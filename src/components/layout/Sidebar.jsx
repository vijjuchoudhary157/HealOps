import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Tasks', path: '/tasks', icon: 'check_box' },
    { name: 'Test Results', path: '/test-results', icon: 'science' },
    { name: 'Incidents', path: '/incidents', icon: 'warning', badge: '2', badgeColor: 'bg-error-container text-on-error-container' },
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
            <span className="inline-block w-2 h-2 rounded-full bg-tertiary"></span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface font-medium">24/24 Pods Healthy</span>
          </div>
          <span className="font-label-code-sm text-label-code-sm text-tertiary">100%</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">SLA 30d</span>
          <span className="font-label-code-sm text-label-code-sm text-secondary font-semibold">99.98% Uptime</span>
        </div>
        <div className="pt-2 mt-1 flex items-center justify-between">
          <span className="font-label-code-sm text-label-code-sm text-outline">v2.4.1-prod</span>
          <span className="font-label-code-sm text-label-code-sm text-outline-variant">Autonomous</span>
        </div>
      </div>
    </aside>
  );
}
