const express = require('express');
const { body } = require('express-validator');
const { updateComment, deleteComment } = require('../controllers/comment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.put('/:id', [
  body('content').trim().notEmpty().isLength({ max: 1000 })
], updateComment);

router.delete('/:id', deleteComment);

module.exports = router;
