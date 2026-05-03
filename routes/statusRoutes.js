const express = require('express');
const router = express.Router();
const { createStatus, getStatuses, deleteStatus, viewStatus } = require('../controllers/statusController');

router.post('/', createStatus);
router.get('/', getStatuses);
router.post('/view/:id', viewStatus);
router.delete('/:id', deleteStatus);

module.exports = router;
