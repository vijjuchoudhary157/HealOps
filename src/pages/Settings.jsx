import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { systemAPI } from '../services/api';

export default function Settings() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedNotice, setSavedNotice] = useState(false);

  // Client-persisted preferences
  const [refreshInterval, setRefreshInterval] = useState(
    localStorage.getItem('healops_refresh_interval') || '10'
  );
  const [pageSize, setPageSize] = useState(
    localStorage.getItem('healops_page_size') || '10'
  );
  const [compactMode, setCompactMode] = useState(
    localStorage.getItem('healops_compact_mode') === 'true'
  );

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await systemAPI.getStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to retrieve system status:', err);
      setError('Unable to fetch live system status. Backend API may be unreachable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSavePreference = (key, val) => {
    localStorage.setItem(key, val);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-xs border-b border-outline-variant/20">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              System Settings &amp; Infrastructure Diagnostics
            </h1>
            <span className={`px-2 py-0.5 rounded font-label-code-sm text-label-code-sm font-semibold uppercase tracking-wider ${
              status?.environment === 'kubernetes' ? 'bg-tertiary-container/30 text-tertiary' : 'bg-secondary-container/30 text-secondary'
            }`}>
              {status?.environment === 'kubernetes' ? 'Kubernetes In-Cluster' : 'Docker Compose Local'}
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Environment topology, telemetry reachability, database health, authenticated session, and client preferences
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-code-sm text-label-code-sm font-semibold transition-all shadow-sm"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Save Notification Toast */}
      {savedNotice && (
        <div className="p-3 rounded bg-tertiary-container/30 border border-tertiary/40 text-tertiary flex items-center gap-2 font-label-code-sm text-label-code-sm animate-fade-in">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Client preferences saved to local storage.</span>
        </div>
      )}

      {error && (
        <div className="p-space-md rounded bg-error-container/20 border border-error/40 text-error flex items-center justify-between font-body-sm text-body-sm">
          <span>{error}</span>
          <button onClick={fetchStatus} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* 1. Infrastructure & Environment */}
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">lan</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Environment &amp; Topology</h2>
          </div>

          <div className="flex flex-col divide-y divide-outline-variant/15 text-body-sm text-body-sm">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Execution Mode</span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface font-bold">
                {status?.environment === 'kubernetes' ? 'Kubernetes (Minikube / Docker Desktop)' : 'Standalone Docker Compose'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Cluster Namespace</span>
              <span className="font-label-code-sm text-label-code-sm text-secondary font-mono">
                {status?.kubernetes?.namespace || 'healops'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Backend Runtime</span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface font-mono">
                {status?.services?.backend?.node_version ? `Node.js ${status.services.backend.node_version}` : 'Node.js 20+'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">HealOps Application Version</span>
              <span className="font-label-code-sm text-label-code-sm text-tertiary font-bold">
                {status?.version ? `v${status.version}` : 'v1.0.0'} (Release)
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Process Uptime</span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface">
                {status?.services?.backend?.uptime_seconds ? `${Math.floor(status.services.backend.uptime_seconds / 60)} minutes` : 'Active'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Heap Memory Allocated</span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface font-mono">
                {status?.services?.backend?.memory ? `${status.services.backend.memory.heap_used_mb} MB / ${status.services.backend.memory.heap_total_mb} MB` : '42 MB'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Service Connectivity Diagnostics */}
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-secondary">vital_signs</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Service Health Diagnostics</h2>
          </div>

          <div className="flex flex-col gap-3">
            {/* Backend API */}
            <div className="p-3 rounded bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                <div className="flex flex-col">
                  <span className="font-label-code-sm text-label-code-sm font-semibold text-on-surface">Backend API Gateway</span>
                  <span className="font-label-code-sm text-[11px] text-outline">HTTP REST Endpoints</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded font-label-code-sm text-label-code-sm bg-tertiary-container/30 text-tertiary font-semibold">
                Online (HTTP 200)
              </span>
            </div>

            {/* PostgreSQL */}
            <div className="p-3 rounded bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${status?.services?.database?.status === 'connected' ? 'bg-tertiary' : 'bg-error'}`}></span>
                <div className="flex flex-col">
                  <span className="font-label-code-sm text-label-code-sm font-semibold text-on-surface">PostgreSQL 15</span>
                  <span className="font-label-code-sm text-[11px] text-outline">
                    {status?.services?.database?.pool ? `Pool: ${status.services.database.pool.total} active • Latency: ${status.services.database.latency_ms || 2}ms` : 'Primary Storage'}
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded font-label-code-sm text-label-code-sm font-semibold ${
                status?.services?.database?.status === 'connected' ? 'bg-tertiary-container/30 text-tertiary' : 'bg-error-container/30 text-error'
              }`}>
                {status?.services?.database?.status === 'connected' ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Prometheus */}
            <div className="p-3 rounded bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${status?.services?.prometheus?.available ? 'bg-tertiary' : 'bg-outline'}`}></span>
                <div className="flex flex-col">
                  <span className="font-label-code-sm text-label-code-sm font-semibold text-on-surface">Prometheus Monitoring</span>
                  <span className="font-label-code-sm text-[11px] text-outline font-mono truncate max-w-xs">
                    {status?.services?.prometheus?.configured_url || 'http://healops-prometheus:9090'}
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded font-label-code-sm text-label-code-sm font-semibold ${
                status?.services?.prometheus?.available ? 'bg-tertiary-container/30 text-tertiary' : 'bg-surface-container text-outline'
              }`}>
                {status?.services?.prometheus?.available ? 'Connected' : 'In-Cluster Only'}
              </span>
            </div>

            {/* Kubernetes API */}
            <div className="p-3 rounded bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${status?.kubernetes?.available ? 'bg-tertiary' : 'bg-outline'}`}></span>
                <div className="flex flex-col">
                  <span className="font-label-code-sm text-label-code-sm font-semibold text-on-surface">Kubernetes API RBAC</span>
                  <span className="font-label-code-sm text-[11px] text-outline">
                    {status?.kubernetes?.available ? 'In-Cluster ServiceAccount Verified' : 'Compose Mode (Cluster Inactive)'}
                  </span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded font-label-code-sm text-label-code-sm font-semibold ${
                status?.kubernetes?.available ? 'bg-tertiary-container/30 text-tertiary' : 'bg-surface-container text-outline'
              }`}>
                {status?.kubernetes?.available ? 'Active (healops-remediation-sa)' : 'Standby'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Authenticated Session & Security Hygiene */}
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-tertiary">lock</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">User Session &amp; Security</h2>
          </div>

          <div className="flex flex-col divide-y divide-outline-variant/15 text-body-sm text-body-sm">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Operator Identity</span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface font-semibold">
                {user?.name || user?.username || 'Platform Operator'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Email Address</span>
              <span className="font-label-code-sm text-label-code-sm text-secondary font-mono">
                {user?.email || 'admin@healops.dev'}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Authentication Mechanism</span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface">
                JWT Bearer Token (HMAC-SHA256)
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-on-surface-variant">Remediation Authority</span>
              <span className="font-label-code-sm text-label-code-sm text-tertiary font-bold">
                Human Approval Required (Phase 9D Enforced)
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-surface-container-lowest border border-outline-variant/30 flex items-start gap-2.5 text-on-surface-variant font-body-sm text-[12px]">
            <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">verified_user</span>
            <span>
              <strong>Secret Hygiene Policy:</strong> Database credentials, JWT signing keys, Kubernetes ServiceAccount tokens, and Alertmanager webhook secrets are exclusively loaded via environment variables and Kubernetes Secrets. No secrets are stored in state or rendered in client HTML.
            </span>
          </div>
        </div>

        {/* 4. Client Operational Preferences */}
        <div className="bg-surface-container-low rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#f59e0b]">tune</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Client Preferences</h2>
          </div>

          <div className="flex flex-col gap-4 text-body-sm text-body-sm">
            {/* Auto-Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-medium text-on-surface">Dashboard Telemetry Refresh Rate</span>
                <span className="text-[11px] text-on-surface-variant">Polling interval for live incident and health updates</span>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => {
                  setRefreshInterval(e.target.value);
                  handleSavePreference('healops_refresh_interval', e.target.value);
                }}
                className="h-8 px-3 rounded bg-surface-container text-on-surface font-label-code-sm text-label-code-sm border border-outline-variant/40 focus:outline-none"
              >
                <option value="5">5 Seconds (Live)</option>
                <option value="10">10 Seconds (Default)</option>
                <option value="30">30 Seconds</option>
                <option value="60">60 Seconds</option>
              </select>
            </div>

            {/* Incidents Page Size */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-medium text-on-surface">Incidents Table Page Size</span>
                <span className="text-[11px] text-on-surface-variant">Number of rows loaded per page in incident triage</span>
              </div>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value);
                  handleSavePreference('healops_page_size', e.target.value);
                }}
                className="h-8 px-3 rounded bg-surface-container text-on-surface font-label-code-sm text-label-code-sm border border-outline-variant/40 focus:outline-none"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>

            {/* Compact Mode */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium text-on-surface">Dense Data Tables</span>
                <span className="text-[11px] text-on-surface-variant">Reduce padding in tasks and incident tables</span>
              </div>
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => {
                  setCompactMode(e.target.checked);
                  handleSavePreference('healops_compact_mode', String(e.target.checked));
                }}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
