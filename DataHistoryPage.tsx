import { useState, useEffect } from 'react';
import { Database, Download, Search, RefreshCw } from 'lucide-react';
import { format, subHours, subMinutes } from 'date-fns';
import { sensorRegistry } from '../sensors/registry';

// ─────────────────────────────────────────────────────────────────────────────
// Data History Page — queries backend for historical telemetry
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND = 'http://localhost:3001';

interface HistoryRow {
  id: number;
  ts: number;
  sensor_id: string;
  field_key: string;
  value: number;
  packet_no: number | null;
  quality: string;
}

const PRESETS = [
  { label: 'Last 15m', from: () => subMinutes(Date.now(), 15).getTime() },
  { label: 'Last 1h', from: () => subHours(Date.now(), 1).getTime() },
  { label: 'Last 6h', from: () => subHours(Date.now(), 6).getTime() },
  { label: 'Last 24h', from: () => subHours(Date.now(), 24).getTime() },
];

export function DataHistoryPage() {
  const fields = sensorRegistry.getAllFields();
  const [selectedField, setSelectedField] = useState(fields[0] ? `${fields[0].sensorId}.${fields[0].fieldDef.fieldKey}` : '');
  const [from, setFrom] = useState(subHours(Date.now(), 1).getTime());
  const [to, setTo] = useState(Date.now());
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [sensorId, fieldKey] = selectedField.split('.');

  const fetchHistory = async () => {
    if (!selectedField) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BACKEND}/api/telemetry/range?sensorId=${sensorId}&fieldKey=${fieldKey}&from=${from}&to=${to}&limit=500`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { rows: HistoryRow[]; total: number };
      setRows(data.rows ?? []);
      setTotalCount(data.total ?? 0);
    } catch (err) {
      setError(`Backend unavailable: ${err instanceof Error ? err.message : String(err)}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (selectedField) fetchHistory(); }, [selectedField, from, to]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportCSV = async () => {
    if (!selectedField) return;
    try {
      const res = await fetch(
        `${BACKEND}/api/telemetry/export?sensorId=${sensorId}&fieldKey=${fieldKey}&from=${from}&to=${to}`
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orbitra_${sensorId}_${fieldKey}_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Database size={20} className="text-cyan-400" /> Data History
        </h1>
        <p className="text-slate-400 text-sm mt-1">Query and export historical telemetry from persistent storage</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 border border-slate-700/40 rounded-xl p-4">
        {/* Field selector */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Field</label>
          <select value={selectedField} onChange={e => setSelectedField(e.target.value)}
            className="bg-slate-800 border border-slate-700/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50">
            {fields.map(({ sensorId, fieldDef }) => (
              <option key={`${sensorId}.${fieldDef.fieldKey}`} value={`${sensorId}.${fieldDef.fieldKey}`}>
                {sensorRegistry.getSensor(sensorId)?.displayName} · {fieldDef.label}
              </option>
            ))}
          </select>
        </div>

        {/* Presets */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Quick range</label>
          <div className="flex gap-1">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => { setFrom(p.from()); setTo(Date.now()); }}
                className="px-2 py-1.5 text-xs rounded bg-slate-800 border border-slate-700/40 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-all">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 ml-auto">
          <button onClick={fetchHistory}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/25 transition-all">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={handleExportCSV} disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-700/40 text-slate-300 rounded-lg text-sm hover:bg-slate-800/60 transition-all disabled:opacity-40">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-300 text-sm rounded-xl px-4 py-3">
          {error}. <span className="text-red-400/70">Start the backend: <code className="font-mono text-xs">cd server && npm run dev</code></span>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>{totalCount.toLocaleString()} total records</span>
        <span>Showing {rows.length}</span>
        {rows.length > 0 && (
          <>
            <span>From {format(new Date(rows[0].ts), 'HH:mm:ss')}</span>
            <span>To {format(new Date(rows[rows.length - 1].ts), 'HH:mm:ss')}</span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-0 text-xs text-slate-500 px-4 py-2 border-b border-slate-800 bg-slate-900/80 uppercase tracking-wider">
          <span className="w-24">Timestamp</span>
          <span className="w-16 ml-4">Pkt#</span>
          <span className="ml-4">Value</span>
          <span className="w-16">Unit</span>
          <span className="w-16">Quality</span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">Loading…</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-600 text-sm">
              No data in selected range.{' '}
              {error ? 'Backend not running.' : 'Ensure bridge is running and telemetry is flowing.'}
            </div>
          )}
          {rows.map((row) => {
            const fd = sensorRegistry.getField(`${row.sensor_id}.${row.field_key}`);
            return (
              <div key={row.id} className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-0 px-4 py-2 border-b border-slate-800/30 hover:bg-slate-800/20 transition-all items-center text-xs">
                <span className="text-slate-400 font-mono w-24">{format(new Date(row.ts), 'HH:mm:ss.SSS')}</span>
                <span className="text-slate-600 font-mono w-16 ml-4">{row.packet_no ?? '—'}</span>
                <span className="text-cyan-300 font-mono font-semibold ml-4">{row.value.toFixed(fd?.precision ?? 2)}</span>
                <span className="text-slate-500 w-16">{fd?.unit}</span>
                <span className={`w-16 ${row.quality === 'ok' ? 'text-emerald-400' : 'text-amber-400'}`}>{row.quality}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
