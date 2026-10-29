import { describe, it, expect } from 'vitest';
import { normalizeMPU6050 } from '../mpu6050';
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

describe('MPU6050 Adapter', () => {
  describe('Flat legacy format from bridge.js', () => {
    it('normalizes accelerometer, gyro, and attitude readings from flat packet', () => {
      const packet = makePacket({
        packetNo: 125,
        timestamp: 1792783200000,
        ax: 0.02,
        ay: -0.04,
        az: 0.99,
        totalAcc: 1.01,
        gx: 2.4,
        gy: -1.2,
        gz: 0.5,
        roll: 4.2,
        pitch: -2.8,
      });

      const readings = normalizeMPU6050(packet, 'esp8266-rx', 'ORBITRA');

      expect(readings.find(r => r.fieldKey === 'ax')?.value).toBe(0.02);
      expect(readings.find(r => r.fieldKey === 'ay')?.value).toBe(-0.04);
      expect(readings.find(r => r.fieldKey === 'az')?.value).toBe(0.99);
      expect(readings.find(r => r.fieldKey === 'totalAcc')?.value).toBe(1.01);
      expect(readings.find(r => r.fieldKey === 'gx')?.value).toBe(2.4);
      expect(readings.find(r => r.fieldKey === 'gy')?.value).toBe(-1.2);
      expect(readings.find(r => r.fieldKey === 'gz')?.value).toBe(0.5);
      expect(readings.find(r => r.fieldKey === 'roll')?.value).toBe(4.2);
      expect(readings.find(r => r.fieldKey === 'pitch')?.value).toBe(-2.8);

      // Verify aliases
      expect(readings.find(r => r.fieldKey === 'accel_x')?.value).toBe(0.02);
      expect(readings.find(r => r.fieldKey === 'gyro_x')?.value).toBe(2.4);
    });

    it('preserves valid zero readings for attitude and motion', () => {
      const packet = makePacket({
        packetNo: 126,
        ax: 0,
        ay: 0,
        az: 0,
        roll: 0,
        pitch: 0,
      });

      const readings = normalizeMPU6050(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings.find(r => r.fieldKey === 'roll')?.value).toBe(0);
      expect(readings.find(r => r.fieldKey === 'pitch')?.value).toBe(0);
      expect(readings.find(r => r.fieldKey === 'ax')?.value).toBe(0);
    });

    it('returns empty array when no MPU fields are present', () => {
      const packet = makePacket({
        packetNo: 127,
        temperature: 25.0,
      });

      const readings = normalizeMPU6050(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings).toHaveLength(0);
    });
  });

  describe('Nested format support', () => {
    it('normalizes MPU readings from nested sensors.mpu6050', () => {
      const packet = makePacket({
        schemaVersion: 1,
        sensors: {
          mpu6050: {
            ax: 0.1,
            ay: 0.2,
            az: 0.98,
            roll: 12.5,
            pitch: -5.4,
          },
        },
      });

      const readings = normalizeMPU6050(packet, 'esp8266-rx', 'ORBITRA');
      expect(readings.find(r => r.fieldKey === 'ax')?.value).toBe(0.1);
      expect(readings.find(r => r.fieldKey === 'roll')?.value).toBe(12.5);
    });
  });
});
