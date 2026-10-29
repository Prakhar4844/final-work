import { useTelemetryStore } from '../../stores/telemetryStore';
import { useMissionStore } from '../../stores/missionStore';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Wifi, WifiOff, Loader2, AlertTriangle, CheckCircle2,
  Package, Clock, AlertCircle, Hash,
} from 'lucide-react';
import type { ConnectionState } from '../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Connection Status Widget
// Displays WebSocket health, packet stats, last raw JSON.
// ─────────────────────────────────────────────────────────────────────────────

function StateDisplay({ state }: { state: ConnectionState }) {
  const configs: Record<ConnectionState, { icon: typeof Wifi; color: string; bg: string; label: string; desc: string }> = {
    idle:         { icon: Wifi, color: 'text-slate-400', bg: 'bg-slate-800', label: 'Idle', desc: 'Not started' },
    connecting:   { icon: Loader2, color: 'text-cyan-400', bg: 'bg-cyan-900/30', label: 'Connecting', desc: 'Establishing connection…' },
    connected:    { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/20', label: 'Connected', desc: 'Live telemetry active' },
    disconnected: { icon: WifiOff, color: 'text-red-400', bg: 'bg-red-900/20', label: 'Disconnected', desc: 'Reconnecting with backoff…' },
    stale:        { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-900/20', label: 'Stale Data', desc: 'No packets for >10 seconds' },
    error:        { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/20', label: 'Error', desc: 'Connection error' },
  };
  const cfg = configs[state];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${cfg.bg} border border-slate-700/40`}>
      <Icon size={18} className={`${cfg.color} ${state === 'connecting' ? 'animate-spin' : ''}`} />
      <div>
        <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
        <p className="text-xs text-slate-500">{cfg.desc}</p>
      </div>
    </div>
  );
}

export function ConnectionStatusWidget() {
  const state = useTelemetryStore(s => s.connectionState);
  const diag = useTelemetryStore(s => s.diagnostics);
  const wsUrl = useMissionStore(s => s.wsUrl);

  const lastSeen = diag.lastTimestamp
    ? formatDistanceToNow(new Date(diag.lastTimestamp), { addSuffix: true })
    : '—';

  const stats = [
    { icon: Package, label: 'Received', value: diag.received.toLocaleString(), color: 'text-cyan-400' },
    { icon: AlertTriangle, label: 'Invalid', value: diag.invalid.toString(), color: diag.invalid > 0 ? 'text-red-400' : 'text-slate-500' },
    { icon: Hash, label: 'Last Pkt#', value: diag.lastPacketNo?.toString() ?? '—', color: 'text-slate-300' },
    { icon: Clock, label: 'Last Seen', value: lastSeen, color: 'text-slate-300' },
  ];

  return (
    <div className="h-full flex flex-col p-4 space-y-3">
      <StateDisplay state={state} />

      <div className="text-xs text-slate-600 font-mono truncate px-1">{wsUrl}</div>

      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={11} className="text-slate-500" />
              <span className="text-slate-500 text-xs">{label}</span>
            </div>
            <p className={`text-sm font-mono font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {diag.lastRawJson && (
        <div className="flex-1 min-h-0">
          <p className="text-xs text-slate-500 mb-1 px-1">Last Raw Packet</p>
          <pre className="text-xs text-emerald-300/80 bg-slate-900/60 border border-slate-800 rounded-lg p-2 overflow-auto h-full font-mono leading-relaxed">
            {(() => { try { return JSON.stringify(JSON.parse(diag.lastRawJson), null, 2); } catch { return diag.lastRawJson; } })()}
          </pre>
        </div>
      )}

      {diag.connectionEvents.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-500 px-1">Recent Events</p>
          {diag.connectionEvents.slice(0, 3).map((ev, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                ev.type === 'connected' ? 'bg-emerald-500'
                : ev.type === 'error' ? 'bg-red-500'
                : ev.type === 'disconnected' ? 'bg-red-400'
                : 'bg-cyan-500'
              }`} />
              <span className="text-slate-500">{format(new Date(ev.at), 'HH:mm:ss')}</span>
              <span className="text-slate-400 capitalize">{ev.type}</span>
              {ev.detail && <span className="text-slate-600 truncate">{ev.detail}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
