import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-50 flex items-center justify-between px-margin shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-space-md">
        <div className="flex items-center gap-space-sm">
          <img alt="HealOps Logo" className="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1X-YWp0OYTApdnk52Oh-qZHatag3ECeZZr53MuHh0bWQo-gdPuQeiMl5-apcRyF45gedPfQv6fMvpfyuAGL0F7CRFUXT3LLNLg1Jm7WTsxwyOnA3-ay91aH4lSoCHi9PY_YqH-8UvvMsSchYzx-N-uHNN1K0Vi9tDOanfBs2ENXHAWrIW_A0lT5pkcuEuiTmk-yzXMfM6yPmIkTztCp27ZS4T_4R98MQ5gPXy3UYi1kVVFBTUIDz6n3cvw" />
          <span className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface">HealOps</span>
        </div>
        <div className="h-4 w-px bg-outline-variant/40 mx-space-xs"></div>
        <div className="flex items-center gap-space-xs px-space-sm py-1 bg-surface-container rounded cursor-pointer hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-[16px] text-secondary">hub</span>
          <span className="font-label-code-md text-label-code-md text-on-surface">prod-us-east-1 / k8s-task-cluster-04</span>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
        </div>
        <span className="px-space-xs py-0.5 rounded font-label-code-sm text-label-code-sm bg-error-container/30 text-error">PRODUCTION</span>
        <div className="hidden sm:inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded font-label-code-sm text-label-code-sm bg-surface-container border border-outline-variant/40 text-on-surface-variant">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          <span className="">Live Backend Connected</span>
        </div>
        <div className="hidden xl:flex items-center gap-2 px-space-sm py-1 rounded bg-tertiary-container/20 shadow-[0_0_8px_1px_rgba(78,222,163,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
          </span>
          <span className="font-label-code-md text-label-code-md text-tertiary font-medium">HealOps Agent: Active &amp; Watching</span>
        </div>
      </div>
      <div className="flex items-center gap-space-md">
        <div className="relative flex items-center w-64 lg:w-80">
          <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-outline">search</span>
          <input className="w-full h-8 pl-8 pr-3 bg-surface-container-lowest text-on-surface placeholder:text-outline-variant font-label-code-sm text-label-code-sm rounded focus:outline-none focus:ring-1 focus:ring-primary-container transition-all" placeholder="Search tasks, incidents, traces, logs... ⌘K" type="text" />
        </div>
        <button className="relative p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-error text-on-error font-label-code-sm text-[9px] font-bold">3</span>
        </button>
        <a className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors" href="#" title="Documentation &amp; API">
          <span className="material-symbols-outlined text-[20px]">description</span>
        </a>
        <div className="h-5 w-px bg-outline-variant/40"></div>
        <div className="flex items-center gap-space-sm pl-space-xs">
          <img alt="Profile" className="w-8 h-8 rounded-full object-cover ring-1 ring-outline-variant" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjAD7wTE9GvegzVGJpIkzgtl9QIbyImYowwmBmQ9Mo5ITKPrOpPfAJ_BToPdQ0r79Uhke13_7oRQuVliqc6YtpdfnQ1bMPJorCU_zc5zc0Cj0KhE_JZhw1Ha_QIO_oWDYzIHT2Gn1z-QVxcUxe61a717kyoNhg-FR0cKF73zj9pV4KlAaQ8USraqpd4K_8OY7o0nChhylkh5AeaDG7xxM_O50UyLyNSbpeMbFnutx1DEP0-BFOLIpc" />
          <div className="hidden md:flex flex-col">
            <span className="font-body-sm text-body-sm font-medium text-on-surface leading-none">{user?.username || 'User'}</span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant leading-none mt-1">{user?.email || 'admin'}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="ml-2 p-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-error transition-colors"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
