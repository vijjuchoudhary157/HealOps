const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth.middleware');
const remediationController = require('../controllers/remediation.controller');

// GET /api/remediations - List all remediations
router.get('/', authenticate, remediationController.getAllRemediations);

// GET /api/remediations/:id - Get single remediation details
router.get('/:id', authenticate, remediationController.getRemediationById);

module.exports = router;
