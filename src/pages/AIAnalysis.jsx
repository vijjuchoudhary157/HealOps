import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { incidentsAPI, analysisAPI, remediationAPI } from '../services/api';

export default function AIAnalysis() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  // Remediation states (Phase 9D)
  const [remediations, setRemediations] = useState([]);
  const [loadingRemediations, setLoadingRemediations] = useState(false);
  const [remediating, setRemediating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [authorizedChecked, setAuthorizedChecked] = useState(false);
  const [remediationMsg, setRemediationMsg] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // 1. Fetch available incidents
  const fetchIncidentsList = useCallback(async () => {
    try {
      setLoadingIncidents(true);
      const data = await incidentsAPI.getAll({ limit: 50 });
      const list = data.incidents || [];
      setIncidents(list);

      // Determine initial incident to select
      const paramId = searchParams.get('incidentId');
      if (paramId) {
        setSelectedIncidentId(parseInt(paramId, 10));
      } else if (list.length > 0) {
        setSelectedIncidentId(list[0].id);
        setSearchParams({ incidentId: list[0].id.toString() }, { replace: true });
      }
    } catch (err) {
      console.error('Failed to load incidents for analysis:', err);
      setError('Failed to load incidents list. Please check backend connection.');
    } finally {
      setLoadingIncidents(false);
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    fetchIncidentsList();
  }, [fetchIncidentsList]);

  // 2. Fetch analysis for currently selected incident
  const fetchAnalysisForIncident = useCallback(async (id) => {
    if (!id) return;
    try {
      setLoadingAnalysis(true);
      setError('');
      const data = await analysisAPI.getIncidentAnalysis(id);
      setSelectedIncident(data.incident);
      setAnalysis(data.analysis || null);
    } catch (err) {
      console.error(`Failed to load analysis for incident #${id}:`, err);
      setError(err.message || 'Failed to retrieve analysis');
      setAnalysis(null);
    } finally {
      setLoadingAnalysis(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      fetchAnalysisForIncident(selectedIncidentId);
    }
  }, [selectedIncidentId, fetchAnalysisForIncident]);

  // 3. Fetch remediations for currently selected incident
  const fetchRemediationsForIncident = useCallback(async (id) => {
    if (!id) return;
    try {
      setLoadingRemediations(true);
      const data = await remediationAPI.getIncidentRemediations(id);
      const list = data.remediations || [];
      setRemediations(list);

      // Check cooldown from latest remediation (180 seconds)
      if (list.length > 0) {
        const latest = list[0];
        const lastTime = new Date(latest.completed_at || latest.created_at).getTime();
        const diff = Math.floor((lastTime + 180000 - Date.now()) / 1000);
        setCooldownSeconds(diff > 0 ? diff : 0);
      } else {
        setCooldownSeconds(0);
      }
    } catch (err) {
      console.error(`Failed to load remediations for incident #${id}:`, err);
    } finally {
      setLoadingRemediations(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIncidentId) {
      fetchRemediationsForIncident(selectedIncidentId);
    }
  }, [selectedIncidentId, fetchRemediationsForIncident]);

  // Cooldown countdown ticker
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // 4. Trigger / Regenerate Root Cause Analysis
  const handleRunAnalysis = async () => {
    if (!selectedIncidentId) return;
    try {
      setAnalyzing(true);
      setError('');
      const data = await analysisAPI.analyzeIncident(selectedIncidentId);
      setAnalysis(data.analysis);
      if (data.incident) {
        setSelectedIncident(prev => ({ ...prev, ...data.incident }));
      }
    } catch (err) {
      console.error('Analysis generation failed:', err);
      setError(err.message || 'Failed to generate root cause analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  // 5. Initiate and Execute Remediation (Phase 9D)
  const handleInitiateRemediation = () => {
    setRemediationMsg(null);
    setAuthorizedChecked(false);
    setShowConfirmModal(true);
  };

  const handleExecuteRemediation = async () => {
    if (!selectedIncidentId || !authorizedChecked) return;
    try {
      setRemediating(true);
      setShowConfirmModal(false);
      setRemediationMsg(null);
      const res = await remediationAPI.remediate(selectedIncidentId, {
        approved: true,
        action: 'restart_deployment',
        target_name: 'healops-backend',
        target_namespace: 'healops',
      });
      const st = res.remediation?.status;
      const isSucceeded = st === 'succeeded';
      setRemediationMsg({
        type: isSucceeded ? 'success' : 'warning',
        text: res.message || `Remediation completed with status: ${st}`,
        remediation: res.remediation,
      });
      await fetchRemediationsForIncident(selectedIncidentId);
      await fetchAnalysisForIncident(selectedIncidentId);
    } catch (err) {
      console.error('Remediation execution failed:', err);
      setRemediationMsg({
        type: 'error',
        text: err.message || 'Remediation failed to execute',
      });
      await fetchRemediationsForIncident(selectedIncidentId);
    } finally {
      setRemediating(false);
    }
  };

  const handleSelectIncident = (idStr) => {
    const id = parseInt(idStr, 10);
    setSelectedIncidentId(id);
    setSearchParams({ incidentId: id.toString() });
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return isoStr;
    }
  };

  // Helper to extract confidence percentage number for circle gauge
  const parseConfidenceScore = (confStr) => {
    if (!confStr) return 85;
    const match = confStr.match(/(\d+)%/);
    if (match) return parseInt(match[1], 10);
    if (confStr.toLowerCase().includes('high')) return 92;
    if (confStr.toLowerCase().includes('medium')) return 75;
    if (confStr.toLowerCase().includes('low')) return 50;
    return 80;
  };

  const isAI = analysis?.analysis_type === 'ai';
  const confidenceScore = parseConfidenceScore(analysis?.confidence);

  return (
    <div className="flex flex-col w-full">
      {/* Top Meta Navigation & Executive Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md mb-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-xs font-label-code-sm text-label-code-sm text-outline">
            <span
              className="hover:text-primary transition-colors cursor-pointer"
              onClick={() => navigate('/incidents')}
            >
              Incidents
            </span>
            <span>/</span>
            <span className="text-on-surface-variant font-medium">
              {selectedIncident ? `#INC-${selectedIncident.id} (${selectedIncident.alertname})` : 'Select Incident'}
            </span>
            <span>/</span>
            <span className="text-secondary font-semibold">Root Cause Diagnostics</span>
          </div>

          <div className="flex flex-wrap items-center gap-space-sm pt-1">
            <h1 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
              Incident Diagnostics {selectedIncident ? `#INC-${selectedIncident.id}` : ''}
            </h1>

            {/* Incident Status Pill */}
            {selectedIncident && (
              <div className={`flex items-center gap-space-xs px-2.5 py-1 rounded font-label-code-sm text-label-code-sm font-semibold tracking-wide uppercase ${
                selectedIncident.status === 'firing'
                  ? 'bg-error-container/40 text-error border border-error/30'
                  : selectedIncident.status === 'acknowledged'
                  ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30'
                  : 'bg-tertiary-container/30 text-tertiary border border-tertiary/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  selectedIncident.status === 'firing' ? 'bg-error animate-ping' :
                  selectedIncident.status === 'acknowledged' ? 'bg-[#f59e0b]' : 'bg-tertiary'
                }`}></span>
                <span>{selectedIncident.status}</span>
              </div>
            )}

            {/* Severity Pill */}
            {selectedIncident && (
              <div className={`flex items-center gap-space-xs px-2.5 py-1 rounded font-label-code-sm text-label-code-sm font-semibold uppercase ${
                selectedIncident.severity === 'critical'
                  ? 'bg-error text-black font-bold'
                  : 'bg-[#f59e0b]/20 text-[#f59e0b]'
              }`}>
                <span>{selectedIncident.severity}</span>
              </div>
            )}

            {/* Analysis Type Pill */}
            {analysis && (
              <div className={`flex items-center gap-space-xs px-2.5 py-1 rounded border font-label-code-sm text-label-code-sm font-medium ${
                isAI
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-secondary/10 text-secondary border-secondary/30'
              }`}>
                <span className="material-symbols-outlined text-[15px]">
                  {isAI ? 'smart_toy' : 'rule'}
                </span>
                <span>
                  {isAI ? `AI-Generated (${analysis.provider} • ${analysis.model || 'LLM'})` : `Rule-Based Diagnostic (${analysis.provider})`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Executive Action Controls & Incident Selector */}
        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Incident Selector Dropdown */}
          <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded border border-outline-variant/30">
            <span className="font-label-code-sm text-label-code-sm text-outline">Target:</span>
            <select
              value={selectedIncidentId || ''}
              onChange={(e) => handleSelectIncident(e.target.value)}
              disabled={loadingIncidents || analyzing}
              className="bg-transparent text-on-surface font-label-code-md text-label-code-md outline-none cursor-pointer"
            >
              {incidents.length === 0 && <option value="">No Incidents Found</option>}
              {!incidents.some(i => i.id === selectedIncidentId) && selectedIncidentId && (
                <option value={selectedIncidentId}>Unknown Incident #{selectedIncidentId}</option>
              )}
              {incidents.map(inc => (
                <option key={inc.id} value={inc.id} className="bg-surface-container-high text-on-surface">
                  #INC-{inc.id} - {inc.alertname} ({inc.status})
                </option>
              ))}
            </select>
          </div>

          {/* Trigger / Regenerate Button */}
          <button
            onClick={handleRunAnalysis}
            disabled={!selectedIncidentId || analyzing || loadingAnalysis}
            className="flex items-center gap-space-xs px-4 py-2 bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-code-md text-label-code-md font-semibold rounded shadow-[0_0_14px_rgba(192,193,255,0.25)] transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${analyzing ? 'animate-spin' : ''}`}>
              {analyzing ? 'refresh' : analysis ? 'sync' : 'psychology'}
            </span>
            <span>{analyzing ? 'Analyzing Incident...' : analysis ? 'Regenerate Analysis' : 'Run Diagnostics'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-space-md p-space-md bg-error-container/30 border border-error/40 rounded flex items-center justify-between text-error">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <span className="font-body-md text-body-md">{error}</span>
          </div>
          <button
            onClick={() => setError('')}
            className="text-error hover:text-on-error-container font-label-code-sm text-label-code-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {(loadingAnalysis || analyzing) && (
        <div className="p-space-xl bg-surface-container rounded flex flex-col items-center justify-center gap-space-md min-h-[300px]">
          <span className="material-symbols-outlined text-[42px] text-primary animate-spin">
            progress_activity
          </span>
          <p className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            {analyzing ? 'Collecting Prometheus Evidence & Generating Diagnostic Inference...' : 'Loading Root Cause Analysis...'}
          </p>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Querying container metrics, HTTP error rates, CPU throttling, and incident timeline...
          </span>
        </div>
      )}

      {/* Empty State: Incident has no analysis yet */}
      {!loadingAnalysis && !analyzing && !analysis && (
        <div className="p-space-xl bg-surface-container rounded flex flex-col items-center justify-center text-center gap-space-md min-h-[360px] border border-dashed border-outline-variant/40">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[32px]">biotech</span>
          </div>
          <div className="flex flex-col gap-1 max-w-lg">
            <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
              No Analysis Generated Yet
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Incident {selectedIncident ? `#INC-${selectedIncident.id} (${selectedIncident.alertname})` : ''} has not been analyzed yet.
              Click the button below to collect real-time telemetry from Prometheus and generate root cause diagnostics.
            </p>
          </div>
          <button
            onClick={handleRunAnalysis}
            disabled={!selectedIncidentId}
            className="flex items-center gap-space-xs px-5 py-2.5 bg-primary hover:bg-primary-fixed-dim text-on-primary font-label-code-md text-label-code-md font-semibold rounded shadow-md transition-all mt-2"
          >
            <span className="material-symbols-outlined text-[20px]">psychology</span>
            <span>Run Incident Root Cause Diagnostics</span>
          </button>
        </div>
      )}

      {/* Analysis Content Workbench */}
      {!loadingAnalysis && !analyzing && analysis && (
        <div className="flex flex-col gap-space-lg">
          {/* Telemetry Overview Strip */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md">
            {/* Primary RCA Vector */}
            <div className="md:col-span-6 xl:col-span-5 bg-surface-container p-space-md rounded flex flex-col justify-between shadow-md relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-code-sm text-label-code-sm uppercase tracking-wider text-secondary font-semibold">
                    Primary RCA Vector
                  </span>
                  <span className="font-label-code-sm text-label-code-sm text-outline-variant">
                    {isAI ? 'AI Neural Inference' : 'Deterministic Heuristic'}
                  </span>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface font-bold leading-snug">
                  {analysis.probable_root_cause}
                </p>
              </div>

              <div className="pt-space-sm mt-space-sm flex flex-wrap items-center gap-x-space-md gap-y-1 font-label-code-sm text-label-code-sm text-on-surface-variant border-t border-outline-variant/15">
                <div>
                  <span className="text-outline">Alert:</span>{' '}
                  <span className="text-on-surface font-semibold">{selectedIncident?.alertname || '—'}</span>
                </div>
                <div>
                  <span className="text-outline">Target Pod:</span>{' '}
                  <span className="text-secondary font-mono">{selectedIncident?.labels?.pod || selectedIncident?.labels?.instance || 'healops'}</span>
                </div>
                <div>
                  <span className="text-outline">Namespace:</span>{' '}
                  <span className="text-on-surface">{selectedIncident?.labels?.namespace || 'healops'}</span>
                </div>
              </div>
            </div>

            {/* Confidence Gauge */}
            <div className="md:col-span-3 xl:col-span-3 bg-surface-container p-space-md rounded flex items-center justify-between shadow-md relative">
              <div className="flex flex-col justify-center">
                <span className="font-label-code-sm text-label-code-sm uppercase tracking-wider text-outline font-semibold">
                  Diagnostic Confidence
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="font-label-code-lg text-headline-xl text-primary font-bold tracking-tight">
                    {analysis.confidence}
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {analysis.evidence?.corroborating_metrics?.length || 0} Telemetry Corroborations
                </span>
              </div>

              <div className="relative flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-surface-container-high"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  ></path>
                  <path
                    className="text-secondary drop-shadow-[0_0_6px_rgba(76,215,246,0.5)]"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={`${confidenceScore}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  ></path>
                </svg>
                <span className="absolute font-label-code-sm text-label-code-sm text-secondary font-bold">
                  {confidenceScore}%
                </span>
              </div>
            </div>

            {/* Analysis Metadata */}
            <div className="md:col-span-3 xl:col-span-4 bg-surface-container p-space-md rounded flex flex-col justify-between shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-label-code-sm text-label-code-sm uppercase tracking-wider text-outline font-semibold">
                  Analysis Metadata
                </span>
                <span className="flex items-center gap-1 font-label-code-sm text-label-code-sm text-tertiary">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                  Stored in PostgreSQL
                </span>
              </div>

              <div className="grid grid-cols-2 gap-space-sm pt-space-xs font-label-code-sm text-label-code-sm">
                <div className="flex flex-col">
                  <span className="text-outline">Engine Provider:</span>
                  <span className="text-on-surface font-semibold capitalize">{analysis.provider}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-outline">Diagnostic Model:</span>
                  <span className="text-secondary font-mono truncate">{analysis.model || 'standard'}</span>
                </div>
                <div className="flex flex-col col-span-2 pt-1 border-t border-outline-variant/15">
                  <span className="text-outline">Analyzed At:</span>
                  <span className="text-on-surface-variant">{formatDateTime(analysis.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Intelligence Workbench: Two Columns */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
            {/* LEFT COLUMN: Cause Explanation, Correlated Telemetry & Timeline (7 Cols) */}
            <div className="xl:col-span-7 flex flex-col gap-space-lg">
              {/* 1. Probable Cause & Fault Domain */}
              <div className="bg-surface-container rounded p-space-md shadow-md">
                <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Probable Cause &amp; Fault Domain
                    </h2>
                  </div>
                  <span className="font-label-code-sm text-label-code-sm text-outline">
                    Fault Domain: {analysis.evidence?.fault_domain || 'Service / Pod'}
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded font-body-md text-body-md text-on-surface space-y-space-sm leading-relaxed">
                  <p className="whitespace-pre-line text-on-surface/90">
                    {analysis.explanation}
                  </p>
                </div>
              </div>

              {/* 2. Correlated Telemetry Evidence */}
              <div className="bg-surface-container rounded p-space-md shadow-md flex flex-col">
                <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-secondary">analytics</span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Correlated Prometheus Signals
                    </h3>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span className="font-label-code-sm text-label-code-sm text-on-surface-variant font-medium">
                      {analysis.evidence?.metrics_status || 'Prometheus Telemetry'}
                    </span>
                  </div>
                </div>

                {/* Evidence Metrics List */}
                <div className="bg-surface-container-lowest rounded p-space-md font-label-code-sm text-label-code-sm text-on-surface flex flex-col gap-2">
                  {analysis.evidence?.corroborating_metrics && analysis.evidence.corroborating_metrics.length > 0 ? (
                    analysis.evidence.corroborating_metrics.map((metricStr, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-container-low transition-colors">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                        <span className="text-on-surface font-mono">{metricStr}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-outline p-2 italic">
                      No live metric corroborations available (Prometheus query API unreachable in local environment).
                    </div>
                  )}

                  {analysis.evidence?.alert_trigger_context && analysis.evidence.alert_trigger_context.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-outline-variant/15 flex flex-col gap-1.5">
                      <span className="text-[11px] text-outline uppercase font-semibold">Alert Notification Payload:</span>
                      {analysis.evidence.alert_trigger_context.map((ctxStr, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-on-surface-variant text-label-code-sm">
                          <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">info</span>
                          <span>{ctxStr}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {analysis.evidence?.key_metrics && analysis.evidence.key_metrics.map((km, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-1.5 rounded hover:bg-surface-container-low transition-colors">
                      <span className="material-symbols-outlined text-[16px] text-secondary">trending_up</span>
                      <span className="text-on-surface font-mono">{km}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Correlated Incident Timeline */}
              <div className="bg-surface-container rounded p-space-md shadow-md">
                <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-outline">history</span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Incident Timeline Correlation
                    </h3>
                  </div>
                  <span className="font-label-code-sm text-label-code-sm text-outline">
                    {analysis.evidence?.timeline_evidence?.length || 0} Events Captured
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded flex flex-col gap-2">
                  {analysis.evidence?.timeline_evidence && analysis.evidence.timeline_evidence.length > 0 ? (
                    analysis.evidence.timeline_evidence.map((tStr, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-on-surface-variant font-label-code-sm text-label-code-sm">
                        <span className="material-symbols-outlined text-[15px] text-secondary mt-0.5">circle</span>
                        <span className="leading-snug">{tStr}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-outline italic text-body-sm">
                      No timeline events recorded during incident window.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Remediation Control & Recommended Actions (5 Cols) */}
            <div className="xl:col-span-5 flex flex-col gap-space-lg">
              {/* 1. Controlled Self-Healing & Remediation Engine (Phase 9D) */}
              <div className="bg-surface-container rounded p-space-md shadow-md flex flex-col border border-primary/20">
                <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[20px] text-primary">healing</span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Self-Healing Remediation
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded font-label-code-sm text-[11px] bg-primary/10 text-primary font-bold uppercase tracking-wider border border-primary/30">
                    Phase 9D Engine
                  </span>
                </div>

                <div className="flex flex-col gap-space-sm">
                  {/* Remediation Target Details */}
                  <div className="p-space-sm bg-surface-container-low rounded border border-outline-variant/15 flex flex-col gap-1.5 font-label-code-sm text-label-code-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Allowed Action:</span>
                      <span className="text-on-surface font-mono font-semibold">restart_deployment</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Target Workload:</span>
                      <span className="text-secondary font-mono font-semibold">healops-backend</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Namespace:</span>
                      <span className="text-on-surface font-mono">healops</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-outline">RBAC ServiceAccount:</span>
                      <span className="text-tertiary font-mono">healops-remediation-sa</span>
                    </div>
                  </div>

                  {/* Status & Safeguard Notices */}
                  {selectedIncident?.status === 'resolved' ? (
                    <div className="p-2.5 rounded bg-surface-container-high border border-outline-variant/20 flex items-center gap-2 text-outline text-label-code-sm">
                      <span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
                      <span>Incident is resolved. Remediation execution is disabled.</span>
                    </div>
                  ) : cooldownSeconds > 0 ? (
                    <div className="p-2.5 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-center gap-2 text-[#f59e0b] text-label-code-sm">
                      <span className="material-symbols-outlined text-[18px] animate-pulse">timer</span>
                      <span>Cooldown active. Next remediation permitted in <strong>{cooldownSeconds}s</strong>.</span>
                    </div>
                  ) : remediating ? (
                    <div className="p-2.5 rounded bg-primary/10 border border-primary/30 flex items-center gap-2 text-primary text-label-code-sm">
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Executing rolling restart &amp; verifying pod health...</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded bg-tertiary/10 border border-tertiary/30 flex items-center gap-2 text-tertiary text-label-code-sm">
                      <span className="material-symbols-outlined text-[16px]">verified_user</span>
                      <span>Human-in-the-loop authorization required before rollout.</span>
                    </div>
                  )}

                  {/* Execution Feedback Message */}
                  {remediationMsg && (
                    <div className={`p-2.5 rounded text-label-code-sm flex flex-col gap-1 ${
                      remediationMsg.type === 'success' ? 'bg-tertiary/15 text-tertiary border border-tertiary/40' :
                      remediationMsg.type === 'warning' ? 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/40' :
                      'bg-error-container/40 text-error border border-error/40'
                    }`}>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-[16px]">
                          {remediationMsg.type === 'success' ? 'verified' : remediationMsg.type === 'warning' ? 'warning' : 'error'}
                        </span>
                        <span>{remediationMsg.text}</span>
                      </div>
                      {remediationMsg.remediation?.verification_details && (
                        <div className="text-[11px] font-mono opacity-90 pl-5">
                          Probe: {remediationMsg.remediation.verification_details.probe_endpoint || '/ready'} |
                          Status: {remediationMsg.remediation.verification_details.probe_status || 200} |
                          Latency: {remediationMsg.remediation.verification_details.probe_latency_ms || 0}ms
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Trigger Button */}
                  <button
                    className={`w-full py-2.5 px-4 rounded font-label-code-md text-label-code-md font-semibold flex items-center justify-center gap-2 transition-all shadow-sm ${
                      selectedIncident?.status === 'resolved' || cooldownSeconds > 0 || remediating
                        ? 'bg-surface-container-high text-outline cursor-not-allowed opacity-60'
                        : 'bg-primary text-on-primary hover:bg-primary/90 hover:shadow-primary/25 cursor-pointer'
                    }`}
                    onClick={handleInitiateRemediation}
                    disabled={selectedIncident?.status === 'resolved' || cooldownSeconds > 0 || remediating}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {remediating ? 'sync' : 'restart_alt'}
                    </span>
                    <span>
                      {remediating ? 'Remediating...' : cooldownSeconds > 0 ? `Cooldown (${cooldownSeconds}s)` : 'Approve & Execute Remediation'}
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Recommended Corrective Actions */}
              <div className="bg-surface-container rounded p-space-md shadow-md flex flex-col">
                <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-[18px] text-primary">auto_awesome</span>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                      Recommended Corrective Actions
                    </h3>
                  </div>
                  <span className="font-label-code-sm text-label-code-sm text-outline">
                    {analysis.recommended_actions?.length || 0} Actions
                  </span>
                </div>

                <div className="flex flex-col gap-space-sm">
                  {(!analysis.recommended_actions || analysis.recommended_actions.length === 0) && (
                    <span className="text-outline p-space-md italic">No specific recommendations provided.</span>
                  )}

                  {analysis.recommended_actions && analysis.recommended_actions.map((rec, idx) => {
                    const isCritical = rec.priority === 'critical';
                    const isHigh = rec.priority === 'high';

                    return (
                      <div
                        key={idx}
                        className="p-space-sm bg-surface-container-low rounded border border-outline-variant/15 hover:border-outline-variant/40 transition-all flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded font-label-code-sm text-label-code-sm font-semibold uppercase ${
                            isCritical ? 'bg-error-container/40 text-error' :
                            isHigh ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                            'bg-primary/20 text-primary'
                          }`}>
                            {rec.priority || 'RECOMMENDED'}
                          </span>
                          <span className="font-label-code-sm text-label-code-sm text-outline font-mono uppercase">
                            TYPE: {rec.type || 'SRE'}
                          </span>
                        </div>

                        <span className="font-body-md text-body-md font-bold text-on-surface mt-0.5">
                          {rec.action}
                        </span>

                        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                          {rec.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Diagnostics Audit Information */}
              <div className="p-space-md bg-surface-container-low rounded border border-outline-variant/20 flex flex-col gap-2 font-label-code-sm text-label-code-sm text-outline">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface">Analysis Status:</span>
                  <span className="text-tertiary capitalize">{analysis.status || 'completed'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Incident ID:</span>
                  <span className="text-on-surface font-mono">#{analysis.incident_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Analysis Record ID:</span>
                  <span className="text-on-surface font-mono">#{analysis.id}</span>
                </div>
                <div className="pt-2 border-t border-outline-variant/15 text-[11px] text-on-surface-variant leading-normal">
                  Root cause analysis evaluates Prometheus time-series telemetry and incident event timelines.
                  Autonomous self-healing recommendations are executed with least-privilege RBAC safeguards.
                </div>
              </div>
            </div>
          </div>

          {/* Remediation Audit History (Phase 9D Full Width Section) */}
          <div className="bg-surface-container rounded p-space-md shadow-md flex flex-col mt-space-lg">
            <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[18px] text-secondary">history_edu</span>
                <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Remediation &amp; Recovery Audit History
                </h3>
              </div>
              <span className="font-label-code-sm text-label-code-sm text-outline">
                {remediations.length} Execution(s) Recorded
              </span>
            </div>

            {loadingRemediations ? (
              <div className="flex items-center justify-center py-6 text-outline">
                <span className="material-symbols-outlined animate-spin text-[24px]">sync</span>
              </div>
            ) : remediations.length === 0 ? (
              <div className="p-space-md text-center text-outline font-body-sm italic">
                No remediation actions executed for this incident yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-label-code-sm text-label-code-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/15 text-outline text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-3">ID</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Target</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Recovery Verification</th>
                      <th className="py-2 px-3">Approved By</th>
                      <th className="py-2 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                    {remediations.map((rem) => {
                      const isSuccess = rem.status === 'succeeded';
                      const isFailed = rem.status === 'failed';
                      const isExecuting = rem.status === 'executing';
                      const isUnverified = rem.status === 'recovery_unverified';

                      return (
                        <tr key={rem.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-2.5 px-3 font-mono text-outline">#{rem.id}</td>
                          <td className="py-2.5 px-3 font-mono font-medium">{rem.action}</td>
                          <td className="py-2.5 px-3 font-mono text-secondary">
                            {rem.target_name} ({rem.target_namespace})
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[11px] ${
                              isSuccess ? 'bg-tertiary/20 text-tertiary' :
                              isExecuting ? 'bg-primary/20 text-primary animate-pulse' :
                              isUnverified ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                              'bg-error-container/40 text-error'
                            }`}>
                              {rem.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {rem.recovery_verified ? (
                              <span className="flex items-center gap-1 text-tertiary font-semibold">
                                <span className="material-symbols-outlined text-[15px]">verified</span>
                                Verified ({rem.verification_details?.probe_latency_ms || 0}ms)
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-outline">
                                <span className="material-symbols-outlined text-[15px]">
                                  {isFailed ? 'cancel' : 'hourglass_empty'}
                                </span>
                                {rem.error_message ? 'Failed' : 'Unverified'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-outline">{rem.approved_by || 'system'}</td>
                          <td className="py-2.5 px-3 text-outline">{formatDateTime(rem.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Human-in-the-Loop Confirmation Modal (Phase 9D) */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg max-w-lg w-full p-space-lg shadow-2xl flex flex-col gap-space-md animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
              <div className="flex items-center gap-space-xs text-primary">
                <span className="material-symbols-outlined text-[24px]">shield_lock</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                  Approve Kubernetes Remediation
                </h3>
              </div>
              <button
                className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                onClick={() => setShowConfirmModal(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Details */}
            <div className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
              <p>
                You are about to authorize a live Kubernetes remediation action to resolve{' '}
                <strong className="text-on-surface">Incident #INC-{selectedIncidentId}</strong>.
              </p>

              <div className="bg-surface-container-lowest p-space-sm rounded border border-outline-variant/15 flex flex-col gap-1.5 font-label-code-sm text-label-code-sm">
                <div className="flex justify-between">
                  <span className="text-outline">Action:</span>
                  <span className="text-on-surface font-mono font-semibold">Rolling Restart</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Target Deployment:</span>
                  <span className="text-secondary font-mono font-semibold">healops-backend</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Target Namespace:</span>
                  <span className="text-on-surface font-mono">healops</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">RBAC Credentials:</span>
                  <span className="text-tertiary font-mono">healops-remediation-sa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">Verification Method:</span>
                  <span className="text-on-surface font-mono">Rollout status + /ready probe</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-start gap-2 text-[#f59e0b] text-[12px] leading-relaxed">
                <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">warning</span>
                <span>
                  This action triggers a Kubernetes Deployment rollout restart. The system will monitor rollout completion and verify readiness before confirming recovery.
                </span>
              </div>

              {/* Explicit Approval Checkbox */}
              <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-outline-variant/50 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  checked={authorizedChecked}
                  onChange={(e) => setAuthorizedChecked(e.target.checked)}
                />
                <span className="font-label-code-sm text-label-code-sm text-on-surface font-medium leading-tight">
                  I explicitly authorize executing rolling restart for deployment{' '}
                  <code className="text-secondary font-mono">healops-backend</code>.
                </span>
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant/20">
              <button
                className="px-4 py-2 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-code-sm text-label-code-sm transition-colors"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 rounded font-label-code-sm text-label-code-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                  !authorizedChecked || remediating
                    ? 'bg-surface-container-high text-outline cursor-not-allowed opacity-50'
                    : 'bg-primary text-on-primary hover:bg-primary/90 cursor-pointer'
                }`}
                onClick={handleExecuteRemediation}
                disabled={!authorizedChecked || remediating}
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Confirm &amp; Execute</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
