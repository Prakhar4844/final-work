import type {
  SensorDefinition,
  SensorFieldDefinition,
  NormalizedPacket,
  NormalizedReading,
} from '../../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// GPS / NEO-6M Sensor Adapter
// ─────────────────────────────────────────────────────────────────────────────

export const GPS_SENSOR_ID = 'gps';

export const GPS_FIELDS: SensorFieldDefinition[] = [
  { fieldKey: 'latitude', label: 'Latitude', unit: '°', dataType: 'number', min: -90, max: 90, precision: 6, defaultChartType: 'map' },
  { fieldKey: 'longitude', label: 'Longitude', unit: '°', dataType: 'number', min: -180, max: 180, precision: 6, defaultChartType: 'map' },
  { fieldKey: 'altitude', label: 'Altitude (GPS)', unit: 'm', dataType: 'number', precision: 1, defaultChartType: 'timeseries' },
  { fieldKey: 'speed', label: 'Speed', unit: 'km/h', dataType: 'number', min: 0, precision: 1, defaultChartType: 'timeseries' },
  { fieldKey: 'satellites', label: 'Satellites', unit: '', dataType: 'integer', min: 0, max: 32, defaultChartType: 'value' },
  { fieldKey: 'gpsFix', label: 'Fix Status', unit: '', dataType: 'integer', min: 0, max: 3, defaultChartType: 'value', description: '0=No fix, 1=GPS fix, 2=DGPS fix' },
  // Compatibility alias
  { fieldKey: 'fix', label: 'Fix Status (Alias)', unit: '', dataType: 'integer', min: 0, max: 3, defaultChartType: 'value' },
];

export const GPS_DEFINITION: SensorDefinition = {
  sensorId: GPS_SENSOR_ID,
  displayName: 'GPS / NEO-6M',
  sensorType: 'gps',
  description: 'GPS receiver providing latitude, longitude, altitude, speed, satellite count, and fix status.',
  iconName: 'MapPin',
  enabled: false,
  deviceId: 'esp8266-rx',
  fields: GPS_FIELDS,
  status: 'configured',
  lastSeenTimestamp: null,
  lastReadings: {
    latitude: null, longitude: null, altitude: null,
    speed: null, satellites: null, gpsFix: null, fix: null,
  },
};

export function normalizeGPS(
  packet: NormalizedPacket,
  deviceId: string,
  missionId: string
): NormalizedReading[] {
  const readings: NormalizedReading[] = [];
  const raw = packet.raw as Record<string, unknown>;

  const pushReading = (fieldKey: string, val: unknown, unit: string) => {
    // 0 is a valid number (e.g. 0 speed, 0 satellites, 0 fix status)
    if (typeof val === 'number' && isFinite(val)) {
      readings.push({
        sensorId: GPS_SENSOR_ID,
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

  // 1. Flat legacy payload from bridge.js
  let latitude = typeof raw.latitude === 'number' ? raw.latitude : typeof raw.lat === 'number' ? raw.lat : undefined;
  let longitude = typeof raw.longitude === 'number' ? raw.longitude : typeof raw.lon === 'number' ? raw.lon : typeof raw.lng === 'number' ? raw.lng : undefined;
  let altitude = typeof raw.altitude === 'number' ? raw.altitude : typeof raw.alt === 'number' ? raw.alt : undefined;
  let speed = typeof raw.speed === 'number' ? raw.speed : undefined;
  let satellites = typeof raw.satellites === 'number' ? raw.satellites : typeof raw.sats === 'number' ? raw.sats : undefined;
  let gpsFix = typeof raw.gpsFix === 'number' ? raw.gpsFix : typeof raw.fix === 'number' ? raw.fix : undefined;

  // 2. Nested sensors.gps format (if present)
  const sensors = raw.sensors as Record<string, unknown> | undefined;
  if (sensors && typeof sensors === 'object') {
    const gps = sensors[GPS_SENSOR_ID] as Record<string, unknown> | null;
    if (gps && typeof gps === 'object') {
      if (typeof gps.latitude === 'number') latitude = gps.latitude;
      if (typeof gps.longitude === 'number') longitude = gps.longitude;
      if (typeof gps.altitude === 'number') altitude = gps.altitude;
      if (typeof gps.speed === 'number') speed = gps.speed;
      if (typeof gps.satellites === 'number') satellites = gps.satellites;
      if (typeof gps.gpsFix === 'number') gpsFix = gps.gpsFix;
      else if (typeof gps.fix === 'number') gpsFix = gps.fix;
    }
  }

  // Push primary fields
  pushReading('latitude', latitude, '°');
  pushReading('longitude', longitude, '°');
  pushReading('altitude', altitude, 'm');
  pushReading('speed', speed, 'km/h');
  pushReading('satellites', satellites, '');
  pushReading('gpsFix', gpsFix, '');

  // Alias fix
  pushReading('fix', gpsFix, '');

  return readings;
}
