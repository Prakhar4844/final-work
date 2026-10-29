import { describe, it, expect } from 'vitest';
import { sensorRegistry } from '../../features/sensors/registry';
import type { NormalizedPacket } from '../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry Service Logic Tests (packet parsing rules)
// Tests the normalization pipeline without needing a real WebSocket
// ─────────────────────────────────────────────────────────────────────────────

function makeLegacyPacket(overrides = {}): NormalizedPacket {
  return {
    raw: { packetNo: 363, timestamp: 1792306291032, temperature: 29.1, humidity: 54, ...overrides },
    packetNo: 363,
    timestamp: 1792306291032,
    timestampSource: 'bridge',
    readings: [],
    parseWarnings: [],
  };
}

describe('Sensor Registry', () => {
  it('has DHT11 registered', () => {
    const sensor = sensorRegistry.getSensor('dht11');
    expect(sensor).toBeDefined();
    expect(sensor?.displayName).toBe('DHT11');
  });

  it('has MPU6050 registered', () => {
    expect(sensorRegistry.getSensor('mpu6050')).toBeDefined();
  });

  it('has BMP280 registered', () => {
    expect(sensorRegistry.getSensor('bmp280')).toBeDefined();
  });

  it('has GPS registered', () => {
    expect(sensorRegistry.getSensor('gps')).toBeDefined();
    
  });

  it('getAllSensors returns all 4', () => {
    expect(sensorRegistry.getAllSensors()).toHaveLength(4);
  });

  it('getField returns correct field definition', () => {
    const field = sensorRegistry.getField('dht11.temperature');
    expect(field).toBeDefined();
    expect(field?.unit).toBe('°C');
    expect(field?.label).toBe('Temperature');
  });

  it('getField returns undefined for unknown field', () => {
    expect(sensorRegistry.getField('unknown.field')).toBeUndefined();
  });
});

describe('Packet normalization pipeline', () => {
  it('extracts DHT11 readings from legacy flat packet', () => {
    const packet = makeLegacyPacket();
    sensorRegistry.enableSensors(['dht11']);
    const readings = sensorRegistry.normalizePacket(packet, ['dht11'], 'esp8266-rx', 'ORBITRA');
    expect(readings.length).toBe(2);
    const temp = readings.find(r => r.fieldKey === 'temperature');
    const hum = readings.find(r => r.fieldKey === 'humidity');
    expect(temp?.value).toBe(29.1);
    expect(hum?.value).toBe(54);
  });

  it('extracts MPU6050 and GPS readings when sensors are enabled in pipeline', () => {
    const packet = makeLegacyPacket({
      ax: 0.05,
      ay: -0.02,
      az: 0.98,
      gx: 1.1,
      gy: -0.5,
      gz: 0.2,
      roll: 3.5,
      pitch: -1.2,
      latitude: 28.6139,
      longitude: 77.2090,
      altitude: 216.0,
      speed: 1.5,
      satellites: 9,
      gpsFix: 1,
    });
    sensorRegistry.enableSensors(['dht11', 'mpu6050', 'gps']);
    const readings = sensorRegistry.normalizePacket(
      packet,
      ['dht11', 'mpu6050', 'gps'],
      'esp8266-rx',
      'ORBITRA'
    );

    const ax = readings.find(r => r.sensorId === 'mpu6050' && r.fieldKey === 'ax');
    const roll = readings.find(r => r.sensorId === 'mpu6050' && r.fieldKey === 'roll');
    const lat = readings.find(r => r.sensorId === 'gps' && r.fieldKey === 'latitude');
    const fix = readings.find(r => r.sensorId === 'gps' && r.fieldKey === 'gpsFix');

    expect(ax?.value).toBe(0.05);
    expect(roll?.value).toBe(3.5);
    expect(lat?.value).toBe(28.6139);
    expect(fix?.value).toBe(1);
  });

  it('does not fabricate readings for disabled sensors', () => {
    const packet = makeLegacyPacket();
    // Only enable dht11 — mpu6050 should produce zero readings from flat packet
    sensorRegistry.enableSensors(['dht11']);
    const readings = sensorRegistry.normalizePacket(packet, ['dht11', 'mpu6050'], 'esp8266-rx', 'ORBITRA');
    const mpuReadings = readings.filter(r => r.sensorId === 'mpu6050');
    expect(mpuReadings).toHaveLength(0);
  });

  it('handles null sensor data without crashing', () => {
    const packet: NormalizedPacket = {
      raw: {
        schemaVersion: 1,
        packetNo: 1,
        timestamp: 1700000000000,
        sensors: { dht11: null, mpu6050: null },
      },
      packetNo: 1,
      timestamp: 1700000000000,
      timestampSource: 'packet',
      readings: [],
      parseWarnings: [],
    };
    sensorRegistry.enableSensors(['dht11', 'mpu6050']);
    expect(() =>
      sensorRegistry.normalizePacket(packet, ['dht11', 'mpu6050'], 'esp8266-rx', 'ORBITRA')
    ).not.toThrow();
  });

  it('preserves original timestamp from bridge packet', () => {
    const ts = 1792306291032;
    const packet = makeLegacyPacket({ timestamp: ts });
    packet.timestamp = ts;
    packet.timestampSource = 'bridge';
    sensorRegistry.enableSensors(['dht11']);
    const readings = sensorRegistry.normalizePacket(packet, ['dht11'], 'esp8266-rx', 'ORBITRA');
    for (const r of readings) {
      expect(r.timestamp).toBe(ts);
    }
  });

  it('does not treat null humidity as zero', () => {
    const packet: NormalizedPacket = {
      raw: { packetNo: 1, temperature: 25 }, // no humidity field
      packetNo: 1,
      timestamp: 1700000000000,
      timestampSource: 'bridge',
      readings: [],
      parseWarnings: [],
    };
    sensorRegistry.enableSensors(['dht11']);
    const readings = sensorRegistry.normalizePacket(packet, ['dht11'], 'esp8266-rx', 'ORBITRA');
    const humReading = readings.find(r => r.fieldKey === 'humidity');
    // If humidity is absent, there should be no humidity reading at all
    expect(humReading).toBeUndefined();
  });
});
