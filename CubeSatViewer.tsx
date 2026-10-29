import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { sensorRegistry } from '../../features/sensors/registry';
import { formatDistanceToNow } from 'date-fns';
import { Compass, AlertTriangle, Eye, RotateCcw } from 'lucide-react';

interface Props {
  title?: string;
}

export function CubeSatViewer({ title = 'CubeSat Attitude 3D' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Live telemetry subscriptions
  const roll = useTelemetryStore(s => s.latestValues['mpu6050.roll'] ?? null);
  const pitch = useTelemetryStore(s => s.latestValues['mpu6050.pitch'] ?? null);
  const ax = useTelemetryStore(s => s.latestValues['mpu6050.ax'] ?? s.latestValues['mpu6050.accel_x'] ?? null);
  const ay = useTelemetryStore(s => s.latestValues['mpu6050.ay'] ?? s.latestValues['mpu6050.accel_y'] ?? null);
  const az = useTelemetryStore(s => s.latestValues['mpu6050.az'] ?? s.latestValues['mpu6050.accel_z'] ?? null);
  const mpuTimestamp = useTelemetryStore(s => s.latestTimestamps['mpu6050.roll'] ?? s.latestTimestamps['mpu6050.ax'] ?? null);
  const connState = useTelemetryStore(s => s.connectionState);

  const [webGlSupported, setWebGlSupported] = useState(true);
  const [isManualRotate, setIsManualRotate] = useState(false);

  // References for animation loop
  const targetEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const currentEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const satelliteGroupRef = useRef<THREE.Group | null>(null);

  // Update target angles whenever live telemetry changes
  useEffect(() => {
    if (roll !== null && pitch !== null) {
      // Convert degrees to radians
      // Aircraft/Spacecraft convention:
      // Roll = rotation about X axis (or longitudinal axis)
      // Pitch = rotation about Y or Z axis
      const radPitch = THREE.MathUtils.degToRad(-pitch);
      const radRoll = THREE.MathUtils.degToRad(roll);
      targetEuler.current.set(radPitch, 0, radRoll, 'YXZ');
    }
  }, [roll, pitch]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
        return;
      }
    } catch {
      setWebGlSupported(false);
      return;
    }

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    // Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(2.8, 2.2, 3.5);
    camera.lookAt(0, 0, 0);

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);
    } catch {
      setWebGlSupported(false);
      return;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x67e8f9, 1.8);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.8);
    dirLight2.position.set(-5, -3, -4);
    scene.add(dirLight2);

    // ── Build 1U CubeSat Spacecraft Model ────────────────────────────────────
    const satGroup = new THREE.Group();
    satelliteGroupRef.current = satGroup;
    scene.add(satGroup);

    // 1. Chassis Body (aluminum anodized dark space frame)
    const chassisGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e2638,
      roughness: 0.35,
      metalness: 0.85,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    satGroup.add(chassis);

    // 2. Gold rails along 12 edges
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const railThick = 0.08;
    const railLen = 1.42;

    const createRail = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      const geo = new THREE.BoxGeometry(railThick, railLen, railThick);
      const m = new THREE.Mesh(geo, railMat);
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      satGroup.add(m);
    };

    // Vertical rails
    createRail(0.7, 0, 0.7);
    createRail(-0.7, 0, 0.7);
    createRail(0.7, 0, -0.7);
    createRail(-0.7, 0, -0.7);
    // Horizontal top/bottom rails
    createRail(0, 0.7, 0.7, 0, 0, Math.PI / 2);
    createRail(0, -0.7, 0.7, 0, 0, Math.PI / 2);
    createRail(0, 0.7, -0.7, 0, 0, Math.PI / 2);
    createRail(0, -0.7, -0.7, 0, 0, Math.PI / 2);
    createRail(0.7, 0.7, 0, Math.PI / 2, 0, 0);
    createRail(-0.7, 0.7, 0, Math.PI / 2, 0, 0);
    createRail(0.7, -0.7, 0, Math.PI / 2, 0, 0);
    createRail(-0.7, -0.7, 0, Math.PI / 2, 0, 0);

    // 3. Solar Panels on faces (Silicon cell deep blue with grid lines)
    const solarGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x0f2b5c,
      roughness: 0.1,
      metalness: 0.8,
    });

    const addSolarPanel = (pos: [number, number, number], rot: [number, number, number]) => {
      const p = new THREE.Mesh(solarGeo, solarMat);
      p.position.set(...pos);
      p.rotation.set(...rot);
      satGroup.add(p);
    };

    addSolarPanel([0, 0, 0.71], [0, 0, 0]);           // +Z Face
    addSolarPanel([0, 0, -0.71], [0, Math.PI, 0]);    // -Z Face
    addSolarPanel([0.71, 0, 0], [0, Math.PI / 2, 0]); // +X Face
    addSolarPanel([-0.71, 0, 0], [0, -Math.PI / 2, 0]);// -X Face

    // 4. Optical Camera / Payload Aperture on +Z top-center
    const lensRingGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 24);
    const lensRingMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });
    const lensRing = new THREE.Mesh(lensRingGeo, lensRingMat);
    lensRing.position.set(0, 0, 0.74);
    lensRing.rotation.x = Math.PI / 2;
    satGroup.add(lensRing);

    const lensGlassGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.09, 24);
    const lensGlassMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.95, roughness: 0.05 });
    const lensGlass = new THREE.Mesh(lensGlassGeo, lensGlassMat);
    lensGlass.position.set(0, 0, 0.74);
    lensGlass.rotation.x = Math.PI / 2;
    satGroup.add(lensGlass);

    // 5. Deployable Monopole Antenna on top (+Y)
    const antennaGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 12);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.1 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(0.4, 1.1, 0.4);
    satGroup.add(antenna);

    // 6. 3D Body Axes (X=Red, Y=Green, Z=Blue)
    const axes = new THREE.AxesHelper(1.1);
    satGroup.add(axes);

    // Subtle star field / orbit grid
    const grid = new THREE.GridHelper(8, 16, 0x1e293b, 0x0f172a);
    grid.position.y = -1.5;
    scene.add(grid);

    // ── Animation Loop ───────────────────────────────────────────────────────
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (satGroup) {
        // Smoothly interpolate current angles toward target angles (lerp factor 0.1)
        currentEuler.current.x = THREE.MathUtils.lerp(currentEuler.current.x, targetEuler.current.x, 0.12);
        currentEuler.current.y = THREE.MathUtils.lerp(currentEuler.current.y, targetEuler.current.y, 0.12);
        currentEuler.current.z = THREE.MathUtils.lerp(currentEuler.current.z, targetEuler.current.z, 0.12);

        satGroup.rotation.copy(currentEuler.current);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Compute status
  const isStale = connState === 'stale' || (mpuTimestamp && Date.now() - mpuTimestamp > 10000);
  const isLive = (roll !== null || ax !== null) && connState === 'connected' && !isStale;
  const statusLabel = isLive ? 'LIVE' : isStale ? 'STALE' : 'WAITING';
  const statusColor = isLive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : isStale ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-slate-400 bg-slate-800/60 border-slate-700/40';

  if (!webGlSupported) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center bg-slate-900/60">
        <AlertTriangle size={32} className="text-amber-400 mb-2" />
        <p className="text-slate-300 font-medium text-sm">WebGL Unavailable</p>
        <p className="text-slate-500 text-xs mt-1">Please enable WebGL hardware acceleration in your browser to view the 3D CubeSat model.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-slate-950/60 overflow-hidden select-none">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="flex-1 w-full min-h-0 relative" />

      {/* Floating HUD Telemetry Readout */}
      <div className="absolute top-2 left-3 pointer-events-none">
        <div className="flex items-center gap-1.5 mb-1">
          <Compass size={13} className="text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">CubeSat Attitude</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-lg p-2 font-mono text-[11px] space-y-0.5 shadow-xl">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Roll (X):</span>
            <span className="text-cyan-300 font-semibold">{roll !== null ? `${roll > 0 ? '+' : ''}${roll.toFixed(1)}°` : 'N/A'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Pitch (Y):</span>
            <span className="text-cyan-300 font-semibold">{pitch !== null ? `${pitch > 0 ? '+' : ''}${pitch.toFixed(1)}°` : 'N/A'}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Yaw (Z):</span>
            <span className="text-slate-500">N/A</span>
          </div>
          {ax !== null && (
            <div className="pt-1 border-t border-slate-800 flex justify-between gap-3 text-[10px] text-slate-400">
              <span>Accel:</span>
              <span className="text-slate-300 font-mono">
                {ax.toFixed(2)}, {ay?.toFixed(2) ?? '0'}, {az?.toFixed(2) ?? '0'} m/s²
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Last update footer */}
      {mpuTimestamp && (
        <div className="absolute bottom-1 right-2 text-[10px] text-slate-500 font-mono pointer-events-none">
          {formatDistanceToNow(new Date(mpuTimestamp), { addSuffix: true })}
        </div>
      )}
    </div>
  );
}
