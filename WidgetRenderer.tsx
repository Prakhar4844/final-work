import { useState } from 'react';
import { Settings, X, Copy } from 'lucide-react';
import type { WidgetConfig } from '../../types/telemetry';
import { useDashboardStore } from '../../stores/dashboardStore';
import { LiveValueCard } from '../../components/widgets/LiveValueCard';
import { TimeSeriesChart } from '../../components/widgets/TimeSeriesChart';
import { GaugeWidget } from '../../components/widgets/GaugeWidget';
import { ConnectionStatusWidget } from '../../components/widgets/ConnectionStatusWidget';
import { CubeSatViewer } from '../../components/widgets/CubeSatViewer';
import { GpsMapWidget } from '../../components/widgets/GpsMapWidget';
import { WidgetEditModal } from './WidgetEditModal';

// ─────────────────────────────────────────────────────────────────────────────
// Widget Renderer — maps WidgetConfig to the correct widget component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  widget: WidgetConfig;
  isEditing: boolean;
}

export function WidgetRenderer({ widget, isEditing }: Props) {
  const removeWidget = useDashboardStore(s => s.removeWidget);
  const duplicateWidget = useDashboardStore(s => s.duplicateWidget);
  const [showEdit, setShowEdit] = useState(false);

  const series = widget.fields.map((f, i) => ({
    fieldRef: f,
    color: widget.color && i === 0 ? widget.color : undefined,
  }));

  const renderContent = () => {
    if (widget.type === 'cubesat') {
      return <CubeSatViewer title={widget.title} />;
    }

    if (widget.type === 'map') {
      return <GpsMapWidget title={widget.title} />;
    }

    // Connection status widget has no fields
    if (widget.fields.length === 0) {
      return <ConnectionStatusWidget />;
    }

    switch (widget.type) {
      case 'value':
        return (
          <LiveValueCard
            fieldRef={widget.fields[0]}
            title={widget.title}
          />
        );
      case 'gauge':
        return (
          <GaugeWidget
            fieldRef={widget.fields[0]}
            title={widget.title}
          />
        );
      case 'timeseries':
        return (
          <TimeSeriesChart
            series={series}
            title={widget.title}
            chartType="timeseries"
            timeRange={widget.timeRange}
            autoScale={widget.autoScale}
            yMin={widget.yMin}
            yMax={widget.yMax}
            showGrid={widget.showGrid ?? true}
            showLegend={widget.showLegend ?? false}
            smoothing={widget.smoothing ?? false}
          />
        );
      case 'area':
        return (
          <TimeSeriesChart
            series={series}
            title={widget.title}
            chartType="area"
            timeRange={widget.timeRange}
            autoScale={widget.autoScale}
            yMin={widget.yMin}
            yMax={widget.yMax}
            showGrid={widget.showGrid ?? true}
            showLegend={widget.showLegend ?? false}
            smoothing={widget.smoothing ?? false}
          />
        );
      case 'bar':
        return (
          <TimeSeriesChart
            series={series}
            title={widget.title}
            chartType="bar"
            timeRange={widget.timeRange}
            autoScale={widget.autoScale}
            showGrid={widget.showGrid ?? true}
          />
        );
      default:
        return (
          <div className="h-full flex items-center justify-center text-slate-600 text-sm">
            Unknown widget type: {widget.type}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/70 border border-slate-700/40 rounded-xl overflow-hidden">
      {/* Widget title bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 shrink-0 ${isEditing ? 'cursor-grab active:cursor-grabbing' : ''}`}>
        <span className="text-slate-300 text-xs font-medium truncate">{widget.title}</span>
        {isEditing && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setShowEdit(true)}
              className="p-0.5 text-slate-500 hover:text-slate-300 transition-all"
              onMouseDown={e => e.stopPropagation()}
            >
              <Settings size={12} />
            </button>
            <button
              onClick={() => duplicateWidget(widget.id)}
              className="p-0.5 text-slate-500 hover:text-slate-300 transition-all"
              onMouseDown={e => e.stopPropagation()}
            >
              <Copy size={12} />
            </button>
            <button
              onClick={() => removeWidget(widget.id)}
              className="p-0.5 text-slate-500 hover:text-red-400 transition-all"
              onMouseDown={e => e.stopPropagation()}
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Widget content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderContent()}
      </div>

      {showEdit && (
        <WidgetEditModal widget={widget} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
