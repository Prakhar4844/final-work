import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { sensorRegistry } from '../sensors/registry';
import { useDashboardStore } from '../../stores/dashboardStore';
import { nanoid } from '../../stores/utils/nanoid';
import type { WidgetConfig, GridItemLayout, ChartType, TimeRange } from '../../types/telemetry';

interface Props { onClose: () => void; }

const CHART_TYPES: { value: ChartType; label: string; desc: string }[] = [
  { value: 'value', label: 'Live Value', desc: 'Current reading with trend' },
  { value: 'timeseries', label: 'Line Chart', desc: 'Time-series line plot' },
  { value: 'area', label: 'Area Chart', desc: 'Filled area time-series' },
  { value: 'bar', label: 'Bar Chart', desc: 'Bar chart over time' },
  { value: 'gauge', label: 'Gauge', desc: 'Radial gauge' },
  { value: 'cubesat', label: 'CubeSat 3D', desc: 'Real-time 3D attitude viewer' },
  { value: 'map', label: 'GPS Map', desc: 'Geospatial position and ground track' },
];

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'live', label: 'Live (last 5m)' },
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '1h', label: '1 hour' },
];

export function AddWidgetModal({ onClose }: Props) {
  const addWidget = useDashboardStore(s => s.addWidget);
  const fields = sensorRegistry.getAllFields();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>('timeseries');
  const [timeRange, setTimeRange] = useState<TimeRange>('5m');
  const [title, setTitle] = useState('');

  const toggleField = (ref: string) => {
    setSelectedFields(prev => {
      if (prev.includes(ref)) return prev.filter(f => f !== ref);
      // For value/gauge, only one field allowed
      if (chartType === 'value' || chartType === 'gauge') return [ref];
      return [...prev, ref];
    });
    // Auto-set title from first field
    if (selectedFields.length === 0 && !title) {
      const fieldDef = sensorRegistry.getField(ref);
      if (fieldDef) setTitle(fieldDef.label);
    }
  };

  const handleAdd = () => {
    const id = `widget-${nanoid()}`;
    const fieldTitle = title || (selectedFields.length > 0
      ? (sensorRegistry.getField(selectedFields[0])?.label ?? selectedFields[0])
      : 'Widget');

    const isLarge = chartType === 'cubesat' || chartType === 'map';
    const isSmall = chartType === 'value' || chartType === 'gauge';

    const widget: WidgetConfig = {
      id,
      type: (chartType === 'cubesat' || chartType === 'map') ? chartType : (selectedFields.length === 0 ? 'value' : chartType),
      title: fieldTitle,
      fields: selectedFields,
      timeRange,
      autoScale: true,
      showGrid: true,
      showLegend: selectedFields.length > 1,
    };

    const gridItem: GridItemLayout = {
      i: id,
      x: 0, y: 999, // react-grid-layout will place it
      w: isSmall ? 3 : (isLarge ? 6 : 6),
      h: isSmall ? 3 : (isLarge ? 5 : 6),
      minW: 2, minH: 2,
    };

    addWidget(widget, gridItem);
    onClose();
  };

  const grouped = fields.reduce<Record<string, typeof fields>>((acc, f) => {
    acc[f.sensorId] = acc[f.sensorId] ?? [];
    acc[f.sensorId].push(f);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Add Widget</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-all"><X size={18} /></button>
        </div>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Widget Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Auto from field…"
              className="w-full bg-slate-800 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50" />
          </div>

          {/* Chart type */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Visualization Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CHART_TYPES.map(ct => (
                <button key={ct.value} onClick={() => setChartType(ct.value)}
                  className={`px-2 py-2 rounded-lg text-xs border transition-all ${chartType === ct.value ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300' : 'border-slate-700/40 text-slate-400 hover:border-slate-600'}`}>
                  <div className="font-medium">{ct.label}</div>
                  <div className="text-slate-500 text-xs mt-0.5 hidden sm:block">{ct.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Fields */}
          {fields.length > 0 ? (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Telemetry Fields</label>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {Object.entries(grouped).map(([sensorId, sensorFields]) => {
                  const sensor = sensorRegistry.getSensor(sensorId);
                  return (
                    <div key={sensorId}>
                      <p className="text-xs text-slate-500 px-1 mb-1">{sensor?.displayName ?? sensorId}</p>
                      {sensorFields.map(({ sensorId: sid, fieldDef }) => {
                        const ref = `${sid}.${fieldDef.fieldKey}`;
                        const selected = selectedFields.includes(ref);
                        return (
                          <button key={ref} onClick={() => toggleField(ref)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all ${selected ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300' : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'}`}>
                            <div className={`w-3 h-3 rounded-sm border-2 shrink-0 flex items-center justify-center ${selected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
                              {selected && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                            </div>
                            <span>{fieldDef.label}</span>
                            <span className="text-slate-500 text-xs">{fieldDef.unit}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-700 rounded-lg">
              No sensor fields available. Configure sensors first.
            </div>
          )}

          {/* Time range (for chart types) */}
          {!['value', 'gauge'].includes(chartType) && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Time Range</label>
              <select value={timeRange} onChange={e => setTimeRange(e.target.value as TimeRange)}
                className="w-full bg-slate-800 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none">
                {TIME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-all text-sm">Cancel</button>
          <button onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-cyan-500 text-slate-900 rounded-lg font-semibold hover:bg-cyan-400 transition-all text-sm">
            <Plus size={14} /> Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}
