import { useTelemetryStore } from '../../stores/telemetryStore';
import { sensorRegistry } from '../sensors/registry';
import { formatDistanceToNow, format } from 'date-fns';
import { Radio, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { DiagnosticsPanel } from './DiagnosticsPanel';

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry Explorer Page
// Live table of all registered fields with latest values and status.
// ─────────────────────────────────────────────────────────────────────────────

export function TelemetryExplorerPage() {
  const latestValues = useTelemetryStore(s => s.latestValues);
  const latestTimestamps = useTelemetryStore(s => s.latestTimestamps);
  const fields = sensorRegistry.getAllFields();
  const sensors = sensorRegistry.getAllSensors();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Radio size={20} className="text-cyan-400" /> Telemetry Explorer
        </h1>
        <p className="text-slate-400 text-sm mt-1">Live view of all registered sensor fields</p>
      </div>

      {/* Fields table */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-0 text-xs text-slate-500 px-4 py-2 border-b border-slate-800 bg-slate-900/80 uppercase tracking-wider">
          <span>Sensor · Field</span>
          <span>Latest Value</span>
          <span>Unit</span>
          <span>Quality</span>
          <span>Last Seen</span>
        </div>

        {fields.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-600 text-sm">
            No sensor fields registered. Configure sensors in the Sensors page.
          </div>
        )}

        {fields.map(({ sensorId, fieldDef }) => {
          const ref = `${sensorId}.${fieldDef.fieldKey}`;
          const value = latestValues[ref] ?? null;
          const ts = latestTimestamps[ref] ?? null;
          const sensor = sensors.find(s => s.sensorId === sensorId);
          const hasData = value !== null;

          return (
            <div key={ref} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-0 px-4 py-3 border-b border-slate-800/40 hover:bg-slate-800/30 transition-all items-center">
              <div>
                <p className="text-slate-300 text-sm font-medium">{fieldDef.label}</p>
                <p className="text-slate-600 text-xs font-mono">{sensor?.displayName ?? sensorId}</p>
              </div>

              <div>
                {hasData ? (
                  <span className="text-cyan-300 font-mono font-semibold text-sm">
                    {value!.toFixed(fieldDef.precision ?? 2)}
                  </span>
                ) : (
                  <span className="text-slate-600 text-sm italic">Configured — awaiting telemetry</span>
                )}
              </div>

              <span className="text-slate-500 text-xs font-mono px-2">{fieldDef.unit}</span>

              <div className="px-2">
                {hasData ? (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400">ok</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-slate-600" />
                    <span className="text-xs text-slate-600">waiting</span>
                  </div>
                )}
              </div>

              <div className="pl-2">
                {ts ? (
                  <span className="text-slate-500 text-xs">{formatDistanceToNow(new Date(ts), { addSuffix: true })}</span>
                ) : (
                  <span className="text-slate-700 text-xs">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostics */}
      <DiagnosticsPanel />
    </div>
  );
}
