const express = require('express');
const { body } = require('express-validator');
const {
  getAllUsers,
  getUserById,
  updateMe,
  changePassword,
  deleteMe,
  getMyStats
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/me/stats', getMyStats);
router.put('/me', [
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('avatar').optional().isURL()
], updateMe);
router.put('/me/password', [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], changePassword);
router.delete('/me', deleteMe);
router.get('/', getAllUsers);
router.get('/:id', getUserById);

module.exports = router;
