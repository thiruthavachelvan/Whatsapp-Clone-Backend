const express = require('express');
const router = express.Router();
const { loginUser, registerUser, getUsers } = require('../controllers/userController');

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/', getUsers);

module.exports = router;
