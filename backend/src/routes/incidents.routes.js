const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const incidentsController = require('../controllers/incidents.controller');
const analysisController = require('../controllers/analysis.controller');

// Alertmanager Webhook (authenticated with ALERTMANAGER_WEBHOOK_TOKEN)
router.post('/webhook', incidentsController.handleWebhook);

// Incident Management Endpoints (authenticated with User JWT)
router.get('/stats', authenticate, incidentsController.getIncidentStats);
router.get('/', authenticate, incidentsController.getIncidents);
router.get('/:id', authenticate, incidentsController.getIncidentById);
router.patch('/:id', authenticate, incidentsController.updateIncidentStatus);

// Root Cause Analysis Endpoints (authenticated with User JWT)
router.post('/:id/analyze', authenticate, analysisController.triggerAnalysis);
router.get('/:id/analysis', authenticate, analysisController.getIncidentAnalysis);

module.exports = router;
