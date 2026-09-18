import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name || email.split('@')[0], email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="w-full min-h-screen bg-surface flex items-center justify-center px-gutter py-space-xl">
      <div className="flex flex-col w-full items-center justify-center relative overflow-hidden py-space-xl">
        {/* Subtle Ambient Telemetry Topology Canvas Background */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] -top-40 -left-20"></div>
          <div className="absolute w-[600px] h-[600px] rounded-full bg-secondary/5 blur-[140px] bottom-0 right-0"></div>
          <svg className="w-full h-full opacity-20 stroke-outline-variant" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern height="48" id="grid-pattern" patternUnits="userSpaceOnUse" width="48">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="currentColor" strokeDasharray="1 7" strokeWidth="0.75"></path>
                <circle className="text-outline" cx="0" cy="0" fill="currentColor" r="1.5"></circle>
              </pattern>
            </defs>
            <rect fill="url(#grid-pattern)" height="100%" width="100%"></rect>
            {/* Simulated Constellation Trace Lines */}
            <g className="text-secondary/40" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M 120 180 L 260 220 L 340 140 L 520 200" strokeDasharray="4 4"></path>
              <circle className="fill-secondary animate-pulse" cx="260" cy="220" r="3"></circle>
              <circle className="fill-surface-tint" cx="340" cy="140" r="2.5"></circle>
            </g>
            <g className="text-tertiary/30" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M 780 400 L 920 360 L 1040 440 L 1180 390" strokeDasharray="6 3"></path>
              <circle className="fill-tertiary" cx="920" cy="360" r="3"></circle>
              <circle className="fill-primary" cx="1040" cy="440" r="2"></circle>
            </g>
          </svg>
        </div>

        {/* Main Auth Container Container */}
        <div className="relative w-full max-w-[490px] mx-auto z-10 flex flex-col items-center">
          {/* Platform Brand Header */}
          <div className="flex flex-col items-center mb-space-lg text-center">
            <div className="flex items-center gap-space-xs px-space-md py-space-xs rounded-full bg-surface-container-high shadow-sm mb-space-md">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant uppercase tracking-wider">Cloud-Native Reliability & Task Platform</span>
            </div>
            <div className="flex items-center gap-space-sm mb-space-xs">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-on-primary text-[24px]">network_intelligence</span>
              </div>
              <span className="font-headline-xl text-headline-xl text-on-surface tracking-tight">HealOps</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">Autonomous incident triage, live telemetry reconciliation, and cluster control plane.</p>
          </div>

          {/* Glassmorphic Auth Card */}
          <div className="w-full bg-surface-container-low/90 backdrop-blur-xl rounded-xl shadow-2xl p-space-xl flex flex-col gap-space-lg relative">
            {/* Tab Switcher */}
            <div className="flex p-space-xs rounded-lg bg-surface-container-lowest gap-space-xs" role="tablist">
              <button
                className={`flex-1 py-space-xs px-space-sm rounded-lg font-label-code-md text-label-code-md transition-all duration-200 text-center flex items-center justify-center gap-space-xs ${isLogin ? 'bg-surface-container-high text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                onClick={() => setIsLogin(true)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Sign In</span>
              </button>
              <button
                className={`flex-1 py-space-xs px-space-sm rounded-lg font-label-code-md text-label-code-md transition-all duration-200 text-center flex items-center justify-center gap-space-xs ${!isLogin ? 'bg-surface-container-high text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                onClick={() => setIsLogin(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">domain_add</span>
                <span>Create Workspace</span>
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-error-container text-error px-4 py-2 rounded-lg font-body-sm flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => setError('')}><span className="material-symbols-outlined text-[16px]">close</span></button>
              </div>
            )}

            {/* Credential Form */}
            <form className="flex flex-col gap-space-md" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="flex flex-col gap-space-xs">
                  <label className="font-label-code-md text-label-code-md text-on-surface-variant flex items-center justify-between" htmlFor="input-name">
                    <span>FULL NAME</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      className="w-full h-9 bg-surface-container-lowest text-on-surface placeholder:text-outline font-label-code-md text-label-code-md px-space-md rounded-lg outline-none focus:bg-surface-container transition-all"
                      id="input-name"
                      placeholder="Alex Chen"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                    />
                    <span className="material-symbols-outlined absolute right-space-sm text-outline text-[18px]">person</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-space-xs">
                <label className="font-label-code-md text-label-code-md text-on-surface-variant flex items-center justify-between" htmlFor="input-email">
                  <span>WORK EMAIL</span>
                  <span className="font-label-code-sm text-label-code-sm text-secondary">CORPORATE DOMAIN REQUIRED</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full h-9 bg-surface-container-lowest text-on-surface placeholder:text-outline font-label-code-md text-label-code-md px-space-md rounded-lg outline-none focus:bg-surface-container transition-all"
                    id="input-email"
                    placeholder="alex.chen@enterprise.io"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <span className="material-symbols-outlined absolute right-space-sm text-outline text-[18px]">alternate_email</span>
                </div>
              </div>

              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <label className="font-label-code-md text-label-code-md text-on-surface-variant" htmlFor="input-password">CLUSTER PASSKEY / CIPHER</label>
                  {isLogin && <a className="font-label-code-sm text-label-code-sm text-primary hover:underline" href="#">Forgot password?</a>}
                </div>
                <div className="relative flex items-center">
                  <input
                    className="w-full h-9 bg-surface-container-lowest text-on-surface placeholder:text-outline font-label-code-md text-label-code-md px-space-md pr-10 rounded-lg outline-none focus:bg-surface-container transition-all"
                    id="input-password"
                    placeholder="••••••••••••••••"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="absolute right-space-sm text-outline hover:text-on-surface flex items-center justify-center p-1"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                className="w-full h-10 mt-space-xs rounded-lg bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md flex items-center justify-center gap-space-sm transition-all duration-200 shadow-lg shadow-primary/20 active:scale-[0.99] group disabled:opacity-70"
                type="submit"
                disabled={isSubmitting}
              >
                <span className={`material-symbols-outlined text-[20px] ${isSubmitting ? 'animate-spin' : 'group-hover:rotate-45 transition-transform duration-300'}`}>
                  {isSubmitting ? 'sync' : 'hub'}
                </span>
                <span>{isSubmitting ? 'Connecting...' : isLogin ? 'Sign In to Cluster Console' : 'Create Reliability Workspace'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
