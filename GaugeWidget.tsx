import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { sensorRegistry } from '../../features/sensors/registry';

interface Props {
  fieldRef: string;
  title?: string;
}

export function GaugeWidget({ fieldRef, title }: Props) {
  const value = useTelemetryStore(s => s.latestValues[fieldRef] ?? null);
  const fieldDef = sensorRegistry.getField(fieldRef);
  const label = title ?? fieldDef?.label ?? fieldRef;
  const unit = fieldDef?.unit ?? '';
  const min = fieldDef?.min ?? 0;
  const max = fieldDef?.max ?? 100;
  const precision = fieldDef?.precision ?? 1;

  const pct = value !== null ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;

  const color = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22d3ee';

  const data = [{ name: label, value: pct, fill: color }];

  return (
    <div className="h-full flex flex-col items-center justify-center p-3">
      <div className="w-full" style={{ height: '70%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="60%" outerRadius="100%"
            data={data} startAngle={180} endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#1e293b' }} dataKey="value" angleAxisId={0} cornerRadius={4} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center -mt-4">
        {value !== null ? (
          <>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>{value.toFixed(precision)}</p>
            <p className="text-slate-500 text-xs">{unit}</p>
          </>
        ) : (
          <p className="text-slate-600 text-sm">—</p>
        )}
        <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
