const http = require('http');
const https = require('https');
const { pool } = require('../db');

/**
 * Execute an HTTP query against the Prometheus instant query API
 */
async function queryPrometheus(query, time = null, timeoutMs = 3000) {
  const prometheusBase = process.env.PROMETHEUS_URL || 'http://healops-prometheus.healops.svc.cluster.local:9090';
  const urlObj = new URL('/api/v1/query', prometheusBase);
  urlObj.searchParams.set('query', query);
  if (time) {
    urlObj.searchParams.set('time', time.toString());
  }

  const client = urlObj.protocol === 'https:' ? https : http;

  return new Promise((resolve) => {
    const req = client.get(urlObj.toString(), { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            if (parsed.status === 'success' && parsed.data && Array.isArray(parsed.data.result)) {
              return resolve({
                available: true,
                result: parsed.data.result,
                error: null
              });
            }
          }
          resolve({
            available: false,
            result: [],
            error: `Prometheus returned status ${res.statusCode}`
          });
        } catch (err) {
          resolve({
            available: false,
            result: [],
            error: `Failed to parse Prometheus JSON: ${err.message}`
          });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        available: false,
        result: [],
        error: 'Prometheus query timed out'
      });
    });

    req.on('error', (err) => {
      resolve({
        available: false,
        result: [],
        error: `Prometheus connection error: ${err.message}`
      });
    });
  });
}

/**
 * Collect relevant telemetry, metrics, and timeline evidence for an incident
 */
async function collectEvidence(incident) {
  const collectedAt = new Date().toISOString();
  const labels = incident.labels || {};
  const targetPod = labels.pod || null;
  const targetContainer = labels.container || null;

  // 1. Fetch Timeline Events from PostgreSQL
  let timeline = [];
  try {
    const timelineRes = await pool.query(
      'SELECT id, event_type, summary, details, created_at FROM incident_events WHERE incident_id = $1 ORDER BY created_at ASC',
      [incident.id]
    );
    timeline = timelineRes.rows;
  } catch (err) {
    timeline = [{
      event_type: 'error',
      summary: `Failed to fetch incident timeline: ${err.message}`,
      created_at: collectedAt
    }];
  }

  // 2. Determine query timestamp around the incident
  const queryTimestamp = incident.last_seen_at
    ? Math.floor(new Date(incident.last_seen_at).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  // 3. Prometheus Metric Queries
  const metricQueries = {
    targetHealth: {
      expr: 'up{job="healops-backend"}',
      label: 'HealOps Backend Target Availability'
    },
    httpRequestRate: {
      expr: 'sum(rate(http_requests_total{job="healops-backend",route!~"/metrics|/health|/ready"}[5m]))',
      label: 'HTTP Request Rate (req/s)'
    },
    httpErrorRate: {
      expr: '(sum(rate(http_requests_total{job="healops-backend",route!~"/metrics|/health|/ready",code=~"5.."}[5m])) / sum(rate(http_requests_total{job="healops-backend",route!~"/metrics|/health|/ready"}[5m]))) * 100',
      label: 'HTTP 5xx Error Rate (%)'
    },
    p95Latency: {
      expr: 'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{job="healops-backend",route!~"/metrics|/health|/ready"}[5m])))',
      label: 'P95 API Latency (seconds)'
    },
    containerMemoryWorkingSet: {
      expr: targetPod
        ? `container_memory_working_set_bytes{namespace="healops",pod="${targetPod}"}`
        : 'container_memory_working_set_bytes{namespace="healops",container!=""}',
      label: 'Container Memory Working Set (bytes)'
    },
    containerMemoryLimit: {
      expr: targetPod
        ? `container_spec_memory_limit_bytes{namespace="healops",pod="${targetPod}"}`
        : 'container_spec_memory_limit_bytes{namespace="healops",container!=""}',
      label: 'Container Memory Limit (bytes)'
    },
    cpuThrottlingPercent: {
      expr: targetPod
        ? `(sum(rate(container_cpu_cfs_throttled_periods_total{namespace="healops",pod="${targetPod}"}[5m])) / sum(rate(container_cpu_cfs_periods_total{namespace="healops",pod="${targetPod}"}[5m]))) * 100`
        : '(sum by (namespace, pod, container) (rate(container_cpu_cfs_throttled_periods_total{namespace="healops",container!=""}[5m])) / sum by (namespace, pod, container) (rate(container_cpu_cfs_periods_total{namespace="healops",container!=""}[5m]))) * 100',
      label: 'CPU CFS Throttling (%)'
    },
    containerCpuUsage: {
      expr: targetPod
        ? `rate(container_cpu_usage_seconds_total{namespace="healops",pod="${targetPod}"}[5m])`
        : 'rate(container_cpu_usage_seconds_total{namespace="healops",container!=""}[5m])',
      label: 'Container CPU Usage (cores)'
    },
    podRestarts: {
      expr: targetPod
        ? `kube_pod_container_status_restarts_total{namespace="healops",pod="${targetPod}"}`
        : 'kube_pod_container_status_restarts_total{namespace="healops"}',
      label: 'Pod Container Restarts'
    },
    podPhase: {
      expr: targetPod
        ? `kube_pod_status_phase{namespace="healops",pod="${targetPod}"}`
        : 'kube_pod_status_phase{namespace="healops"}',
      label: 'Pod Status Phase'
    },
    deploymentAvailability: {
      expr: 'kube_deployment_status_replicas_available{namespace="healops"}',
      label: 'Deployment Available Replicas'
    }
  };

  const metricResults = {};
  let reachableMetricsCount = 0;
  let prometheusReachable = false;

  const queryEntries = Object.entries(metricQueries);
  const queryPromises = queryEntries.map(async ([key, meta]) => {
    const res = await queryPrometheus(meta.expr, queryTimestamp, 2000);
    return { key, meta, res };
  });

  const queryResults = await Promise.all(queryPromises);
  for (const { key, meta, res } of queryResults) {
    if (res.available) {
      prometheusReachable = true;
      if (res.result.length > 0) {
        reachableMetricsCount++;
        metricResults[key] = {
          name: meta.label,
          expr: meta.expr,
          status: 'available',
          value: res.result[0].value ? res.result[0].value[1] : null,
          series: res.result.map(r => ({
            metric: r.metric,
            value: r.value ? r.value[1] : null
          }))
        };
      } else {
        metricResults[key] = {
          name: meta.label,
          expr: meta.expr,
          status: 'empty',
          value: null,
          reason: 'Metric series absent or zero samples in time window'
        };
      }
    } else {
      metricResults[key] = {
        name: meta.label,
        expr: meta.expr,
        status: 'unavailable',
        value: null,
        reason: res.error || 'Prometheus query failed'
      };
    }
  }

  // 4. Compute Derived Metrics (e.g. Memory Usage %)
  let memoryUsagePercent = null;
  const memWs = metricResults.containerMemoryWorkingSet;
  const memLimit = metricResults.containerMemoryLimit;
  if (memWs && memWs.status === 'available' && memLimit && memLimit.status === 'available') {
    const wsBytes = parseFloat(memWs.value);
    const limitBytes = parseFloat(memLimit.value);
    if (!isNaN(wsBytes) && !isNaN(limitBytes) && limitBytes > 0 && limitBytes < 1e14) {
      memoryUsagePercent = parseFloat(((wsBytes / limitBytes) * 100).toFixed(2));
    }
  }

  return {
    incident_id: incident.id,
    alertname: incident.alertname,
    fingerprint: incident.fingerprint,
    severity: incident.severity,
    status: incident.status,
    labels: incident.labels,
    annotations: incident.annotations,
    first_seen_at: incident.first_seen_at,
    last_seen_at: incident.last_seen_at,
    collected_at: collectedAt,
    prometheus: {
      reachable: prometheusReachable,
      metrics_available_count: reachableMetricsCount,
      total_metrics_queried: queryEntries.length,
      metrics: metricResults,
      derived: {
        memory_usage_percent: memoryUsagePercent
      }
    },
    timeline: timeline.map(evt => ({
      id: evt.id,
      event_type: evt.event_type,
      summary: evt.summary,
      created_at: evt.created_at
    }))
  };
}

module.exports = {
  collectEvidence,
  queryPrometheus
};
