import { describe, it, expect } from 'vitest';
import { normalizeGPS } from '../gps';
import type { NormalizedPacket } from '../../../../types/telemetry';

function makePacket(raw: unknown): NormalizedPacket {
  return {
    raw,
    packetNo: 125,
    timestamp: 1792783200000,
    timestampSource: 'bridge',
    readings: [],
    parseWarnings: [],
  };
}

describe('GPS Adapter', () => {
  describe('Flat legacy format from bridge.js', () => {
    it('normalizes GPS coordinates, speed, satellites, and fix status', () => {
      const packet = makePacket({
        packetNo: 125,
        timestamp: 1792783200000,
        latitude: 26.76,
        longitude: 83.37,
        altitude: 80.5,
        speed: 0.2,
        satellites: 8,
        gpsFix: 1,
      });

      const readings = normalizeGPS(packet, 'esp8266-rx', 'ORBITRA');

      expect(readings.find(r => r.fieldKey === 'latitude')?.value).toBe(26.76);
      expect(readings.find(r => r.fieldKey === 'longitude')?.value).toBe(83.37);
      expect(readings.find(r => r.fieldKey === 'altitude')?.value).toBe(80.5);
      expect(readings.find(r => r.fieldKey === 'speed')?.value).toBe(0.2);
      expect(readings.find(r => r.fieldKey === 'satellites')?.value).toBe(8);
      expect(readings.find(r => r.fieldKey === 'gpsFix')?.value).toBe(1);
      expect(readings.find(r => r.fieldKey === 'fix')?.value).toBe(1);
    });

    it('preserves valid zero values such as 0 speed, 0 satellites, and 0 fix status', () => {
      const packet = makePacket({
        packetNo: 126,
        latitude: -12.04,
        longitude: -77.03,
        altitude: 100,
        speed: 0,
        satellites: 0,
        gpsFix: 0,
      });

      const readings = normalizeGPS(packet, 'esp8266-rx', 'ORBITRA');

      expect(readings.find(r => r.fieldKey === 'speed')?.value).toBe(0);
      expect(readings.find(r => r.fieldKey === 'satellites')?.value).toBe(0);
      expect(readings.find(r => r.fieldKey === 'gpsFix')?.value).toBe(0);
      expect(readings.find(r => r.fieldKey === 'latitude')?.value).toBe(-12.04);
      expect(readings.find(r => r.fieldKey === 'longitude')?.value).toBe(-77.03);
    });

    it('returns empty array when GPS fields are missing', () => {
      const packet = makePacket({
        packetNo: 127,
        temperature: 28.5,
      });

      const readings = normalizeGPS(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings).toHaveLength(0);
    });
  });

  describe('Nested format support', () => {
    it('normalizes GPS readings from nested sensors.gps', () => {
      const packet = makePacket({
        schemaVersion: 1,
        sensors: {
          gps: {
            latitude: 37.7749,
            longitude: -122.4194,
            altitude: 15.2,
            speed: 5.4,
            satellites: 12,
            gpsFix: 2,
          },
        },
      });

      const readings = normalizeGPS(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings.find(r => r.fieldKey === 'latitude')?.value).toBe(37.7749);
      expect(readings.find(r => r.fieldKey === 'longitude')?.value).toBe(-122.4194);
      expect(readings.find(r => r.fieldKey === 'satellites')?.value).toBe(12);
      expect(readings.find(r => r.fieldKey === 'gpsFix')?.value).toBe(2);
    });
  });
});
