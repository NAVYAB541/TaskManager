const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' })); // allow base64 file uploads

// ─── MongoDB connection ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => { console.error('MongoDB connection error:', err); process.exit(1); });

// ─── Task schema ──────────────────────────────────────────────────────────────
const taskSchema = new mongoose.Schema(
  {
    title:           { type: String, required: true, trim: true },
    description:     { type: String, default: '' },
    dueDate:         { type: Date, default: null },
    priority:        { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    completed:       { type: Boolean, default: false },
    category:        { type: String, default: 'General', trim: true },
    tags:            { type: [String], default: [] },
    estimateMinutes: { type: Number, default: 30 },
    energy:          { type: String, default: null },   // 'high' | 'medium' | 'low' | null
    nextAction:      { type: String, default: '' },
    parentTaskId:    { type: String, default: null },   // set on AI-generated subtasks
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Task = mongoose.model('Task', taskSchema);

// ─── Focus Session schema ───────────────────────────────────────────
const focusSessionSchema = new mongoose.Schema({
  taskId:          { type: String, required: true },
  taskTitle:       { type: String, required: true },
  estimateMinutes: { type: Number, default: 0 },
  actualMinutes:   { type: Number, required: true },
  feelingRating:   { type: String, enum: ['easy', 'okay', 'hard'], required: true },
  category:        { type: String, default: 'General' },
  completedAt:     { type: Date, default: Date.now },
}, { timestamps: true });

const FocusSession = mongoose.model('FocusSession', focusSessionSchema);

// ─── GET all tasks ────────────────────────────────────────────────────────────
app.get('/tasks', async (req, res) => {
  try {
    const { completed, category, tag, parentTaskId } = req.query;
    const filter = {};
    if (completed    !== undefined) filter.completed    = completed === 'true';
    if (category)                   filter.category     = category;
    if (tag)                        filter.tags         = tag;
    if (parentTaskId !== undefined) filter.parentTaskId = parentTaskId === 'null' ? null : parentTaskId;
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// ─── GET single task ──────────────────────────────────────────────────────────
app.get('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: 'Invalid task ID' });
  }
});

// ─── POST create task ─────────────────────────────────────────────────────────
app.post('/tasks', async (req, res) => {
  try {
    const { title, description, dueDate, priority, completed, category, tags,
            estimateMinutes, energy, nextAction } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
    const task = await Task.create({
      title:           title.trim(),
      description:     description ?? '',
      dueDate:         dueDate     ?? null,
      priority:        priority    ?? 'medium',
      completed:       completed   ?? false,
      category:        category?.trim() || 'General',
      tags:            Array.isArray(tags) ? tags.filter(Boolean) : [],
      estimateMinutes: estimateMinutes ?? 30,
      energy:          energy ?? null,
      nextAction:      nextAction ?? '',
    });
    res.status(201).json(task);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ─── PUT update task ──────────────────────────────────────────────────────────
app.put('/tasks/:id', async (req, res) => {
  try {
    const { title, description, dueDate, priority, completed, category, tags,
            estimateMinutes, energy, nextAction } = req.body;
    const updates = {};
    if (title           !== undefined) updates.title           = title.trim();
    if (description     !== undefined) updates.description     = description;
    if (dueDate         !== undefined) updates.dueDate         = dueDate;
    if (priority        !== undefined) updates.priority        = priority;
    if (completed       !== undefined) updates.completed       = completed;
    if (category        !== undefined) updates.category        = category?.trim() || 'General';
    if (tags            !== undefined) updates.tags            = Array.isArray(tags) ? tags.filter(Boolean) : [];
    if (estimateMinutes !== undefined) updates.estimateMinutes = estimateMinutes;
    if (energy          !== undefined) updates.energy          = energy;
    if (nextAction      !== undefined) updates.nextAction      = nextAction;
    const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    res.status(400).json({ error: 'Invalid task ID or data' });
  }
});

// ─── DELETE task ──────────────────────────────────────────────────────────────
app.delete('/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid task ID' });
  }
});

// ─── POST complete focus session ────────────────────────────────────
app.post('/tasks/:id/complete-focus', async (req, res) => {
  try {
    const { actualMinutes, feelingRating } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await FocusSession.create({
      taskId:          task.id,
      taskTitle:       task.title,
      estimateMinutes: task.estimateMinutes,
      actualMinutes,
      feelingRating,
      category:        task.category,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log focus session' });
  }
});

// ─── POST AI plan task ────────────────────────────────────────────────────────
app.post('/ai/plan-task', async (req, res) => {
  try {
    const { title, description, category, totalHours } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are a student productivity coach. Break this task into manageable subtasks.

Task: "${title.trim()}"
${description ? `Details: ${description}` : ''}
${category ? `Category: ${category}` : ''}
${totalHours ? `Time available: ${totalHours} hours` : ''}

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "feasibility": {
    "ok": true,
    "message": "This looks achievable in the time given."
  },
  "subtasks": [
    {
      "title": "Short subtask title",
      "estimateMinutes": 20,
      "nextAction": "The very first small thing to do — make it feel easy to start",
      "energy": "medium"
    }
  ]
}

Rules:
- If totalHours is given and seems unrealistic for the task, set feasibility.ok to false and explain gently.
- Create 3–5 subtasks. Each must feel non-overwhelming.
- nextAction should be a single specific micro-step (like "Open a blank doc and jot 3 bullet points").
- estimateMinutes per subtask should be 10–60 min.
- energy must be "high", "medium", or "low".
- Total estimated time across subtasks should roughly match totalHours if given.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0].message.content.trim();
    const parsed = JSON.parse(raw);

    res.json(parsed);
  } catch (err) {
    console.error('AI plan error:', err.message);
    res.status(500).json({ error: 'AI planning failed' });
  }
});

// ─── POST bulk create tasks (parent + subtasks in one shot) ───────────────────
app.post('/tasks/bulk', async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks) || !tasks.length) {
      return res.status(400).json({ error: 'tasks array is required' });
    }
    const created = await Task.insertMany(
      tasks.map(t => ({
        title:           t.title?.trim(),
        description:     t.description ?? '',
        dueDate:         t.dueDate ?? null,
        priority:        t.priority ?? 'medium',
        completed:       false,
        category:        t.category?.trim() || 'General',
        tags:            Array.isArray(t.tags) ? t.tags.filter(Boolean) : [],
        estimateMinutes: t.estimateMinutes ?? 30,
        energy:          t.energy ?? null,
        nextAction:      t.nextAction ?? '',
        parentTaskId:    t.parentTaskId ?? null,
      }))
    );
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: 'Bulk create failed' });
  }
});

// Keep Render free tier alive by self-pinging every 14 minutes
const https = require('https');
setInterval(() => {
  https.get('https://taskmanager-pn0w.onrender.com/tasks', (res) => {
    console.log(`Keep-alive ping: ${res.statusCode}`);
  }).on('error', (err) => {
    console.error('Keep-alive failed:', err.message);
  });
}, 14 * 60 * 1000);

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
