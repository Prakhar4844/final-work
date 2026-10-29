import type {
  SensorDefinition,
  SensorFieldDefinition,
  NormalizedPacket,
  NormalizedReading,
} from '../../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// DHT11 Sensor Adapter
// Temperature (°C) and Relative Humidity (%)
// ─────────────────────────────────────────────────────────────────────────────

export const DHT11_SENSOR_ID = 'dht11';

export const DHT11_FIELDS: SensorFieldDefinition[] = [
  {
    fieldKey: 'temperature',
    label: 'Temperature',
    unit: '°C',
    dataType: 'number',
    min: -40,
    max: 80,
    precision: 1,
    defaultChartType: 'timeseries',
    description: 'Ambient air temperature',
    alertThresholds: {
      low: 0,
      high: 60,
      critical_low: -10,
      critical_high: 70,
    },
  },
  {
    fieldKey: 'humidity',
    label: 'Relative Humidity',
    unit: '%',
    dataType: 'number',
    min: 0,
    max: 100,
    precision: 0,
    defaultChartType: 'timeseries',
    description: 'Relative humidity of air',
    alertThresholds: {
      low: 10,
      high: 90,
    },
  },
];

export const DHT11_DEFINITION: SensorDefinition = {
  sensorId: DHT11_SENSOR_ID,
  displayName: 'DHT11',
  sensorType: 'temperature_humidity',
  description: 'Digital temperature and humidity sensor. Measures ambient temperature (°C) and relative humidity (%).',
  iconName: 'Thermometer',
  enabled: true,
  deviceId: 'esp8266-rx',
  fields: DHT11_FIELDS,
  status: 'configured',
  lastSeenTimestamp: null,
  lastReadings: { temperature: null, humidity: null },
};

// ── Normalization ──────────────────────────────────────────────────────────────
// The bridge always emits flat JSON: { packetNo, timestamp, temperature, humidity }
// Accepts both the legacy flat format AND nested "sensors.dht11" format.

export function normalizeDHT11(
  packet: NormalizedPacket,
  deviceId: string,
  missionId: string
): NormalizedReading[] {
  const readings: NormalizedReading[] = [];
  const raw = packet.raw as Record<string, unknown>;

  let temperature: number | null = null;
  let humidity: number | null = null;

  // ── Flat legacy format ────────────────────────────────────────────────────
  if (typeof raw.temperature === 'number' && isFinite(raw.temperature)) {
    temperature = raw.temperature;
  }
  if (typeof raw.humidity === 'number' && isFinite(raw.humidity)) {
    humidity = raw.humidity;
  }

  // ── Nested future format ──────────────────────────────────────────────────
  const sensors = raw.sensors as Record<string, unknown> | undefined;
  if (sensors && typeof sensors === 'object') {
    const dht11Data = sensors[DHT11_SENSOR_ID] as Record<string, unknown> | null;
    if (dht11Data && typeof dht11Data === 'object') {
      if (typeof dht11Data.temperature === 'number' && isFinite(dht11Data.temperature)) {
        temperature = dht11Data.temperature;
      }
      if (typeof dht11Data.humidity === 'number' && isFinite(dht11Data.humidity)) {
        humidity = dht11Data.humidity;
      }
    }
  }

  // ── Validate and push temperature ─────────────────────────────────────────
  if (temperature !== null) {
    const inRange = temperature >= -40 && temperature <= 80;
    readings.push({
      sensorId: DHT11_SENSOR_ID,
      fieldKey: 'temperature',
      value: temperature,
      unit: '°C',
      timestamp: packet.timestamp,
      timestampSource: packet.timestampSource,
      packetNo: packet.packetNo,
      quality: inRange ? 'ok' : 'invalid',
      deviceId,
      missionId,
    });
    if (!inRange) {
      packet.parseWarnings.push(
        `DHT11 temperature ${temperature}°C is outside expected range [-40, 80]`
      );
    }
  }

  // ── Validate and push humidity ────────────────────────────────────────────
  if (humidity !== null) {
    const inRange = humidity >= 0 && humidity <= 100;
    readings.push({
      sensorId: DHT11_SENSOR_ID,
      fieldKey: 'humidity',
      value: humidity,
      unit: '%',
      timestamp: packet.timestamp,
      timestampSource: packet.timestampSource,
      packetNo: packet.packetNo,
      quality: inRange ? 'ok' : 'invalid',
      deviceId,
      missionId,
    });
    if (!inRange) {
      packet.parseWarnings.push(
        `DHT11 humidity ${humidity}% is outside expected range [0, 100]`
      );
    }
  }

  return readings;
}
