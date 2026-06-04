const { validationResult } = require('express-validator');
const Comment = require('../models/comment.model');
const Task = require('../models/task.model');
const Notification = require('../models/notification.model');
const logger = require('../config/logger');

// GET /api/tasks/:taskId/comments
const getComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await Comment.find({ task: taskId })
      .populate('author', 'name email avatar')
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Comment.countDocuments({ task: taskId });

    res.json({
      comments,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('getComments error:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/tasks/:taskId/comments
const createComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { taskId } = req.params;
    const { content } = req.body;

    // Verify task exists
    const task = await Task.findById(taskId).populate('assignee', '_id');
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const comment = await Comment.create({
      content,
      task: taskId,
      author: req.user._id
    });

    await comment.populate('author', 'name email avatar');

    // Send notification to task assignee (if different from commenter)
    if (task.assignee && task.assignee._id.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: task.assignee._id,
        type: 'task_comment',
        title: 'Nouveau commentaire',
        message: `${req.user.name} a commenté la tâche "${task.title}"`,
        link: `/tasks/${taskId}`
      });
    }

    res.status(201).json({ comment });
  } catch (error) {
    logger.error('createComment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/comments/:id
const updateComment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found or not authorized.' });
    }

    comment.content = req.body.content;
    comment.edited = true;
    await comment.save();
    await comment.populate('author', 'name email avatar');

    res.json({ comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/comments/:id
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({
      _id: req.params.id,
      author: req.user._id
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found or not authorized.' });
    }

    await comment.deleteOne();
    res.json({ message: 'Comment deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getComments, createComment, updateComment, deleteComment };
