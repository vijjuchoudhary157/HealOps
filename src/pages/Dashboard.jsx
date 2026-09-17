import React from 'react';

export default function Dashboard() {
  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Control Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md pb-space-xs">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Cluster Overview &amp; Task Health</h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high text-tertiary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span className="font-label-code-sm text-label-code-sm font-medium">Auto-refreshing (5s)</span>
            </div>
            <span className="font-label-code-sm text-label-code-sm text-outline-variant">|</span>
            <span className="font-label-code-sm text-label-code-sm text-on-surface-variant font-mono">UTC 17:24:39</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Cluster: <span className="font-label-code-sm text-label-code-sm text-secondary">prod-us-east-1a</span> • Heuristic Auto-Mitigation: <span className="font-label-code-sm text-label-code-sm text-tertiary">ARMED</span></p>
        </div>
        {/* Actions & Time Filter */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="inline-flex p-0.5 rounded bg-surface-container-lowest">
            <button className="px-space-sm py-1 rounded font-label-code-sm text-label-code-sm transition-all bg-primary text-on-primary font-semibold shadow-sm" type="button">Last 1 hour</button>
            <button className="px-space-sm py-1 rounded font-label-code-sm text-label-code-sm transition-all text-on-surface-variant hover:text-on-surface hover:bg-surface-container" type="button">Last 24 hours</button>
            <button className="px-space-sm py-1 rounded font-label-code-sm text-label-code-sm transition-all text-on-surface-variant hover:text-on-surface hover:bg-surface-container" type="button">7 days</button>
          </div>
          <div className="h-5 w-px bg-surface-container-highest hidden sm:block"></div>
          <button className="inline-flex items-center gap-1.5 px-space-sm py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-code-sm text-label-code-sm transition-all shadow-sm">
            <span className="material-symbols-outlined text-[16px] text-secondary">file_download</span>
            <span className="">Export Telemetry</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-space-sm py-1.5 rounded bg-surface-container-high hover:bg-surface-bright text-secondary font-label-code-sm text-label-code-sm transition-all shadow-sm">
            <span className="material-symbols-outlined text-[16px] text-secondary">radar</span>
            <span className="">Trigger Health Probe</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded bg-primary hover:bg-primary-container text-on-primary font-label-code-sm text-label-code-sm font-semibold transition-all shadow-md">
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span className="">Create Task</span>
          </button>
        </div>
      </div>

      {/* Key Metrics Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Overall System Status */}
        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-tertiary/10 blur-2xl pointer-events-none"></div>
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-code-sm text-label-code-sm uppercase tracking-wider text-outline font-semibold">Overall System Status</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-code-sm text-label-code-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                Operational
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-label-code-lg text-[28px] font-bold text-on-surface leading-tight">99.98%</span>
              <span className="font-label-code-sm text-label-code-sm text-tertiary font-medium">30d SLA</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">0 active P0/P1 blockers detected</p>
          </div>
          <div className="mt-space-md pt-space-xs flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-label-code-sm text-label-code-sm">
              <span className="text-on-surface-variant">Consensus Health</span>
              <span className="text-tertiary font-semibold">100% Solid</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden flex gap-0.5">
              <div className="h-full bg-tertiary rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between pb-1">
            <span className="font-label-code-sm text-label-code-sm uppercase tracking-wider text-outline font-semibold">Services Status</span>
            <span className="font-label-code-sm text-label-code-sm text-secondary">3/3 Online</span>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="font-body-sm text-body-sm font-medium text-on-surface">Frontend UI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">18ms</span>
                <span className="font-label-code-sm text-label-code-sm px-1 py-0.2 rounded bg-surface-container text-tertiary">99.99%</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="font-body-sm text-body-sm font-medium text-on-surface">Backend API</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">42ms p95</span>
                <span className="font-label-code-sm text-label-code-sm px-1 py-0.2 rounded bg-surface-container text-secondary">3 Pods</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                <span className="font-body-sm text-body-sm font-medium text-on-surface">PostgreSQL / Redis</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">Pool: 14/100</span>
                <span className="font-label-code-sm text-label-code-sm text-tertiary">In Sync</span>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-1 flex items-center justify-between text-on-surface-variant font-label-code-sm text-label-code-sm">
            <span className="">Cross-AZ Replication</span>
            <span className="text-tertiary font-mono">0.4ms delta</span>
          </div>
        </div>

        {/* Task Queue & Execution */}
        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-code-sm text-label-code-sm uppercase tracking-wider text-outline font-semibold">Task Queue &amp; Execution</span>
              <span className="material-symbols-outlined text-[16px] text-primary">data_thresholding</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-label-code-lg text-[28px] font-bold text-on-surface leading-tight">1,482</span>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">total tasks</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 my-2">
            <div className="p-1.5 rounded bg-surface-container flex flex-col">
              <span className="font-label-code-sm text-[10px] text-on-surface-variant">Active</span>
              <span className="font-label-code-md text-label-code-md font-bold text-secondary">38</span>
            </div>
            <div className="p-1.5 rounded bg-surface-container flex flex-col">
              <span className="font-label-code-sm text-[10px] text-on-surface-variant">Pending</span>
              <span className="font-label-code-md text-label-code-md font-bold text-primary">12</span>
            </div>
            <div className="p-1.5 rounded bg-surface-container flex flex-col">
              <span className="font-label-code-sm text-[10px] text-on-surface-variant">Done Today</span>
              <span className="font-label-code-md text-label-code-md font-bold text-tertiary">1,432</span>
            </div>
          </div>
          <div className="w-full bg-surface-container rounded-full h-1.5 flex overflow-hidden">
            <div className="bg-tertiary h-full" style={{ width: '96.6%' }}></div>
            <div className="bg-secondary h-full" style={{ width: '2.5%' }}></div>
            <div className="bg-primary h-full" style={{ width: '0.9%' }}></div>
          </div>
        </div>

        {/* Automated Testing & Stability */}
        <div className="p-space-md rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-label-code-sm text-label-code-sm uppercase tracking-wider text-outline font-semibold">Testing &amp; Stability</span>
              <span className="px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-label-code-sm text-label-code-sm">E2E Suite</span>
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                <span className="font-label-code-lg text-[22px] font-bold text-tertiary">342</span>
                <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">Passed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-label-code-lg text-[22px] font-bold text-error">2</span>
                <span className="font-label-code-sm text-label-code-sm text-error">Retrying</span>
              </div>
            </div>
          </div>
          <div className="p-2 rounded bg-surface-container flex items-start gap-2 mt-2">
            <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">auto_mode</span>
            <div className="flex flex-col">
              <span className="font-label-code-sm text-label-code-sm text-on-surface font-semibold">Pod Restarts (24h): 1</span>
              <span className="font-label-code-sm text-[10px] text-on-surface-variant leading-snug">Auto-healed pod 'task-worker-7dfb-9x' via OOM memory expansion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* Telemetry Chart Card */}
          <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-headline-md text-headline-md text-on-surface">Application Telemetry &amp; Health Trend</h2>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-label-code-sm text-label-code-sm text-secondary">p99 Latency &amp; Req/s</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Cross-service aggregate throughput &amp; heuristic anomaly detection</p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 font-label-code-sm text-label-code-sm text-on-surface-variant">
                  <span className="w-3 h-1 bg-secondary rounded-full"></span>
                  <span className="">Req/s (Throughput)</span>
                </div>
                <div className="flex items-center gap-1.5 font-label-code-sm text-label-code-sm text-on-surface-variant">
                  <span className="w-3 h-1 bg-primary rounded-full"></span>
                  <span className="">Latency (p90 ms)</span>
                </div>
                <div className="flex items-center gap-1.5 font-label-code-sm text-label-code-sm text-error">
                  <span className="w-2 h-2 rounded-full bg-error"></span>
                  <span className="">Spike Anomaly</span>
                </div>
              </div>
            </div>
            {/* Inline SVG Visualization */}
            <div className="relative w-full h-64 bg-surface-container-lowest rounded-lg p-space-sm flex flex-col justify-between overflow-hidden">
              <div className="absolute inset-x-0 top-1/4 border-b border-surface-container opacity-40"></div>
              <div className="absolute inset-x-0 top-2/4 border-b border-surface-container opacity-40"></div>
              <div className="absolute inset-x-0 top-3/4 border-b border-surface-container opacity-40"></div>
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 700 180">
                <defs>
                  <linearGradient id="reqGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.35"></stop>
                    <stop offset="100%" stopColor="#4cd7f6" stopOpacity="0.0"></stop>
                  </linearGradient>
                  <linearGradient id="latencyGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#c0c1ff" stopOpacity="0.25"></stop>
                    <stop offset="100%" stopColor="#c0c1ff" stopOpacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <path d="M0,130 Q70,110 140,125 T280,105 T420,135 T520,60 T560,140 T700,115 L700,180 L0,180 Z" fill="url(#reqGradient)"></path>
                <path d="M0,130 Q70,110 140,125 T280,105 T420,135 T520,60 T560,140 T700,115" fill="none" stroke="#4cd7f6" strokeLinecap="round" strokeWidth="2.5"></path>
                <path d="M0,150 Q90,145 180,140 T360,130 T500,110 T525,40 T555,138 T700,135" fill="none" stroke="#c0c1ff" strokeDasharray="4 2" strokeWidth="2"></path>
                <g transform="translate(525, 40)">
                  <circle className="animate-ping" fill="#ffb4ab" fillOpacity="0.2" r="14"></circle>
                  <circle fill="#ffb4ab" r="5"></circle>
                  <line stroke="#ffb4ab" strokeDasharray="2 2" strokeWidth="1.5" x1="0" x2="0" y1="5" y2="140"></line>
                </g>
              </svg>
              <div className="absolute top-4 left-[72%] transform -translate-x-1/2 px-2 py-1 rounded bg-surface-container-high shadow-lg text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-error">warning</span>
                <span className="font-label-code-sm text-label-code-sm">Queue Surge 2.1k req/s (Mitigated)</span>
              </div>
              <div className="flex justify-between items-center text-outline font-label-code-sm text-label-code-sm px-1 pt-1 z-10">
                <span className="">13:40</span>
                <span className="">13:50</span>
                <span className="">14:00</span>
                <span className="">14:10</span>
                <span className="">14:20</span>
                <span className="">14:30</span>
                <span className="text-tertiary">14:38 (Live)</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm pt-space-xs">
              <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col">
                <span className="font-label-code-sm text-label-code-sm text-outline">P50 Latency</span>
                <span className="font-label-code-md text-label-code-md font-semibold text-on-surface">14.2 ms</span>
              </div>
              <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col">
                <span className="font-label-code-sm text-label-code-sm text-outline">P90 Latency</span>
                <span className="font-label-code-md text-label-code-md font-semibold text-on-surface">32.8 ms</span>
              </div>
              <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col">
                <span className="font-label-code-sm text-label-code-sm text-outline">P99 Latency</span>
                <span className="font-label-code-md text-label-code-md font-semibold text-secondary">78.4 ms</span>
              </div>
              <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col">
                <span className="font-label-code-sm text-label-code-sm text-outline">Error Rate</span>
                <span className="font-label-code-md text-label-code-md font-semibold text-tertiary">0.002%</span>
              </div>
            </div>
          </div>
          {/* Recent Incidents Table */}
          <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Recent Incidents &amp; Triage</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Real-time incident feed managed by autonomous loop</p>
              </div>
              <button className="font-label-code-sm text-label-code-sm text-secondary hover:text-on-surface flex items-center gap-1 transition-colors">
                <span className="">View All Incidents</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="text-outline font-label-code-sm text-label-code-sm bg-surface-container-lowest/50">
                    <th className="py-2.5 px-3 rounded-l">Incident ID</th>
                    <th className="py-2.5 px-3">Title &amp; Trigger</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3 rounded-r text-right">Remediation</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  <tr className="hover:bg-surface-container transition-colors group">
                    <td className="py-3 px-3 font-label-code-sm text-label-code-sm font-semibold text-secondary">INC-4091</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">Task queue backlog spike</span>
                        <span className="font-label-code-sm text-label-code-sm text-outline">Trigger: Redis Stream queue depth &gt; 800</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-label-code-sm text-label-code-sm bg-surface-container text-[#f59e0b] font-medium">Medium</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-code-sm text-label-code-sm bg-tertiary-container/20 text-tertiary">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                        Auto-Recovered
                      </span>
                    </td>
                    <td className="py-3 px-3 font-label-code-sm text-label-code-sm text-on-surface-variant">42s</td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-label-code-sm text-label-code-sm text-primary group-hover:underline cursor-pointer">Scaled +3 pods</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-surface-container transition-colors group">
                    <td className="py-3 px-3 font-label-code-sm text-label-code-sm font-semibold text-secondary">INC-4089</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-on-surface">Memory leak in worker task-worker-7dfb</span>
                        <span className="font-label-code-sm text-label-code-sm text-outline">Trigger: cgroup RSS limit reached 94%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-label-code-sm text-label-code-sm bg-error-container/30 text-error font-medium">High</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-code-sm text-label-code-sm bg-tertiary-container/20 text-tertiary">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                        Auto-Recovered
                      </span>
                    </td>
                    <td className="py-3 px-3 font-label-code-sm text-label-code-sm text-on-surface-variant">1m 18s</td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-label-code-sm text-label-code-sm text-primary group-hover:underline cursor-pointer">OOM Expansion</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          <div className="p-space-lg rounded-xl bg-surface-container-low shadow-sm flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface">Autonomous Healing Engine</h2>
              </div>
              <span className="px-1.5 py-0.5 rounded font-label-code-sm text-label-code-sm bg-surface-container-high text-secondary">Live</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">HealOps is monitoring cluster state machines and applying predictive playbooks.</p>
            <div className="flex flex-col gap-2.5">
              <div className="p-2.5 rounded bg-surface-container-lowest flex items-start gap-2.5 shadow-sm">
                <div className="p-1 rounded bg-secondary-container/20 text-secondary mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-label-code-sm text-label-code-sm text-secondary font-bold truncate">Auto-scaled worker pool</span>
                    <span className="font-label-code-sm text-[10px] text-outline">09:41:12</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Increased pool from 3 → 6 replicas based on sudden task queue growth rate.</p>
                </div>
              </div>
            </div>
            <button className="w-full py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-code-sm text-label-code-sm flex items-center justify-center gap-1.5 transition-colors">
              <span className="material-symbols-outlined text-[16px]">terminal</span>
              <span className="">Open Full Autonomous Audit Log</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
