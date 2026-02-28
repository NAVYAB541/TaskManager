const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let tasks = [];

// GET all tasks (optionally filter by completed)
app.get('/tasks', (req, res) => {
  const { completed, category, tag } = req.query;
  let result = tasks;

  // Filter by completion status
  if (completed !== undefined) {
    result = result.filter(t => t.completed === (completed === 'true'));
  }

  // Filter by category
  if (category) {
    result = result.filter(t => t.category === category);
  }

  // Filter by tag
  if (tag) {
    result = result.filter(t => Array.isArray(t.tags) && t.tags.includes(tag));
  }

  res.json(result);
});

// GET a single task
app.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST a new task
app.post('/tasks', (req, res) => {
  const { title, description, dueDate, priority, completed, category, tags } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const allowedPriorities = ['low', 'medium', 'high'];

  const task = {
    id: Date.now().toString(),
    title,
    description: description ?? '',
    dueDate: dueDate ?? null,
    priority: allowedPriorities.includes(priority) ? priority : 'medium',
    completed: completed ?? false,
    category: typeof category === 'string' && category.trim() ? category : 'General',
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
  };

  tasks.push(task);
  res.status(201).json(task);
});

// PUT update a task
app.put('/tasks/:id', (req, res) => {
  const { title, description, dueDate, priority, completed, category, tags } = req.body;

  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const allowedPriorities = ['low', 'medium', 'high'];

  tasks[index] = {
    ...tasks[index],
    title: title ?? tasks[index].title,
    description: description ?? tasks[index].description,
    dueDate: dueDate ?? tasks[index].dueDate,
    priority: allowedPriorities.includes(priority)
      ? priority
      : tasks[index].priority,
    completed: completed ?? tasks[index].completed,
    category: typeof category === 'string' && category.trim() ? category : tasks[index].category,
    tags: Array.isArray(tags) ? tags.filter(Boolean) : tasks[index].tags,
  };

  res.json(tasks[index]);
});

// DELETE a task
app.delete('/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  tasks.splice(index, 1);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));