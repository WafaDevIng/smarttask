const { validationResult } = require('express-validator');
const Task = require('../models/task.model');
const Project = require('../models/project.model');

// GET /api/tasks?project=xxx&status=xxx&assignee=xxx
const getTasks = async (req, res) => {
  try {
    const { project, status, priority, assignee, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignee) filter.assignee = assignee;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ order: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        limit: Number(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/tasks/:id
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('project', 'name color');

    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { projectId, ...taskData } = req.body;

    // Verify project access
    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.user._id }, { members: req.user._id }]
    });
    if (!project) return res.status(403).json({ message: 'Project not found or access denied.' });

    const task = await Task.create({
      ...taskData,
      project: projectId,
      createdBy: req.user._id
    });

    const populated = await task.populate('assignee', 'name email avatar');
    res.status(201).json({ task: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('assignee', 'name email avatar');

    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/tasks/:id/status
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('assignee', 'name email avatar');

    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/tasks/stats
const getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await Task.aggregate([
      { $match: { $or: [{ assignee: userId }, { createdBy: userId }] } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result = { todo: 0, in_progress: 0, review: 0, done: 0 };
    stats.forEach(s => { result[s._id] = s.count; });

    res.json({ stats: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, updateTaskStatus, getStats };
