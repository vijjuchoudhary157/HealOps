const http = require('http');
const https = require('https');

/**
 * Perform an HTTP POST request to an external LLM API
 */
function callLLM(url, headers, body, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const payload = JSON.stringify(body);
    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      },
      timeout: timeoutMs
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } else {
            reject(new Error(`LLM API returned status ${res.statusCode}: ${data}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse LLM response: ${err.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('LLM API request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Attempt to perform AI analysis via configured LLM (Gemini or OpenAI compatible)
 */
async function performAIAnalysis(incident, evidenceContext) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return null; // No credentials configured; trigger diagnostic fallback
  }

  const prompt = `You are a Senior Site Reliability Engineer (SRE) analyzing a production incident in a Kubernetes environment.
Analyze the incident and evidence context provided below and output a strict JSON object with root cause analysis.

INCIDENT DETAILS:
- Alert Name: ${incident.alertname}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Summary: ${incident.summary || 'N/A'}
- Description: ${incident.description || 'N/A'}
- Target Labels: ${JSON.stringify(incident.labels || {})}
- Timeline Events: ${JSON.stringify(evidenceContext.timeline || [])}

COLLECTED TELEMETRY EVIDENCE:
- Prometheus Target Health: ${JSON.stringify(evidenceContext.prometheus.metrics.targetHealth || {})}
- Memory Working Set: ${JSON.stringify(evidenceContext.prometheus.metrics.containerMemoryWorkingSet || {})}
- Memory Limit: ${JSON.stringify(evidenceContext.prometheus.metrics.containerMemoryLimit || {})}
- Calculated Memory Usage %: ${evidenceContext.prometheus.derived.memory_usage_percent !== null ? evidenceContext.prometheus.derived.memory_usage_percent + '%' : 'Unavailable'}
- CPU CFS Throttling %: ${JSON.stringify(evidenceContext.prometheus.metrics.cpuThrottlingPercent || {})}
- HTTP Error Rate %: ${JSON.stringify(evidenceContext.prometheus.metrics.httpErrorRate || {})}
- P95 Request Latency: ${JSON.stringify(evidenceContext.prometheus.metrics.p95Latency || {})}
- Pod Restarts: ${JSON.stringify(evidenceContext.prometheus.metrics.podRestarts || {})}

REQUIRED JSON FORMAT (respond with ONLY this JSON and no other text or backticks):
{
  "probable_root_cause": "A concise, definitive summary of the primary failure vector",
  "explanation": "Detailed explanation of why this cause is suspected based on the evidence",
  "evidence": {
    "key_metrics": ["metric observation 1", "metric observation 2"],
    "timeline_correlation": "how timeline events correlate to metrics",
    "fault_domain": "service / pod / node / infrastructure"
  },
  "recommended_actions": [
    {
      "action": "Clear title of action",
      "priority": "critical | high | medium | low",
      "type": "k8s | code | config | database",
      "description": "Specific instruction for remediation"
    }
  ],
  "confidence": "high (95%)"
}`;

  try {
    if (geminiKey) {
      const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      };

      const resp = await callLLM(endpoint, {}, payload);
      const text = resp.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          analysis_type: 'ai',
          provider: 'gemini',
          model: model,
          probable_root_cause: parsed.probable_root_cause || `${incident.alertname} failure`,
          explanation: parsed.explanation || '',
          evidence: parsed.evidence || {},
          recommended_actions: Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : [],
          confidence: parsed.confidence || 'high (85%)'
        };
      }
    } else if (openaiKey) {
      const model = process.env.LLM_MODEL || 'gpt-4o-mini';
      const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      const endpoint = `${baseUrl}/chat/completions`;
      const payload = {
        model: model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      };

      const resp = await callLLM(endpoint, { Authorization: `Bearer ${openaiKey}` }, payload);
      const text = resp.data.choices?.[0]?.message?.content;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          analysis_type: 'ai',
          provider: 'openai',
          model: model,
          probable_root_cause: parsed.probable_root_cause || `${incident.alertname} failure`,
          explanation: parsed.explanation || '',
          evidence: parsed.evidence || {},
          recommended_actions: Array.isArray(parsed.recommended_actions) ? parsed.recommended_actions : [],
          confidence: parsed.confidence || 'high (85%)'
        };
      }
    }
  } catch (err) {
    console.warn(`[AnalysisEngine] LLM invocation failed (${err.message}). Falling back to rule-based diagnostics.`);
    return null;
  }

  return null;
}

/**
 * Deterministic Rule-Based Diagnostic Engine
 * Analyzes metrics, timeline events, and alert specifics without external LLM dependencies
 */
function generateRuleBasedAnalysis(incident, evidenceContext) {
  const alertname = incident.alertname || 'UnknownAlert';
  const labels = incident.labels || {};
  const targetPod = labels.pod || 'unknown-pod';
  const targetContainer = labels.container || 'unknown-container';
  const targetComponent = labels.component || 'backend';
  const promMetrics = evidenceContext.prometheus?.metrics || {};
  const derived = evidenceContext.prometheus?.derived || {};
  const promReachable = Boolean(evidenceContext.prometheus?.reachable);

  let probable_root_cause = '';
  let explanation = '';
  let corroborating_metrics = [];
  const alert_trigger_context = [
    `Alert: ${alertname} [severity: ${incident.severity}]`,
    incident.summary ? `Summary: ${incident.summary}` : null,
    incident.description ? `Description: ${incident.description}` : null
  ].filter(Boolean);

  let evidence = {
    fault_domain: `${targetComponent} / ${targetPod}`,
    corroborating_metrics: [],
    alert_trigger_context,
    timeline_evidence: [],
    metrics_status: promReachable
      ? 'Prometheus query API reachable'
      : 'Prometheus telemetry unavailable (query endpoint unreachable in local environment)'
  };
  let recommended_actions = [];
  let confidence = 'high (92%)';

  // Extract timeline summaries
  if (Array.isArray(evidenceContext.timeline)) {
    evidence.timeline_evidence = evidenceContext.timeline.map(t => `[${t.event_type.toUpperCase()}] ${t.summary}`);
  }

  switch (alertname) {
    case 'HighContainerMemoryUsage': {
      const memPct = derived.memory_usage_percent !== null ? derived.memory_usage_percent : null;
      const memWsVal = promMetrics.containerMemoryWorkingSet?.value;
      const memLimitVal = promMetrics.containerMemoryLimit?.value;

      if (promReachable && memPct !== null) {
        corroborating_metrics.push(`Container memory working set is ${memPct}% of spec limit`);
        if (memWsVal) corroborating_metrics.push(`Working set: ${(parseFloat(memWsVal) / 1024 / 1024).toFixed(1)} MiB`);
        if (memLimitVal) corroborating_metrics.push(`Memory limit: ${(parseFloat(memLimitVal) / 1024 / 1024).toFixed(1)} MiB`);
        confidence = memPct > 80 ? 'high (96%)' : 'medium (82%)';
      } else if (promReachable) {
        confidence = 'medium (65%)';
      } else {
        confidence = 'low (40%)';
      }

      probable_root_cause = `Container memory working set approaching cgroup limit in pod ${targetPod}`;
      explanation = `The container '${targetContainer}' in pod '${targetPod}' has experienced elevated memory allocation. ` +
        `When container memory working set exceeds 85% of its allocated cgroup limit, the Linux kernel OOM-killer (Out of Memory) ` +
        `is at imminent risk of terminating the container process with SIGKILL (exit code 137), leading to service downtime.`;

      recommended_actions = [
        {
          action: 'Increase Container Memory Limit',
          priority: 'critical',
          type: 'k8s',
          description: `Raise resources.limits.memory in ${targetComponent} deployment from existing threshold to provide safe headroom.`
        },
        {
          action: 'Stream Large Payloads & Limit Heap Buffers',
          priority: 'high',
          type: 'code',
          description: 'Inspect active endpoints handling large data payloads. Ensure streams and chunked reads are utilized instead of buffering entire datasets in RAM.'
        },
        {
          action: 'Configure Vertical Pod Autoscaling',
          priority: 'medium',
          type: 'k8s',
          description: 'Deploy a VerticalPodAutoscaler or dynamic resource recommender to automate memory allocation based on peak historical consumption.'
        }
      ];
      break;
    }

    case 'HighCPUThrottling': {
      const throttledVal = promMetrics.cpuThrottlingPercent?.value;
      if (promReachable && throttledVal !== null && throttledVal !== undefined) {
        corroborating_metrics.push(`CFS CPU Throttling rate: ${parseFloat(throttledVal).toFixed(1)}%`);
        confidence = 'high (90%)';
      } else if (promReachable) {
        confidence = 'medium (65%)';
      } else {
        confidence = 'low (40%)';
      }

      probable_root_cause = `Aggressive CFS CPU quota throttling exceeding 25% on pod ${targetPod}`;
      explanation = `The container '${targetContainer}' in pod '${targetPod}' is exhausting its CFS CPU quota periods. ` +
        `Linux Completely Fair Scheduler throttles processing once the quota is reached within a 100ms window, resulting in ` +
        `artificial latency spikes, queuing delays, and degraded application throughput.`;

      recommended_actions = [
        {
          action: 'Increase CPU Limits or Remove Hard Limits',
          priority: 'high',
          type: 'k8s',
          description: `Raise resources.limits.cpu or configure CPU limits to 2x current quota to prevent scheduler throttling during bursts.`
        },
        {
          action: 'Profile CPU-Intensive Event Loop Operations',
          priority: 'medium',
          type: 'code',
          description: 'Profile Node.js event loop blocks and optimize expensive JSON serialization or cryptographic hashing operations.'
        }
      ];
      break;
    }

    case 'BackendUnavailable': {
      const targetUp = promMetrics.targetHealth?.value;
      const restarts = promMetrics.podRestarts?.value;

      if (promReachable && targetUp !== null && targetUp !== undefined) {
        corroborating_metrics.push(`Prometheus target up{job="healops-backend"}: ${targetUp}`);
        if (restarts) corroborating_metrics.push(`Pod container restarts total: ${restarts}`);
        confidence = 'high (98%)';
      } else if (promReachable) {
        confidence = 'medium (65%)';
      } else {
        confidence = 'low (40%)';
      }

      probable_root_cause = `Backend process termination, crash, or unreachable service endpoint`;
      explanation = `Prometheus has detected that the HealOps backend target is down (up == 0) or completely missing ` +
        `from service discovery for more than 1 minute. This indicates either an uncaught fatal exception, container termination, ` +
        `failed readiness probes, or cluster network reachability partition.`;

      recommended_actions = [
        {
          action: 'Inspect Pod Status & Describe Events',
          priority: 'critical',
          type: 'k8s',
          description: 'Execute kubectl describe pod -l app=healops-backend -n healops to inspect probe failures, OOM kills, or scheduling issues.'
        },
        {
          action: 'Review Previous Container Crash Logs',
          priority: 'high',
          type: 'code',
          description: 'Run kubectl logs -l app=healops-backend -n healops --previous to capture the fatal stack trace prior to process exit.'
        },
        {
          action: 'Validate PostgreSQL Connectivity & Migration Status',
          priority: 'high',
          type: 'database',
          description: 'Ensure the backend container can reach PostgreSQL on port 5432 and database credentials remain valid.'
        }
      ];
      break;
    }

    case 'HighHTTPErrorRate': {
      const errorRate = promMetrics.httpErrorRate?.value;
      const reqRate = promMetrics.httpRequestRate?.value;

      if (promReachable && errorRate !== null && errorRate !== undefined) {
        corroborating_metrics.push(`HTTP 5xx Error Rate: ${parseFloat(errorRate).toFixed(2)}%`);
        if (reqRate) corroborating_metrics.push(`Total request throughput: ${parseFloat(reqRate).toFixed(2)} req/s`);
        confidence = 'high (92%)';
      } else if (promReachable) {
        confidence = 'medium (65%)';
      } else {
        confidence = 'low (40%)';
      }

      probable_root_cause = `Elevated HTTP 5xx server responses exceeding 10% error threshold`;
      explanation = `The backend service is generating internal server errors (HTTP 500/503) for incoming client requests. ` +
        `This typically stems from database query connection drops, unhandled Promise rejections, or downstream dependency failures.`;

      recommended_actions = [
        {
          action: 'Review Backend Application Logs for 5xx Stack Traces',
          priority: 'critical',
          type: 'code',
          description: 'Query application logs for unhandled errors, validation failures, or database query timeout exceptions.'
        },
        {
          action: 'Check Database Connection Pool Health',
          priority: 'high',
          type: 'database',
          description: 'Confirm PostgreSQL pool max clients is not exhausted and active queries are completing without deadlocks.'
        }
      ];
      break;
    }

    case 'HighAPILatency': {
      const p95 = promMetrics.p95Latency?.value;
      if (promReachable && p95 !== null && p95 !== undefined) {
        corroborating_metrics.push(`P95 request latency: ${parseFloat(p95).toFixed(3)}s`);
        confidence = 'high (89%)';
      } else if (promReachable) {
        confidence = 'medium (65%)';
      } else {
        confidence = 'low (40%)';
      }

      probable_root_cause = `P95 API request latency exceeding 1.5-second service level objective`;
      explanation = `95% of incoming user requests are experiencing severe response delays (> 1.5s). ` +
        `This degrades user experience and indicates query execution bottlenecks, unindexed database tables, or CPU scheduling starvation.`;

      recommended_actions = [
        {
          action: 'Identify Slow Database Queries & Add Missing Indexes',
          priority: 'high',
          type: 'database',
          description: 'Review PostgreSQL EXPLAIN ANALYZE on frequently hit endpoints and create appropriate B-tree or unique indexes.'
        },
        {
          action: 'Horizontal Pod Autoscaling',
          priority: 'medium',
          type: 'k8s',
          description: 'Increase backend replica count to distribute concurrent I/O load across multiple Node.js worker instances.'
        }
      ];
      break;
    }

    case 'PodCrashLooping':
    case 'PodUnavailable': {
      const restarts = promMetrics.podRestarts?.value;
      const phase = promMetrics.podPhase?.value;

      if (promReachable && (restarts || phase)) {
        if (restarts) corroborating_metrics.push(`Container restart count: ${restarts}`);
        if (phase) corroborating_metrics.push(`Pod status phase: ${phase}`);
        confidence = 'high (94%)';
      } else if (promReachable) {
        confidence = 'medium (65%)';
      } else {
        confidence = 'low (40%)';
      }

      probable_root_cause = `Pod in namespace healops failing to maintain ready status or crashlooping`;
      explanation = `Kubernetes pod '${targetPod}' is restarting repeatedly or stuck in a non-Running phase (Pending/Failed). ` +
        `Common causes include invalid entrypoint arguments, missing environment variables/secrets, or repeated panic on boot.`;

      recommended_actions = [
        {
          action: 'Inspect Pod Termination Reason',
          priority: 'critical',
          type: 'k8s',
          description: 'Execute kubectl get pods -n healops and inspect LastState termination reason (e.g. CrashLoopBackOff, Error, OOMKilled).'
        },
        {
          action: 'Verify Referenced ConfigMaps and Secrets',
          priority: 'high',
          type: 'config',
          description: 'Ensure backend-config, backend-secret, and alertmanager-secret exist and contain all required keys.'
        }
      ];
      break;
    }

    default: {
      probable_root_cause = `Triggered alert condition: ${incident.summary || alertname}`;
      explanation = incident.description ||
        `Alert '${alertname}' triggered with severity '${incident.severity}'. Telemetry signals indicate abnormal operational state.`;

      recommended_actions = [
        {
          action: 'Inspect Relevant Pod and Container Telemetry',
          priority: 'high',
          type: 'k8s',
          description: `Check health status and logs for component '${targetComponent}' in namespace 'healops'.`
        },
        {
          action: 'Verify Alert Rule Conditions in Prometheus',
          priority: 'medium',
          type: 'config',
          description: 'Review alert threshold configuration in prometheus-rules ConfigMap.'
        }
      ];

      confidence = promReachable ? 'medium (75%)' : 'low (40%)';
      break;
    }
  }

  // If Prometheus is not reachable, append clear note to explanation
  if (!promReachable) {
    explanation += `\n\n[Telemetry Note]: Prometheus query API was unavailable during analysis in this environment. This diagnosis is based solely on the alert notification payload and timeline events; live metric corroboration could not be performed.`;
  }

  evidence.corroborating_metrics = corroborating_metrics;

  return {
    analysis_type: 'rule-based',
    provider: 'rule-based-engine',
    model: 'healops-heuristic-v1',
    probable_root_cause,
    explanation,
    evidence,
    recommended_actions,
    confidence
  };
}

/**
 * Execute Root Cause Analysis
 * Orchestrates LLM call (if configured) with fallback to deterministic rule-based engine
 */
async function analyzeIncident(incident, evidenceContext) {
  // Try AI analysis first if credentials exist
  const aiResult = await performAIAnalysis(incident, evidenceContext);
  if (aiResult) {
    return aiResult;
  }

  // Fallback to rule-based diagnostic analysis
  return generateRuleBasedAnalysis(incident, evidenceContext);
}

module.exports = {
  analyzeIncident,
  generateRuleBasedAnalysis,
  performAIAnalysis
};
