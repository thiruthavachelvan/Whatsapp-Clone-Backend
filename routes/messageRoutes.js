const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, markMessagesRead } = require('../controllers/messageController');

router.get('/:senderId/:receiverId', getMessages);
router.post('/send', sendMessage);
router.put('/mark-read', markMessagesRead);

module.exports = router;
