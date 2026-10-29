import { z } from 'zod';
import { useTelemetryStore } from '../stores/telemetryStore';
import { sensorRegistry } from '../features/sensors/registry';
import type { NormalizedPacket, ConnectionState } from '../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// ORBITRA Telemetry Service
//
// - Single shared WebSocket connection (no per-chart connections)
// - Parses flat legacy + future nested packet formats
// - Bounded exponential backoff reconnection (max 30s)
// - Stale detection: marks 'stale' if no packet for 10s
// - Distributes readings to Zustand store
// - Posts readings to backend for persistence
// ─────────────────────────────────────────────────────────────────────────────

// ── Zod schemas ───────────────────────────────────────────────────────────────
const FlatPacketSchema = z.object({
  packetNo: z.number(),
  timestamp: z.number().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  ax: z.number().optional(),
  ay: z.number().optional(),
  az: z.number().optional(),
  totalAcc: z.number().optional(),
  gx: z.number().optional(),
  gy: z.number().optional(),
  gz: z.number().optional(),
  roll: z.number().optional(),
  pitch: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  altitude: z.number().optional(),
  speed: z.number().optional(),
  satellites: z.number().optional(),
  gpsFix: z.number().optional(),
}).passthrough();

const NestedPacketSchema = z.object({
  schemaVersion: z.literal(1),
  missionId: z.string().optional(),
  deviceId: z.string().optional(),
  packetNo: z.number(),
  timestamp: z.number().optional(),
  sensors: z.record(z.unknown()).optional(),
});

// ── Config ────────────────────────────────────────────────────────────────────
const STALE_TIMEOUT_MS = 10_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const BACKOFF_MULTIPLIER = 1.5;
const BACKEND_URL = 'http://localhost:3001';

class TelemetryService {
  private ws: WebSocket | null = null;
  private wsUrl: string = 'ws://localhost:8081';
  private deviceId: string = 'esp8266-rx';
  private missionId: string = 'ORBITRA';
  private enabledSensorIds: string[] = ['dht11'];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private staleTimer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  configure(options: {
    wsUrl: string;
    deviceId: string;
    missionId: string;
    enabledSensorIds: string[];
  }): void {
    this.wsUrl = options.wsUrl;
    this.deviceId = options.deviceId;
    this.missionId = options.missionId;
    this.enabledSensorIds = options.enabledSensorIds;
    // Apply to registry
    sensorRegistry.enableSensors(options.enabledSensorIds);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.connect();
  }

  stop(): void {
    this.running = false;
    this.clearReconnectTimer();
    this.clearStaleTimer();
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.CONNECTING) {
        ws.onopen = () => ws.close();
      } else {
        ws.onopen = null;
        ws.close();
      }
    }
    this.setConnectionState('disconnected');
  }

  private connect(): void {
    if (!this.running) return;
    this.setConnectionState('connecting');

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.setConnectionState('error', detail);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setConnectionState('connected');
      this.resetStaleTimer();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(typeof event.data === 'string' ? event.data : '');
    };

    this.ws.onerror = () => {
      // onerror always followed by onclose; handle in onclose
    };

    this.ws.onclose = (event) => {
      const detail = `Code ${event.code}${event.reason ? ': ' + event.reason : ''}`;
      this.setConnectionState('disconnected', detail);
      this.clearStaleTimer();
      if (this.running) this.scheduleReconnect();
    };
  }

  private handleMessage(rawJson: string): void {
    this.resetStaleTimer();
    const store = useTelemetryStore.getState();

    // ── Parse JSON ──────────────────────────────────────────────────────────
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      store.incrementInvalidPacket('JSON parse error');
      return;
    }

    // ── Build normalized packet shell ───────────────────────────────────────
    const packet: NormalizedPacket = {
      raw: parsed,
      packetNo: null,
      timestamp: Date.now(),
      timestampSource: 'fallback',
      readings: [],
      parseWarnings: [],
    };

    // ── Try flat legacy schema ──────────────────────────────────────────────
    const flat = FlatPacketSchema.safeParse(parsed);
    if (flat.success) {
      packet.packetNo = flat.data.packetNo;
      // Bridge sets timestamp to Date.now() — always valid
      if (typeof flat.data.timestamp === 'number' && isFinite(flat.data.timestamp) && flat.data.timestamp > 0) {
        packet.timestamp = flat.data.timestamp;
        packet.timestampSource = 'bridge';
      }
    } else {
      // ── Try nested schema ─────────────────────────────────────────────────
      const nested = NestedPacketSchema.safeParse(parsed);
      if (nested.success) {
        packet.packetNo = nested.data.packetNo;
        if (typeof nested.data.timestamp === 'number' && isFinite(nested.data.timestamp) && nested.data.timestamp > 0) {
          packet.timestamp = nested.data.timestamp;
          packet.timestampSource = 'packet';
        }
      } else {
        store.incrementInvalidPacket(`Unknown packet format: ${rawJson.slice(0, 120)}`);
        return;
      }
    }

    // ── Run adapters ────────────────────────────────────────────────────────
    const readings = sensorRegistry.normalizePacket(
      packet,
      this.enabledSensorIds,
      this.deviceId,
      this.missionId
    );
    packet.readings = readings;

    // Update store
    store.processReadings(readings, rawJson);

    // Update registry sensor status
    if (readings.length > 0) {
      const seenSensors = new Set(readings.map(r => r.sensorId));
      for (const sensorId of seenSensors) {
        sensorRegistry.updateSensor(sensorId, {
          status: 'receiving',
          lastSeenTimestamp: packet.timestamp,
        });
      }
    }

    // ── Persist to backend ──────────────────────────────────────────────────
    if (readings.length > 0) {
      this.persistReadings(readings).catch(() => {
        // Backend unavailable — silently continue; data still in memory buffer
      });
    }
  }

  private async persistReadings(readings: Array<{
    sensorId: string; fieldKey: string; value: number;
    timestamp: number; packetNo: number | null; quality: string;
  }>): Promise<void> {
    await fetch(`${BACKEND_URL}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        missionId: this.missionId,
        deviceId: this.deviceId,
        readings,
      }),
      signal: AbortSignal.timeout(2000),
    });
  }

  private resetStaleTimer(): void {
    this.clearStaleTimer();
    this.staleTimer = setTimeout(() => {
      const state = useTelemetryStore.getState().connectionState;
      if (state === 'connected') {
        this.setConnectionState('stale', 'No packets received for 10 seconds');
        // Update all receiving sensors to stale
        const sensors = sensorRegistry.getAllSensors();
        for (const sensor of sensors) {
          if (sensor.status === 'receiving') {
            sensorRegistry.updateSensor(sensor.sensorId, { status: 'stale' });
          }
        }
      }
    }, STALE_TIMEOUT_MS);
  }

  private clearStaleTimer(): void {
    if (this.staleTimer !== null) {
      clearTimeout(this.staleTimer);
      this.staleTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = Math.min(
      BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, this.reconnectAttempts),
      BACKOFF_MAX_MS
    );
    this.reconnectAttempts++;
    useTelemetryStore.getState().setConnectionState('connecting', `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      if (this.running) this.connect();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setConnectionState(state: ConnectionState, detail?: string): void {
    useTelemetryStore.getState().setConnectionState(state, detail);
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────────
export const telemetryService = new TelemetryService();
