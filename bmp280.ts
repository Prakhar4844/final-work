
import type {
  SensorDefinition,
  SensorFieldDefinition,
  NormalizedPacket,
  NormalizedReading,
} from '../../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// BMP280 Sensor Adapter — Temperature + Pressure + Optional Altitude
// ─────────────────────────────────────────────────────────────────────────────

export const BMP280_SENSOR_ID = 'bmp280';

export const BMP280_FIELDS: SensorFieldDefinition[] = [
  {
    fieldKey: 'temperature',
    label: 'Temperature (BMP)',
    unit: '°C',
    dataType: 'number',
    min: -40,
    max: 85,
    precision: 2,
    defaultChartType: 'timeseries',
  },
  {
    fieldKey: 'pressure',
    label: 'Pressure',
    unit: 'hPa',
    dataType: 'number',
    min: 300,
    max: 1100,
    precision: 2,
    defaultChartType: 'timeseries',
  },
  {
    fieldKey: 'altitude',
    label: 'BMP Altitude',
    unit: 'm',
    dataType: 'number',
    precision: 1,
    defaultChartType: 'timeseries',
    description: 'Estimated altitude from barometric pressure',
  },
];

export const BMP280_DEFINITION: SensorDefinition = {
  sensorId: BMP280_SENSOR_ID,
  displayName: 'BMP280',
  sensorType: 'barometric',
  description:
    'Barometric pressure and temperature sensor. Optional estimated altitude from pressure.',
  iconName: 'Gauge',
  enabled: false,
  deviceId: 'esp8266-rx',
  fields: BMP280_FIELDS,
  status: 'configured',
  lastSeenTimestamp: null,
  lastReadings: {
    temperature: null,
    pressure: null,
    altitude: null,
  },
};

export function normalizeBMP280(
  packet: NormalizedPacket,
  deviceId: string,
  missionId: string
): NormalizedReading[] {
  const readings: NormalizedReading[] = [];
  const raw = packet.raw as Record<string, unknown>;

  const pushReading = (
    fieldKey: string,
    val: unknown,
    unit: string
  ) => {
    if (typeof val === 'number' && Number.isFinite(val)) {
      readings.push({
        sensorId: BMP280_SENSOR_ID,
        fieldKey,
        value: val,
        unit,
        timestamp: packet.timestamp,
        timestampSource: packet.timestampSource,
        packetNo: packet.packetNo,
        quality: 'ok',
        deviceId,
        missionId,
      });
    }
  };

  // 1. Flat telemetry format
  const temperature =
    typeof raw.bmpTemperature === 'number'
      ? raw.bmpTemperature
      : typeof raw.bmp_temp === 'number'
        ? raw.bmp_temp
        : undefined;

  const pressure =
    typeof raw.pressure === 'number'
      ? raw.pressure
      : typeof raw.baro === 'number'
        ? raw.baro
        : undefined;

  let altitude =
    typeof raw.bmpAltitude === 'number'
      ? raw.bmpAltitude
      : typeof raw.bmp_alt === 'number'
        ? raw.bmp_alt
        : typeof raw.estAltitude === 'number'
          ? raw.estAltitude
          : undefined;

  // 2. Nested telemetry format
  const sensors = raw.sensors as
    | Record<string, unknown>
    | undefined;

  if (sensors && typeof sensors === 'object') {
    const bmp = sensors[BMP280_SENSOR_ID] as
      | Record<string, unknown>
      | null
      | undefined;

    if (bmp && typeof bmp === 'object') {
      // Prefer nested values when available
      if (typeof bmp.temperature === 'number') {
        // Nested temperature overrides flat value
        pushReading('temperature', bmp.temperature, '°C');
      } else {
        pushReading('temperature', temperature, '°C');
      }

      if (typeof bmp.pressure === 'number') {
        pushReading('pressure', bmp.pressure, 'hPa');
      } else {
        pushReading('pressure', pressure, 'hPa');
      }

      if (typeof bmp.altitude === 'number') {
        altitude = bmp.altitude;
      }

      pushReading('altitude', altitude, 'm');

      return readings;
    }
  }

  // 3. Emit readings for flat telemetry
  pushReading('temperature', temperature, '°C');
  pushReading('pressure', pressure, 'hPa');
  pushReading('altitude', altitude, 'm');

  return readings;
}
