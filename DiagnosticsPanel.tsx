import { useTelemetryStore } from '../../stores/telemetryStore';
import { Terminal, AlertCircle, Wifi, Package } from 'lucide-react';
import { format } from 'date-fns';

export function DiagnosticsPanel() {
  const diag = useTelemetryStore(s => s.diagnostics);
  const state = useTelemetryStore(s => s.connectionState);

  return (
    <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/80">
        <Terminal size={14} className="text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Diagnostics</h3>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Package size={11} />{diag.received.toLocaleString()} recv</span>
          {diag.invalid > 0 && <span className="flex items-center gap-1 text-red-400"><AlertCircle size={11} />{diag.invalid} invalid</span>}
          {diag.missedCount > 0 && <span className="text-amber-400">{diag.missedCount} missed pkts</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Last raw packet */}
        <div className="p-4 border-b md:border-b-0 md:border-r border-slate-800/40">
          <p className="text-xs text-slate-500 mb-2">Last Raw JSON Packet</p>
          {diag.lastRawJson ? (
            <pre className="text-xs text-emerald-300/90 font-mono leading-relaxed overflow-x-auto">
              {(() => { try { return JSON.stringify(JSON.parse(diag.lastRawJson), null, 2); } catch { return diag.lastRawJson; } })()}
            </pre>
          ) : (
            <p className="text-slate-600 text-xs italic">No packets received yet</p>
          )}
        </div>

        {/* Validation errors + connection events */}
        <div className="p-4 space-y-4">
          <div>
            <p className="text-xs text-slate-500 mb-2">Validation Errors (last 20)</p>
            {diag.validationErrors.length === 0 ? (
              <p className="text-emerald-400 text-xs">No errors</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {diag.validationErrors.slice(0, 20).map((e, i) => (
                  <p key={i} className="text-xs text-red-400/80 font-mono">{e}</p>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-2">Connection Events</p>
            {diag.connectionEvents.length === 0 ? (
              <p className="text-slate-600 text-xs italic">None yet</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {diag.connectionEvents.slice(0, 15).map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      ev.type === 'connected' ? 'bg-emerald-500'
                      : ev.type === 'error' ? 'bg-red-500'
                      : ev.type === 'disconnected' ? 'bg-red-400'
                      : 'bg-cyan-500'
                    }`} />
                    <span className="text-slate-500 font-mono">{format(new Date(ev.at), 'HH:mm:ss')}</span>
                    <span className="text-slate-400 capitalize">{ev.type}</span>
                    {ev.detail && <span className="text-slate-600 truncate text-xs">{ev.detail}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
