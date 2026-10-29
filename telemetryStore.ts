import { create } from 'zustand';
import type {
  ConnectionState,
  FieldSample,
  PacketDiagnostics,
  NormalizedReading,
  ConnectionEvent,
} from '../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry Store
// Holds live telemetry data, connection state, and diagnostics.
// Updated by telemetryService — NOT directly by components.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BUFFER_SIZE = 3600; // ~2h at 2s interval

interface TelemetryState {
  connectionState: ConnectionState;
  latestValues: Record<string, number | null>;     // "sensorId.fieldKey" → value
  latestTimestamps: Record<string, number | null>; // "sensorId.fieldKey" → timestamp
  sampleBuffers: Record<string, FieldSample[]>;    // "sensorId.fieldKey" → ring buffer
  diagnostics: PacketDiagnostics;

  // Actions
  setConnectionState: (state: ConnectionState, detail?: string) => void;
  processReadings: (readings: NormalizedReading[], rawJson: string) => void;
  incrementInvalidPacket: (reason: string) => void;
  clearHistory: () => void;
}

const initialDiagnostics: PacketDiagnostics = {
  received: 0,
  invalid: 0,
  lastPacketNo: null,
  lastTimestamp: null,
  duplicateCount: 0,
  missedCount: 0,
  lastRawJson: null,
  lastNormalizedPacket: null,
  validationErrors: [],
  connectionEvents: [],
};

export const useTelemetryStore = create<TelemetryState>()((set) => ({
  connectionState: 'idle',
  latestValues: {},
  latestTimestamps: {},
  sampleBuffers: {},
  diagnostics: { ...initialDiagnostics },

  setConnectionState: (state, detail) =>
    set((s) => {
      const event: ConnectionEvent = {
        at: Date.now(),
        type:
          state === 'connected' ? 'connected'
          : state === 'disconnected' ? 'disconnected'
          : state === 'error' ? 'error'
          : 'reconnecting',
        detail,
      };
      return {
        connectionState: state,
        diagnostics: {
          ...s.diagnostics,
          connectionEvents: [event, ...s.diagnostics.connectionEvents].slice(0, 50),
        },
      };
    }),

  processReadings: (readings, rawJson) =>
    set((s) => {
      const newLatestValues = { ...s.latestValues };
      const newLatestTimestamps = { ...s.latestTimestamps };
      const newSampleBuffers = { ...s.sampleBuffers };

      for (const reading of readings) {
        const key = `${reading.sensorId}.${reading.fieldKey}`;
        newLatestValues[key] = reading.value;
        newLatestTimestamps[key] = reading.timestamp;

        const existing = newSampleBuffers[key] ?? [];
        const sample: FieldSample = {
          timestamp: reading.timestamp,
          value: reading.value,
          quality: reading.quality,
        };
        // Append and trim to max buffer size
        const updated = [...existing, sample];
        newSampleBuffers[key] = updated.length > MAX_BUFFER_SIZE
          ? updated.slice(updated.length - MAX_BUFFER_SIZE)
          : updated;
      }

      // Update diagnostics
      const firstReading = readings[0];
      const newPacketNo = firstReading?.packetNo ?? s.diagnostics.lastPacketNo;
      const lastPacketNo = s.diagnostics.lastPacketNo;

      let duplicateCount = s.diagnostics.duplicateCount;
      let missedCount = s.diagnostics.missedCount;

      if (newPacketNo !== null && lastPacketNo !== null) {
        const diff = newPacketNo - lastPacketNo;
        if (diff === 0) duplicateCount++;
        else if (diff > 1) missedCount += diff - 1;
      }

      const errors = s.diagnostics.validationErrors;

      return {
        latestValues: newLatestValues,
        latestTimestamps: newLatestTimestamps,
        sampleBuffers: newSampleBuffers,
        diagnostics: {
          ...s.diagnostics,
          received: s.diagnostics.received + 1,
          lastPacketNo: newPacketNo,
          lastTimestamp: firstReading?.timestamp ?? s.diagnostics.lastTimestamp,
          duplicateCount,
          missedCount,
          lastRawJson: rawJson,
          validationErrors: errors,
        },
      };
    }),

  incrementInvalidPacket: (reason) =>
    set((s) => ({
      diagnostics: {
        ...s.diagnostics,
        invalid: s.diagnostics.invalid + 1,
        validationErrors: [
          `[${new Date().toISOString()}] ${reason}`,
          ...s.diagnostics.validationErrors,
        ].slice(0, 100),
      },
    })),

  clearHistory: () =>
    set(() => ({
      latestValues: {},
      latestTimestamps: {},
      sampleBuffers: {},
      diagnostics: { ...initialDiagnostics },
    })),
}));
