const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getUsers, updateProfile, searchUsers, blockUser, muteChat, reportUser, hideChat } = require('../controllers/userController');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/', getUsers);
router.get('/search', searchUsers);
router.put('/update/:id', updateProfile);
router.put('/block', blockUser);
router.put('/mute', muteChat);
router.put('/hide', hideChat);
router.post('/report', reportUser);

module.exports = router;
