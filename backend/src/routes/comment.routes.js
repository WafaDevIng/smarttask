const express = require('express');
const { body } = require('express-validator');
const {
  getComments,
  createComment,
  updateComment,
  deleteComment
} = require('../controllers/comment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router({ mergeParams: true });
router.use(protect);

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   get:
 *     summary: Get all comments for a task
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *   post:
 *     summary: Add a comment to a task
 *     tags: [Comments]
 */
router.get('/', getComments);
router.post('/', [
  body('content').trim().notEmpty().isLength({ max: 1000 }).withMessage('Content required (max 1000 chars)')
], createComment);

module.exports = router;
