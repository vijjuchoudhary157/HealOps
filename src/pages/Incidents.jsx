import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { incidentsAPI } from '../services/api';

export default function Incidents() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_status: {}, by_severity: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 10 });

  // Detail & Timeline Modal State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await incidentsAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load incident stats:', err);
    }
  };

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await incidentsAPI.getAll({
        page,
        limit: 10,
        status: statusFilter,
        severity: severityFilter,
        search: search.trim() || undefined,
      });
      setIncidents(data.incidents || []);
      setPagination(data.pagination || { total: 0, totalPages: 1, limit: 10 });
    } catch (err) {
      setError(err.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, severityFilter, search]);

  useEffect(() => {
    fetchStats();
    fetchIncidents();
  }, [fetchIncidents]);

  const openDetailsModal = async (incidentId) => {
    try {
      setLoadingDetail(true);
      setSelectedIncident(null);
      const data = await incidentsAPI.getById(incidentId);
      setSelectedIncident(data.incident);
      setTimeline(data.timeline || []);
    } catch (err) {
      alert(err.message || 'Failed to load incident details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setActionInProgress(true);
      const updated = await incidentsAPI.updateStatus(id, newStatus);

      // Update in table list
      setIncidents(prev => prev.map(inc => inc.id === id ? updated.incident : inc));

      // Update in modal if open
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident(updated.incident);
        // Refresh timeline
        const detailData = await incidentsAPI.getById(id);
        setTimeline(detailData.timeline || []);
      }

      await fetchStats();
    } catch (err) {
      alert(err.message || `Failed to set incident status to ${newStatus}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch {
      return isoStr;
    }
  };

  const formatRelativeTime = (isoStr) => {
    if (!isoStr) return '';
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return `${Math.floor(diffHr / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div className="relative w-full flex flex-col gap-space-lg">
      {/* Background glow effects */}
      <div className="absolute -top-12 -left-12 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-48 right-10 w-80 h-80 bg-secondary/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="px-space-xs py-0.5 rounded font-label-code-sm text-label-code-sm bg-primary/10 text-primary uppercase font-bold tracking-wider">
              Alertmanager &amp; Incident Engine
            </span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Live Cluster Telemetry
            </span>
            <span className="px-space-xs py-0.5 rounded font-label-code-sm text-label-code-sm bg-surface-container text-outline flex items-center gap-1 border border-outline-variant/30">
              <span className="material-symbols-outlined text-[13px] text-secondary">database</span> PostgreSQL Persistence
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Incident Management &amp; Triage
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Real-time Alertmanager webhooks, automated deduplication, and lifecycle auditing.
          </p>
        </div>

        <div className="flex items-center gap-space-sm self-start lg:self-center">
          <button
            className="flex items-center gap-space-xs px-space-md py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-all shadow-sm"
            onClick={() => { fetchStats(); fetchIncidents(); }}
          >
            <span className={`material-symbols-outlined text-[18px] text-secondary ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span className="font-label-code-md text-label-code-md">Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* Stats KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-low p-space-md rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-code-sm text-label-code-sm text-outline uppercase font-semibold">Total Incidents</span>
            <span className="material-symbols-outlined text-[18px] text-primary">warning</span>
          </div>
          <div className="my-space-sm flex items-baseline gap-space-sm">
            <span className="font-label-code-lg text-headline-xl font-bold text-on-surface">{stats.total || 0}</span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">recorded</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1 overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-md rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-code-sm text-label-code-sm text-error uppercase font-semibold">Active Firing</span>
            <span className="material-symbols-outlined text-[18px] text-error animate-pulse">local_fire_department</span>
          </div>
          <div className="my-space-sm flex items-baseline gap-space-sm">
            <span className="font-label-code-lg text-headline-xl font-bold text-error">
              {stats.by_status?.firing || 0}
            </span>
            <span className="font-label-code-sm text-label-code-sm text-error font-medium">requires action</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1 overflow-hidden">
            <div className="bg-error h-full rounded-full" style={{ width: `${Math.min(100, ((stats.by_status?.firing || 0) / (stats.total || 1)) * 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-md rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-code-sm text-label-code-sm text-[#f59e0b] uppercase font-semibold">Acknowledged</span>
            <span className="material-symbols-outlined text-[18px] text-[#f59e0b]">visibility</span>
          </div>
          <div className="my-space-sm flex items-baseline gap-space-sm">
            <span className="font-label-code-lg text-headline-xl font-bold text-[#f59e0b]">
              {stats.by_status?.acknowledged || 0}
            </span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">under investigation</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1 overflow-hidden">
            <div className="bg-[#f59e0b] h-full rounded-full" style={{ width: `${Math.min(100, ((stats.by_status?.acknowledged || 0) / (stats.total || 1)) * 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-surface-container-low p-space-md rounded-lg shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-code-sm text-label-code-sm text-tertiary uppercase font-semibold">Resolved</span>
            <span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
          </div>
          <div className="my-space-sm flex items-baseline gap-space-sm">
            <span className="font-label-code-lg text-headline-xl font-bold text-tertiary">
              {stats.by_status?.resolved || 0}
            </span>
            <span className="font-label-code-sm text-label-code-sm text-tertiary">stabilized</span>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1 overflow-hidden">
            <div className="bg-tertiary h-full rounded-full" style={{ width: `${Math.min(100, ((stats.by_status?.resolved || 0) / (stats.total || 1)) * 100)}%` }}></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-error p-space-md rounded-lg shadow-sm font-body-sm flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}><span className="material-symbols-outlined">close</span></button>
        </div>
      )}

      {/* Filter Strip */}
      <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-surface-container-low p-1 rounded">
            {[
              { id: 'all', label: 'All Incidents', count: stats.total || 0 },
              { id: 'firing', label: 'Firing', count: stats.by_status?.firing || 0, color: 'text-error', dot: 'bg-error' },
              { id: 'acknowledged', label: 'Acknowledged', count: stats.by_status?.acknowledged || 0, color: 'text-[#f59e0b]', dot: 'bg-[#f59e0b]' },
              { id: 'resolved', label: 'Resolved', count: stats.by_status?.resolved || 0, color: 'text-tertiary', dot: 'bg-tertiary' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                className={`px-space-md py-1 rounded font-label-code-sm text-label-code-sm transition-all flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-surface-container-high text-on-surface font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`}></span>}
                <span>{tab.label}</span>
                <span className="ml-1 opacity-75 font-mono text-[11px]">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Severity & Search */}
          <div className="flex flex-wrap items-center gap-space-sm w-full lg:w-auto">
            <div className="relative flex-1 sm:w-64">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-outline">search</span>
              <input
                className="w-full h-8 pl-8 pr-3 bg-surface-container-low text-on-surface placeholder:text-outline font-label-code-sm text-label-code-sm rounded focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
                placeholder="Search alerts or summary..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="font-label-code-sm text-label-code-sm text-outline mr-1 uppercase">Severity:</span>
              {['all', 'critical', 'warning', 'info'].map(sev => (
                <button
                  key={sev}
                  onClick={() => { setSeverityFilter(sev); setPage(1); }}
                  className={`px-2 py-0.5 rounded font-label-code-sm text-label-code-sm capitalize transition-all ${
                    severityFilter === sev
                      ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                      : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-surface-container-lowest rounded-lg shadow-md overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex flex-col justify-center items-center h-56 gap-2">
            <span className="material-symbols-outlined text-[36px] text-primary animate-spin">sync</span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">Loading real incident telemetry...</span>
          </div>
        ) : incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-on-surface-variant text-center gap-2">
            <span className="material-symbols-outlined text-[52px] text-outline">verified_user</span>
            <p className="font-headline-sm font-semibold text-on-surface">No incidents found</p>
            <p className="font-body-sm text-outline max-w-md">
              {statusFilter !== 'all' || severityFilter !== 'all' || search
                ? 'No incidents match your current filters. Try resetting search or severity parameters.'
                : 'All Kubernetes clusters and backend services are operational with zero active firing alerts.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-body-sm font-body-sm text-on-surface min-w-[1150px]">
              <thead className="bg-surface-container-low font-label-code-sm text-label-code-sm text-outline uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-space-md" scope="col">Incident ID</th>
                  <th className="py-2.5 px-space-sm" scope="col">Severity</th>
                  <th className="py-2.5 px-space-md w-72" scope="col">Alert &amp; Summary</th>
                  <th className="py-2.5 px-space-sm" scope="col">Component</th>
                  <th className="py-2.5 px-space-sm" scope="col">Status</th>
                  <th className="py-2.5 px-space-sm" scope="col">First Seen</th>
                  <th className="py-2.5 px-space-sm" scope="col">Last Seen</th>
                  <th className="py-2.5 px-space-md text-right" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {incidents.map(inc => {
                  const isFiring = inc.status === 'firing';
                  const isAck = inc.status === 'acknowledged';
                  const isResolved = inc.status === 'resolved';

                  const component = inc.labels?.component || inc.labels?.job || inc.labels?.pod || 'healops';

                  return (
                    <tr
                      key={inc.id}
                      className={`hover:bg-surface-container/60 transition-colors ${
                        isFiring ? 'bg-error-container/5' : isAck ? 'bg-[#f59e0b]/5' : ''
                      }`}
                    >
                      <td className="py-space-md px-space-md font-label-code-md text-label-code-md text-primary font-bold">
                        #INC-{inc.id}
                      </td>
                      <td className="py-space-md px-space-sm">
                        <span className={`px-space-xs py-0.5 rounded font-label-code-sm text-label-code-sm font-bold flex items-center gap-1 w-fit uppercase ${
                          inc.severity === 'critical' ? 'bg-error-container text-on-error-container' :
                          inc.severity === 'warning' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                          'bg-surface-container text-outline'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            inc.severity === 'critical' ? 'bg-error animate-ping' :
                            inc.severity === 'warning' ? 'bg-[#f59e0b]' : 'bg-outline'
                          }`}></span>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="flex flex-col">
                          <span className="font-body-md text-body-md font-semibold text-on-surface">
                            {inc.alertname}
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant truncate max-w-md">
                            {inc.summary || inc.description || 'No description supplied'}
                          </span>
                        </div>
                      </td>
                      <td className="py-space-md px-space-sm">
                        <span className="px-space-sm py-0.5 rounded font-label-code-sm text-label-code-sm bg-surface-container-high text-on-surface flex items-center gap-1 w-fit">
                          <span className="material-symbols-outlined text-[13px] text-secondary">dns</span>
                          {component}
                        </span>
                      </td>
                      <td className="py-space-md px-space-sm">
                        <span className={`px-space-sm py-0.5 rounded font-label-code-sm text-label-code-sm font-semibold flex items-center gap-1.5 w-fit capitalize ${
                          isFiring ? 'bg-error-container/30 text-error' :
                          isAck ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                          'bg-tertiary-container/30 text-tertiary'
                        }`}>
                          {isFiring && <span className="material-symbols-outlined text-[13px] animate-spin">autorenew</span>}
                          {isAck && <span className="material-symbols-outlined text-[13px]">visibility</span>}
                          {isResolved && <span className="material-symbols-outlined text-[13px]">check_circle</span>}
                          {inc.status}
                        </span>
                      </td>
                      <td className="py-space-md px-space-sm font-label-code-sm text-label-code-sm text-on-surface-variant">
                        <div>{formatDateTime(inc.first_seen_at)}</div>
                        <div className="text-outline text-[11px]">{formatRelativeTime(inc.first_seen_at)}</div>
                      </td>
                      <td className="py-space-md px-space-sm font-label-code-sm text-label-code-sm text-on-surface-variant">
                        <div>{formatDateTime(inc.last_seen_at)}</div>
                        <div className="text-outline text-[11px]">{formatRelativeTime(inc.last_seen_at)}</div>
                      </td>
                      <td className="py-space-md px-space-md text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isFiring && (
                            <button
                              className="px-2 py-1 rounded bg-[#f59e0b]/10 hover:bg-[#f59e0b]/20 text-[#f59e0b] font-label-code-sm text-label-code-sm flex items-center gap-1 transition-all"
                              title="Acknowledge Incident"
                              onClick={() => handleUpdateStatus(inc.id, 'acknowledged')}
                              disabled={actionInProgress}
                            >
                              <span className="material-symbols-outlined text-[14px]">done</span>
                              <span>Ack</span>
                            </button>
                          )}
                          {!isResolved && (
                            <button
                              className="px-2 py-1 rounded bg-tertiary-container/20 hover:bg-tertiary-container/40 text-tertiary font-label-code-sm text-label-code-sm flex items-center gap-1 transition-all"
                              title="Resolve Incident"
                              onClick={() => handleUpdateStatus(inc.id, 'resolved')}
                              disabled={actionInProgress}
                            >
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              <span>Resolve</span>
                            </button>
                          )}
                          <button
                            className="p-1 hover:bg-surface-container rounded text-primary hover:text-primary-container transition-colors"
                            title="Inspect Details &amp; Timeline"
                            onClick={() => openDetailsModal(inc.id)}
                          >
                            <span className="material-symbols-outlined text-[18px]">timeline</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-space-md py-space-sm bg-surface-container-low text-on-surface-variant">
            <span className="font-label-code-sm text-label-code-sm mb-2 sm:mb-0">
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total incidents)
            </span>
            <div className="flex items-center gap-1">
              <button
                className="p-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              <span className="font-label-code-sm text-label-code-sm px-space-sm py-1 bg-surface-container-high rounded text-on-surface font-bold">
                {page}
              </span>
              <button
                className="p-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface disabled:opacity-40"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Incident Details & Timeline Modal */}
      {(selectedIncident || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface-container-low border border-outline-variant/30 shadow-2xl rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col relative overflow-hidden">
            {/* Modal Header */}
            <div className="p-space-lg border-b border-outline-variant/20 flex items-start justify-between bg-surface-container-lowest">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-label-code-lg text-label-code-lg text-primary font-bold">
                    #INC-{selectedIncident?.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-label-code-sm text-label-code-sm font-bold uppercase ${
                    selectedIncident?.severity === 'critical' ? 'bg-error-container text-on-error-container' :
                    selectedIncident?.severity === 'warning' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                    'bg-surface-container text-outline'
                  }`}>
                    {selectedIncident?.severity}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-label-code-sm text-label-code-sm font-semibold capitalize ${
                    selectedIncident?.status === 'firing' ? 'bg-error-container/30 text-error' :
                    selectedIncident?.status === 'acknowledged' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' :
                    'bg-tertiary-container/30 text-tertiary'
                  }`}>
                    {selectedIncident?.status}
                  </span>
                </div>
                <h2 className="font-headline-md text-headline-md text-on-surface mt-1">
                  {selectedIncident?.alertname}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {selectedIncident?.summary}
                </p>
              </div>

              <button
                className="p-1 rounded text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                onClick={() => setSelectedIncident(null)}
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            {loadingDetail ? (
              <div className="flex justify-center items-center h-64">
                <span className="material-symbols-outlined text-[32px] text-primary animate-spin">sync</span>
              </div>
            ) : (
              <div className="p-space-lg overflow-y-auto flex flex-col gap-space-lg">
                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-sm bg-surface-container-lowest p-space-md rounded-lg">
                  <div>
                    <span className="font-label-code-sm text-label-code-sm text-outline uppercase">Fingerprint</span>
                    <p className="font-label-code-sm text-label-code-sm text-on-surface font-mono truncate" title={selectedIncident?.fingerprint}>
                      {selectedIncident?.fingerprint}
                    </p>
                  </div>
                  <div>
                    <span className="font-label-code-sm text-label-code-sm text-outline uppercase">First Occurrence</span>
                    <p className="font-label-code-sm text-label-code-sm text-on-surface">
                      {formatDateTime(selectedIncident?.first_seen_at)}
                    </p>
                  </div>
                  <div>
                    <span className="font-label-code-sm text-label-code-sm text-outline uppercase">Last Occurrence</span>
                    <p className="font-label-code-sm text-label-code-sm text-on-surface">
                      {formatDateTime(selectedIncident?.last_seen_at)}
                    </p>
                  </div>
                  {selectedIncident?.resolved_at && (
                    <div>
                      <span className="font-label-code-sm text-label-code-sm text-tertiary uppercase">Resolved At</span>
                      <p className="font-label-code-sm text-label-code-sm text-tertiary font-semibold">
                        {formatDateTime(selectedIncident?.resolved_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Labels Chips */}
                {selectedIncident?.labels && Object.keys(selectedIncident.labels).length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="font-label-code-sm text-label-code-sm text-outline uppercase font-semibold">
                      Prometheus Alert Labels
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(selectedIncident.labels).map(([k, v]) => (
                        <span key={k} className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-label-code-sm text-[12px] flex items-center gap-1">
                          <span className="text-secondary font-semibold">{k}:</span>
                          <span>{String(v)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline / History */}
                <div className="flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-code-sm text-label-code-sm text-outline uppercase font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">history</span>
                      Incident Audit &amp; Event Timeline
                    </span>
                    <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                      {timeline.length} event(s) recorded
                    </span>
                  </div>

                  <div className="relative border-l-2 border-outline-variant/30 ml-3 pl-4 flex flex-col gap-space-md py-1">
                    {timeline.map((evt, idx) => {
                      const isFiringEvt = evt.event_type === 'firing';
                      const isAckEvt = evt.event_type === 'acknowledged';
                      const isResEvt = evt.event_type === 'resolved';
                      const isReopenedEvt = evt.event_type === 'reopened';
                      const isRemediationOk = evt.event_type === 'remediation_succeeded';
                      const isRemediationFail = evt.event_type === 'remediation_failed';
                      const isRemediationStart = evt.event_type === 'remediation_started';

                      return (
                        <div key={evt.id || idx} className="relative flex flex-col gap-1">
                          {/* Dot marker on timeline */}
                          <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 border-surface-container-low ${
                            isRemediationOk ? 'bg-tertiary' :
                            isRemediationFail ? 'bg-error' :
                            isRemediationStart ? 'bg-primary animate-pulse' :
                            isFiringEvt ? 'bg-error' :
                            isAckEvt ? 'bg-[#f59e0b]' :
                            isResEvt ? 'bg-tertiary' :
                            isReopenedEvt ? 'bg-secondary' : 'bg-primary'
                          }`}></div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="font-label-code-sm text-label-code-sm font-bold text-on-surface capitalize flex items-center gap-1.5">
                              {isRemediationOk && <span className="material-symbols-outlined text-[15px] text-tertiary">verified</span>}
                              {isRemediationFail && <span className="material-symbols-outlined text-[15px] text-error">cancel</span>}
                              {isRemediationStart && <span className="material-symbols-outlined text-[15px] text-primary animate-spin">sync</span>}
                              {evt.event_type.replace(/_/g, ' ')}
                            </span>
                            <span className="font-label-code-sm text-label-code-sm text-outline">
                              {formatDateTime(evt.created_at)}
                            </span>
                          </div>

                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {evt.summary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            {selectedIncident && (
              <div className="p-space-md border-t border-outline-variant/20 bg-surface-container-lowest flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedIncident.status === 'firing' && (
                    <button
                      className="px-space-md py-1.5 rounded bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-black font-label-code-md text-label-code-md font-semibold flex items-center gap-1 transition-all"
                      onClick={() => handleUpdateStatus(selectedIncident.id, 'acknowledged')}
                      disabled={actionInProgress}
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Acknowledge Incident</span>
                    </button>
                  )}
                  {selectedIncident.status !== 'resolved' && (
                    <button
                      className="px-space-md py-1.5 rounded bg-tertiary hover:bg-tertiary/90 text-black font-label-code-md text-label-code-md font-semibold flex items-center gap-1 transition-all"
                      onClick={() => handleUpdateStatus(selectedIncident.id, 'resolved')}
                      disabled={actionInProgress}
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Mark Resolved</span>
                    </button>
                  )}
                  <button
                    className="px-space-md py-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 font-label-code-md text-label-code-md font-semibold flex items-center gap-1.5 transition-all border border-primary/40 shadow-sm"
                    onClick={() => navigate(`/ai-analysis?incidentId=${selectedIncident.id}`)}
                  >
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    <span>Root Cause Analysis</span>
                  </button>
                  <button
                    className="px-space-md py-1.5 rounded bg-primary text-on-primary hover:bg-primary/90 font-label-code-md text-label-code-md font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    onClick={() => navigate(`/ai-analysis?incidentId=${selectedIncident.id}`)}
                  >
                    <span className="material-symbols-outlined text-[16px]">healing</span>
                    <span>Self-Healing</span>
                  </button>
                </div>

                <button
                  className="px-space-md py-1.5 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-code-sm text-label-code-sm"
                  onClick={() => setSelectedIncident(null)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
