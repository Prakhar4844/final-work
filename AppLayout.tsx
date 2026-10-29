import { useEffect, useState } from 'react';
import { useLocation, NavLink, Outlet } from 'react-router-dom';
import {
  Satellite, LayoutDashboard, Radio, BarChart2, Cpu, Database,
  Settings, Wifi, WifiOff, Loader2, AlertTriangle, Clock, Package,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTelemetryStore } from '../stores/telemetryStore';
import { useMissionStore } from '../stores/missionStore';
import { sensorRegistry } from '../features/sensors/registry';
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// App Layout — Header + Sidebar + Content
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/explorer', icon: Radio, label: 'Telemetry Explorer' },
  { to: '/plots', icon: BarChart2, label: 'Plot Builder' },
  { to: '/sensors', icon: Cpu, label: 'Sensors' },
  { to: '/history', icon: Database, label: 'Data History' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function ConnectionBadge() {
  const state = useTelemetryStore(s => s.connectionState);
  const diag = useTelemetryStore(s => s.diagnostics);
  const lastTs = diag.lastTimestamp;

  const config = {
    idle:         { icon: Wifi, color: 'text-slate-500', bg: 'bg-slate-800', dot: 'bg-slate-600', label: 'Idle' },
    connecting:   { icon: Loader2, color: 'text-cyan-400', bg: 'bg-cyan-500/10', dot: 'bg-cyan-400 animate-pulse', label: 'Connecting' },
    connected:    { icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400 animate-pulse', label: 'Connected' },
    disconnected: { icon: WifiOff, color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-500', label: 'Disconnected' },
    stale:        { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400', label: 'Stale Data' },
    error:        { icon: WifiOff, color: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-500', label: 'Error' },
  }[state];

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} border border-slate-700/40`}>
      <div className={`w-2 h-2 rounded-full ${config.dot}`} />
      <Icon size={14} className={`${config.color} ${state === 'connecting' ? 'animate-spin' : ''}`} />
      <span className={`text-xs font-medium ${config.color} hidden sm:block`}>{config.label}</span>
      {lastTs && state === 'connected' && (
        <span className="text-xs text-slate-500 hidden lg:block">
          · {format(new Date(lastTs), 'HH:mm:ss')}
        </span>
      )}
    </div>
  );
}

function UtcClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono hidden md:flex">
      <Clock size={13} />
      {format(time, 'yyyy-MM-dd HH:mm:ss')} UTC
    </div>
  );
}

function PacketCounter() {
  const received = useTelemetryStore(s => s.diagnostics.received);
  const invalid = useTelemetryStore(s => s.diagnostics.invalid);
  const lastPacketNo = useTelemetryStore(s => s.diagnostics.lastPacketNo);
  return (
    <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400">
      {lastPacketNo !== null && (
        <span className="text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded text-[11px]">
          PKT #{lastPacketNo}
        </span>
      )}
      <div className="flex items-center gap-1">
        <Package size={13} />
        <span className="text-slate-300">{received.toLocaleString()}</span>
        {invalid > 0 && <span className="text-red-400">/ {invalid} bad</span>}
      </div>
    </div>
  );
}

function SensorIndicators() {
  const configuredIds = useMissionStore(s => s.configuredSensorIds);
  const connState = useTelemetryStore(s => s.connectionState);
  const sensors = sensorRegistry.getAllSensors();

  return (
    <div className="hidden xl:flex items-center gap-1.5">
      {sensors.map(s => {
        const isConfigured = configuredIds.includes(s.sensorId);
        if (!isConfigured) return null;

        const isLive = s.status === 'receiving' && connState === 'connected';
        const isStale = s.status === 'stale' || connState === 'stale';

        const dotColor = isLive ? 'bg-emerald-400 animate-pulse'
          : isStale ? 'bg-amber-400'
          : 'bg-slate-600';

        const textColor = isLive ? 'text-emerald-300'
          : isStale ? 'text-amber-300'
          : 'text-slate-400';

        return (
          <div
            key={s.sensorId}
            className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800/70 border border-slate-700/50 text-[11px] font-mono"
            title={`${s.displayName}: ${s.status}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            <span className={textColor}>{s.displayName}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const missionName = useMissionStore(s => s.missionName);

  return (
    <div className="flex flex-col h-screen bg-[#0a0d14] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-4 px-4 py-2 bg-slate-900/90 backdrop-blur-sm border-b border-slate-700/50 shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center shrink-0">
            <Satellite size={16} className="text-cyan-400" />
          </div>
          <div className="hidden sm:block">
            <span className="text-white font-bold tracking-widest text-sm">ORBITRA</span>
            <span className="text-slate-500 text-xs ml-2 hidden md:inline">{missionName}</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-end gap-3">
          <SensorIndicators />
          <UtcClock />
          <PacketCounter />
          <ConnectionBadge />
          <NavLink to="/settings" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <Settings size={16} />
          </NavLink>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`flex flex-col bg-slate-900/70 border-r border-slate-700/40 transition-all duration-300 shrink-0 ${sidebarCollapsed ? 'w-14' : 'w-52'}`}>
          <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto px-2">
            {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all group ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon size={16} className="shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="p-2 border-t border-slate-800">
            <button
              onClick={() => setSidebarCollapsed(c => !c)}
              className="w-full flex items-center justify-center p-1.5 text-slate-600 hover:text-slate-400 transition-all"
            >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
