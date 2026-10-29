import type {
  SensorDefinition,
  SensorFieldDefinition,
  NormalizedPacket,
  NormalizedReading,
} from '../../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// MPU6050 Sensor Adapter — Accelerometer + Gyroscope + Attitude (Roll/Pitch)
// ─────────────────────────────────────────────────────────────────────────────

export const MPU6050_SENSOR_ID = 'mpu6050';

export const MPU6050_FIELDS: SensorFieldDefinition[] = [
  { fieldKey: 'ax', label: 'Acceleration X', unit: 'm/s²', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'ay', label: 'Acceleration Y', unit: 'm/s²', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'az', label: 'Acceleration Z', unit: 'm/s²', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'totalAcc', label: 'Total Acceleration', unit: 'm/s²', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'gx', label: 'Gyroscope X', unit: '°/s', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'gy', label: 'Gyroscope Y', unit: '°/s', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'gz', label: 'Gyroscope Z', unit: '°/s', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'roll', label: 'Roll', unit: '°', dataType: 'number', precision: 2, defaultChartType: 'timeseries' },
  { fieldKey: 'pitch', label: 'Pitch', unit: '°', dataType: 'number', precision: 2, defaultChartType: 'timeseries' },
  // Compatibility aliases
  { fieldKey: 'accel_x', label: 'Accel X (Alias)', unit: 'm/s²', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'accel_y', label: 'Accel Y (Alias)', unit: 'm/s²', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'accel_z', label: 'Accel Z (Alias)', unit: 'm/s²', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'gyro_x', label: 'Gyro X (Alias)', unit: '°/s', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'gyro_y', label: 'Gyro Y (Alias)', unit: '°/s', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
  { fieldKey: 'gyro_z', label: 'Gyro Z (Alias)', unit: '°/s', dataType: 'number', precision: 3, defaultChartType: 'timeseries' },
];

export const MPU6050_DEFINITION: SensorDefinition = {
  sensorId: MPU6050_SENSOR_ID,
  displayName: 'MPU6050',
  sensorType: 'imu',
  description: '6-axis IMU with 3-axis accelerometer, 3-axis gyroscope, and attitude orientation (Roll & Pitch).',
  iconName: 'Compass',
  enabled: false,
  deviceId: 'esp8266-rx',
  fields: MPU6050_FIELDS,
  status: 'configured',
  lastSeenTimestamp: null,
  lastReadings: {
    ax: null, ay: null, az: null, totalAcc: null,
    gx: null, gy: null, gz: null, roll: null, pitch: null,
  },
};

export function normalizeMPU6050(
  packet: NormalizedPacket,
  deviceId: string,
  missionId: string
): NormalizedReading[] {
  const readings: NormalizedReading[] = [];
  const raw = packet.raw as Record<string, unknown>;

  const pushReading = (fieldKey: string, val: unknown, unit: string) => {
    if (typeof val === 'number' && isFinite(val)) {
      readings.push({
        sensorId: MPU6050_SENSOR_ID,
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
  let ax = typeof raw.ax === 'number' ? raw.ax : raw.accel_x ?? raw.accelX;
  let ay = typeof raw.ay === 'number' ? raw.ay : raw.accel_y ?? raw.accelY;
  let az = typeof raw.az === 'number' ? raw.az : raw.accel_z ?? raw.accelZ;
  let totalAcc = typeof raw.totalAcc === 'number' ? raw.totalAcc : raw.total_acc;
  let gx = typeof raw.gx === 'number' ? raw.gx : raw.gyro_x ?? raw.gyroX;
  let gy = typeof raw.gy === 'number' ? raw.gy : raw.gyro_y ?? raw.gyroY;
  let gz = typeof raw.gz === 'number' ? raw.gz : raw.gyro_z ?? raw.gyroZ;
  let roll = typeof raw.roll === 'number' ? raw.roll : undefined;
  let pitch = typeof raw.pitch === 'number' ? raw.pitch : undefined;

  // 2. Nested sensors.mpu6050 format (if present)
  const sensors = raw.sensors as Record<string, unknown> | undefined;
  if (sensors && typeof sensors === 'object') {
    const mpu = sensors[MPU6050_SENSOR_ID] as Record<string, unknown> | null;
    if (mpu && typeof mpu === 'object') {
      if (typeof mpu.ax === 'number') ax = mpu.ax;
      else if (typeof mpu.accel_x === 'number') ax = mpu.accel_x;

      if (typeof mpu.ay === 'number') ay = mpu.ay;
      else if (typeof mpu.accel_y === 'number') ay = mpu.accel_y;

      if (typeof mpu.az === 'number') az = mpu.az;
      else if (typeof mpu.accel_z === 'number') az = mpu.accel_z;

      if (typeof mpu.totalAcc === 'number') totalAcc = mpu.totalAcc;
      else if (typeof mpu.total_acc === 'number') totalAcc = mpu.total_acc;

      if (typeof mpu.gx === 'number') gx = mpu.gx;
      else if (typeof mpu.gyro_x === 'number') gx = mpu.gyro_x;

      if (typeof mpu.gy === 'number') gy = mpu.gy;
      else if (typeof mpu.gyro_y === 'number') gy = mpu.gyro_y;

      if (typeof mpu.gz === 'number') gz = mpu.gz;
      else if (typeof mpu.gyro_z === 'number') gz = mpu.gyro_z;

      if (typeof mpu.roll === 'number') roll = mpu.roll;
      if (typeof mpu.pitch === 'number') pitch = mpu.pitch;
    }
  }

  // Push primary fields
  pushReading('ax', ax, 'm/s²');
  pushReading('ay', ay, 'm/s²');
  pushReading('az', az, 'm/s²');
  pushReading('totalAcc', totalAcc, 'm/s²');
  pushReading('gx', gx, '°/s');
  pushReading('gy', gy, '°/s');
  pushReading('gz', gz, '°/s');
  pushReading('roll', roll, '°');
  pushReading('pitch', pitch, '°');

  // Push legacy aliases so existing widgets targeting accel_x / gyro_x also resolve
  pushReading('accel_x', ax, 'm/s²');
  pushReading('accel_y', ay, 'm/s²');
  pushReading('accel_z', az, 'm/s²');
  pushReading('gyro_x', gx, '°/s');
  pushReading('gyro_y', gy, '°/s');
  pushReading('gyro_z', gz, '°/s');

  return readings;
}
