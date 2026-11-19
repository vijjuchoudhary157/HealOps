# HealOps — Autonomous Incident Detection, Root Cause Diagnostics & Self-Healing Platform

> **A Kubernetes-native reliability platform providing automated incident lifecycle management, telemetry-correlated root cause analysis, and human-approved self-healing remediation.**

[![HealOps CI](https://github.com/vijjuchoudhary157/HealOps/actions/workflows/ci.yml/badge.svg)](https://github.com/vijjuchoudhary157/HealOps/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-v1.28%2B-326CE5?logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-v2.45-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-v10.2-F46800?logo=grafana&logoColor=white)](https://grafana.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## 1. Project Overview

**HealOps** is an autonomous Site Reliability Engineering (SRE) management and self-healing platform built for cloud-native Kubernetes environments. HealOps bridges the gap between raw infrastructure observability and automated incident remediation.

When containerized workloads encounter resource exhaustion, crashes, or severe performance degradation, HealOps captures firing alert notifications from Prometheus Alertmanager, deduplicates incidents, correlates live time-series metrics, generates explainable Root Cause Analysis (RCA), and arms operators with safe, one-click self-healing remediation governed by strict Kubernetes Role-Based Access Controls (RBAC).

---

## 2. Problem Statement

In modern distributed microservice architectures running on Kubernetes:
1. **Alert Fatigue & Noise:** On-call engineers are inundated with fragmented alerts across monitoring silos without unified incident context or timeline correlation.
2. **High Mean Time to Detect & Identify (MTTD/MTTI):** Diagnosing root causes requires manual triage across pod logs, Prometheus metrics, and Kubernetes cluster events.
3. **Risky Manual Remediation:** Uncontrolled manual interventions (`kubectl restart`, pod deletion) lack auditability, peer authorization, concurrency safeguards, or automated recovery verification.
4. **Lack of Remediation Auditability:** Traditional DevOps runbooks leave no persistent database records detailing which operator approved a rollout, why it was triggered, or whether the service recovered.

---

## 3. Project Objectives

- **Automate Incident Ingestion:** Receive and deduplicate Prometheus Alertmanager notifications via authenticated webhooks into a PostgreSQL datastore.
- **Correlate Live Cluster Telemetry:** Pull active Prometheus metrics (`cAdvisor`, `kube-state-metrics`) matching the incident's target pod, container, and namespace.
- **Explainable Root Cause Diagnostics:** Synthesize alerts, metric signals, and timeline events into clear root cause hypotheses and actionable recommendations.
- **Human-in-the-Loop Self-Healing:** Provide safe, operator-authorized rolling restarts with strict namespace restrictions, cooldown guards, and automated `/ready` probe verification.
- **Comprehensive Auditability:** Persist every stage of the incident lifecycle—from firing alerts and diagnostic reports to operator approvals and rollout verifications.

---

## 4. Key Features

- **Executive Reliability Dashboard:** Real-time visibility into cluster operational state, MTTR, MTBF, firing alerts, and active workloads.
- **Alertmanager Webhook Receiver:** Ingests Alertmanager API alerts with token-based authentication and deduplication via 64-bit label fingerprints.
- **Incident Event Timelines:** Granular audit history capturing alert start times, severity transitions, diagnostic generations, operator approvals, and resolutions.
- **Rule-Based & AI-Assisted RCA:** Heuristic diagnostic engine that isolates fault domains and evaluates cgroup limits, CPU quotas, and service reachability.
- **Controlled Self-Healing Engine (Phase 9D):** Operator-approved Kubernetes deployment rollout restarts with concurrency locks and 3-minute cooldown safeguards.
- **Least-Privilege RBAC:** Remediation is restricted to specific deployment targets in the `healops` namespace through dedicated `ServiceAccount` and `Role` definitions.
- **Post-Rollout Recovery Probes:** Automated polling of Kubernetes deployment conditions and HTTP `/ready` endpoint to verify database connectivity before confirming recovery.
- **Dual-Mode System Health Diagnostics:** Honest environment detection supporting both local Docker Compose development and live Kubernetes cluster operation.

---

## 5. Architecture Overview

HealOps is organized into three decoupled layers: **Observability Pipeline**, **Control Plane**, and **Self-Healing Engine**.

```mermaid
flowchart TD
    subgraph Observability["Observability Pipeline"]
        K8S["Kubernetes Nodes & Workloads"] -->|cAdvisor & node metrics| PROM["Prometheus Server (v2.45.0)"]
        KSM["kube-state-metrics"] -->|Cluster State Telemetry| PROM
        PROM -->|Alert Rules Triggered| AM["Alertmanager (v0.27.0)"]
        PROM -->|Time-Series Data Source| GRAF["Grafana Dashboards (v10.2.0)"]
    end

    subgraph HealOpsPlatform["HealOps Control Plane"]
        AM -->|Bearer Token Webhook| API["HealOps Backend API (Express.js)"]
        API -->|Deduplicate & Persist| DB[("PostgreSQL 15 Datastore")]
        API -->|Correlate Live Telemetry| PROM
        API -->|Diagnostic Pipeline| RCA["Root Cause Analysis Engine"]
        UI["HealOps Web Console (React / Vite)"] -->|JWT Authenticated Requests| API
    end

    subgraph SelfHealing["Controlled Self-Healing Engine"]
        UI -->|Operator Authorization Modal| API
        API -->|ServiceAccount: healops-remediation-sa| K8S_API["Kubernetes API Server"]
        K8S_API -->|Zero-Downtime Rolling Restart| DEPLOY["healops-backend Deployment"]
        API -->|Verify Rollout & /ready Probe| DEPLOY
    end
```

---

## 6. Technology Stack

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18 | Declarative single-page application built with Vite and Tailwind CSS. |
| **Reverse Proxy** | Nginx Alpine | Serves compiled SPA assets and proxies `/api/*` traffic to the backend. |
| **Backend API** | Node.js 20 / Express | RESTful API server handling authentication, incident tracking, and k8s interactions. |
| **Database** | PostgreSQL 15 | Relational datastore with JSONB columns for labels, evidence, and audit logs. |
| **Monitoring** | Prometheus v2.45.0 | Scrapes application `/metrics`, node cAdvisor, and kube-state-metrics. |
| **Alerting** | Alertmanager v0.27.0 | Evaluates firing alerts, groups notifications, and dispatches authenticated webhooks. |
| **Visualization** | Grafana v10.2.0 | Infrastructure dashboard monitoring CPU, memory working sets, and restart spikes. |
| **Kubernetes** | Kubernetes 1.28+ | Container orchestration running on Docker Desktop / Minikube. |
| **CI/CD** | GitHub Actions | Automated build, Jest unit testing, Newman API testing, and Playwright E2E suites. |

---

## 7. Application Visual Walkthrough

### Core Pages & Navigation

| View | Screenshot | Description |
| :--- | :--- | :--- |
| **Executive Dashboard** | ![Dashboard](docs/screenshots/dashboard.png) | Unified operations center displaying system status, MTTR/MTBF metrics, active tasks, and recent incident logs. |
| **Incidents Console** | ![Incidents](docs/screenshots/incidents.png) | Incident management interface with severity filtering, Alertmanager fingerprint tracking, and diagnostic launchers. |
| **AI Root Cause Diagnostics** | ![AI Analysis](docs/screenshots/ai-analysis.png) | In-depth diagnostic view correlating Prometheus signals, cgroup working sets, confidence scores, and corrective steps. |
| **System Diagnostics** | ![System Health](docs/screenshots/system-health.png) | Live cluster and service diagnostics showing environment detection, database pool metrics, and Prometheus connectivity. |
| **Task Management** | ![Tasks](docs/screenshots/tasks.png) | Reliability operations task board with status filtering, priorities, and PostgreSQL persistence. |
| **Settings & Versioning** | ![Settings](docs/screenshots/settings.png) | Runtime configuration panel displaying dynamic Git commit SHA, environment mode, and telemetry settings. |

### End-to-End Remediation Demonstration

| Step | Screenshot | Description |
| :--- | :--- | :--- |
| **Human Approval Modal** | ![Remediation Approval](docs/screenshots/remediation-approval.png) | Mandatory safety gate requiring operator checkbox authorization before any Kubernetes rollout action executes. |
| **Remediation & Recovery Audit** | ![Remediation Success](docs/screenshots/remediation-success.png) | Completed audit log recording execution ID, operator username, rollout duration, and `/ready` probe validation. |
| **Infrastructure Monitoring** | ![Monitoring](docs/screenshots/monitoring.png) | Live Grafana dashboard tracking pod CPU, memory working sets, cgroup throttling, and restart spikes across workloads. |

---

## 8. How HealOps Works

1. **Continuous Telemetry Collection:** Prometheus scrapes `/metrics` from HealOps components, `kube-state-metrics`, and node `cAdvisor`.
2. **Alert Evaluation:** Prometheus alert rules (`k8s/20-prometheus-rules.yaml`) monitor container memory working sets, CPU throttling, restart spikes, and target availability.
3. **Webhook Ingestion:** Alertmanager dispatches firing alert notifications to `POST /api/incidents/webhook` with a Bearer token.
4. **Deduplication:** The backend calculates a 64-bit fingerprint from alert labels, creating a new incident or updating an existing active incident without creating noise.
5. **Root Cause Analysis:** Operators trigger RCA via the UI or API. The engine queries Prometheus for live corroborating evidence and computes a confidence score.
6. **Human Approval Gate:** If remediation is recommended, the UI presents an interactive approval modal detailing the target workload and RBAC ServiceAccount.
7. **Controlled Rollout:** Upon operator authorization, the backend patches the deployment template via `@kubernetes/client-node`.
8. **Automated Recovery Probe:** The engine polls deployment status until desired replicas match available replicas, then probes `GET /ready` to verify database connectivity.
9. **Audit Persistence:** The full remediation event, operator identity, latency, and probe results are permanently recorded in PostgreSQL.

---

## 9. Incident Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Firing: Alertmanager Webhook
    Firing --> Investigating: Operator Views Incident
    Investigating --> RCA_Completed: Trigger Root Cause Diagnostics
    RCA_Completed --> Remediation_Pending: Remediation Recommended
    Remediation_Pending --> Remediation_Executing: Operator Explicit Approval
    Remediation_Executing --> Recovery_Verified: Rollout & /ready Probe Pass
    Remediation_Executing --> Remediation_Failed: Rollout or Probe Timeout
    Recovery_Verified --> Resolved: Alertmanager Resolves or Manual Closure
    Resolved --> [*]
```

---

## 10. Root Cause Analysis (RCA) Explanation

HealOps features a dual-path Root Cause Analysis engine:

1. **Deterministic Rule-Based Engine (Default):**
   - Designed for high-speed, air-gapped, or cost-sensitive environments where external LLM APIs are not configured.
   - Evaluates fault domains using pre-defined SRE heuristics for:
     - `HighContainerMemoryUsage`: Cgroup working set vs limit analysis (OOM-kill prevention).
     - `HighCPUThrottling`: CFS CPU quota exhaustion over 100ms scheduler periods.
     - `BackendUnavailable`: Readiness probe failures, fatal crashes, or cluster partition.
     - `PodRestartSpike`: CrashLoopBackOff detection and container restart velocity.
   - Correlates live Prometheus time-series metrics matching the incident pod and container labels.
   - Dynamically calculates a confidence score (e.g., `medium (65%)` when metric series are unavailable; `high (96%)` when threshold breaches are corroborated).

2. **Generative AI Diagnostics (Optional):**
   - When `GEMINI_API_KEY` or `OPENAI_API_KEY` is set in the environment, the engine formats the incident context, alert annotations, and Prometheus metrics into a structured prompt.
   - Returns JSON-formatted probable causes, technical explanations, and prioritized corrective actions.
   - Automatically falls back to the deterministic rule-based engine if LLM API rate limits or network issues occur.

---

## 11. Controlled Self-Healing & Safeguards

The self-healing remediation engine (`backend/src/services/remediation.service.js`) incorporates strict enterprise safety controls:

- **Mandatory Human-in-the-Loop Approval:** No remediation action is ever executed autonomously in the MVP. Every rollout requires interactive operator approval through the UI modal with an explicit confirmation checkbox.
- **Workload & Action Whitelist:** Only predefined actions (`restart_deployment`), targets (`healops-backend`), and namespaces (`healops`) are permitted. Arbitrary script execution is architecturally disallowed.
- **Concurrency Guard:** Prevents concurrent remediation jobs on the same target deployment.
- **Cooldown Window (180 Seconds):** Enforces a 3-minute cooldown period after every successful restart to allow Kubernetes scheduler and pod caches to stabilize.
- **Recovery Verification Probe:** After triggering a rollout, the engine polls Kubernetes ReplicaSet conditions and executes an HTTP `GET /ready` probe against the new pod before marking the run `succeeded`.

---

## 12. Security & RBAC Safeguards

### Kubernetes RBAC Least-Privilege Model
HealOps backend does not run as cluster administrator. Instead, remediation runs under a dedicated ServiceAccount:

- **ServiceAccount:** `healops-remediation-sa` (`k8s/23-remediation-rbac.yaml`)
- **Role:** `healops-remediation-role` scoped strictly to namespace `healops`.
- **Allowed Verbs:** `get`, `list`, `patch` on resource `deployments`.
- **Prohibited Verbs:** Cannot delete pods, modify secrets, alter RBAC policies, or interact with other namespaces (`kube-system`, `default`).

### Application Security
- **JWT Authentication:** Stateful user session authentication using JSON Web Tokens with bcrypt-hashed passwords.
- **Webhook Authentication:** Alertmanager webhooks must supply a pre-shared Bearer token matching `ALERTMANAGER_WEBHOOK_TOKEN`.
- **Environment Isolation:** Secrets are never hardcoded. Local runs use `.env` (git-ignored), while Kubernetes deployments mount Opaque `Secret` objects.

---

## 13. PostgreSQL Audit History

HealOps tracks all operational changes across four dedicated tables in PostgreSQL:

| Table | Purpose |
| :--- | :--- |
| `incidents` | Core incident records, alert status, severity, fingerprint, labels, and timestamps. |
| `incident_events` | Granular event log (firing, analysis generated, remediation triggered, completed, resolved). |
| `incident_analyses` | Persistent RCA records including probable causes, evidence JSONB, and recommendations. |
| `incident_remediations` | Full remediation audit log including operator identity, execution duration, and probe results. |

---

## 14. Project Directory Structure

```
HealOps/
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated CI pipeline (Jest, Newman, Playwright)
├── backend/
│   ├── Dockerfile               # Backend production container definition
│   ├── src/
│   │   ├── app.js               # Express application initialization
│   │   ├── server.js            # HTTP server startup & graceful shutdown
│   │   ├── controllers/         # Request controllers (auth, incidents, tasks, sys, remediation)
│   │   ├── db/                  # PostgreSQL connection pool & schema migrations
│   │   ├── middleware/          # JWT auth, Prometheus metrics scrape middleware, logging
│   │   ├── routes/              # Express API route endpoints
│   │   └── services/            # RCA engine, k8s client, remediation service
│   ├── tests/
│   │   └── api.test.js          # Jest unit and API integration tests
│   └── package.json             # Backend dependencies and scripts
├── docs/
│   └── screenshots/             # Application screenshots for documentation
├── k8s/                         # Kubernetes deployment manifests
│   ├── 00-namespace.yaml
│   ├── 01-postgres-secret.yaml.example
│   ├── 02-postgres-pvc.yaml
│   ├── 03-postgres-deployment.yaml
│   ├── 04-postgres-service.yaml
│   ├── 05-backend-configmap.yaml
│   ├── 06-backend-secret.yaml.example
│   ├── 07-backend-deployment.yaml
│   ├── 08-backend-service.yaml
│   ├── 09-frontend-configmap.yaml
│   ├── 10-frontend-deployment.yaml
│   ├── 11-frontend-service.yaml
│   ├── 12-prometheus-configmap.yaml
│   ├── 13-prometheus-pvc.yaml
│   ├── 14-prometheus-deployment.yaml
│   ├── 15-grafana-secret.yaml.example
│   ├── 16-grafana-configmap.yaml
│   ├── 17-grafana-deployment.yaml
│   ├── 18-prometheus-rbac.yaml
│   ├── 19-kube-state-metrics.yaml
│   ├── 20-prometheus-rules.yaml
│   ├── 21-alertmanager-secret.yaml.example
│   ├── 22-alertmanager.yaml
│   └── 23-remediation-rbac.yaml
├── nginx/
│   └── nginx.conf               # Frontend Nginx reverse proxy configuration
├── src/                         # React frontend source code
│   ├── components/              # Layout, Header, Sidebar, StatCards, ErrorBoundary
│   ├── context/                 # AuthContext (JWT session management)
│   ├── pages/                   # Dashboard, Tasks, TestResults, Incidents, AIAnalysis, SystemHealth, Settings
│   ├── services/                # Axios API client integrations
│   ├── App.jsx                  # React application router
│   └── main.jsx                 # React root mount
├── tests/                       # Root-level integration and E2E tests
│   ├── e2e/                     # Playwright browser end-to-end test specs
│   └── postman/                 # Newman Postman API collections
├── docker-compose.yml           # Local multi-container Docker Compose definition
├── frontend.Dockerfile          # Multi-stage production frontend Dockerfile
├── package.json                 # Frontend dependencies and scripts
├── vite.config.js               # Vite build configuration
└── README.md                    # Project documentation
```

---

## 15. Local Docker Compose Setup

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24+) & [Docker Compose](https://docs.docker.com/compose/) (v2.20+)
- [Node.js](https://nodejs.org/) (v20+) *(optional for local development)*

### Quick Start
1. **Clone the repository:**
   ```bash
   git clone https://github.com/vijjuchoudhary157/HealOps.git
   cd HealOps
   ```

2. **Configure environment:**
   ```bash
   cp backend/.env.example backend/.env
   ```

3. **Start services:**
   ```bash
   docker compose up --build -d
   ```

4. **Verify container status:**
   ```bash
   docker compose ps
   ```

5. **Access the application:**
   - **Frontend Console:** [http://localhost:8080](http://localhost:8080)
   - **Backend API:** [http://localhost:5000/health](http://localhost:5000/health)

---

## 16. Kubernetes Deployment Instructions

### Prerequisites
- Running Kubernetes cluster (Docker Desktop Kubernetes, Minikube, or Kind).
- `kubectl` configured with cluster access.

### Step-by-Step Cluster Rollout

1. **Create Namespace & Secrets:**
   ```bash
   kubectl apply -f k8s/00-namespace.yaml

   # Create Secrets from example templates
   kubectl create secret generic postgres-secret -n healops \
     --from-literal=POSTGRES_USER=healops \
     --from-literal=POSTGRES_PASSWORD=healops_pass \
     --from-literal=POSTGRES_DB=healops

   kubectl create secret generic backend-secret -n healops \
     --from-literal=JWT_SECRET=super_secret_jwt_key \
     --from-literal=DATABASE_URL=postgres://healops:healops_pass@healops-postgres:5432/healops

   kubectl create secret generic alertmanager-secret -n healops \
     --from-literal=webhook-token=HealOps_Alertmanager_Token_Secured_2026_x87b

   kubectl create secret generic grafana-secret -n healops \
     --from-literal=admin-user=healops_admin \
     --from-literal=admin-password=healops_grafana_pass
   ```

2. **Deploy Storage & Database:**
   ```bash
   kubectl apply -f k8s/02-postgres-pvc.yaml
   kubectl apply -f k8s/03-postgres-deployment.yaml
   kubectl apply -f k8s/04-postgres-service.yaml
   ```

3. **Deploy Observability Stack:**
   ```bash
   kubectl apply -f k8s/18-prometheus-rbac.yaml
   kubectl apply -f k8s/12-prometheus-configmap.yaml
   kubectl apply -f k8s/13-prometheus-pvc.yaml
   kubectl apply -f k8s/14-prometheus-deployment.yaml
   kubectl apply -f k8s/20-prometheus-rules.yaml
   kubectl apply -f k8s/19-kube-state-metrics.yaml
   kubectl apply -f k8s/22-alertmanager.yaml
   kubectl apply -f k8s/16-grafana-configmap.yaml
   kubectl apply -f k8s/17-grafana-deployment.yaml
   ```

4. **Deploy Application Workloads & RBAC:**
   ```bash
   kubectl apply -f k8s/23-remediation-rbac.yaml
   kubectl apply -f k8s/05-backend-configmap.yaml
   kubectl apply -f k8s/07-backend-deployment.yaml
   kubectl apply -f k8s/08-backend-service.yaml
   kubectl apply -f k8s/09-frontend-configmap.yaml
   kubectl apply -f k8s/10-frontend-deployment.yaml
   kubectl apply -f k8s/11-frontend-service.yaml
   ```

5. **Verify All Pods Running:**
   ```bash
   kubectl get pods -n healops -o wide
   ```

---

## 17. Access & Port-Forwarding Guide

To access cluster services locally:

| Service | Port-Forward Command | Local URL | Default Credentials |
| :--- | :--- | :--- | :--- |
| **HealOps Frontend** | `kubectl port-forward svc/healops-frontend 8090:80 -n healops` | [http://localhost:8090](http://localhost:8090) | Create workspace on first login |
| **HealOps Backend** | `kubectl port-forward svc/healops-backend 5000:5000 -n healops` | [http://localhost:5000](http://localhost:5000) | Bearer Token / JWT |
| **Grafana** | `kubectl port-forward svc/healops-grafana 3000:3000 -n healops` | [http://localhost:3000](http://localhost:3000) | `healops_admin` / *(secret)* |
| **Prometheus** | `kubectl port-forward svc/healops-prometheus 9090:9090 -n healops` | [http://localhost:9090](http://localhost:9090) | No auth |
| **Alertmanager** | `kubectl port-forward svc/healops-alertmanager 9093:9093 -n healops` | [http://localhost:9093](http://localhost:9093) | No auth |

---

## 18. Environment Variables & Configuration

### Backend (`backend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgres://healops:healops_pass@postgres:5432/healops` |
| `JWT_SECRET` | Secret key for signing operator JWTs | *Required in production* |
| `ALERTMANAGER_WEBHOOK_TOKEN` | Bearer token for Alertmanager webhook authentication | *Required in production* |
| `PROMETHEUS_URL` | Internal URL for querying Prometheus API | `http://healops-prometheus.healops.svc.cluster.local:9090` |
| `GEMINI_API_KEY` | *(Optional)* Google Gemini API key for GenAI RCA | `null` (uses heuristic fallback) |
| `OPENAI_API_KEY` | *(Optional)* OpenAI API key for GenAI RCA | `null` (uses heuristic fallback) |

---

## 19. API Overview

All API endpoints except `/health`, `/ready`, `/metrics`, and `/api/incidents/webhook` require a valid JWT `Authorization: Bearer <token>` header.

### System Diagnostics
- `GET /health`: Liveness probe returning backend status and timestamp.
- `GET /ready`: Readiness probe verifying PostgreSQL pool connectivity.
- `GET /metrics`: Prometheus metric scrape endpoint.
- `GET /api/system/status`: Environment detection, database latency, and Prometheus reachability.

### Incident Management
- `POST /api/incidents/webhook`: Alertmanager webhook receiver (requires Bearer token).
- `GET /api/incidents`: List incidents with status, severity, and pagination filters.
- `GET /api/incidents/:id`: Retrieve single incident details and label metadata.
- `PATCH /api/incidents/:id`: Acknowledge or manually resolve an incident.
- `GET /api/incidents/stats`: Summary counts of active, firing, acknowledged, and resolved incidents.

### Root Cause Diagnostics
- `POST /api/incidents/:id/analyze`: Trigger root cause analysis and metric evidence collection.
- `GET /api/incidents/:id/analysis`: Retrieve the most recent RCA report for an incident.

### Controlled Remediation
- `POST /api/incidents/:id/remediate`: Trigger authorized remediation (requires `{ approved: true }`).
- `GET /api/incidents/:id/remediations`: Retrieve remediation history and probe audit logs for an incident.
- `GET /api/remediations`: List all historical remediations across the cluster.

---

## 20. Automated Testing

The HealOps test suite validates backend integrity, API contracts, and browser workflows:

```bash
# 1. Backend Unit & Integration Tests (Jest)
cd backend
npm test

# 2. API Contract Tests (Newman / Postman)
npm run test:api

# 3. End-to-End Browser Tests (Playwright)
npm run test:e2e
```

---

## 21. Live Demonstration Workflow

To execute an end-to-end incident, RCA, and remediation demonstration in a local Kubernetes cluster:

1. **Inject Controlled Synthetic Alert:**
   ```bash
   kubectl exec -i -n healops deployment/healops-backend -- curl -s -X POST "http://healops-alertmanager:9093/api/v2/alerts" \
     -H "Content-Type: application/json" \
     -d '[{
       "labels": {
         "alertname": "HighContainerMemoryUsage",
         "severity": "critical",
         "namespace": "healops",
         "pod": "healops-backend-live-demo-2",
         "container": "backend",
         "component": "backend"
       },
       "annotations": {
         "summary": "Demonstration: High container memory usage",
         "description": "Controlled synthetic alert for HealOps remediation demonstration."
       },
       "startsAt": "'"$(date -u +%FT%TZ)"'",
       "endsAt": "'"$(date -u -d '+24 hours' +%FT%TZ)"'"
     }]'
   ```

2. **Observe Firing Incident in UI:** Open [http://localhost:8090/incidents](http://localhost:8090/incidents) to observe the incoming firing incident.
3. **Generate Root Cause Diagnostics:** Open the AI Analysis tab and click **"Run Incident Root Cause Diagnostics"**.
4. **Approve Remediation:** Click **"Approve & Execute Remediation"**, check the authorization box, and confirm.
5. **Verify Zero-Downtime Rollout:** Observe the rolling restart in Kubernetes:
   ```bash
   kubectl get pods -l app=healops-backend -n healops -w
   ```
6. **Inspect Audit History:** Observe the recovery audit record confirming `SUCCEEDED` with `/ready` probe latency.

---

## 22. Known Limitations & Honest Disclosures

- **Self-Monitoring Scope (MVP):** HealOps is currently configured to monitor its own application components and cluster infrastructure. It is not an arbitrary agent runner for multi-tenant customer clusters.
- **Rule-Based Fallback:** When external LLM API keys are unconfigured, RCA is generated by a deterministic heuristic engine. It does not pretend to use an LLM when one is not active.
- **Synthetic Alerting for Demonstrations:** Because production hardware failures and memory leaks cannot be reliably induced safely during live demonstrations, synthetic Alertmanager API payloads are utilized for controlled walkthroughs.
- **No Terraform in Repository:** Infrastructure is provisioned via native Kubernetes YAML manifests and Docker Compose; no Terraform HCL code is included.
- **Academic & Prototype Status:** HealOps is an advanced engineering prototype and academic demonstration; it is not yet certified for mission-critical enterprise production environments without secondary human oversight.

---

## 23. Future Roadmap

- [ ] **Multi-Workload Policy Engine:** Support arbitrary deployment targets via Kubernetes Custom Resource Definitions (CRDs).
- [ ] **Automated Rollback Safeguards:** Revert rolling restarts automatically if new pods fail health checks within 60 seconds.
- [ ] **ChatOps & Slack/Discord Integration:** Operator approvals via interactive Slack message action buttons.
- [ ] **eBPF Kernel Probing:** Kernel-level observability via Cilium or Pixie for network latency and socket drop detection.
- [ ] **Horizontal Pod Autoscaler (HPA) Tuning:** Autonomous adjustment of HPA scaling thresholds based on seasonal traffic patterns.

---

## 24. Author & Contributors

- **Vijendra Choudhary** ([@vijjuchoudhary157](https://github.com/vijjuchoudhary157)) — Lead Developer & Site Reliability Architect
- **Project Repository:** [https://github.com/vijjuchoudhary157/HealOps.git](https://github.com/vijjuchoudhary157/HealOps.git)

---

## 25. License & Terms

This project is open-source software developed for demonstration, educational, and Site Reliability Engineering research purposes.
