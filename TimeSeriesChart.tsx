import { useMemo, useState, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { sensorRegistry } from '../../features/sensors/registry';
import type { TimeRange, FieldSample } from '../../types/telemetry';
import { format, subMinutes, subHours } from 'date-fns';
import { Pause, Play, ZoomIn } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Generic Time-Series Chart Widget
// Renders LineChart or AreaChart for one or more telemetry fields.
// Contains zero sensor-specific logic — driven entirely by field definitions.
// ─────────────────────────────────────────────────────────────────────────────

interface SeriesConfig {
  fieldRef: string;   // "sensorId.fieldKey"
  color?: string;
  label?: string;
}

interface Props {
  series: SeriesConfig[];
  title?: string;
  chartType?: 'timeseries' | 'area' | 'bar';
  timeRange?: TimeRange;
  autoScale?: boolean;
  yMin?: number;
  yMax?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  smoothing?: boolean;
  height?: number;
}

const DEFAULT_COLORS = ['#22d3ee', '#818cf8', '#34d399', '#fb923c', '#f472b6'];
const MAX_VISIBLE_POINTS = 300;

function getWindowStart(range: TimeRange): number {
  const now = Date.now();
  switch (range) {
    case '1m':  return subMinutes(now, 1).getTime();
    case '5m':  return subMinutes(now, 5).getTime();
    case '15m': return subMinutes(now, 15).getTime();
    case '1h':  return subHours(now, 1).getTime();
    case '6h':  return subHours(now, 6).getTime();
    default:    return subMinutes(now, 5).getTime(); // live = last 5 min
  }
}

function decimateSamples(samples: FieldSample[], maxPoints: number): FieldSample[] {
  if (samples.length <= maxPoints) return samples;
  const step = Math.ceil(samples.length / maxPoints);
  return samples.filter((_, i) => i % step === 0 || i === samples.length - 1);
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: number }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800/95 border border-slate-600/50 rounded-lg p-2.5 text-xs shadow-xl">
      <p className="text-slate-400 mb-1.5">{label ? format(new Date(label), 'HH:mm:ss') : ''}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-mono font-medium">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

export function TimeSeriesChart({
  series,
  title,
  chartType = 'timeseries',
  timeRange = '5m',
  autoScale = true,
  yMin,
  yMax,
  showGrid = true,
  showLegend = false,
  smoothing = false,
}: Props) {
  const [paused, setPaused] = useState(false);
  const buffers = useTelemetryStore(s => s.sampleBuffers);

  // Build unified chart data from all series
  const chartData = useMemo(() => {
    const windowStart = getWindowStart(timeRange);

    // Collect and filter samples per series
    const filtered = series.map((s) => {
      const raw = buffers[s.fieldRef] ?? [];
      return {
        ...s,
        samples: raw.filter(p => p.timestamp >= windowStart),
      };
    });

    if (filtered.every(s => s.samples.length === 0)) return [];

    // Build time-keyed data points
    const timeMap = new Map<number, Record<string, number>>();

    for (const s of filtered) {
      const decimated = decimateSamples(s.samples, MAX_VISIBLE_POINTS);
      for (const sample of decimated) {
        const existing = timeMap.get(sample.timestamp) ?? {};
        existing[s.fieldRef] = sample.value;
        timeMap.set(sample.timestamp, existing);
      }
    }

    return Array.from(timeMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, values]) => ({ ts, ...values }));
  }, [buffers, series, timeRange, paused]);  // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = chartData.length === 0;

  // Compute Y domain
  const [computedMin, computedMax] = useMemo(() => {
    if (!autoScale || (yMin !== undefined && yMax !== undefined)) {
      return [yMin, yMax];
    }
    const allValues = chartData.flatMap(d =>
      series.map(s => d[s.fieldRef as keyof typeof d] as number | undefined).filter((v): v is number => v !== undefined)
    );
    if (!allValues.length) return [undefined, undefined];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = Math.max((max - min) * 0.1, 1);
    return [min - padding, max + padding];
  }, [chartData, series, autoScale, yMin, yMax]);

  const tickFormatter = (v: number) => format(new Date(v), 'HH:mm:ss');

  const sharedProps = {
    data: chartData,
    margin: { top: 4, right: 8, bottom: 4, left: 0 },
  };

  const xAxisProps = {
    dataKey: 'ts' as const,
    type: 'number' as const,
    scale: 'time' as const,
    domain: ['dataMin', 'dataMax'] as ['dataMin', 'dataMax'],
    tickFormatter,
    tick: { fill: '#64748b', fontSize: 10 },
    tickCount: 5,
  };

  const yAxisProps = {
    domain: [computedMin ?? 'auto', computedMax ?? 'auto'] as ['auto' | number, 'auto' | number],
    tick: { fill: '#64748b', fontSize: 10 },
    width: 45,
  };

  const renderChart = useCallback(() => {
    if (chartType === 'area') {
      return (
        <AreaChart {...sharedProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />}
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />}
          {series.map((s, i) => {
            const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const label = s.label ?? sensorRegistry.getField(s.fieldRef)?.label ?? s.fieldRef;
            return (
              <Area
                key={s.fieldRef}
                type={smoothing ? 'monotone' : 'linear'}
                dataKey={s.fieldRef}
                name={label}
                stroke={color}
                fill={`${color}20`}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            );
          })}
        </AreaChart>
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart {...sharedProps}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />}
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />}
          {series.map((s, i) => {
            const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
            const label = s.label ?? sensorRegistry.getField(s.fieldRef)?.label ?? s.fieldRef;
            return (
              <Bar key={s.fieldRef} dataKey={s.fieldRef} name={label} fill={color} isAnimationActive={false} />
            );
          })}
        </BarChart>
      );
    }

    // default: timeseries line
    return (
      <LineChart {...sharedProps}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />}
        <XAxis {...xAxisProps} />
        <YAxis {...yAxisProps} />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />}
        {series.map((s, i) => {
          const color = s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const label = s.label ?? sensorRegistry.getField(s.fieldRef)?.label ?? s.fieldRef;
          return (
            <Line
              key={s.fieldRef}
              type={smoothing ? 'monotone' : 'linear'}
              dataKey={s.fieldRef}
              name={label}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          );
        })}
      </LineChart>
    );
  }, [chartType, chartData, series, showGrid, showLegend, smoothing, computedMin, computedMax]);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col bg-slate-900/40 rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          {series.map((s, i) => (
            <div key={s.fieldRef} className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded" style={{ background: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] }} />
              <span className="text-slate-400 text-xs">{s.label ?? sensorRegistry.getField(s.fieldRef)?.label ?? s.fieldRef}</span>
              <span className="text-slate-600 text-xs">{sensorRegistry.getField(s.fieldRef)?.unit}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setPaused(p => !p)}
          className="p-1 text-slate-500 hover:text-slate-300 transition-all"
          title={paused ? 'Resume live update' : 'Pause update'}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
            <ZoomIn size={28} />
            <p className="text-sm">No data in selected time window</p>
            <p className="text-xs text-slate-700">Waiting for telemetry packets…</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
