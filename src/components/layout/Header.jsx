import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/incidents?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-50 flex items-center justify-between px-3 sm:px-4 lg:px-margin shadow-[0_1px_8px_rgba(0,0,0,0.4)] max-w-full">
      <div className="flex items-center gap-space-xs sm:gap-space-sm lg:gap-space-md min-w-0 flex-1 mr-2 sm:mr-4 overflow-hidden">
        <div
          className="flex items-center gap-space-sm flex-shrink-0 cursor-pointer"
          onClick={() => navigate('/dashboard')}
        >
          <img alt="HealOps Logo" className="h-8 w-8 object-contain flex-shrink-0" src="/healops-logo.svg" onError={(e) => { e.target.style.display = 'none'; }} />
          <span className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">HealOps</span>
        </div>
        <div className="hidden sm:block h-4 w-px bg-outline-variant/40 mx-space-xs flex-shrink-0"></div>
        <div
          onClick={() => navigate('/settings')}
          className="hidden xl:flex items-center gap-space-xs px-space-sm py-1 bg-surface-container rounded cursor-pointer hover:bg-surface-container-high transition-colors flex-shrink min-w-0 max-w-[240px]"
          title="Open Environment Settings"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary flex-shrink-0">hub</span>
          <span className="font-label-code-md text-label-code-md text-on-surface truncate">local-compose / docker-desktop</span>
        </div>
        <span className="hidden sm:inline-block px-space-xs py-0.5 rounded font-label-code-sm text-label-code-sm bg-secondary-container/30 text-secondary flex-shrink-0 font-semibold tracking-wide">LOCAL COMPOSE</span>
        <div className="hidden xl:inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded font-label-code-sm text-label-code-sm bg-surface-container border border-outline-variant/40 text-on-surface-variant flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          <span>Live Backend Connected</span>
        </div>
        <div className="hidden 2xl:flex items-center gap-2 px-space-sm py-1 rounded bg-tertiary-container/20 shadow-[0_0_8px_1px_rgba(78,222,163,0.15)] flex-shrink-0">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
          </span>
          <span className="font-label-code-md text-label-code-md text-tertiary font-medium">HealOps Agent: Active</span>
        </div>
      </div>
      <div className="flex items-center gap-space-xs sm:gap-space-sm lg:gap-space-md flex-shrink-0">
        <div className="hidden md:flex relative items-center w-48 lg:w-60 xl:w-72 flex-shrink min-w-0">
          <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-outline">search</span>
          <input
            className="w-full h-8 pl-8 pr-3 bg-surface-container-lowest text-on-surface placeholder:text-outline-variant font-label-code-sm text-label-code-sm rounded focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
            placeholder="Search incidents (Enter)..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        <button
          className="relative p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
          aria-label="View Incidents"
          title="View Incidents"
          onClick={() => navigate('/incidents')}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <button
          className="hidden sm:flex p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
          onClick={() => navigate('/settings')}
          title="System Settings"
          aria-label="System Settings"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
        <div className="hidden sm:block h-5 w-px bg-outline-variant/40 flex-shrink-0"></div>
        <div className="flex items-center gap-space-xs sm:gap-space-sm pl-space-xs flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold font-label-code-sm flex-shrink-0 border border-primary/30">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="hidden md:flex flex-col min-w-0 max-w-[120px] lg:max-w-[150px] xl:max-w-[180px]">
            <span className="font-body-sm text-body-sm font-medium text-on-surface leading-none truncate">{user?.name || user?.username || 'Operator'}</span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant leading-none mt-1 truncate" title={user?.email || 'admin'}>{user?.email || 'admin@healops.dev'}</span>
          </div>
          <button
            onClick={handleLogout}
            className="ml-1 sm:ml-2 p-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
