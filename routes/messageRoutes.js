const express = require('express');
const router = express.Router();
const { getMessages, sendMessage } = require('../controllers/messageController');

router.get('/:senderId/:receiverId', getMessages);
router.post('/send', sendMessage);

module.exports = router;
