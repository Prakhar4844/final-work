import { useState } from 'react';
import { Cpu, CheckCircle2, Clock, Activity, ToggleLeft, ToggleRight, RefreshCw, Thermometer, Compass, Gauge, MapPin, AlertTriangle } from 'lucide-react';
import { sensorRegistry } from './registry';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useMissionStore } from '../../stores/missionStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { telemetryService } from '../../services/telemetryService';
import { SetupWizard } from '../setup/SetupWizard';
import { formatDistanceToNow } from 'date-fns';
import type { SensorStatus } from '../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Sensors Management Page
// ─────────────────────────────────────────────────────────────────────────────

const SENSOR_ICONS: Record<string, typeof Thermometer> = {
  dht11: Thermometer,
  mpu6050: Compass,
  bmp280: Gauge,
  gps: MapPin,
};

function StatusBadge({ status }: { status: SensorStatus }) {
  const cfg: Record<SensorStatus, { color: string; label: string }> = {
    configured:  { color: 'text-slate-400 bg-slate-800 border-slate-700', label: 'Configured — awaiting telemetry' },
    receiving:   { color: 'text-emerald-400 bg-emerald-900/20 border-emerald-800', label: 'Receiving' },
    stale:       { color: 'text-amber-400 bg-amber-900/20 border-amber-800', label: 'Stale' },
    error:       { color: 'text-red-400 bg-red-900/20 border-red-800', label: 'Error' },
    disabled:    { color: 'text-slate-600 bg-slate-900 border-slate-800', label: 'Disabled' },
  };
  const c = cfg[status];
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${c.color}`}>{c.label}</span>
  );
}

export function SensorsPage() {
  const latestValues = useTelemetryStore(s => s.latestValues);
  const latestTimestamps = useTelemetryStore(s => s.latestTimestamps);
  const mission = useMissionStore();
  const [sensors, setSensors] = useState(() => sensorRegistry.getAllSensors());
  const [showWizard, setShowWizard] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => setSensors(sensorRegistry.getAllSensors());

  const toggleSensor = (sensorId: string, enabled: boolean) => {
    sensorRegistry.updateSensor(sensorId, { enabled, status: enabled ? 'configured' : 'disabled' });
    const newEnabled = sensors.filter(s => s.enabled).map(s => s.sensorId);
    const updated = enabled
      ? [...newEnabled.filter(id => id !== sensorId), sensorId]
      : newEnabled.filter(id => id !== sensorId);
    mission.updateConfig({ configuredSensorIds: updated });
    useDashboardStore.getState().syncSensorsWithLayout(updated);
    telemetryService.configure({
      wsUrl: mission.wsUrl,
      deviceId: mission.deviceId,
      missionId: mission.missionName,
      enabledSensorIds: updated,
    });
    refresh();
  };

  if (showWizard) {
    return (
      <div>
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <button onClick={() => setShowWizard(false)} className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-all">
            ← Back to Sensors
          </button>
        </div>
        <SetupWizard />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu size={20} className="text-cyan-400" /> Sensors
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage registered sensor adapters and view telemetry status</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/25 transition-all"
          >
            <RefreshCw size={13} /> Reconfigure Mission
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sensors.map(sensor => {
          const Icon = SENSOR_ICONS[sensor.sensorId] ?? Cpu;
          const isExpanded = expandedId === sensor.sensorId;
          const lastSeen = sensor.lastSeenTimestamp
            ? formatDistanceToNow(new Date(sensor.lastSeenTimestamp), { addSuffix: true })
            : null;

          return (
            <div key={sensor.sensorId} className="bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 px-4 py-4 cursor-pointer hover:bg-slate-800/30 transition-all"
                onClick={() => setExpandedId(isExpanded ? null : sensor.sensorId)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sensor.enabled ? 'bg-slate-800 text-cyan-400' : 'bg-slate-900 text-slate-600'}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${sensor.enabled ? 'text-white' : 'text-slate-500'}`}>{sensor.displayName}</span>
                    <StatusBadge status={sensor.status} />
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{sensor.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {lastSeen && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 hidden sm:flex">
                      <Clock size={11} />
                      {lastSeen}
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); toggleSensor(sensor.sensorId, !sensor.enabled); }}
                    className="transition-all"
                    title={sensor.enabled ? 'Disable sensor' : 'Enable sensor'}
                  >
                    {sensor.enabled
                      ? <ToggleRight size={24} className="text-cyan-400" />
                      : <ToggleLeft size={24} className="text-slate-600" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-800 px-4 py-4 space-y-4 bg-slate-900/40">
                  {/* Fields */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Registered Fields</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {sensor.fields.map(field => {
                        const ref = `${sensor.sensorId}.${field.fieldKey}`;
                        const value = latestValues[ref] ?? null;
                        const ts = latestTimestamps[ref] ?? null;
                        return (
                          <div key={field.fieldKey} className="bg-slate-800/40 rounded-lg p-2.5 border border-slate-700/30">
                            <p className="text-slate-400 text-xs">{field.label}</p>
                            {value !== null ? (
                              <p className="text-cyan-300 text-sm font-mono font-semibold mt-0.5">
                                {value.toFixed(field.precision ?? 2)} {field.unit}
                              </p>
                            ) : (
                              <p className="text-slate-600 text-xs italic mt-0.5">awaiting data</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!sensor.enabled && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/40 rounded-lg px-3 py-2">
                      <AlertTriangle size={12} className="text-amber-500" />
                      Sensor is disabled. Enable it to receive telemetry for its fields.
                    </div>
                  )}

                  {sensor.enabled && sensor.status === 'configured' && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800/40 rounded-lg px-3 py-2">
                      <Clock size={12} />
                      Configured and awaiting first telemetry packet. Verify hardware is connected and bridge is running.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
