const User = require('../models/user.model');
const Task = require('../models/task.model');
const Project = require('../models/project.model');
const logger = require('../config/logger');

// GET /api/users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('name email avatar role createdAt')
      .sort({ name: 1 });
    res.json({ users, total: users.length });
  } catch (error) {
    logger.error('getAllUsers error:', error);
    res.status(500).json({ message: error.message });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -__v');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/me
const updateMe = async (req, res) => {
  try {
    const allowed = ['name', 'avatar'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/users/me/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both currentPassword and newPassword are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    logger.info(`Password changed for user: ${user.email}`);
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/users/me
const deleteMe = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    logger.info(`User deactivated: ${req.user.email}`);
    res.json({ message: 'Account deactivated successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/users/me/stats
const getMyStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const [taskStats, projectCount, recentTasks] = await Promise.all([
      Task.aggregate([
        { $match: { $or: [{ assignee: userId }, { createdBy: userId }] } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Project.countDocuments({
        $or: [{ owner: userId }, { members: userId }],
        status: 'active'
      }),
      Task.find({
        $or: [{ assignee: userId }, { createdBy: userId }],
        status: { $ne: 'done' },
        dueDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .select('title status priority dueDate')
    ]);

    const stats = { todo: 0, in_progress: 0, review: 0, done: 0 };
    taskStats.forEach(s => { stats[s._id] = s.count; });

    res.json({
      taskStats: stats,
      projectCount,
      upcomingTasks: recentTasks,
      totalTasks: Object.values(stats).reduce((a, b) => a + b, 0)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllUsers, getUserById, updateMe, changePassword, deleteMe, getMyStats };
