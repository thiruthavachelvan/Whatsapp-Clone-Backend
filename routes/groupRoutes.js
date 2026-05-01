const express = require('express');
const router = express.Router();
const { createGroup, getUserGroups } = require('../controllers/groupController');

router.post('/', createGroup);
router.get('/:userId', getUserGroups);

module.exports = router;
