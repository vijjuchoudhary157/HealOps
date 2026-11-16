const { pool } = require('../db');
const { collectEvidence } = require('../services/evidenceCollector.service');
const { analyzeIncident } = require('../services/analysisEngine.service');

/**
 * Trigger AI / Diagnostic Root Cause Analysis for an incident
 * POST /api/incidents/:id/analyze
 */
const triggerAnalysis = async (req, res, next) => {
  const { id } = req.params;
  const incidentId = parseInt(id, 10);

  if (isNaN(incidentId) || incidentId <= 0) {
    return res.status(400).json({
      error: { message: 'Bad Request: Invalid incident ID', status: 400 }
    });
  }

  try {
    // 1. Retrieve incident
    const incidentRes = await pool.query('SELECT * FROM incidents WHERE id = $1', [incidentId]);
    if (incidentRes.rows.length === 0) {
      return res.status(404).json({
        error: { message: `Incident with ID ${incidentId} not found`, status: 404 }
      });
    }
    const incident = incidentRes.rows[0];

    // 2. Collect Evidence (Prometheus metrics + timeline + labels)
    const evidenceContext = await collectEvidence(incident);

    // 3. Run Analysis Engine (AI or Rule-based fallback)
    const analysisResult = await analyzeIncident(incident, evidenceContext);

    // 4. Store Analysis Result in PostgreSQL
    const insertRes = await pool.query(
      `INSERT INTO incident_analyses (
        incident_id, analysis_type, provider, model, probable_root_cause,
        explanation, evidence, recommended_actions, confidence, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        incidentId,
        analysisResult.analysis_type,
        analysisResult.provider,
        analysisResult.model,
        analysisResult.probable_root_cause,
        analysisResult.explanation,
        JSON.stringify(analysisResult.evidence || {}),
        JSON.stringify(analysisResult.recommended_actions || []),
        analysisResult.confidence,
        'completed'
      ]
    );
    const savedAnalysis = insertRes.rows[0];

    // 5. Append Timeline Event
    const timelineSummary = `Root cause analysis generated (${savedAnalysis.analysis_type.toUpperCase()} by ${savedAnalysis.provider})`;
    await pool.query(
      `INSERT INTO incident_events (
        incident_id, event_type, summary, details
      ) VALUES ($1, 'analysis_generated', $2, $3)`,
      [
        incidentId,
        timelineSummary,
        JSON.stringify({
          analysis_id: savedAnalysis.id,
          analysis_type: savedAnalysis.analysis_type,
          provider: savedAnalysis.provider,
          confidence: savedAnalysis.confidence,
          probable_root_cause: savedAnalysis.probable_root_cause
        })
      ]
    );

    return res.status(201).json({
      message: 'Root cause analysis generated successfully',
      analysis: savedAnalysis,
      incident: {
        id: incident.id,
        alertname: incident.alertname,
        status: incident.status,
        severity: incident.severity,
        summary: incident.summary
      }
    });
  } catch (err) {
    console.error('Error generating incident analysis:', err);
    return res.status(500).json({
      error: { message: `Failed to generate root cause analysis: ${err.message}`, status: 500 }
    });
  }
};

/**
 * Get the latest analysis for an incident
 * GET /api/incidents/:id/analysis
 */
const getIncidentAnalysis = async (req, res, next) => {
  const { id } = req.params;
  const incidentId = parseInt(id, 10);

  if (isNaN(incidentId) || incidentId <= 0) {
    return res.status(400).json({
      error: { message: 'Bad Request: Invalid incident ID', status: 400 }
    });
  }

  try {
    // Check incident existence
    const incidentRes = await pool.query('SELECT * FROM incidents WHERE id = $1', [incidentId]);
    if (incidentRes.rows.length === 0) {
      return res.status(404).json({
        error: { message: `Incident with ID ${incidentId} not found`, status: 404 }
      });
    }
    const incident = incidentRes.rows[0];

    // Query latest analysis
    const analysisRes = await pool.query(
      'SELECT * FROM incident_analyses WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1',
      [incidentId]
    );

    const analysis = analysisRes.rows[0] || null;

    return res.status(200).json({
      incident_id: incidentId,
      incident: {
        id: incident.id,
        alertname: incident.alertname,
        status: incident.status,
        severity: incident.severity,
        summary: incident.summary,
        description: incident.description,
        labels: incident.labels,
        first_seen_at: incident.first_seen_at,
        last_seen_at: incident.last_seen_at,
        resolved_at: incident.resolved_at
      },
      analysis
    });
  } catch (err) {
    console.error('Error retrieving incident analysis:', err);
    return res.status(500).json({
      error: { message: 'Failed to retrieve incident analysis', status: 500 }
    });
  }
};

/**
 * List all recent analyses across incidents
 * GET /api/analysis
 */
const getAllAnalyses = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              i.alertname,
              i.status AS incident_status,
              i.severity,
              i.summary AS incident_summary,
              i.fingerprint
       FROM incident_analyses a
       JOIN incidents i ON a.incident_id = i.id
       ORDER BY a.created_at DESC
       LIMIT 50`
    );

    return res.status(200).json({
      analyses: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error('Error listing analyses:', err);
    return res.status(500).json({
      error: { message: 'Failed to list root cause analyses', status: 500 }
    });
  }
};

module.exports = {
  triggerAnalysis,
  getIncidentAnalysis,
  getAllAnalyses
};
