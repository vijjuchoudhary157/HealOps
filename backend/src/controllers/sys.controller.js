const { pool } = require('../db');
const { isK8sAvailable, getDeployment } = require('../services/k8sClient.service');
const { queryPrometheus } = require('../services/evidenceCollector.service');

const getHealth = (req, res) => {
  res.json({
    status: 'healthy',
    service: 'healops-backend',
    timestamp: new Date().toISOString()
  });
};

const getReady = async (req, res, next) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ready', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
};

const getSystemStatus = async (req, res, next) => {
  try {
    const k8sAvailable = isK8sAvailable();
    const envType = k8sAvailable ? 'kubernetes' : 'docker-compose';
    const namespace = process.env.KUBERNETES_NAMESPACE || 'healops';

    // 1. Database check & latency
    let dbStatus = 'disconnected';
    let dbLatencyMs = null;
    try {
      const dbStart = Date.now();
      await pool.query('SELECT 1');
      dbLatencyMs = Date.now() - dbStart;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    // 2. Prometheus probe with 2s timeout
    let promAvailable = false;
    let promError = null;
    try {
      const promCheck = await queryPrometheus('up', null, 2000);
      promAvailable = Boolean(promCheck?.available);
      promError = promCheck?.error || null;
    } catch (e) {
      promAvailable = false;
      promError = e.message;
    }

    // 3. Kubernetes deployment details if in cluster
    const k8sDetails = {
      available: k8sAvailable,
      cluster_type: envType,
      namespace: namespace
    };

    if (k8sAvailable) {
      try {
        const deploy = await getDeployment(namespace, 'healops-backend');
        const status = deploy.body?.status || {};
        k8sDetails.deployment = {
          name: 'healops-backend',
          replicas: status.replicas ?? 0,
          readyReplicas: status.readyReplicas ?? 0,
          availableReplicas: status.availableReplicas ?? 0,
          updatedReplicas: status.updatedReplicas ?? 0
        };
      } catch (err) {
        k8sDetails.deploymentError = err.message;
      }
    } else {
      k8sDetails.message = 'Kubernetes in-cluster ServiceAccount token not detected (running in standalone Docker Compose)';
    }

    const mem = process.memoryUsage();

    res.json({
      environment: envType,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        backend: {
          status: 'healthy',
          uptime_seconds: Math.floor(process.uptime()),
          node_version: process.version,
          memory: {
            heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10,
            heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10,
            rss_mb: Math.round(mem.rss / 1024 / 1024 * 10) / 10
          }
        },
        database: {
          status: dbStatus,
          latency_ms: dbLatencyMs,
          pool: {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
          }
        },
        prometheus: {
          available: promAvailable,
          configured_url: process.env.PROMETHEUS_URL || 'http://healops-prometheus.healops.svc.cluster.local:9090',
          error: promError
        }
      },
      kubernetes: k8sDetails
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHealth,
  getReady,
  getSystemStatus
};
