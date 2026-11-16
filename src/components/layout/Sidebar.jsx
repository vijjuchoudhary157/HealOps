import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { incidentsAPI } from '../../services/api';

export default function Sidebar() {
  const [healthStatus, setHealthStatus] = useState({ backend: 'checking', db: 'checking' });
  const [firingCount, setFiringCount] = useState(null);
  const [environment, setEnvironment] = useState('Detecting...');

  useEffect(() => {
    let isMounted = true;

    const fetchHealthAndStats = async () => {
      // 1. Check /ready
      try {
        const res = await fetch('/ready');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setHealthStatus({
              backend: data.status === 'ready' ? 'online' : 'degraded',
              db: data.database === 'connected' ? 'connected' : 'disconnected'
            });
          }
        } else {
          if (isMounted) setHealthStatus({ backend: 'offline', db: 'unknown' });
        }
      } catch {
        if (isMounted) setHealthStatus({ backend: 'offline', db: 'unknown' });
      }

      // 2. Fetch active incident count
      try {
        const stats = await incidentsAPI.getStats();
        if (isMounted && stats?.by_status) {
          setFiringCount(stats.by_status.firing ?? 0);
        }
      } catch {
        // Leave previous count or null
      }

      // 3. Fetch system status for environment detection
      try {
        const res = await fetch('/api/system/status');
        if (res.ok) {
          const sysData = await res.json();
          if (isMounted) {
            setEnvironment(sysData.environment === 'kubernetes' ? 'Kubernetes Cluster' : 'Docker Compose');
          }
        }
      } catch {
        // Fallback default
        if (isMounted && environment === 'Detecting...') {
          setEnvironment('Docker Compose');
        }
      }
    };

    fetchHealthAndStats();
    const timer = setInterval(fetchHealthAndStats, 10000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const isHealthy = healthStatus.backend === 'online' && healthStatus.db === 'connected';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Tasks', path: '/tasks', icon: 'check_box' },
    { name: 'Test Results', path: '/test-results', icon: 'science' },
    {
      name: 'Incidents',
      path: '/incidents',
      icon: 'warning',
      badge: firingCount !== null && firingCount > 0 ? String(firingCount) : null,
      badgeColor: 'bg-error-container text-on-error-container'
    },
    { name: 'AI Analysis', path: '/ai-analysis', icon: 'psychology', badge: 'AI', badgeColor: 'bg-secondary-container/20 text-secondary' },
    { name: 'System Health', path: '/system-health', icon: 'pulse_alert' },
    { name: 'Settings', path: '/settings', icon: 'settings' },
  ];

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-surface-container-lowest z-40 flex flex-col justify-between shadow-[1px_0_12px_rgba(0,0,0,0.3)]">
      <div className="flex flex-col py-space-md">
        <div className="px-space-md pb-space-sm mb-space-xs">
          <span className="font-label-code-sm text-label-code-sm text-outline uppercase tracking-wider font-semibold">Autonomous Engine</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-space-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-space-md py-2 rounded transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary font-bold shadow-[inset_3px_0_0_0_#c0c1ff]'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`
              }
            >
              <div className="flex items-center gap-space-md">
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="font-body-md text-body-md">{item.name}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 rounded font-label-code-sm text-label-code-sm font-bold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-space-md m-space-sm bg-surface-container-low rounded flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${isHealthy ? 'bg-tertiary' : 'bg-error'}`}></span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface font-medium">
              {isHealthy ? 'Backend & DB Healthy' : healthStatus.backend === 'checking' ? 'Checking Health...' : 'Degraded Health'}
            </span>
          </div>
          <span className={`font-label-code-sm text-label-code-sm ${isHealthy ? 'text-tertiary font-bold' : 'text-error'}`}>
            {isHealthy ? 'Live' : healthStatus.backend === 'checking' ? '...' : 'Alert'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">Environment</span>
          <span className="font-label-code-sm text-label-code-sm text-secondary font-semibold">{environment}</span>
        </div>
        <div className="pt-2 mt-1 flex items-center justify-between text-[11px] font-label-code-sm">
          <span className="text-outline">Health Probe</span>
          <span className={isHealthy ? 'text-tertiary font-semibold' : 'text-error'}>
            {isHealthy ? 'Verified (/ready)' : 'Connection Failed'}
          </span>
        </div>
      </div>
    </aside>
  );
}
