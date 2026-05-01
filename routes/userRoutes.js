const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getUsers, updateProfile, searchUsers } = require('../controllers/userController');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/', getUsers);
router.get('/search', searchUsers);
router.put('/update/:id', updateProfile);

module.exports = router;
