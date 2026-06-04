const express = require('express');
const { body } = require('express-validator');
const {
  getProjects, getProject, createProject,
  updateProject, deleteProject,
  addMember, removeMember, getProjectStats
} = require('../controllers/project.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getProjects);
router.post('/', [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 500 }),
  body('color').optional().isHexColor()
], createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.get('/:id/stats', getProjectStats);
router.post('/:id/members', [body('userId').isMongoId()], addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
