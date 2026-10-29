import { useState, useEffect } from 'react';
import { Satellite, Wifi, WifiOff, Loader2, CheckCircle2, XCircle, ChevronRight, ChevronLeft, Thermometer, Compass, Gauge, MapPin, Zap } from 'lucide-react';
import { useMissionStore } from '../../stores/missionStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { sensorRegistry } from '../sensors/registry';

// ─────────────────────────────────────────────────────────────────────────────
// Setup Wizard — First-launch configuration
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'welcome' | 'connection' | 'sensors' | 'confirm';
type TestState = 'idle' | 'connecting' | 'connected' | 'failed' | 'stale';

const SENSOR_CARDS = [
  {
    id: 'dht11',
    name: 'DHT11',
    icon: Thermometer,
    description: 'Digital temperature & humidity sensor',
    fields: ['Temperature (°C)', 'Relative Humidity (%)'],
    color: 'from-cyan-500/20 to-cyan-500/5',
    border: 'border-cyan-500/40',
    iconColor: 'text-cyan-400',
    required: true,
  },
  {
    id: 'mpu6050',
    name: 'MPU6050',
    icon: Compass,
    description: '6-axis IMU with accelerometer & gyroscope',
    fields: ['Accel X/Y/Z (m/s²)', 'Gyro X/Y/Z (°/s)'],
    color: 'from-violet-500/20 to-violet-500/5',
    border: 'border-violet-500/40',
    iconColor: 'text-violet-400',
  },
  {
    id: 'bmp280',
    name: 'BMP280',
    icon: Gauge,
    description: 'Barometric pressure & temperature sensor',
    fields: ['Pressure (hPa)', 'Temperature (°C)', 'bmpAltitude (m)'],
    color: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/40',
    iconColor: 'text-amber-400',
  },
  {
    id: 'gps',
    name: 'GPS / NEO-6M',
    icon: MapPin,
    description: 'GPS receiver for position & velocity',
    fields: ['Latitude/Longitude', 'Altitude (m)', 'Speed (km/h)', 'Satellites'],
    color: 'from-emerald-500/20 to-emerald-500/5',
    border: 'border-emerald-500/40',
    iconColor: 'text-emerald-400',
  },
];

interface ConnectionTestResult {
  state: TestState;
  message: string;
  latestPacket: string | null;
  latencyMs?: number;
}

function ConnectionTester({ wsUrl }: { wsUrl: string }) {
  const [result, setResult] = useState<ConnectionTestResult>({
    state: 'idle',
    message: 'Click "Test Connection" to verify your WebSocket endpoint.',
    latestPacket: null,
  });
  const [ws, setWs] = useState<WebSocket | null>(null);

  const runTest = () => {
    if (ws) { ws.close(); setWs(null); }
    setResult({ state: 'connecting', message: `Connecting to ${wsUrl}…`, latestPacket: null });
    const start = Date.now();
    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
    } catch (e) {
      setResult({ state: 'failed', message: `Invalid URL: ${(e as Error).message}`, latestPacket: null });
      return;
    }
    setWs(socket);
    const timeout = setTimeout(() => {
      socket.close();
      setResult({ state: 'failed', message: 'Connection timed out (5 seconds). Is the bridge running?', latestPacket: null });
    }, 5000);

    socket.onopen = () => {
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      setResult((r) => ({ ...r, state: 'connected', message: `Connected in ${latencyMs}ms. Waiting for first packet…`, latencyMs }));
    };
    socket.onmessage = (e) => {
      clearTimeout(timeout);
      setResult((r) => ({ ...r, state: 'connected', message: 'Live data confirmed.', latestPacket: e.data }));
    };
    socket.onerror = () => {
      clearTimeout(timeout);
      setResult({ state: 'failed', message: `Cannot reach ${wsUrl}. Ensure the bridge is running: node bridge.js`, latestPacket: null });
    };
    socket.onclose = (ev) => {
      if (result.state !== 'connected') {
        setResult({ state: 'failed', message: `Connection closed (code ${ev.code}). Bridge may have rejected the connection.`, latestPacket: null });
      }
    };
  };

  useEffect(() => () => { ws?.close(); }, [ws]);

  const Icon = result.state === 'connecting' ? Loader2
    : result.state === 'connected' ? CheckCircle2
    : result.state === 'failed' ? XCircle
    : Wifi;

  const iconClass = result.state === 'connected' ? 'text-emerald-400'
    : result.state === 'failed' ? 'text-red-400'
    : result.state === 'connecting' ? 'text-cyan-400 animate-spin'
    : 'text-slate-400';

  return (
    <div className="space-y-3">
      <button
        onClick={runTest}
        disabled={result.state === 'connecting'}
        className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        <Wifi size={15} />
        Test Connection
      </button>

      <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
        <Icon size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-300">{result.message}</p>
          {result.latestPacket && (
            <pre className="mt-2 text-xs text-emerald-300 bg-slate-900/60 p-2 rounded overflow-x-auto">
              {JSON.stringify(JSON.parse(result.latestPacket), null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export function SetupWizard() {
  const mission = useMissionStore();
  const [step, setStep] = useState<Step>('welcome');
  const [missionName, setMissionName] = useState(mission.missionName);
  const [deviceId, setDeviceId] = useState(mission.deviceId);
  const [wsUrl, setWsUrl] = useState(mission.wsUrl);
  const [selectedSensors, setSelectedSensors] = useState<string[]>(
    mission.isSetupComplete ? mission.configuredSensorIds : ['dht11']
  );

  const toggleSensor = (id: string) => {
    if (id === 'dht11') return; // DHT11 always selected in initial config
    setSelectedSensors((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleComplete = () => {
    // Enable selected sensors in registry
    sensorRegistry.enableSensors(selectedSensors);
    useDashboardStore.getState().syncSensorsWithLayout(selectedSensors);
    mission.completeMission({
      missionName,
      deviceId,
      wsUrl,
      configuredSensorIds: selectedSensors,
    });
  };

  const steps: Step[] = ['welcome', 'connection', 'sensors', 'confirm'];
  const stepIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center p-4">
      {/* Starfield background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() > 0.8 ? 2 : 1,
              height: Math.random() > 0.8 ? 2 : 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.7 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-6 flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                i < stepIdx ? 'bg-cyan-500 border-cyan-500 text-slate-900'
                : i === stepIdx ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                : 'border-slate-700 text-slate-600'
              }`}>{i + 1}</div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px transition-all ${i < stepIdx ? 'bg-cyan-500' : 'bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">

          {/* ── Welcome ──────────────────────────────────────────────────── */}
          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center">
                    <Satellite size={40} className="text-cyan-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">ORBITRA</h1>
                <p className="text-slate-400 mt-1">Modular Aerospace Telemetry Platform</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-5 text-left space-y-2">
                <h2 className="text-lg font-semibold text-white">Configure Your ORBITRA Mission</h2>
                <p className="text-slate-400 text-sm">
                  Select the sensors currently connected to your telemetry system and configure your mission parameters.
                  This setup wizard runs once and can be reconfigured at any time from Settings.
                </p>
              </div>
              <button
                onClick={() => setStep('connection')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
              >
                Begin Mission Configuration <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── Connection ────────────────────────────────────────────────── */}
          {step === 'connection' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Mission Parameters</h2>
                <p className="text-slate-400 text-sm mt-1">Configure your mission identity and telemetry endpoint.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Mission Name</label>
                  <input
                    value={missionName}
                    onChange={e => setMissionName(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/60 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                    placeholder="ORBITRA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Device ID</label>
                  <input
                    value={deviceId}
                    onChange={e => setDeviceId(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/60 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/40 transition-all"
                    placeholder="esp8266-rx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">WebSocket URL</label>
                  <input
                    value={wsUrl}
                    onChange={e => setWsUrl(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-600/60 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/40 transition-all font-mono"
                    placeholder="ws://localhost:8081"
                  />
                </div>
                <ConnectionTester wsUrl={wsUrl} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('welcome')} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800/60 transition-all text-sm">
                  <ChevronLeft size={15} /> Back
                </button>
                <button onClick={() => setStep('sensors')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all text-sm">
                  Next: Select Sensors <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Sensor Selection ──────────────────────────────────────────── */}
          {step === 'sensors' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Select Connected Sensors</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Select the sensors <em>currently connected</em> to your device. Selecting a sensor registers it for monitoring — it does not verify hardware presence.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {SENSOR_CARDS.map((card) => {
                  const selected = selectedSensors.includes(card.id);
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.id}
                      onClick={() => toggleSensor(card.id)}
                      className={`relative w-full text-left p-4 rounded-xl border transition-all ${
                        selected
                          ? `bg-gradient-to-r ${card.color} ${card.border} shadow-lg`
                          : 'bg-slate-800/40 border-slate-700/40 hover:border-slate-600/60'
                      } ${card.required ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg bg-slate-800/60 flex items-center justify-center shrink-0 ${card.iconColor}`}>
                          <Icon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{card.name}</span>
                            {card.required && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Required</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5">{card.description}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {card.fields.map(f => (
                              <span key={f} className="text-xs px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/40">{f}</span>
                            ))}
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                          selected ? `${card.border} bg-gradient-to-br ${card.color}` : 'border-slate-600'
                        }`}>
                          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-2">
                <Zap size={15} className="text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300">
                  Sensors will show <strong>"Configured — awaiting telemetry"</strong> until real data arrives. No readings will be fabricated for unconnected sensors.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('connection')} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800/60 transition-all text-sm">
                  <ChevronLeft size={15} /> Back
                </button>
                <button onClick={() => setStep('confirm')} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all text-sm">
                  Review & Launch <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Confirm ───────────────────────────────────────────────────── */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Mission Summary</h2>
                <p className="text-slate-400 text-sm mt-1">Review your configuration before launching the dashboard.</p>
              </div>
              <div className="space-y-3">
                {[
                  ['Mission Name', missionName],
                  ['Device ID', deviceId],
                  ['WebSocket URL', wsUrl],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400 text-sm">{label}</span>
                    <span className="text-white text-sm font-mono">{value}</span>
                  </div>
                ))}
                <div className="pt-1">
                  <p className="text-slate-400 text-sm mb-2">Configured Sensors</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSensors.map(id => {
                      const card = SENSOR_CARDS.find(c => c.id === id);
                      return card ? (
                        <span key={id} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border bg-gradient-to-r ${card.color} ${card.border}`}>
                          <card.icon size={11} className={card.iconColor} />
                          <span className="text-white">{card.name}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  All configured sensors will display <strong className="text-slate-300">"Configured — awaiting telemetry"</strong> until real data arrives from your hardware. You can reconfigure this at any time from the Settings page.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('sensors')} className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800/60 transition-all text-sm">
                  <ChevronLeft size={15} /> Back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:opacity-90 transition-all"
                >
                  <Satellite size={18} /> Launch ORBITRA Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          ORBITRA Telemetry Platform · v1.0.0
        </p>
      </div>
    </div>
  );
}
