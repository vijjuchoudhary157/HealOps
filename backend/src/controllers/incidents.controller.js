const crypto = require('crypto');
const { pool } = require('../db');

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Alertmanager Webhook Receiver
 * POST /api/incidents/webhook
 */
const handleWebhook = async (req, res, next) => {
  try {
    // 1. Authenticate bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: { message: 'Unauthorized: Missing or invalid authorization header', status: 401 }
      });
    }

    const token = authHeader.split(' ')[1];
    const expectedToken = process.env.ALERTMANAGER_WEBHOOK_TOKEN;

    if (!expectedToken || !safeCompare(token, expectedToken)) {
      return res.status(403).json({
        error: { message: 'Forbidden: Invalid webhook token', status: 403 }
      });
    }

    // 2. Validate payload structure
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.alerts)) {
      return res.status(400).json({
        error: { message: 'Bad Request: Missing or invalid alerts array', status: 400 }
      });
    }

    const alerts = payload.alerts;
    let processedCount = 0;

    for (const alert of alerts) {
      if (!alert || typeof alert !== 'object') continue;

      const fingerprint = alert.fingerprint;
      if (!fingerprint || typeof fingerprint !== 'string') {
        continue; // Alertmanager must supply fingerprint for deduplication
      }

      const alertStatus = alert.status === 'resolved' ? 'resolved' : 'firing';
      const labels = alert.labels || {};
      const annotations = alert.annotations || {};
      const alertname = labels.alertname || 'UnknownAlert';
      const severity = labels.severity || 'warning';
      const summary = annotations.summary || annotations.message || alertname;
      const description = annotations.description || '';
      const startsAt = alert.startsAt ? new Date(alert.startsAt) : new Date();
      const endsAt = alert.endsAt ? new Date(alert.endsAt) : new Date();

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Advisory transaction lock per fingerprint serializes concurrent notifications for the same alert
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [fingerprint]);

        // Check for existing incident by fingerprint within transaction
        const existingRes = await client.query(
          'SELECT * FROM incidents WHERE fingerprint = $1 FOR UPDATE',
          [fingerprint]
        );
        const existing = existingRes.rows[0];

        if (alertStatus === 'firing') {
          if (!existing) {
            // New incident - atomic insert with ON CONFLICT safety
            const insertRes = await client.query(
              `INSERT INTO incidents (
                fingerprint, alertname, status, severity, summary, description,
                labels, annotations, first_seen_at, last_seen_at
              ) VALUES ($1, $2, 'firing', $3, $4, $5, $6, $7, $8, $8)
              ON CONFLICT (fingerprint) DO UPDATE
              SET last_seen_at = GREATEST(incidents.last_seen_at, EXCLUDED.last_seen_at),
                  updated_at = CURRENT_TIMESTAMP
              RETURNING *`,
              [fingerprint, alertname, severity, summary, description, JSON.stringify(labels), JSON.stringify(annotations), startsAt]
            );
            const newIncident = insertRes.rows[0];

            await client.query(
              `INSERT INTO incident_events (
                incident_id, event_type, summary, details, created_at
              ) VALUES ($1, 'firing', $2, $3, $4)`,
              [
                newIncident.id,
                `Alert started firing: ${summary}`,
                JSON.stringify({ labels, annotations, startsAt, generatorURL: alert.generatorURL }),
                startsAt
              ]
            );
            processedCount++;
          } else if (existing.status === 'resolved') {
            // Reopen previously resolved incident
            await client.query(
              `UPDATE incidents
               SET status = 'firing',
                   resolved_at = NULL,
                   last_seen_at = $1,
                   updated_at = CURRENT_TIMESTAMP,
                   severity = $2,
                   summary = $3,
                   description = $4,
                   labels = $5,
                   annotations = $6
               WHERE id = $7`,
              [startsAt, severity, summary, description, JSON.stringify(labels), JSON.stringify(annotations), existing.id]
            );

            await client.query(
              `INSERT INTO incident_events (
                incident_id, event_type, summary, details, created_at
              ) VALUES ($1, 'reopened', $2, $3, $4)`,
              [
                existing.id,
                `Alert re-triggered after resolution: ${summary}`,
                JSON.stringify({ labels, annotations, startsAt, generatorURL: alert.generatorURL }),
                startsAt
              ]
            );
            processedCount++;
          } else {
            // Ongoing active incident (firing or acknowledged) - update last_seen_at idempotently
            // Acknowledged status is preserved
            await client.query(
              `UPDATE incidents
               SET last_seen_at = GREATEST(last_seen_at, $1),
                   updated_at = CURRENT_TIMESTAMP,
                   severity = $2,
                   summary = $3,
                   description = $4,
                   labels = $5,
                   annotations = $6
               WHERE id = $7`,
              [startsAt, severity, summary, description, JSON.stringify(labels), JSON.stringify(annotations), existing.id]
            );
            // Idempotency: no duplicate timeline event created for retried firing alert
            processedCount++;
          }
        } else if (alertStatus === 'resolved') {
          if (existing && existing.status !== 'resolved') {
            // Mark incident resolved
            await client.query(
              `UPDATE incidents
               SET status = 'resolved',
                   resolved_at = $1,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [endsAt, existing.id]
            );

            await client.query(
              `INSERT INTO incident_events (
                incident_id, event_type, summary, details, created_at
              ) VALUES ($1, 'resolved', $2, $3, $4)`,
              [
                existing.id,
                `Alert resolved: ${summary}`,
                JSON.stringify({ endsAt }),
                endsAt
              ]
            );
            processedCount++;
          }
          // If already resolved or no incident exists, idempotent no-op
        }

        await client.query('COMMIT');
      } catch (alertErr) {
        await client.query('ROLLBACK');
        throw alertErr;
      } finally {
        client.release();
      }
    }

    res.status(200).json({ status: 'ok', processed: processedCount });
  } catch (err) {
    next(err);
  }
};

/**
 * List incidents with pagination and filtering
 * GET /api/incidents
 */
const getIncidents = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { status, severity, search } = req.query;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (severity && severity !== 'all') {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(severity);
    }

    if (search && search.trim()) {
      conditions.push(`(alertname ILIKE $${paramIndex} OR summary ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR fingerprint ILIKE $${paramIndex})`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM incidents ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query with status-priority ordering (firing -> acknowledged -> resolved) then last_seen_at DESC
    const dataParams = [...params, limit, offset];
    const dataResult = await pool.query(
      `SELECT * FROM incidents ${whereClause}
       ORDER BY
         CASE WHEN status = 'firing' THEN 1 WHEN status = 'acknowledged' THEN 2 ELSE 3 END,
         last_seen_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      dataParams
    );

    res.json({
      incidents: dataResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Summary counts by status and severity
 * GET /api/incidents/stats
 */
const getIncidentStats = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'firing') AS firing,
        COUNT(*) FILTER (WHERE status = 'acknowledged') AS acknowledged,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE severity = 'critical') AS critical,
        COUNT(*) FILTER (WHERE severity = 'warning') AS warning,
        COUNT(*) FILTER (WHERE severity = 'info') AS info
      FROM incidents
    `);

    const row = result.rows[0];

    res.json({
      total: parseInt(row.total, 10),
      by_status: {
        firing: parseInt(row.firing, 10),
        acknowledged: parseInt(row.acknowledged, 10),
        resolved: parseInt(row.resolved, 10)
      },
      by_severity: {
        critical: parseInt(row.critical, 10),
        warning: parseInt(row.warning, 10),
        info: parseInt(row.info, 10)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get incident details and chronological timeline
 * GET /api/incidents/:id
 */
const getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const incidentRes = await pool.query('SELECT * FROM incidents WHERE id = $1', [id]);
    if (incidentRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Incident not found', status: 404 } });
    }

    const timelineRes = await pool.query(
      'SELECT * FROM incident_events WHERE incident_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json({
      incident: incidentRes.rows[0],
      timeline: timelineRes.rows
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update incident status (e.g. acknowledge, resolve)
 * PATCH /api/incidents/:id
 */
const updateIncidentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['firing', 'acknowledged', 'resolved'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: { message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`, status: 400 }
      });
    }

    const checkRes = await pool.query('SELECT * FROM incidents WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Incident not found', status: 404 } });
    }

    const prevIncident = checkRes.rows[0];
    const resolvedAtValue = status === 'resolved' ? new Date() : (status === 'firing' ? null : prevIncident.resolved_at);

    const updateRes = await pool.query(
      `UPDATE incidents
       SET status = $1,
           resolved_at = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, resolvedAtValue, id]
    );

    const updatedIncident = updateRes.rows[0];
    const userEmail = req.user?.email || 'operator';

    // Insert timeline event
    await pool.query(
      `INSERT INTO incident_events (
        incident_id, event_type, summary, details
      ) VALUES ($1, $2, $3, $4)`,
      [
        id,
        status,
        `Incident marked as ${status} by ${userEmail}`,
        JSON.stringify({ previous_status: prevIncident.status, new_status: status, updated_by: userEmail })
      ]
    );

    res.json({ incident: updatedIncident });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  handleWebhook,
  getIncidents,
  getIncidentStats,
  getIncidentById,
  updateIncidentStatus
};
