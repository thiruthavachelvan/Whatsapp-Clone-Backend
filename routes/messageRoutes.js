const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, markMessagesRead, toggleStar, getStarredMessages, clearChat, searchMessages, searchInConversation } = require('../controllers/messageController');

router.get('/starred/:userId', getStarredMessages);
router.get('/search/global', searchMessages);
router.get('/search/:senderId/:receiverId', searchInConversation);
router.get('/:senderId/:receiverId', getMessages);
router.post('/send', sendMessage);
router.put('/mark-read', markMessagesRead);
router.put('/star/:id', toggleStar);
router.post('/clear', clearChat);

module.exports = router;
