import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MissionConfig } from '../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Mission Store — persisted to localStorage
// Holds all mission configuration set during setup wizard.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MISSION: MissionConfig = {
  missionName: 'ORBITRA',
  deviceId: 'esp8266-rx',
  wsUrl: 'ws://localhost:8081',
  configuredSensorIds: ['dht11'],
  isSetupComplete: false,
  setupVersion: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

interface MissionState extends MissionConfig {
  // Actions
  completeMission: (config: Partial<MissionConfig>) => void;
  updateConfig: (config: Partial<MissionConfig>) => void;
  resetSetup: () => void;
  addSensor: (sensorId: string) => void;
  removeSensor: (sensorId: string) => void;
}

export const useMissionStore = create<MissionState>()(
  persist(
    (set) => ({
      ...DEFAULT_MISSION,

      completeMission: (config) =>
        set((state) => ({
          ...state,
          ...config,
          isSetupComplete: true,
          updatedAt: Date.now(),
        })),

      updateConfig: (config) =>
        set((state) => ({
          ...state,
          ...config,
          updatedAt: Date.now(),
        })),

      resetSetup: () =>
        set({
          ...DEFAULT_MISSION,
          isSetupComplete: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),

      addSensor: (sensorId) =>
        set((state) => ({
          configuredSensorIds: state.configuredSensorIds.includes(sensorId)
            ? state.configuredSensorIds
            : [...state.configuredSensorIds, sensorId],
          updatedAt: Date.now(),
        })),

      removeSensor: (sensorId) =>
        set((state) => ({
          // DHT11 cannot be fully removed here, only disabled via SensorsPage
          configuredSensorIds: state.configuredSensorIds.filter((id) => id !== sensorId),
          updatedAt: Date.now(),
        })),
    }),
    {
      name: 'orbitra-mission',
      version: 1,
    }
  )
);
