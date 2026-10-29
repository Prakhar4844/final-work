import { useMemo } from 'react';
import { MapPin, Navigation, Signal, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  title?: string;
}

export function GpsMapWidget({ title = 'GPS Position & Ground Track' }: Props) {
  const latitude = useTelemetryStore(s => s.latestValues['gps.latitude'] ?? null);
  const longitude = useTelemetryStore(s => s.latestValues['gps.longitude'] ?? null);
  const altitude = useTelemetryStore(s => s.latestValues['gps.altitude'] ?? null);
  const speed = useTelemetryStore(s => s.latestValues['gps.speed'] ?? null);
  const satellites = useTelemetryStore(s => s.latestValues['gps.satellites'] ?? null);
  const gpsFix = useTelemetryStore(s => s.latestValues['gps.gpsFix'] ?? s.latestValues['gps.fix'] ?? null);
  const timestamp = useTelemetryStore(s => s.latestTimestamps['gps.latitude'] ?? s.latestTimestamps['gps.gpsFix'] ?? null);
  const connState = useTelemetryStore(s => s.connectionState);

  // Status calculation:
  // fix === 0 -> NO FIX
  // fix >= 1 -> LIVE fix
  // no data yet -> WAITING
  const hasData = gpsFix !== null || satellites !== null;
  const hasLock = (gpsFix !== null && gpsFix > 0) && latitude !== null && longitude !== null && !(latitude === 0 && longitude === 0);
  const isStale = connState === 'stale' || (timestamp && Date.now() - timestamp > 10000);

  const status = !hasData ? 'WAITING' : !hasLock ? 'NO FIX' : isStale ? 'STALE' : 'LIVE';
  const statusColor = status === 'LIVE' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : status === 'NO FIX' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : status === 'STALE' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-slate-400 bg-slate-800/60 border-slate-700/40';

  // Map projection: Equirectangular mapping from [-180, 180] and [-90, 90] to percent [0, 100%]
  const mapPoint = useMemo(() => {
    if (!hasLock || latitude === null || longitude === null) return null;
    const x = ((longitude + 180) / 360) * 100;
    const y = ((90 - latitude) / 180) * 100;
    return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
  }, [hasLock, latitude, longitude]);

  return (
    <div className="h-full flex flex-col bg-slate-950/70 p-3 overflow-hidden select-none">
      {/* Top Bar Readout */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-cyan-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${statusColor}`}>
            {status}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1 text-slate-400">
            <Signal size={12} className={satellites && satellites >= 4 ? 'text-emerald-400' : 'text-slate-500'} />
            <span>Sats: <strong className="text-white">{satellites !== null ? satellites : '—'}</strong></span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Fix: <strong className={hasLock ? 'text-emerald-400' : 'text-amber-400'}>{gpsFix !== null ? (gpsFix === 1 ? '3D' : gpsFix === 2 ? 'DGPS' : 'None') : '—'}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="flex-1 min-h-0 my-2 relative rounded-lg border border-slate-800 bg-[#070b14] overflow-hidden flex items-center justify-center">
        {/* Simplified Earth Continents Vector / Grid */}
        <svg className="w-full h-full opacity-35" viewBox="0 0 360 180" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="360" height="180" fill="url(#grid)" />
          {/* Prime meridian and equator */}
          <line x1="180" y1="0" x2="180" y2="180" stroke="#0ea5e9" strokeWidth="0.7" strokeDasharray="3 3" />
          <line x1="0" y1="90" x2="360" y2="90" stroke="#0ea5e9" strokeWidth="0.7" strokeDasharray="3 3" />

          {/* Stylized continent outlines for global geospatial reference */}
          <path
            d="M 60,35 Q 85,25 100,45 T 70,80 T 50,50 Z
               M 75,95 Q 90,90 100,115 T 85,155 T 70,120 Z
               M 160,30 Q 190,20 220,35 T 190,65 T 155,50 Z
               M 170,75 Q 195,70 200,95 T 185,140 T 160,105 Z
               M 230,35 Q 290,25 320,50 T 270,85 T 225,55 Z
               M 280,110 Q 315,105 320,135 T 275,145 Z"
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="0.75"
          />
        </svg>

        {/* Live Coordinate Crosshair Beacon */}
        {hasLock && mapPoint ? (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-700 pointer-events-none"
            style={{ left: `${mapPoint.x}%`, top: `${mapPoint.y}%` }}
          >
            {/* Pulsing ring */}
            <div className="w-8 h-8 rounded-full bg-cyan-400/20 border border-cyan-400 animate-ping absolute -top-4 -left-4" />
            {/* Center target point */}
            <div className="w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-lg relative flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-white" />
            </div>
            {/* Crosshair lines */}
            <div className="w-12 h-px bg-cyan-400/50 absolute top-1.5 -left-4 pointer-events-none" />
            <div className="h-12 w-px bg-cyan-400/50 absolute -top-4 left-1.5 pointer-events-none" />
          </div>
        ) : (
          /* No Fix / Waiting Overlay */
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 p-4 text-center backdrop-blur-[2px]">
            <AlertCircle size={24} className="text-amber-400 mb-1.5 animate-pulse" />
            <p className="text-xs font-semibold text-slate-300">
              {status === 'WAITING' ? 'Awaiting GPS Telemetry' : 'No Valid GPS Fix'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
              {status === 'WAITING'
                ? 'Check that receiver ESP8266 is transmitting GPS packets.'
                : 'GPS receiver is active. Satellite lock in progress.'}
            </p>
          </div>
        )}

        {/* Coordinate HUD Tag */}
        <div className="absolute bottom-1.5 left-2 bg-slate-900/90 border border-slate-800 rounded px-2 py-1 font-mono text-[10px] text-slate-300 flex gap-3 shadow-md">
          <span>Lat: <strong className="text-cyan-300">{hasLock && latitude !== null ? latitude.toFixed(5) : 'N/A'}</strong></span>
          <span>Lon: <strong className="text-cyan-300">{hasLock && longitude !== null ? longitude.toFixed(5) : 'N/A'}</strong></span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-800/60 font-mono text-center text-xs">
        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase">Latitude</p>
          <p className="font-semibold text-white truncate">{hasLock && latitude !== null ? `${latitude.toFixed(4)}°` : 'N/A'}</p>
        </div>
        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase">Longitude</p>
          <p className="font-semibold text-white truncate">{hasLock && longitude !== null ? `${longitude.toFixed(4)}°` : 'N/A'}</p>
        </div>
        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase">Altitude</p>
          <p className="font-semibold text-cyan-300 truncate">{altitude !== null ? `${altitude.toFixed(1)} m` : 'N/A'}</p>
        </div>
        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
          <p className="text-[10px] text-slate-500 uppercase">Speed</p>
          <p className="font-semibold text-emerald-300 truncate">{speed !== null ? `${speed.toFixed(1)} km/h` : 'N/A'}</p>
        </div>
      </div>
    </div>
  );
}
