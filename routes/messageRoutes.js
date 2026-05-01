const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, markMessagesRead, toggleStar, getStarredMessages } = require('../controllers/messageController');

router.get('/:senderId/:receiverId', getMessages);
router.post('/send', sendMessage);
router.put('/mark-read', markMessagesRead);
router.put('/star/:id', toggleStar);
router.get('/starred/:userId', getStarredMessages);

module.exports = router;
