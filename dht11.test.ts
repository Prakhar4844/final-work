import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeDHT11 } from '../dht11';
import type { NormalizedPacket } from '../../../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// DHT11 Adapter Unit Tests
// ─────────────────────────────────────────────────────────────────────────────

function makePacket(raw: unknown): NormalizedPacket {
  return {
    raw,
    packetNo: 1,
    timestamp: 1700000000000,
    timestampSource: 'bridge',
    readings: [],
    parseWarnings: [],
  };
}

describe('DHT11 Adapter', () => {
  describe('Flat legacy format', () => {
    it('normalizes temperature from flat packet', () => {
      const packet = makePacket({ packetNo: 1, timestamp: 1700000000000, temperature: 29.1, humidity: 54 });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      const tempReading = readings.find(r => r.fieldKey === 'temperature');
      expect(tempReading).toBeDefined();
      expect(tempReading?.value).toBe(29.1);
      expect(tempReading?.unit).toBe('°C');
      expect(tempReading?.quality).toBe('ok');
    });

    it('normalizes humidity from flat packet', () => {
      const packet = makePacket({ packetNo: 1, timestamp: 1700000000000, temperature: 29.1, humidity: 54 });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      const humReading = readings.find(r => r.fieldKey === 'humidity');
      expect(humReading).toBeDefined();
      expect(humReading?.value).toBe(54);
      expect(humReading?.unit).toBe('%');
      expect(humReading?.quality).toBe('ok');
    });

    it('marks out-of-range temperature as invalid', () => {
      const packet = makePacket({ packetNo: 1, timestamp: 1700000000000, temperature: 999, humidity: 54 });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      const tempReading = readings.find(r => r.fieldKey === 'temperature');
      expect(tempReading?.quality).toBe('invalid');
      expect(packet.parseWarnings.length).toBeGreaterThan(0);
    });

    it('marks out-of-range humidity as invalid', () => {
      const packet = makePacket({ packetNo: 1, timestamp: 1700000000000, temperature: 25, humidity: 110 });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      const humReading = readings.find(r => r.fieldKey === 'humidity');
      expect(humReading?.quality).toBe('invalid');
    });

    it('returns no readings if temperature and humidity are missing', () => {
      const packet = makePacket({ packetNo: 1, timestamp: 1700000000000 });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings).toHaveLength(0);
    });

    it('ignores non-finite values', () => {
      const packet = makePacket({ packetNo: 1, temperature: NaN, humidity: Infinity });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings).toHaveLength(0);
    });
  });

  describe('Nested future format', () => {
    it('normalizes temperature from nested sensors object', () => {
      const packet = makePacket({
        schemaVersion: 1,
        missionId: 'ORBITRA',
        packetNo: 42,
        timestamp: 1700000000000,
        sensors: { dht11: { temperature: 27.5, humidity: 60 } },
      });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings.find(r => r.fieldKey === 'temperature')?.value).toBe(27.5);
      expect(readings.find(r => r.fieldKey === 'humidity')?.value).toBe(60);
    });

    it('returns no readings if dht11 is null in sensors', () => {
      const packet = makePacket({
        schemaVersion: 1,
        packetNo: 1,
        sensors: { dht11: null },
      });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings).toHaveLength(0);
    });
  });

  describe('Field metadata', () => {
    it('attaches correct sensorId and deviceId', () => {
      const packet = makePacket({ temperature: 25, humidity: 50 });
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      for (const r of readings) {
        expect(r.sensorId).toBe('dht11');
        expect(r.deviceId).toBe('esp8266-rx');
        expect(r.missionId).toBe('ORBITRA');
      }
    });

    it('preserves packet timestamp', () => {
      const ts = 1700000000000;
      const packet = makePacket({ temperature: 25, humidity: 50 });
      packet.timestamp = ts;
      const readings = normalizeDHT11(packet, 'esp8266-rx', 'ORBITRA');
      for (const r of readings) {
        expect(r.timestamp).toBe(ts);
      }
    });
  });
});
