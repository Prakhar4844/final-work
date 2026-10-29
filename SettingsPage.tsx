import { useState } from 'react';
import { Settings, RotateCcw, Trash2, Wifi, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { useMissionStore } from '../../stores/missionStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { telemetryService } from '../../services/telemetryService';

// ─────────────────────────────────────────────────────────────────────────────
// Settings Page
// ─────────────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const mission = useMissionStore();
  const clearHistory = useTelemetryStore(s => s.clearHistory);
  const resetLayout = useDashboardStore(s => s.resetToDefault);

  const [wsUrl, setWsUrl] = useState(mission.wsUrl);
  const [missionName, setMissionName] = useState(mission.missionName);
  const [deviceId, setDeviceId] = useState(mission.deviceId);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSave = () => {
    mission.updateConfig({ wsUrl, missionName, deviceId });
    telemetryService.stop();
    setTimeout(() => {
      telemetryService.configure({
        wsUrl, deviceId, missionId: missionName,
        enabledSensorIds: mission.configuredSensorIds,
      });
      telemetryService.start();
    }, 300);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetAll = () => {
    clearHistory();
    resetLayout(mission.configuredSensorIds);
    setConfirmReset(false);
  };

  const handleReconfigureMission = () => {
    mission.resetSetup();
    window.location.reload();
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings size={20} className="text-cyan-400" /> Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure telemetry connection and dashboard preferences</p>
      </div>

      {/* Connection */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Wifi size={14} className="text-cyan-400" /> Telemetry Connection</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Mission Name</label>
            <input value={missionName} onChange={e => setMissionName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700/50 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Device ID</label>
            <input value={deviceId} onChange={e => setDeviceId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700/50 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">WebSocket URL</label>
            <input value={wsUrl} onChange={e => setWsUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700/50 text-white rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500/50" />
            <p className="text-xs text-slate-600 mt-1">Bridge endpoint: ws://localhost:8081 (default)</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            : 'bg-cyan-500 text-slate-900 hover:bg-cyan-400'
          }`}
        >
          <RefreshCw size={14} className={saved ? '' : ''} />
          {saved ? 'Saved & Reconnecting…' : 'Save & Reconnect'}
        </button>
      </div>

      {/* Mission configuration */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Mission Configuration</h2>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {[
            ['Setup complete', mission.isSetupComplete ? 'Yes' : 'No'],
            ['Setup version', String(mission.setupVersion)],
            ['Configured sensors', mission.configuredSensorIds.join(', ')],
            ['Created', new Date(mission.createdAt).toLocaleString()],
            ['Updated', new Date(mission.updatedAt).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="bg-slate-800/40 rounded-lg p-2.5">
              <p className="text-slate-500">{k}</p>
              <p className="text-slate-300 font-mono mt-0.5">{v}</p>
            </div>
          ))}
        </div>
        <button
          onClick={handleReconfigureMission}
          className="flex items-center gap-2 px-4 py-2 border border-amber-500/40 text-amber-400 rounded-lg text-sm hover:bg-amber-500/10 transition-all"
        >
          <RotateCcw size={14} /> Reconfigure Mission Wizard
        </button>
      </div>

      {/* Dashboard */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Dashboard</h2>
        <button
          onClick={() => resetLayout(mission.configuredSensorIds)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-800 transition-all"
        >
          <RotateCcw size={14} /> Reset to Default Layout
        </button>
        <p className="text-xs text-slate-500">This resets widget positions to the default. Historical telemetry is not deleted.</p>
      </div>

      {/* Danger zone */}
      <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2"><AlertTriangle size={14} /> Danger Zone</h2>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="flex items-center gap-2 px-4 py-2 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-900/20 transition-all"
          >
            <Trash2 size={14} /> Clear In-Memory Telemetry Buffer
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-300">This clears the in-memory sample buffer (charts reset). Persisted DB data is not deleted.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="px-3 py-1.5 border border-slate-600 text-slate-300 rounded-lg text-xs hover:bg-slate-800 transition-all">Cancel</button>
              <button onClick={handleResetAll} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 transition-all">Confirm Clear</button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-slate-600 space-y-1 px-1">
        <p>ORBITRA Telemetry Platform v1.0.0</p>
        <p>Bridge: <a href="https://github.com" className="text-slate-500 hover:text-slate-400 inline-flex items-center gap-0.5" target="_blank" rel="noopener noreferrer">orbitra-telemetry-bridge <ExternalLink size={10} /></a></p>
      </div>
    </div>
  );
}
