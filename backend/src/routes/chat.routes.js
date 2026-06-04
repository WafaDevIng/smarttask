const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { sendMessage } = require('../controllers/chat.controller');

const router = express.Router();
router.use(protect);

// POST /api/chat/message
router.post('/message', sendMessage);

module.exports = router;
