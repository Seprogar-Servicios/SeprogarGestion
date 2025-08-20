const express = require('express');
const router = express.Router();
const notificationCtrl = require('../controllers/notification.controller');
const { authenticateToken } = require('../middlewares/auth');

router.post('/subscribe', authenticateToken, notificationCtrl.subscribe);

module.exports = router;
