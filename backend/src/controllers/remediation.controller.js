const { pool } = require('../db');
const { executeRemediation, formatRemediation, ALLOWED_ACTIONS, ALLOWED_TARGETS, ALLOWED_NAMESPACES } = require('../services/remediation.service');

/**
 * Trigger an approved remediation for an incident
 * POST /api/incidents/:id/remediate
 */
const triggerIncidentRemediation = async (req, res, next) => {
  const { id } = req.params;
  const incidentId = parseInt(id, 10);

  if (isNaN(incidentId) || incidentId <= 0) {
    return res.status(400).json({
      error: { message: 'Bad Request: Invalid incident ID', status: 400 }
    });
  }

  const { approved } = req.body || {};
  const action = req.body?.action || 'restart_deployment';
  const target = req.body?.target || req.body?.target_name || 'healops-backend';
  const namespace = req.body?.namespace || req.body?.target_namespace || 'healops';

  // Explicit approval check
  if (approved !== true) {
    return res.status(400).json({
      error: {
        message: 'Explicit user approval is required to execute remediation',
        status: 400
      }
    });
  }

  const requestedBy = req.user?.email || req.user?.username || `user-${req.user?.id || 'unknown'}`;
  const approvalTimestamp = new Date().toISOString();

  try {
    const result = await executeRemediation({
      incidentId,
      action,
      target,
      namespace,
      requestedBy,
      approvalTimestamp
    });

    return res.status(201).json({
      message: `Remediation execution completed with status '${result.status}'`,
      status: result.status,
      remediation: result.remediation
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      error: {
        message: err.message,
        status: statusCode,
        details: err.details || null
      }
    });
  }
};

/**
 * Get all remediations for a specific incident
 * GET /api/incidents/:id/remediations
 */
const getIncidentRemediations = async (req, res, next) => {
  const { id } = req.params;
  const incidentId = parseInt(id, 10);

  if (isNaN(incidentId) || incidentId <= 0) {
    return res.status(400).json({
      error: { message: 'Bad Request: Invalid incident ID', status: 400 }
    });
  }

  try {
    // Check incident existence
    const incidentRes = await pool.query('SELECT id, alertname, status, severity FROM incidents WHERE id = $1', [incidentId]);
    if (incidentRes.rows.length === 0) {
      return res.status(404).json({
        error: { message: `Incident with ID ${incidentId} not found`, status: 404 }
      });
    }

    const remediationsRes = await pool.query(
      `SELECT * FROM incident_remediations WHERE incident_id = $1 ORDER BY created_at DESC`,
      [incidentId]
    );

    return res.status(200).json({
      incident: incidentRes.rows[0],
      remediations: remediationsRes.rows.map(formatRemediation)
    });
  } catch (err) {
    console.error('Error fetching incident remediations:', err);
    return res.status(500).json({
      error: { message: 'Failed to retrieve incident remediations', status: 500 }
    });
  }
};

/**
 * Get a specific remediation by ID
 * GET /api/remediations/:id
 */
const getRemediationById = async (req, res, next) => {
  const { id } = req.params;
  const remediationId = parseInt(id, 10);

  if (isNaN(remediationId) || remediationId <= 0) {
    return res.status(400).json({
      error: { message: 'Bad Request: Invalid remediation ID', status: 400 }
    });
  }

  try {
    const result = await pool.query(
      `SELECT r.*, i.alertname, i.status as incident_status, i.severity as incident_severity
       FROM incident_remediations r
       JOIN incidents i ON r.incident_id = i.id
       WHERE r.id = $1`,
      [remediationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: `Remediation with ID ${remediationId} not found`, status: 404 }
      });
    }

    return res.status(200).json({
      remediation: formatRemediation(result.rows[0])
    });
  } catch (err) {
    console.error('Error fetching remediation by ID:', err);
    return res.status(500).json({
      error: { message: 'Failed to retrieve remediation record', status: 500 }
    });
  }
};

/**
 * List all remediations across all incidents
 * GET /api/remediations
 */
const getAllRemediations = async (req, res, next) => {
  const { status, target, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }

  if (target) {
    params.push(target);
    conditions.push(`r.target_deployment = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM incident_remediations r ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(parseInt(limit, 10));
    params.push(offset);
    const listRes = await pool.query(
      `SELECT r.*, i.alertname, i.status as incident_status, i.severity as incident_severity
       FROM incident_remediations r
       JOIN incidents i ON r.incident_id = i.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.status(200).json({
      remediations: listRes.rows.map(formatRemediation),
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      },
      metadata: {
        allowed_actions: ALLOWED_ACTIONS,
        allowed_targets: ALLOWED_TARGETS,
        allowed_namespaces: ALLOWED_NAMESPACES
      }
    });
  } catch (err) {
    console.error('Error listing remediations:', err);
    return res.status(500).json({
      error: { message: 'Failed to retrieve remediations list', status: 500 }
    });
  }
};

module.exports = {
  triggerIncidentRemediation,
  getIncidentRemediations,
  getRemediationById,
  getAllRemediations
};
