import { useState, useMemo } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useServers } from '@/hooks/useServers';
import { useAlerts } from '@/hooks/useAlerts';
import {
  ChevronDown, ChevronRight, Server as ServerIcon, Database, Globe, Zap, RefreshCw,
  AlertCircle, TrendingUp, Activity, History,
} from 'lucide-react';
import type { Alert } from '@/api/alerts';
import type { Server } from '@/api/servers';

// ── static mock metric data ────────────────────────────────────────────────
const CPU_BARS = [0.5, 0.75, 0.66, 0.5, 0.83, 0.66, 0.5, 0.33, 0.66, 0.75, 1, 0.75, 0.5];
const SERVICE_CARDS = [
  { name: 'Auth-API',     icon: Globe,      status: 'UP',   statusColor: 'text-[#6bd8cb]', statusBg: 'bg-[#6bd8cb]/10', ringColor: 'ring-[#6bd8cb]/50', sub: 'Latency: 24ms • Req: 1.2k/s',  bars: [0.33, 0.66, 0.5, 1, 0.66] },
  { name: 'Payment-DB',  icon: Database,   status: 'WARN', statusColor: 'text-[#ffb59a]', statusBg: 'bg-[#ffb59a]/10', ringColor: 'ring-[#ffb59a]/50', sub: 'Latency: 480ms • Conn: 84%',    bars: [0.66, 1, 1, 0.83, 0.66] },
  { name: 'Redis-Cluster',icon: RefreshCw,  status: 'UP',   statusColor: 'text-[#6bd8cb]', statusBg: 'bg-[#6bd8cb]/10', ringColor: 'ring-[#6bd8cb]/50', sub: 'Hit Rate: 99.2% • Mem: 4GB',   bars: [0.5, 0.5, 0.5, 0.5, 0.5] },
  { name: 'Edge-CDN',    icon: Zap,        status: 'UP',   statusColor: 'text-[#6bd8cb]', statusBg: 'bg-[#6bd8cb]/10', ringColor: 'ring-[#6bd8cb]/50', sub: 'Traffic: 4.2TB • Global',        bars: [0.33, 0.33, 1, 0.33, 0.33] },
];
const INCIDENTS = [
  { icon: History,      iconColor: 'text-[#ffb59a]', iconBg: 'bg-[#ffb59a]/10', title: 'Network Partitioning Event', date: 'Oct 24, 08:12', desc: 'Inter-regional VPC traffic drop for 42 seconds. Auto-recovered.' },
  { icon: AlertCircle,  iconColor: 'text-[#ffb4ab]',  iconBg: 'bg-[#ffb4ab]/10',  title: 'OOM Kill Process: Worker-02',  date: 'Oct 22, 14:05', desc: 'Memory overflow during batch job. Scaling group adjusted.' },
];
const TIME_RANGES = ['1H', '6H', '24H', '7D'] as const;

// ── helpers ────────────────────────────────────────────────────────────────
function severityColor(sev: string) {
  if (sev === 'critical') return { border: 'border-[#ffb4ab]', bg: 'bg-[#93000a]/10', label: 'text-[#ffb4ab]' };
  if (sev === 'warning')  return { border: 'border-[#ffb59a]', bg: 'bg-[#ffb59a]/10', label: 'text-[#ffb59a]' };
  return                         { border: 'border-[#b4c5ff]', bg: 'bg-[#b4c5ff]/10', label: 'text-[#b4c5ff]' };
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── sub-components ─────────────────────────────────────────────────────────
function AlertItem({ alert, onResolve }: { alert: Alert; onResolve: (id: string) => void }) {
  const c = severityColor(alert.severity);
  return (
    <div className={`p-3 ${c.bg} border-l-2 ${c.border} rounded-r-lg`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase ${c.label}`}>{alert.severity}</span>
        <span className="text-[10px] text-slate-500">{relativeTime(alert.created_at)}</span>
      </div>
      <p className="text-xs font-bold text-text1">{alert.title}</p>
      {alert.message && <p className="text-[10px] text-slate-400 mt-1">{alert.message}</p>}
      {!alert.resolved && (
        <button
          onClick={() => onResolve(alert.id)}
          className="mt-2 text-[10px] font-bold text-slate-400 hover:text-[#6bd8cb] transition-colors"
        >
          Resolve →
        </button>
      )}
    </div>
  );
}

function ServerGroup({ label, servers, selectedId, onSelect }: {
  label: string; servers: Server[]; selectedId: string | null; onSelect: (s: Server) => void;
}) {
  const [open, setOpen] = useState(true);
  const active = servers.filter((s) => s.is_active).length;
  const allUp = active === servers.length;
  const badgeCls = allUp
    ? 'bg-[#6bd8cb]/10 text-[#6bd8cb]'
    : active === 0
    ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]'
    : 'bg-input text-slate-400';

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-slate-300 hover:text-[#6bd8cb] transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-sm font-bold capitalize">{label}</span>
        </div>
        <span className={`text-[10px] px-1.5 rounded ${badgeCls}`}>
          {active === 0 ? 'OFF' : `${active}/${servers.length}`}
        </span>
      </button>
      {open && (
        <div className="ml-5 mt-2 space-y-1">
          {servers.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                selectedId === s.id
                  ? 'bg-[#6bd8cb]/5 text-[#6bd8cb] font-medium'
                  : 'text-slate-400 hover:bg-input'
              }`}
            >
              <span>{s.name}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-[#6bd8cb]' : 'bg-[#ffb4ab]'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { servers } = useServers(workspaceId);
  const { alerts, resolve } = useAlerts(workspaceId, false);
  const [selected, setSelected] = useState<Server | null>(null);
  const [timeRange, setTimeRange] = useState<typeof TIME_RANGES[number]>('6H');

  const serversByEnv = useMemo(() => {
    const map = new Map<string, Server[]>();
    for (const s of servers) {
      const key = s.environment || 'default';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [servers]);

  const activeServer = selected ?? servers[0] ?? null;
  const healthyCount = servers.filter((s) => s.is_active).length;
  const warnCount = servers.filter((s) => !s.is_active).length;

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts  = alerts.filter((a) => a.severity === 'warning');

  return (
    <div className="flex-1 flex overflow-hidden p-6 gap-6">
      {/* ── Left panel ──────────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        {/* Server Fleet */}
        <section className="bg-card rounded-xl p-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Server Fleet</h3>
          {servers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No servers yet.</p>
          ) : (
            <div className="space-y-4">
              {Array.from(serversByEnv.entries()).map(([env, envServers]) => (
                <ServerGroup
                  key={env}
                  label={env}
                  servers={envServers}
                  selectedId={activeServer?.id ?? null}
                  onSelect={setSelected}
                />
              ))}
            </div>
          )}
        </section>

        {/* Active Alerts */}
        <section className="flex-1 flex flex-col bg-card rounded-xl p-4 overflow-hidden min-h-0">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Active Alerts</h3>
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No active alerts.</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1
              [&::-webkit-scrollbar]:w-[3px]
              [&::-webkit-scrollbar-thumb]:bg-input2
              [&::-webkit-scrollbar-thumb:hover]:bg-[#6bd8cb]
              [&::-webkit-scrollbar-track]:bg-transparent">
              {alerts.map((a) => (
                <AlertItem key={a.id} alert={a} onResolve={resolve} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Right content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto
        [&::-webkit-scrollbar]:w-[3px]
        [&::-webkit-scrollbar-thumb]:bg-input2
        [&::-webkit-scrollbar-thumb:hover]:bg-[#6bd8cb]
        [&::-webkit-scrollbar-track]:bg-transparent">

        {/* Header row */}
        <div className="flex items-end justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <span>Fleet</span>
              <ChevronRight size={12} />
              <span>{activeServer?.environment ?? '—'}</span>
              <ChevronRight size={12} />
              <span className="text-[#6bd8cb] font-bold">{activeServer?.name ?? 'No server selected'}</span>
            </div>
            <h1 className="text-2xl font-bold text-text1 tracking-tight">System Performance</h1>
          </div>
          <div className="flex bg-card p-1 rounded-xl gap-0.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors ${
                  timeRange === r
                    ? 'bg-[#6bd8cb] text-[#003732]'
                    : 'text-slate-500 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Bento metrics grid */}
        <div className="grid grid-cols-12 gap-4 flex-shrink-0">
          {/* CPU chart — 8 cols */}
          <div className="col-span-8 bg-card rounded-2xl p-6 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CPU Utilization</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-bold text-[#6bd8cb]">42.8%</span>
                    <span className="text-xs text-[#6bd8cb] font-bold flex items-center gap-0.5">
                      <TrendingUp size={12} /> 2.4%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Peak Load</span>
                  <span className="text-sm font-bold text-text1">88.2%</span>
                </div>
              </div>
              {/* Bar chart */}
              <div className="h-40 w-full flex items-end gap-1 px-2">
                {CPU_BARS.map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm transition-all ${
                      h >= 1
                        ? 'bg-[#6bd8cb]/60 border-t-2 border-[#6bd8cb] shadow-[0_0_16px_rgba(107,216,203,0.3)]'
                        : h >= 0.75
                        ? 'bg-[#6bd8cb]/40 border-t-2 border-[#6bd8cb]'
                        : 'bg-[#6bd8cb]/20'
                    }`}
                    style={{ height: `${h * 100}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-[#6bd8cb]/5 to-transparent opacity-50 pointer-events-none" />
          </div>

          {/* Side metrics — 4 cols */}
          <div className="col-span-4 flex flex-col gap-4">
            <div className="flex-1 bg-card rounded-2xl p-5 flex flex-col justify-between">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memory Usage</h4>
              <div>
                <span className="text-3xl font-bold text-[#b4c5ff]">12.4 GB</span>
                <div className="w-full bg-input h-1 mt-2 rounded-full overflow-hidden">
                  <div className="bg-[#b4c5ff] h-full rounded-full" style={{ width: '65%' }} />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-slate-500">Available: 4.2 GB</span>
                  <span className="text-[10px] text-slate-500">65%</span>
                </div>
              </div>
            </div>
            <div className="flex-1 bg-card rounded-2xl p-5 flex flex-col justify-between">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Disk I/O</h4>
              <div>
                <span className="text-3xl font-bold text-[#ffb59a]">240 MB/s</span>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-1 bg-input rounded-full overflow-hidden">
                    <div className="bg-[#ffb59a] h-full rounded-full" style={{ width: '40%' }} />
                  </div>
                  <span className="text-[10px] text-[#ffb59a] font-bold">STABLE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Services */}
        <section className="flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-text1 flex items-center gap-2">
              <Activity size={14} className="text-[#6bd8cb]" />
              Active Services
            </h3>
            <div className="flex gap-4">
              {healthyCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#6bd8cb]" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{healthyCount} Healthy</span>
                </div>
              )}
              {warnCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ffb59a]" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{warnCount} Down</span>
                </div>
              )}
              {criticalAlerts.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{criticalAlerts.length} Critical</span>
                </div>
              )}
              {warningAlerts.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ffb59a]" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{warningAlerts.length} Warnings</span>
                </div>
              )}
            </div>
          </div>

          {/* Real servers grid */}
          {servers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {servers.map((s) => {
                const up = s.is_active;
                const accent = up ? '#6bd8cb' : '#ffb4ab';
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`bg-card2 rounded-xl p-4 text-left group hover:ring-1 transition-all ${
                      up ? 'ring-[#6bd8cb]/50' : 'ring-[#ffb4ab]/50'
                    } ${activeServer?.id === s.id ? 'ring-1' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}18` }}>
                        <ServerIcon size={18} style={{ color: accent }} />
                      </div>
                      <span
                        className="px-2 py-0.5 text-[10px] font-bold rounded"
                        style={{ color: accent, backgroundColor: `${accent}18` }}
                      >
                        {up ? 'UP' : 'DOWN'}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-text1 transition-colors" style={{ color: activeServer?.id === s.id ? accent : undefined }}>{s.name}</h5>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">{s.hostname || s.ip_address || s.environment}</p>
                    <div className="mt-3 flex gap-1 h-3 items-end">
                      {[0.4, 0.7, 0.55, 0.9, 0.65].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-full"
                          style={{ height: `${h * 100}%`, backgroundColor: `${accent}${up ? '99' : '44'}` }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Fallback to static service cards when no real servers */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {SERVICE_CARDS.map((svc) => {
                const Icon = svc.icon;
                return (
                  <div
                    key={svc.name}
                    className={`bg-card2 rounded-xl p-4 group hover:ring-1 ${svc.ringColor} transition-all cursor-pointer`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className={`w-10 h-10 ${svc.statusBg} rounded-lg flex items-center justify-center`}>
                        <Icon size={18} className={svc.statusColor} />
                      </div>
                      <span className={`px-2 py-0.5 ${svc.statusBg} ${svc.statusColor} text-[10px] font-bold rounded`}>{svc.status}</span>
                    </div>
                    <h5 className={`text-sm font-bold text-text1 group-hover:${svc.statusColor} transition-colors`}>{svc.name}</h5>
                    <p className="text-[10px] text-slate-500 mt-1">{svc.sub}</p>
                    <div className="mt-4 flex gap-1 h-3 items-end">
                      {svc.bars.map((h, i) => (
                        <div key={i} className={`flex-1 ${svc.statusBg} rounded-full`} style={{ height: `${h * 100}%` }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Node detail + incidents */}
        {activeServer && (
          <section className="bg-card2 rounded-2xl overflow-hidden mb-2 flex-shrink-0">
            <div className="grid grid-cols-12">
              {/* Node details */}
              <div className="col-span-12 lg:col-span-4 p-6 border-r border-slate-800/30">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Node Details</h4>
                <div className="space-y-0">
                  {[
                    { label: 'Name',        value: activeServer.name },
                    { label: 'Hostname',    value: activeServer.hostname ?? '—' },
                    { label: 'IP Address',  value: activeServer.ip_address ?? '—' },
                    { label: 'Environment', value: activeServer.environment },
                    { label: 'Status',      value: activeServer.is_active ? 'Online' : 'Offline', accent: activeServer.is_active },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-slate-800/20">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className={`text-xs font-bold ${accent !== undefined ? (accent ? 'text-[#6bd8cb]' : 'text-[#ffb4ab]') : 'text-text1'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                  {activeServer.tags.length > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-xs text-slate-400">Tags</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {activeServer.tags.map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-input text-slate-400 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Incidents — static display */}
              <div className="col-span-12 lg:col-span-8 p-6">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Incidents</h4>
                {INCIDENTS.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No incidents recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {INCIDENTS.map((inc) => {
                      const Icon = inc.icon;
                      return (
                        <div key={inc.title} className="flex items-center gap-4 p-3 bg-input rounded-xl">
                          <div className={`w-8 h-8 rounded-full ${inc.iconBg} flex items-center justify-center flex-shrink-0`}>
                            <Icon size={14} className={inc.iconColor} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-text1">{inc.title}</p>
                              <span className="text-[10px] text-slate-500 ml-2 flex-shrink-0">{inc.date}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{inc.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
