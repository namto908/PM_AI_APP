import { useState, useMemo } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useServers } from '@/hooks/useServers';
import { useAlerts } from '@/hooks/useAlerts';
import {
  ChevronDown, ChevronRight, Database, Globe, Zap, RefreshCw,
  AlertCircle, TrendingUp, History, Terminal, CloudOff, Play,
  Settings2,
} from 'lucide-react';
import type { Server } from '@/api/servers';

// ── Constants & Mock Data ──────────────────────────────────────────────────

const CPU_BARS = [0.5, 0.75, 0.66, 0.5, 0.83, 0.66, 0.5, 0.33, 0.66, 0.75, 1, 0.75, 0.5];
const TIME_RANGES = ['All', 'Active', 'Warning', 'Offline'] as const;

const SERVICE_CARDS = [
  { name: 'Auth-API',      icon: Globe,      status: 'UP',   statusColor: 'text-primary',  statusBg: 'bg-primary/10',  sub: 'Latency: 24ms • Requests: 1.2k/s • CPU: 12%', bars: [0.3, 0.6, 0.5, 1, 0.7] },
  { name: 'Payment-DB',    icon: Database,   status: 'WARN', statusColor: 'text-tertiary', statusBg: 'bg-tertiary/10', sub: 'Latency: 480ms • Conns: 84% • Mem: 6.2GB',  bars: [0.6, 1, 1, 0.8, 0.6] },
  { name: 'Redis-Cluster', icon: RefreshCw,  status: 'UP',   statusColor: 'text-primary',  statusBg: 'bg-primary/10',  sub: 'Hit Rate: 99.2% • Mem: 4GB • IO: High',    bars: [0.4, 0.5, 0.4, 0.4, 0.4] },
  { name: 'Edge-CDN',      icon: Zap,        status: 'UP',   statusColor: 'text-primary',  statusBg: 'bg-primary/10',  sub: 'Traffic: 4.2TB • Nodes: 42 • Latency: 12ms', bars: [0.3, 0.3, 1, 0.3, 0.3] },
  { name: 'Log-Aggregator',icon: CloudOff,   status: 'DOWN', statusColor: 'text-error',    statusBg: 'bg-error/10',    sub: 'Status: Terminated • Exit Code: 137',      bars: [0, 0, 0, 0, 0], offline: true },
];

const RECENT_INCIDENTS = [
  { icon: History,     color: 'text-tertiary', bg: 'bg-tertiary/10', title: 'Network Partitioning Event', date: 'Oct 24, 08:12', desc: 'Inter-regional VPC traffic drop for 42 seconds. Auto-recovered.' },
  { icon: AlertCircle, color: 'text-error',    bg: 'bg-error/10',    title: 'OOM Kill Process: Worker-02', date: 'Oct 22, 14:05', desc: 'Memory overflow during batch job. Scaling group adjusted.' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function severityColor(sev: string) {
  if (sev === 'critical') return { brand: 'error', label: 'Critical' };
  if (sev === 'warning')  return { brand: 'tertiary', label: 'Warning' };
  return                         { brand: 'secondary', label: 'Info' };
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

// ── Sub-components ─────────────────────────────────────────────────────────

function SidebarGroup({ label, servers, selectedId, onSelect }: {
  label: string; servers: Server[]; selectedId: string | null; onSelect: (s: Server) => void;
}) {
  const [open, setOpen] = useState(true);
  const activeCount = servers.filter(s => s.is_active).length;
  
  return (
    <div>
      <div 
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between group cursor-pointer text-on-surface-variant hover:text-primary transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="font-headline text-sm font-bold capitalize">{label} Production</span>
        </div>
        <span className={`text-[10px] px-1.5 rounded font-bold ${activeCount === servers.length ? 'bg-primary/10 text-primary' : 'bg-surface-container-highest text-on-surface-variant/70'}`}>
          {activeCount}/{servers.length}
        </span>
      </div>
      {open && (
        <div className="ml-6 mt-2 space-y-1">
          {servers.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors ${
                selectedId === s.id 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              <span>{s.name}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-primary' : 'bg-tertiary'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function MonitoringPage() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { servers } = useServers(workspaceId);
  const { alerts } = useAlerts(workspaceId, false);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [filter, setFilter] = useState<string>('All');

  const activeServer = selectedServer ?? servers[0] ?? null;

  const serversByEnv = useMemo(() => {
    const map = new Map<string, Server[]>();
    for (const s of servers) {
      const key = s.environment || 'production';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [servers]);

  const healthyCount = servers.filter(s => s.is_active).length;
  const warnCount = servers.length - healthyCount;

  return (
    <div className="flex-1 flex gap-8 p-8 overflow-hidden h-full">
      
      {/* ── Left Sidebar (Server Fleet + Alerts) ────────────────── */}
      <div className="w-72 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
        <section className="bg-surface rounded-xl p-4 border border-outline-variant backdrop-blur-sm">
          <h3 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-4">Server Fleet</h3>
          <div className="space-y-4">
            {Array.from(serversByEnv.entries()).map(([env, envServers]) => (
              <SidebarGroup 
                key={env} 
                label={env} 
                servers={envServers} 
                selectedId={activeServer?.id ?? null} 
                onSelect={setSelectedServer}
              />
            ))}
            {servers.length === 0 && <p className="text-xs text-on-surface-variant italic">No servers in fleet.</p>}
          </div>
        </section>

        <section className="flex-1 flex flex-col bg-surface rounded-xl p-4 overflow-hidden border border-outline-variant backdrop-blur-sm">
          <h3 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-4">Active Alerts</h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">All systems clear.</p>
            ) : (
              alerts.map(alert => {
                const c = severityColor(alert.severity);
                return (
                  <div key={alert.id} className={`p-3 bg-surface-container border-l-2 border-${c.brand} rounded-r-lg group hover:bg-surface-container-high transition-colors`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold text-${c.brand} uppercase`}>{c.label}</span>
                      <span className="text-[10px] text-on-surface-variant/60">{relativeTime(alert.created_at)}</span>
                    </div>
                    <p className="text-xs font-bold text-on-surface">{alert.title}</p>
                    {alert.message && <p className="text-[10px] text-on-surface-variant mt-1 line-clamp-1">{alert.message}</p>}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ── Main Content Area ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-8 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Header & Performance Metrics */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-1">
              <span>Fleet</span>
              <ChevronRight size={14} />
              <span className="capitalize">{activeServer?.environment || 'Global'} Production</span>
              <ChevronRight size={14} />
              <span className="text-primary font-bold">{activeServer?.name || 'Overview'}</span>
            </div>
            <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">System Performance</h1>
          </div>
          
          <div className="flex bg-surface p-1 rounded-xl border border-outline-variant shadow-lg">
            {TIME_RANGES.map(r => (
              <button 
                key={r}
                onClick={() => setFilter(r)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${filter === r ? 'bg-primary text-on-primary-fixed font-black shadow-md' : 'text-on-surface-variant hover:text-on-surface'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Big Chart Area (Mock) */}
        <section className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Aggregate CPU Utilization</h4>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold text-primary">42.8%</span>
                  <span className="text-xs text-primary font-bold flex items-center gap-0.5">
                    <TrendingUp size={12} /> +2.4%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-on-surface-variant block uppercase font-bold">Peak Load</span>
                <span className="text-sm font-bold text-on-surface">88.2%</span>
              </div>
            </div>
            
            {/* Bar Chart Graphics */}
            <div className="h-24 w-full flex items-end gap-1 px-2">
              {CPU_BARS.map((h, i) => (
                <div 
                  key={i} 
                  className={`flex-1 rounded-t-sm transition-all duration-700 ${h >= 0.8 ? 'bg-primary/60 border-t-2 border-primary shadow-[0_0_15px_rgba(107,216,203,0.3)]' : 'bg-primary/20'}`}
                  style={{ height: `${h * 100}%` }}
                />
              ))}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        </section>

        {/* Services / Processes Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Terminal size={14} className="text-primary" />
              Active Services & Processes
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">{healthyCount || 12} Healthy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">{warnCount || 2} Warnings</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {SERVICE_CARDS.map((svc) => {
              const Icon = svc.icon;
              return (
                <div key={svc.name} className={`flex items-center justify-between p-4 bg-surface hover:bg-surface-container rounded-2xl border border-outline-variant transition-all group cursor-pointer ${svc.offline ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${svc.statusBg} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                      <Icon size={20} className={svc.statusColor} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-on-surface">{svc.name}</h5>
                        <span className={`text-[10px] px-2 py-0.5 ${svc.statusBg} ${svc.statusColor} font-black rounded`}>
                          {svc.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">{svc.sub}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase">Uptime</span>
                      <span className={`text-xs font-bold ${svc.offline ? 'text-error' : 'text-on-surface'}`}>
                        {svc.offline ? '0s' : '14d 2h'}
                      </span>
                    </div>
                    
                    <div className="flex gap-1 h-4 items-end w-16">
                      {svc.bars.map((h, i) => (
                        <div key={i} className={`flex-1 ${svc.offline ? 'bg-slate-800' : svc.statusBg.replace('/10', '/40').replace('bg-', 'bg-')} h-${Math.ceil(h * 4)} rounded-full`} style={{ height: `${h * 100}%` }} />
                      ))}
                    </div>
                    
                    <button className={`p-2 text-on-surface-variant hover:${svc.statusColor} transition-all active:scale-90`}>
                      {svc.offline ? <Play size={16} /> : <Settings2 size={16} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Node Bottom Detail View */}
        {activeServer && (
          <section className="bg-surface border border-outline-variant rounded-2xl overflow-hidden mb-8">
            <div className="grid grid-cols-12 divide-x divide-outline-variant">
              <div className="col-span-12 lg:col-span-4 p-6">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Node Metadata</h4>
                <div className="space-y-3">
                  {[
                    ['Hostname', activeServer.hostname || 'prod-east-01.mono'],
                    ['IP Address', activeServer.ip_address || '10.0.4.122'],
                    ['Instance', 'C5.4xlarge'],
                    ['Uptime', '142 Days, 4h']
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2 border-b border-outline-variant last:border-0">
                      <span className="text-xs text-on-surface-variant">{k}</span>
                      <span className="text-xs font-bold text-on-surface">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="col-span-12 lg:col-span-8 p-6 bg-surface-container/30">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4 font-headline">Recent Lifecycle Events</h4>
                <div className="space-y-3">
                  {RECENT_INCIDENTS.map((inc, idx) => {
                    const Icon = inc.icon;
                    return (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-outline-variant hover:border-primary/30 transition-colors">
                        <div className={`w-8 h-8 rounded-full ${inc.bg} flex items-center justify-center ${inc.color} flex-shrink-0`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-on-surface truncate">{inc.title}</p>
                            <span className="text-[10px] text-on-surface-variant/40 ml-2 shrink-0">{inc.date}</span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant mt-0.5 line-clamp-1">{inc.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
