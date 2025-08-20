const express = require('express');
const router = express.Router();
const { subscribe } = require('../controllers/subscriptionController');
const { authenticateToken } = require('../middlewares/auth');

// @route   POST /api/subscribe
// @desc    Subscribe to push notifications
// @access  Private
router.post('/', authenticateToken, subscribe);

module.exports = router;
