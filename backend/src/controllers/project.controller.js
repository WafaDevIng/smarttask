const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Project = require('../models/project.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const logger = require('../config/logger');

const getProjects = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = { $or: [{ owner: req.user._id }, { members: req.user._id }] };
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const projects = await Project.find(filter)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ projects, total: projects.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('members', 'name email avatar');

    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const isAuthorized =
      project.owner._id.toString() === req.user._id.toString() ||
      project.members.some(m => m._id.toString() === req.user._id.toString());

    if (!isAuthorized) return res.status(403).json({ message: 'Access denied.' });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const project = await Project.create({ ...req.body, owner: req.user._id, members: [req.user._id] });
    await project.populate('owner', 'name email avatar');
    await project.populate('members', 'name email avatar');
    logger.info('Project created: ' + project.name);
    res.status(201).json({ project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProject = async (req, res) => {
  try {
    const allowed = ['name', 'description', 'status', 'deadline', 'color'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id }, updates, { new: true, runValidators: true }
    ).populate('owner', 'name email avatar').populate('members', 'name email avatar');
    if (!project) return res.status(404).json({ message: 'Project not found or unauthorized.' });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found or unauthorized.' });
    const deleted = await Task.deleteMany({ project: req.params.id });
    res.json({ message: 'Project deleted. ' + deleted.deletedCount + ' tasks removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required.' });
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found or unauthorized.' });
    const userToAdd = await User.findById(userId);
    if (!userToAdd) return res.status(404).json({ message: 'User not found.' });
    if (project.members.map(String).includes(userId)) {
      return res.status(409).json({ message: 'User is already a member.' });
    }
    project.members.push(userId);
    await project.save();
    await project.populate('members', 'name email avatar');
    await Notification.create({
      recipient: userId,
      type: 'project_member_added',
      title: 'Ajouté à un projet',
      message: req.user.name + ' vous a ajouté au projet "' + project.name + '"',
      link: '/projects/' + project._id
    });
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ message: 'Project not found or unauthorized.' });
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Owner cannot be removed.' });
    }
    project.members = project.members.filter(m => m.toString() !== userId);
    await project.save();
    await project.populate('members', 'name email avatar');
    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectStats = async (req, res) => {
  try {
    const projectId = mongoose.Types.ObjectId.createFromHexString(req.params.id);
    const [taskStats, priorityStats, recentActivity] = await Promise.all([
      Task.aggregate([{ $match: { project: projectId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $match: { project: projectId } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Task.find({ project: projectId }).sort({ updatedAt: -1 }).limit(5).select('title status priority updatedAt')
    ]);
    const statusMap = { todo: 0, in_progress: 0, review: 0, done: 0 };
    taskStats.forEach(s => { statusMap[s._id] = s.count; });
    const priorityMap = { low: 0, medium: 0, high: 0, urgent: 0 };
    priorityStats.forEach(p => { priorityMap[p._id] = p.count; });
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const completion = total > 0 ? Math.round((statusMap.done / total) * 100) : 0;
    res.json({ taskStats: statusMap, priorityStats: priorityMap, recentActivity, total, completion });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember, getProjectStats };
