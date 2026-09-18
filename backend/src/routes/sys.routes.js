const express = require('express');
const { getHealth, getReady } = require('../controllers/sys.controller');
const { getMetrics } = require('../middleware/metrics.middleware');

const router = express.Router();

router.get('/health', getHealth);
router.get('/ready', getReady);
router.get('/metrics', getMetrics);

module.exports = router;
