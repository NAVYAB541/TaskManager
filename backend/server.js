const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── MongoDB connection ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => { console.error('MongoDB connection error:', err); process.exit(1); });

// ─── Task schema ──────────────────────────────────────────────────────────────
const taskSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    dueDate:     { type: Date, default: null },
    priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    completed:   { type: Boolean, default: false },
    category:    { type: String, default: 'General', trim: true },
    tags:        { type: [String], default: [] },
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

// ─── GET all tasks ────────────────────────────────────────────────────────────
app.get('/tasks', async (req, res) => {
  try {
    const { completed, category, tag } = req.query;
    const filter = {};

    if (completed !== undefined) filter.completed = completed === 'true';
    if (category)                filter.category  = category;
    if (tag)                     filter.tags      = tag;

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
    const { title, description, dueDate, priority, completed, category, tags } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const task = await Task.create({
      title:       title.trim(),
      description: description ?? '',
      dueDate:     dueDate     ?? null,
      priority:    priority    ?? 'medium',
      completed:   completed   ?? false,
      category:    category?.trim() || 'General',
      tags:        Array.isArray(tags) ? tags.filter(Boolean) : [],
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
    const { title, description, dueDate, priority, completed, category, tags } = req.body;

    const updates = {};
    if (title       !== undefined) updates.title       = title.trim();
    if (description !== undefined) updates.description = description;
    if (dueDate     !== undefined) updates.dueDate     = dueDate;
    if (priority    !== undefined) updates.priority    = priority;
    if (completed   !== undefined) updates.completed   = completed;
    if (category    !== undefined) updates.category    = category?.trim() || 'General';
    if (tags        !== undefined) updates.tags        = Array.isArray(tags) ? tags.filter(Boolean) : [];

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true } // return updated doc + validate
    );

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