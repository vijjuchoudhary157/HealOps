const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const analysisController = require('../controllers/analysis.controller');

// GET /api/analysis - List all recent analyses across incidents
router.get('/', authenticate, analysisController.getAllAnalyses);

module.exports = router;
