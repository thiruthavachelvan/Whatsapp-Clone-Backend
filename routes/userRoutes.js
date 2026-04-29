const express = require('express');
const router = express.Router();
const { loginUser, getUsers } = require('../controllers/userController');

router.post('/login', loginUser);
router.get('/', getUsers);

module.exports = router;
