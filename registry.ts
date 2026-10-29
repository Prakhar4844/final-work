import type {
  SensorDefinition,
  SensorFieldDefinition,
  NormalizedPacket,
  NormalizedReading,
} from '../../types/telemetry';
import { DHT11_DEFINITION, normalizeDHT11 } from './adapters/dht11';
import { MPU6050_DEFINITION, normalizeMPU6050 } from './adapters/mpu6050';
import { BMP280_DEFINITION, normalizeBMP280 } from './adapters/bmp280';

import { GPS_DEFINITION, normalizeGPS } from './adapters/gps';

// ─────────────────────────────────────────────────────────────────────────────
// Sensor Registry
//
// Central registry for all sensor adapters. New sensors can be added by
// calling registerSensor() with a definition and normalizer function.
// ─────────────────────────────────────────────────────────────────────────────

export type NormalizerFn = (
  packet: NormalizedPacket,
  deviceId: string,
  missionId: string
) => NormalizedReading[];

interface SensorRegistryEntry {
  definition: SensorDefinition;
  normalizer: NormalizerFn;
}

class SensorRegistry {
  private entries = new Map<string, SensorRegistryEntry>();

  /** Register a sensor adapter. Call this once at app startup (or when a plugin loads). */
  registerSensor(definition: SensorDefinition, normalizer: NormalizerFn): void {
    this.entries.set(definition.sensorId, {
      definition: { ...definition },
      normalizer,
    });
  }

  /** Get a mutable copy of a sensor definition. */
  getSensor(sensorId: string): SensorDefinition | undefined {
    const entry = this.entries.get(sensorId);
    return entry ? { ...entry.definition } : undefined;
  }

  /** All registered sensors. */
  getAllSensors(): SensorDefinition[] {
    return Array.from(this.entries.values()).map(e => ({ ...e.definition }));
  }

  /** All enabled sensors. */
  getEnabledSensors(): SensorDefinition[] {
    return this.getAllSensors().filter(s => s.enabled);
  }

  /** All fields from all enabled sensors, returned as "sensorId.fieldKey". */
  getAllFields(): Array<{ sensorId: string; fieldDef: SensorFieldDefinition }> {
    const result: Array<{ sensorId: string; fieldDef: SensorFieldDefinition }> = [];
    for (const entry of this.entries.values()) {
      if (!entry.definition.enabled) continue;
      for (const field of entry.definition.fields) {
        result.push({ sensorId: entry.definition.sensorId, fieldDef: field });
      }
    }
    return result;
  }

  /** Get a field definition by "sensorId.fieldKey". */
  getField(ref: string): SensorFieldDefinition | undefined {
    const [sensorId, fieldKey] = ref.split('.');
    const entry = this.entries.get(sensorId);
    return entry?.definition.fields.find(f => f.fieldKey === fieldKey);
  }

  /** Update sensor enabled state and metadata (called from Settings/Sensors page). */
  updateSensor(sensorId: string, updates: Partial<SensorDefinition>): boolean {
    const entry = this.entries.get(sensorId);
    if (!entry) return false;
    entry.definition = { ...entry.definition, ...updates };
    return true;
  }

  /** Apply a packet through all enabled adapters and collect readings. */
  normalizePacket(
    packet: NormalizedPacket,
    enabledSensorIds: string[],
    deviceId: string,
    missionId: string
  ): NormalizedReading[] {
    const readings: NormalizedReading[] = [];
    for (const sensorId of enabledSensorIds) {
      const entry = this.entries.get(sensorId);
      if (!entry || !entry.definition.enabled) continue;
      try {
        const sensorReadings = entry.normalizer(packet, deviceId, missionId);
        readings.push(...sensorReadings);
      } catch (err) {
        packet.parseWarnings.push(
          `Adapter error for ${sensorId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    return readings;
  }

  /** Enable sensors by their IDs (called after setup wizard). */
  enableSensors(sensorIds: string[]): void {
    for (const [id, entry] of this.entries) {
      entry.definition.enabled = sensorIds.includes(id);
      if (!sensorIds.includes(id)) {
        entry.definition.status = 'disabled';
      } else if (entry.definition.status === 'disabled') {
        entry.definition.status = 'configured';
      }
    }
  }

  /** Export sensor definitions as JSON (for import/export feature). */
  exportDefinitions(): SensorDefinition[] {
    return this.getAllSensors();
  }
}

// ── Singleton instance ────────────────────────────────────────────────────────
export const sensorRegistry = new SensorRegistry();

// ── Register built-in adapters ─────────────────────────────────────────────
sensorRegistry.registerSensor(DHT11_DEFINITION, normalizeDHT11);
sensorRegistry.registerSensor(MPU6050_DEFINITION, normalizeMPU6050);
sensorRegistry.registerSensor(BMP280_DEFINITION, normalizeBMP280);
sensorRegistry.registerSensor(GPS_DEFINITION, normalizeGPS);
