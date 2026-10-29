# ORBITRA — Modular Aerospace Telemetry Dashboard

> Real-time telemetry visualization platform for ESP8266 + DHT11/MPU6050/BMP280/GPS sensor pipelines.

## Quick Start

### Prerequisites
- Node.js v18+ (tested on v24.18.0)
- The orbitra-telemetry-bridge running (`node bridge.js` in its directory)

### 1. Start the Backend (SQLite persistence & REST API)
```bash
cd C:\Users\hp\Desktop\Orbitra_Dashboard\server
npm install     # first time only
npm run dev     # starts on http://localhost:3001
```

### 2. Start the Frontend
```bash
cd C:\Users\hp\Desktop\Orbitra_Dashboard
npm install     # first time only
npm run dev     # starts on http://localhost:5173
```

### 3. Start the Telemetry Bridge (if not already running)
```bash
cd C:\Users\hp\Desktop\orbitra-telemetry-bridge
node bridge.js
```

Open **http://localhost:5173** — the setup wizard will appear on first launch.

---

## Architecture

```
DHT11 → ESP-NOW → ESP8266 → COM6 → bridge.js
                                        │
                                   ws://localhost:8081
                                        │
                              ORBITRA Frontend (React/Vite)
                                        │
                              http://localhost:3001 (Express + SQLite)
```

### Frontend Structure
```
src/
├── app/            App shell, layout, router
├── features/
│   ├── dashboard/  Grid layout, widgets
│   ├── plots/      Plot Builder
│   ├── sensors/    Sensor management + adapters
│   │   └── adapters/  dht11, mpu6050, bmp280, gps
│   ├── setup/      First-launch wizard
│   ├── telemetry/  Explorer + diagnostics
│   ├── history/    Historical data page
│   └── settings/   Settings page
├── services/       telemetryService.ts (WebSocket, backoff, normalization)
├── stores/         Zustand stores (telemetry, mission, dashboard)
├── components/     Reusable widgets (LiveValueCard, TimeSeriesChart, Gauge)
└── types/          Core TypeScript types
```

### Backend Structure
```
server/src/
├── index.ts         Express server (port 3001)
├── storage/
│   ├── db.ts        SQLite + WAL mode setup
│   └── migrations.ts  Schema migrations
└── routes/
    ├── telemetry.ts  POST/GET telemetry, CSV export
    └── layouts.ts    Dashboard layout persistence
```

---

## How to Add a New Sensor Adapter

Adding a new sensor takes 3 steps — no changes to any chart component needed.

### Step 1: Create the adapter file

```typescript
// src/features/sensors/adapters/myNewSensor.ts
import type { SensorDefinition, SensorFieldDefinition, NormalizedPacket, NormalizedReading } from '../../types/telemetry';

export const MY_SENSOR_ID = 'my_new_sensor';

export const MY_SENSOR_FIELDS: SensorFieldDefinition[] = [
  {
    fieldKey: 'my_value',
    label: 'My Value',
    unit: 'unit',
    dataType: 'number',
    precision: 2,
    defaultChartType: 'timeseries',
  },
];

export const MY_SENSOR_DEFINITION: SensorDefinition = {
  sensorId: MY_SENSOR_ID,
  displayName: 'My New Sensor',
  sensorType: 'custom',
  description: 'A new custom sensor.',
  iconName: 'Cpu',
  enabled: false,
  deviceId: 'esp8266-rx',
  fields: MY_SENSOR_FIELDS,
  status: 'configured',
  lastSeenTimestamp: null,
  lastReadings: { my_value: null },
};

export function normalizeMyNewSensor(
  packet: NormalizedPacket,
  deviceId: string,
  missionId: string
): NormalizedReading[] {
  const raw = packet.raw as Record<string, unknown>;
  const sensors = raw.sensors as Record<string, unknown> | undefined;
  if (!sensors) return [];
  const data = sensors[MY_SENSOR_ID] as Record<string, unknown> | null;
  if (!data) return [];

  const readings: NormalizedReading[] = [];
  const val = data['my_value'];
  if (typeof val === 'number' && isFinite(val)) {
    readings.push({
      sensorId: MY_SENSOR_ID,
      fieldKey: 'my_value',
      value: val,
      unit: 'unit',
      timestamp: packet.timestamp,
      timestampSource: packet.timestampSource,
      packetNo: packet.packetNo,
      quality: 'ok',
      deviceId,
      missionId,
    });
  }
  return readings;
}
```

### Step 2: Register in the sensor registry

```typescript
// src/features/sensors/registry.ts  — add to the bottom:
import { MY_SENSOR_DEFINITION, normalizeMyNewSensor } from './adapters/myNewSensor';
sensorRegistry.registerSensor(MY_SENSOR_DEFINITION, normalizeMyNewSensor);
```

### Step 3: Add to setup wizard (optional)

```typescript
// src/features/setup/SetupWizard.tsx — add to SENSOR_CARDS array:
{
  id: 'my_new_sensor',
  name: 'My New Sensor',
  icon: Cpu,
  description: 'Description of my sensor',
  fields: ['My Value (unit)'],
  color: 'from-pink-500/20 to-pink-500/5',
  border: 'border-pink-500/40',
  iconColor: 'text-pink-400',
},
```

That's it. The sensor's fields automatically appear in the **Telemetry Explorer**, **Plot Builder**, and can be added to the dashboard — no chart code changes needed.

---

## Running Tests

```bash
# Frontend unit tests
cd C:\Users\hp\Desktop\Orbitra_Dashboard
npm run test

# Watch mode
npm run test:watch
```

### Test Coverage
- DHT11 adapter: flat packet parsing, nested packet parsing, out-of-range validation
- Sensor registry: registration, field lookup, normalization pipeline
- Timestamp preservation, null safety, no fabricated data

---

## Packet Format

### Current Bridge Format (flat)
```json
{
  "packetNo": 363,
  "timestamp": 1792306291032,
  "temperature": 29.1,
  "humidity": 54
}
```
> `timestamp` is set by `bridge.js` using `Date.now()` on the receiving PC.

### Future Nested Format (forward-compatible)
```json
{
  "schemaVersion": 1,
  "missionId": "ORBITRA",
  "deviceId": "esp8266-rx",
  "packetNo": 363,
  "timestamp": 1792306291032,
  "sensors": {
    "dht11": { "temperature": 29.1, "humidity": 54 },
    "mpu6050": null,
    "bmp280": null,
    "gps": null
  }
}
```
Both formats are supported simultaneously without firmware changes.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/telemetry` | Ingest normalized readings |
| `GET`  | `/api/telemetry/latest?sensorId=&fieldKey=` | Latest value for a field |
| `GET`  | `/api/telemetry/range?sensorId=&fieldKey=&from=&to=&limit=` | Time-range query |
| `GET`  | `/api/telemetry/export?sensorId=&fieldKey=&from=&to=` | CSV download |
| `GET`  | `/api/layouts` | All saved layouts |
| `POST` | `/api/layouts` | Save/update a layout |
| `DELETE` | `/api/layouts/:id` | Delete a layout |
| `GET`  | `/health` | Server health check |

---

## Connection States

| State | Meaning |
|-------|---------|
| `Idle` | Not started |
| `Connecting` | WebSocket handshake in progress |
| `Connected` | Live data flowing |
| `Stale Data` | Connected but no packet for >10 seconds |
| `Disconnected` | Connection lost — exponential backoff reconnecting |
| `Error` | WebSocket error |

Reconnection uses bounded exponential backoff: 1s → 1.5s → 2.25s … → 30s max.

---

## Important Notes

- **No COM6 access from dashboard** — only the bridge opens the serial port. The dashboard connects only to `ws://localhost:8081`.
- **No fabricated data** — unconnected sensors show "Configured — awaiting telemetry" until real packets arrive. Demo mode must be explicitly activated.
- **Historical data is not deleted** when you reset layouts or clear the in-memory buffer.
- **Timestamps** are preserved from bridge packets. Never replaced with browser time if valid.
