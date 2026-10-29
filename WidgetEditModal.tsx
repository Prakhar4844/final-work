import { useState } from 'react';
import { X } from 'lucide-react';
import type { WidgetConfig, TimeRange } from '../../types/telemetry';
import { useDashboardStore } from '../../stores/dashboardStore';
import { sensorRegistry } from '../sensors/registry';

interface Props {
  widget: WidgetConfig;
  onClose: () => void;
}

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: '1m', label: '1 minute' },
  { value: '5m', label: '5 minutes' },
  { value: '15m', label: '15 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
];

export function WidgetEditModal({ widget, onClose }: Props) {
  const updateWidget = useDashboardStore(s => s.updateWidget);
  const [title, setTitle] = useState(widget.title);
  const [timeRange, setTimeRange] = useState<TimeRange>(widget.timeRange);
  const [autoScale, setAutoScale] = useState(widget.autoScale);
  const [showGrid, setShowGrid] = useState(widget.showGrid ?? true);
  const [showLegend, setShowLegend] = useState(widget.showLegend ?? false);
  const [smoothing, setSmoothing] = useState(widget.smoothing ?? false);
  const [color, setColor] = useState(widget.color ?? '#22d3ee');

  const allFields = sensorRegistry.getAllFields();

  const handleSave = () => {
    updateWidget(widget.id, { title, timeRange, autoScale, showGrid, showLegend, smoothing, color });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold">Edit Widget</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-all"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50" />
          </div>

          {widget.fields.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Fields</label>
              <div className="space-y-1">
                {widget.fields.map(f => {
                  const fd = sensorRegistry.getField(f);
                  return (
                    <div key={f} className="flex items-center gap-2 text-xs bg-slate-800 rounded px-2 py-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span className="text-slate-300">{fd?.label ?? f}</span>
                      <span className="text-slate-500">{fd?.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Time Range</label>
            <select value={timeRange} onChange={e => setTimeRange(e.target.value as TimeRange)}
              className="w-full bg-slate-800 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50">
              {TIME_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {widget.fields.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Series Color</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="h-8 w-16 rounded cursor-pointer bg-slate-800 border border-slate-600/50" />
            </div>
          )}

          <div className="space-y-2">
            {[
              { key: 'autoScale', label: 'Auto-scale Y axis', value: autoScale, set: setAutoScale },
              { key: 'showGrid', label: 'Show grid', value: showGrid, set: setShowGrid },
              { key: 'showLegend', label: 'Show legend', value: showLegend, set: setShowLegend },
              { key: 'smoothing', label: 'Smoothing (off by default)', value: smoothing, set: setSmoothing },
            ].map(({ key, label, value, set }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => set(!value)}
                  className={`w-9 h-5 rounded-full transition-all relative ${value ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-all text-sm">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-cyan-500 text-slate-900 rounded-lg font-semibold hover:bg-cyan-400 transition-all text-sm">Save</button>
        </div>
      </div>
    </div>
  );
}
