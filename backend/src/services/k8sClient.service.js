const fs = require('fs');
const https = require('https');
const http = require('http');

const IN_CLUSTER_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';
const IN_CLUSTER_CA_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';

/**
 * Retrieve Kubernetes API configuration
 */
function getK8sConfig() {
  const customUrl = process.env.KUBERNETES_API_URL;
  const host = process.env.KUBERNETES_SERVICE_HOST;
  const port = process.env.KUBERNETES_SERVICE_PORT || 443;

  let baseUrl = null;
  if (customUrl) {
    baseUrl = customUrl.replace(/\/+$/, '');
  } else if (host) {
    baseUrl = `https://${host}:${port}`;
  } else if (fs.existsSync(IN_CLUSTER_TOKEN_PATH)) {
    baseUrl = 'https://kubernetes.default.svc';
  }

  let token = process.env.KUBERNETES_BEARER_TOKEN || null;
  let ca = null;

  if (fs.existsSync(IN_CLUSTER_TOKEN_PATH)) {
    try {
      token = fs.readFileSync(IN_CLUSTER_TOKEN_PATH, 'utf8').trim();
    } catch (e) {
      console.warn('[K8sClient] Unable to read in-cluster token:', e.message);
    }
  }

  if (fs.existsSync(IN_CLUSTER_CA_PATH)) {
    try {
      ca = fs.readFileSync(IN_CLUSTER_CA_PATH);
    } catch (e) {
      console.warn('[K8sClient] Unable to read in-cluster CA:', e.message);
    }
  }

  return { baseUrl, token, ca };
}

/**
 * Check whether the Kubernetes cluster API is accessible
 */
function isK8sAvailable() {
  const { baseUrl, token } = getK8sConfig();
  return Boolean(baseUrl && token);
}

/**
 * Perform an authenticated HTTP request against Kubernetes API
 */
function requestK8s(method, apiPath, body = null, contentType = 'application/json', timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const { baseUrl, token, ca } = getK8sConfig();

    if (!baseUrl || !token) {
      return reject(new Error('Kubernetes API unavailable (ServiceAccount token or cluster endpoint not detected)'));
    }

    const urlObj = new URL(apiPath, baseUrl);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        ...(payload ? {
          'Content-Type': contentType,
          'Content-Length': Buffer.byteLength(payload)
        } : {})
      },
      timeout: timeoutMs,
      ...(ca ? { ca } : {}),
      rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0'
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: parsed });
          } else {
            const msg = parsed.message || parsed.reason || `Kubernetes API returned status ${res.statusCode}`;
            const err = new Error(msg);
            err.statusCode = res.statusCode;
            err.body = parsed;
            reject(err);
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, body: data });
          } else {
            const err = new Error(`Kubernetes API error (${res.statusCode}): ${data}`);
            err.statusCode = res.statusCode;
            reject(err);
          }
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const err = new Error('Kubernetes API request timed out');
      err.statusCode = 504;
      reject(err);
    });

    req.on('error', (err) => {
      reject(new Error(`Kubernetes API connection error: ${err.message}`));
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

/**
 * Retrieve Deployment details
 */
async function getDeployment(namespace, deploymentName) {
  const path = `/apis/apps/v1/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deploymentName)}`;
  const res = await requestK8s('GET', path);
  return res.body;
}

/**
 * Execute rolling restart of deployment via strategic-merge patch
 */
async function restartDeployment(namespace, deploymentName) {
  const restartedAt = new Date().toISOString();
  const patchBody = {
    spec: {
      template: {
        metadata: {
          annotations: {
            'kubectl.kubernetes.io/restartedAt': restartedAt
          }
        }
      }
    }
  };

  const path = `/apis/apps/v1/namespaces/${encodeURIComponent(namespace)}/deployments/${encodeURIComponent(deploymentName)}`;
  const res = await requestK8s('PATCH', path, patchBody, 'application/strategic-merge-patch+json');
  return {
    restartedAt,
    deployment: res.body
  };
}

/**
 * Poll deployment status until rollout completes
 */
async function pollDeploymentRollout(namespace, deploymentName, timeoutMs = 60000, pollIntervalMs = 2000) {
  const startTime = Date.now();
  let lastStatus = null;

  while (Date.now() - startTime < timeoutMs) {
    try {
      const dep = await getDeployment(namespace, deploymentName);
      const specReplicas = dep.spec?.replicas || 1;
      const status = dep.status || {};
      lastStatus = status;

      const observedGen = status.observedGeneration || 0;
      const metaGen = dep.metadata?.generation || 0;
      const updatedReplicas = status.updatedReplicas || 0;
      const availableReplicas = status.availableReplicas || 0;
      const readyReplicas = status.readyReplicas || 0;

      // Rollout is complete when:
      // 1. Observed generation >= metadata generation
      // 2. Updated replicas == spec replicas
      // 3. Available replicas == spec replicas
      // 4. Ready replicas == spec replicas
      if (
        observedGen >= metaGen &&
        updatedReplicas === specReplicas &&
        availableReplicas === specReplicas &&
        readyReplicas === specReplicas
      ) {
        return {
          completed: true,
          durationMs: Date.now() - startTime,
          replicas: specReplicas,
          status
        };
      }
    } catch (err) {
      console.warn(`[K8sClient] Rollout poll error: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  return {
    completed: false,
    durationMs: Date.now() - startTime,
    error: `Rollout verification timed out after ${timeoutMs / 1000}s`,
    lastStatus
  };
}

/**
 * Verify service recovery via readiness endpoint
 */
async function verifyReadinessProbe(endpointUrl, timeoutMs = 45000, pollIntervalMs = 2000) {
  const startTime = Date.now();
  let lastError = null;
  let lastResponse = null;

  const urlObj = new URL(endpointUrl);
  const client = urlObj.protocol === 'https:' ? https : http;

  while (Date.now() - startTime < timeoutMs) {
    const probeResult = await new Promise((resolve) => {
      const reqStart = Date.now();
      const req = client.get(urlObj.toString(), { timeout: 3000 }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          const latencyMs = Date.now() - reqStart;
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode === 200 && (parsed.status === 'ready' || parsed.status === 'healthy')) {
              return resolve({ ok: true, statusCode: res.statusCode, data: parsed, latencyMs });
            }
            resolve({ ok: false, statusCode: res.statusCode, data: parsed, latencyMs });
          } catch (e) {
            resolve({ ok: res.statusCode === 200, statusCode: res.statusCode, data, latencyMs });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Readiness probe timed out' });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });
    });

    if (probeResult.ok) {
      return {
        verified: true,
        endpoint: endpointUrl,
        statusCode: probeResult.statusCode,
        latencyMs: probeResult.latencyMs,
        durationMs: Date.now() - startTime,
        data: probeResult.data,
        timestamp: new Date().toISOString()
      };
    }

    lastError = probeResult.error || `Status code: ${probeResult.statusCode}`;
    lastResponse = probeResult.data;
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  return {
    verified: false,
    endpoint: endpointUrl,
    durationMs: Date.now() - startTime,
    error: `Readiness verification failed after ${timeoutMs / 1000}s: ${lastError}`,
    lastResponse,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getK8sConfig,
  isK8sAvailable,
  requestK8s,
  getDeployment,
  restartDeployment,
  pollDeploymentRollout,
  verifyReadinessProbe
};
