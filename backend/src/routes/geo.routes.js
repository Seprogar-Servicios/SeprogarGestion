const express = require('express');
const router = express.Router();
const geoCtrl = require('../controllers/geo.controller');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);
router.get('/suggest', geoCtrl.suggest);
router.post('/geocode', geoCtrl.geocode);

module.exports = router;
