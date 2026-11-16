const { pool } = require('../db');
const k8sClient = require('./k8sClient.service');

const ALLOWED_ACTIONS = ['restart_deployment'];
const ALLOWED_TARGETS = ['healops-backend'];
const ALLOWED_NAMESPACES = ['healops'];
const COOLDOWN_SECONDS = 180; // 3-minute cooldown between successful restarts

/**
 * Validate whether an action and target deployment are eligible for remediation
 */
function validateRemediationRequest(action, target, namespace) {
  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return {
      valid: false,
      error: `Invalid remediation action '${action}'. Supported actions: ${ALLOWED_ACTIONS.join(', ')}`
    };
  }

  if (!target || !ALLOWED_TARGETS.includes(target)) {
    return {
      valid: false,
      error: `Invalid remediation target '${target}'. Supported targets: ${ALLOWED_TARGETS.join(', ')}`
    };
  }

  if (!namespace || !ALLOWED_NAMESPACES.includes(namespace)) {
    return {
      valid: false,
      error: `Invalid namespace '${namespace}'. Supported namespaces: ${ALLOWED_NAMESPACES.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Check if a deployment is currently in cooldown or already has an executing remediation
 */
async function checkCooldownAndConcurrency(target, namespace) {
  // 1. Check for in-progress remediation
  const inProgressRes = await pool.query(
    `SELECT id, status, execution_started_at, requested_by
     FROM incident_remediations
     WHERE target_deployment = $1 AND namespace = $2 AND status IN ('pending', 'executing')
     ORDER BY created_at DESC LIMIT 1`,
    [target, namespace]
  );

  if (inProgressRes.rows.length > 0) {
    const active = inProgressRes.rows[0];
    return {
      allowed: false,
      reason: 'in_progress',
      message: `A remediation action (ID #${active.id}) is already ${active.status} for target '${target}'`,
      activeRemediation: active
    };
  }

  // 2. Check cooldown window
  const cooldownRes = await pool.query(
    `SELECT id, status, execution_completed_at, created_at
     FROM incident_remediations
     WHERE target_deployment = $1 AND namespace = $2 AND status = 'succeeded'
       AND execution_completed_at > NOW() - ($3 || ' seconds')::INTERVAL
     ORDER BY execution_completed_at DESC LIMIT 1`,
    [target, namespace, COOLDOWN_SECONDS]
  );

  if (cooldownRes.rows.length > 0) {
    const recent = cooldownRes.rows[0];
    const completedAt = new Date(recent.execution_completed_at || recent.created_at);
    const elapsedSec = Math.floor((Date.now() - completedAt.getTime()) / 1000);
    const remainingSec = Math.max(0, COOLDOWN_SECONDS - elapsedSec);

    return {
      allowed: false,
      reason: 'cooldown',
      message: `Remediation cooldown active for deployment '${target}'. Successfully restarted ${elapsedSec}s ago. Cooldown expires in ${remainingSec}s.`,
      remainingSeconds: remainingSec
    };
  }

  return { allowed: true };
}

/**
 * Execute remediation for an incident
 */
async function executeRemediation({
  incidentId,
  action = 'restart_deployment',
  target = 'healops-backend',
  namespace = 'healops',
  requestedBy = 'system',
  approvalTimestamp = new Date().toISOString()
}) {
  // 1. Validation
  const validation = validateRemediationRequest(action, target, namespace);
  if (!validation.valid) {
    const err = new Error(validation.error);
    err.statusCode = 400;
    throw err;
  }

  // 2. Check Incident
  const incidentRes = await pool.query('SELECT * FROM incidents WHERE id = $1', [incidentId]);
  if (incidentRes.rows.length === 0) {
    const err = new Error(`Incident with ID ${incidentId} not found`);
    err.statusCode = 404;
    throw err;
  }
  const incident = incidentRes.rows[0];

  if (incident.status === 'resolved') {
    const err = new Error('Cannot execute remediation on a resolved incident');
    err.statusCode = 400;
    throw err;
  }

  // 3. Concurrency & Cooldown Guard
  const guard = await checkCooldownAndConcurrency(target, namespace);
  if (!guard.allowed) {
    const err = new Error(guard.message);
    err.statusCode = guard.reason === 'in_progress' ? 409 : 429;
    err.details = guard;
    throw err;
  }

  // 4. Record pending execution in database
  const executionStartedAt = new Date().toISOString();
  let remediationRecord;
  try {
    const insertRes = await pool.query(
      `INSERT INTO incident_remediations (
        incident_id, action_type, target_deployment, namespace, requested_by,
        approval_timestamp, execution_started_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        incidentId,
        action,
        target,
        namespace,
        requestedBy,
        approvalTimestamp,
        executionStartedAt,
        'executing'
      ]
    );
    remediationRecord = insertRes.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      const conflictErr = new Error(`A remediation action is already in progress for target '${target}'`);
      conflictErr.statusCode = 409;
      conflictErr.details = { reason: 'in_progress' };
      throw conflictErr;
    }
    throw err;
  }

  // 5. Log timeline event: remediation_triggered
  await pool.query(
    `INSERT INTO incident_events (incident_id, event_type, summary, details)
     VALUES ($1, $2, $3, $4)`,
    [
      incidentId,
      'remediation_triggered',
      `Remediation approved by ${requestedBy}: Restarting deployment '${target}' in namespace '${namespace}'`,
      JSON.stringify({
        remediation_id: remediationRecord.id,
        action,
        target,
        namespace,
        requested_by: requestedBy,
        approval_timestamp: approvalTimestamp
      })
    ]
  );

  // 6. Check if Kubernetes API is available
  if (!k8sClient.isK8sAvailable()) {
    const errorMsg = 'Kubernetes API unavailable (ServiceAccount token or cluster endpoint not detected)';
    const completedAt = new Date().toISOString();

    const updateRes = await pool.query(
      `UPDATE incident_remediations
       SET status = 'failed',
           execution_completed_at = $1,
           error_details = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [completedAt, errorMsg, remediationRecord.id]
    );
    remediationRecord = updateRes.rows[0];

    await pool.query(
      `INSERT INTO incident_events (incident_id, event_type, summary, details)
       VALUES ($1, $2, $3, $4)`,
      [
        incidentId,
        'remediation_failed',
        `Remediation failed: ${errorMsg}`,
        JSON.stringify({ remediation_id: remediationRecord.id, error: errorMsg })
      ]
    );

    return {
      status: 'failed',
      error: errorMsg,
      remediation: remediationRecord
    };
  }

  // 7. Execute Rolling Restart via Kubernetes Strategic Merge Patch
  let restartResult;
  try {
    restartResult = await k8sClient.restartDeployment(namespace, target);
  } catch (err) {
    const completedAt = new Date().toISOString();
    const errorMsg = `Kubernetes patch failed: ${err.message}`;

    const updateRes = await pool.query(
      `UPDATE incident_remediations
       SET status = 'failed',
           execution_completed_at = $1,
           error_details = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [completedAt, errorMsg, remediationRecord.id]
    );
    remediationRecord = updateRes.rows[0];

    await pool.query(
      `INSERT INTO incident_events (incident_id, event_type, summary, details)
       VALUES ($1, $2, $3, $4)`,
      [
        incidentId,
        'remediation_failed',
        `Remediation failed: ${errorMsg}`,
        JSON.stringify({ remediation_id: remediationRecord.id, error: errorMsg })
      ]
    );

    return {
      status: 'failed',
      error: errorMsg,
      remediation: remediationRecord
    };
  }

  // 8. Poll Deployment Rollout Status
  const rolloutResult = await k8sClient.pollDeploymentRollout(namespace, target, 45000);

  // 9. Verify Backend Service Recovery via Readiness Probe
  const readinessUrl = process.env.BACKEND_READINESS_URL ||
    (process.env.KUBERNETES_SERVICE_HOST
      ? 'http://healops-backend.healops.svc.cluster.local:5000/ready'
      : 'http://localhost:5000/ready');

  const probeResult = await k8sClient.verifyReadinessProbe(readinessUrl, 45000);

  // 10. Evaluate Recovery Outcome
  const executionCompletedAt = new Date().toISOString();
  let finalStatus;
  let summaryText;

  if (rolloutResult.completed && probeResult.verified) {
    finalStatus = 'succeeded';
    summaryText = `Remediation succeeded: deployment '${target}' restarted and verified healthy via ${readinessUrl} probe (${probeResult.latencyMs}ms)`;
  } else if (!probeResult.verified) {
    finalStatus = 'recovery_unverified';
    summaryText = `Remediation restart initiated, but backend recovery could not be verified: ${probeResult.error || 'Readiness timeout'}`;
  } else {
    finalStatus = 'failed';
    summaryText = `Remediation rollout failed: ${rolloutResult.error || 'Rollout timeout'}`;
  }

  const resultDetails = {
    restarted_at: restartResult.restartedAt,
    rollout: rolloutResult,
    readiness_url: readinessUrl
  };

  const updateRes = await pool.query(
    `UPDATE incident_remediations
     SET status = $1,
         execution_completed_at = $2,
         result_details = $3,
         error_details = $4,
         recovery_verification = $5,
         recovery_verified = $6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $7
     RETURNING *`,
    [
      finalStatus,
      executionCompletedAt,
      JSON.stringify(resultDetails),
      finalStatus !== 'succeeded' ? (probeResult.error || rolloutResult.error) : null,
      JSON.stringify(probeResult),
      probeResult.verified === true,
      remediationRecord.id
    ]
  );
  remediationRecord = formatRemediation(updateRes.rows[0]);

  // 11. Log final timeline event
  await pool.query(
    `INSERT INTO incident_events (incident_id, event_type, summary, details)
     VALUES ($1, $2, $3, $4)`,
    [
      incidentId,
      finalStatus === 'succeeded' ? 'remediation_completed' : 'remediation_recovery_failed',
      summaryText,
      JSON.stringify({
        remediation_id: remediationRecord.id,
        status: finalStatus,
        probe: probeResult,
        rollout: rolloutResult
      })
    ]
  );

  return {
    status: finalStatus,
    remediation: remediationRecord
  };
}

/**
 * Standardize remediation record attributes for API consumers and DB consistency
 */
function formatRemediation(row) {
  if (!row) return null;
  const verified = row.recovery_verified === true ||
                   (typeof row.recovery_verification === 'object' && row.recovery_verification?.verified === true);
  return {
    ...row,
    action: row.action || row.action_type,
    target_type: row.target_type || 'deployment',
    target_name: row.target_name || row.target_deployment,
    target_namespace: row.target_namespace || row.namespace,
    triggered_by: row.triggered_by || row.requested_by,
    approved_by: row.approved_by || row.requested_by,
    recovery_verified: verified,
    verification_details: row.verification_details || row.recovery_verification || {},
    error_message: row.error_message || row.error_details || null,
    started_at: row.started_at || row.execution_started_at,
    completed_at: row.completed_at || row.execution_completed_at,
  };
}

module.exports = {
  validateRemediationRequest,
  checkCooldownAndConcurrency,
  executeRemediation,
  formatRemediation,
  ALLOWED_ACTIONS,
  ALLOWED_TARGETS,
  ALLOWED_NAMESPACES,
  COOLDOWN_SECONDS
};
