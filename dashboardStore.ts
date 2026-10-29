import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DashboardLayout, GridItemLayout, WidgetConfig } from '../types/telemetry';
import { nanoid } from './utils/nanoid';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Store — persisted
// ─────────────────────────────────────────────────────────────────────────────

interface CategoryWidgets {
  widgets: WidgetConfig[];
  grid: GridItemLayout[];
}

function generateWidgetsForCategory(sensorId: string, startY: number): CategoryWidgets {
  const widgets: WidgetConfig[] = [];
  const grid: GridItemLayout[] = [];
  let y = startY;

  switch (sensorId) {
    case 'dht11': {
      const tempId = `widget-${nanoid()}`;
      const humId = `widget-${nanoid()}`;
      const tempChartId = `widget-${nanoid()}`;
      const humChartId = `widget-${nanoid()}`;

      widgets.push(
        { id: tempId, type: 'value', title: 'Temperature', fields: ['dht11.temperature'], timeRange: 'live', autoScale: true, sensorCategory: 'dht11' },
        { id: humId, type: 'value', title: 'Relative Humidity', fields: ['dht11.humidity'], timeRange: 'live', autoScale: true, sensorCategory: 'dht11' },
        { id: tempChartId, type: 'timeseries', title: 'Temperature Trend', fields: ['dht11.temperature'], timeRange: '5m', autoScale: true, color: '#22d3ee', showGrid: true, showLegend: false, sensorCategory: 'dht11' },
        { id: humChartId, type: 'area', title: 'Humidity Trend', fields: ['dht11.humidity'], timeRange: '5m', autoScale: true, color: '#818cf8', showGrid: true, showLegend: false, sensorCategory: 'dht11' },
      );

      grid.push(
        { i: tempId, x: 0, y: y, w: 3, h: 3, minW: 2, minH: 2 },
        { i: humId, x: 3, y: y, w: 3, h: 3, minW: 2, minH: 2 },
        { i: tempChartId, x: 0, y: y + 3, w: 6, h: 5, minW: 3, minH: 3 },
        { i: humChartId, x: 6, y: y + 3, w: 6, h: 5, minW: 3, minH: 3 },
      );
      break;
    }

    case 'mpu6050': {
      const cubeId = `widget-${nanoid()}`;
      const rollId = `widget-${nanoid()}`;
      const pitchId = `widget-${nanoid()}`;
      const accelPlotId = `widget-${nanoid()}`;
      const gyroPlotId = `widget-${nanoid()}`;

      widgets.push(
        { id: cubeId, type: 'cubesat', title: 'CubeSat Attitude 3D', fields: ['mpu6050.roll', 'mpu6050.pitch'], timeRange: 'live', autoScale: true, sensorCategory: 'mpu6050' },
        { id: rollId, type: 'value', title: 'Roll', fields: ['mpu6050.roll'], timeRange: 'live', autoScale: true, sensorCategory: 'mpu6050' },
        { id: pitchId, type: 'value', title: 'Pitch', fields: ['mpu6050.pitch'], timeRange: 'live', autoScale: true, sensorCategory: 'mpu6050' },
        { id: accelPlotId, type: 'timeseries', title: '3-Axis Acceleration', fields: ['mpu6050.ax', 'mpu6050.ay', 'mpu6050.az'], timeRange: '5m', autoScale: true, showGrid: true, showLegend: true, sensorCategory: 'mpu6050' },
        { id: gyroPlotId, type: 'timeseries', title: '3-Axis Angular Velocity', fields: ['mpu6050.gx', 'mpu6050.gy', 'mpu6050.gz'], timeRange: '5m', autoScale: true, showGrid: true, showLegend: true, sensorCategory: 'mpu6050' },
      );

      grid.push(
        { i: cubeId, x: 0, y: y, w: 6, h: 6, minW: 4, minH: 4 },
        { i: rollId, x: 6, y: y, w: 3, h: 3, minW: 2, minH: 2 },
        { i: pitchId, x: 9, y: y, w: 3, h: 3, minW: 2, minH: 2 },
        { i: accelPlotId, x: 6, y: y + 3, w: 6, h: 5, minW: 3, minH: 3 },
        { i: gyroPlotId, x: 0, y: y + 6, w: 12, h: 5, minW: 4, minH: 3 },
      );
      break;
    }

    case 'gps': {
      const mapId = `widget-${nanoid()}`;
      const altId = `widget-${nanoid()}`;
      const spdId = `widget-${nanoid()}`;
      const satId = `widget-${nanoid()}`;
      const fixId = `widget-${nanoid()}`;

      widgets.push(
        { id: mapId, type: 'map', title: 'GPS Position & Ground Track', fields: ['gps.latitude', 'gps.longitude', 'gps.altitude'], timeRange: 'live', autoScale: true, sensorCategory: 'gps' },
        { id: altId, type: 'value', title: 'GPS Altitude', fields: ['gps.altitude'], timeRange: 'live', autoScale: true, sensorCategory: 'gps' },
        { id: spdId, type: 'value', title: 'Ground Speed', fields: ['gps.speed'], timeRange: 'live', autoScale: true, sensorCategory: 'gps' },
        { id: satId, type: 'value', title: 'Satellites', fields: ['gps.satellites'], timeRange: 'live', autoScale: true, sensorCategory: 'gps' },
        { id: fixId, type: 'value', title: 'GPS Fix Status', fields: ['gps.gpsFix'], timeRange: 'live', autoScale: true, sensorCategory: 'gps' },
      );

      grid.push(
        { i: mapId, x: 0, y: y, w: 6, h: 6, minW: 4, minH: 4 },
        { i: altId, x: 6, y: y, w: 3, h: 3, minW: 2, minH: 2 },
        { i: spdId, x: 9, y: y, w: 3, h: 3, minW: 2, minH: 2 },
        { i: satId, x: 6, y: y + 3, w: 3, h: 3, minW: 2, minH: 2 },
        { i: fixId, x: 9, y: y + 3, w: 3, h: 3, minW: 2, minH: 2 },
      );
      break;
    }

    case 'bmp280': {
      const pressId = `widget-${nanoid()}`;
      const tempId = `widget-${nanoid()}`;
      const altId = `widget-${nanoid()}`;
      const pressPlotId = `widget-${nanoid()}`;

      widgets.push(
        { id: pressId, type: 'value', title: 'Barometric Pressure', fields: ['bmp280.pressure'], timeRange: 'live', autoScale: true, sensorCategory: 'bmp280' },
        { id: tempId, type: 'value', title: 'Temperature (BMP)', fields: ['bmp280.temperature'], timeRange: 'live', autoScale: true, sensorCategory: 'bmp280' },
        { id: altId, type: 'value', title: 'Estimated Altitude', fields: ['bmp280.altitude'], timeRange: 'live', autoScale: true, sensorCategory: 'bmp280' },
        { id: pressPlotId, type: 'timeseries', title: 'Atmospheric Pressure Trend', fields: ['bmp280.pressure'], timeRange: '5m', autoScale: true, color: '#f59e0b', showGrid: true, showLegend: false, sensorCategory: 'bmp280' },
      );

      grid.push(
        { i: pressId, x: 0, y: y, w: 4, h: 3, minW: 2, minH: 2 },
        { i: tempId, x: 4, y: y, w: 4, h: 3, minW: 2, minH: 2 },
        { i: altId, x: 8, y: y, w: 4, h: 3, minW: 2, minH: 2 },
        { i: pressPlotId, x: 0, y: y + 3, w: 12, h: 5, minW: 4, minH: 3 },
      );
      break;
    }
  }

  return { widgets, grid };
}

function createDefaultLayout(configuredSensorIds: string[]): DashboardLayout {
  const widgets: WidgetConfig[] = [];
  const grid: GridItemLayout[] = [];

  // Always include connection status at top
  const connId = `widget-${nanoid()}`;
  widgets.push({ id: connId, type: 'value', title: 'Connection Status', fields: [], timeRange: 'live', autoScale: false, sensorCategory: 'system' });
  grid.push({ i: connId, x: 6, y: 0, w: 6, h: 3, minW: 3, minH: 2 });

  let currentY = 0;

  for (const sId of configuredSensorIds) {
    const generated = generateWidgetsForCategory(sId, currentY);
    widgets.push(...generated.widgets);
    grid.push(...generated.grid);

    // Compute max Y for next category
    for (const g of generated.grid) {
      if (g.y + g.h > currentY) {
        currentY = g.y + g.h;
      }
    }
  }

  return {
    id: 'default',
    name: 'Default',
    isDefault: true,
    widgets,
    gridLayout: grid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

interface DashboardState {
  layouts: DashboardLayout[];
  activeLayoutId: string;
  isEditing: boolean;

  // Actions
  initDefaultLayout: (configuredSensorIds: string[]) => void;
  syncSensorsWithLayout: (configuredSensorIds: string[]) => void;
  setActiveLayout: (id: string) => void;
  addWidget: (widget: WidgetConfig, gridItem: GridItemLayout) => void;
  removeWidget: (widgetId: string) => void;
  updateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  duplicateWidget: (widgetId: string) => void;
  updateGridLayout: (layoutId: string, gridLayout: GridItemLayout[]) => void;
  saveLayout: (name: string) => void;
  deleteLayout: (id: string) => void;
  setEditing: (editing: boolean) => void;
  resetToDefault: (configuredSensorIds: string[]) => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      layouts: [],
      activeLayoutId: 'default',
      isEditing: false,

      initDefaultLayout: (configuredSensorIds) => {
        const { layouts } = get();
        if (layouts.length === 0) {
          const defaultLayout = createDefaultLayout(configuredSensorIds);
          set({ layouts: [defaultLayout], activeLayoutId: 'default' });
        } else {
          // Sync existing layout with configured sensors
          get().syncSensorsWithLayout(configuredSensorIds);
        }
      },

      syncSensorsWithLayout: (configuredSensorIds) => {
        const { layouts, activeLayoutId } = get();
        const activeLayout = layouts.find(l => l.id === activeLayoutId) ?? layouts[0];
        if (!activeLayout) return;

        let updatedWidgets = [...activeLayout.widgets];
        let updatedGrid = [...activeLayout.gridLayout];

        // 1. Remove widgets for deselected sensor categories
        const categoriesToRemove = ['dht11', 'mpu6050', 'gps', 'bmp280'].filter(
          cat => !configuredSensorIds.includes(cat)
        );

        updatedWidgets = updatedWidgets.filter(
          w => !w.sensorCategory || !categoriesToRemove.includes(w.sensorCategory)
        );
        updatedGrid = updatedGrid.filter(
          g => updatedWidgets.some(w => w.id === g.i)
        );

        // 2. Add widgets for newly selected sensor categories
        let maxY = updatedGrid.reduce((max, g) => Math.max(max, g.y + g.h), 0);

        for (const sensorId of configuredSensorIds) {
          const alreadyHasCategory = updatedWidgets.some(
            w => w.sensorCategory === sensorId
          );
          if (!alreadyHasCategory) {
            const generated = generateWidgetsForCategory(sensorId, maxY);
            updatedWidgets.push(...generated.widgets);
            updatedGrid.push(...generated.grid);
            maxY = updatedGrid.reduce((max, g) => Math.max(max, g.y + g.h), maxY);
          }
        }

        set(s => ({
          layouts: s.layouts.map(l =>
            l.id === activeLayout.id
              ? { ...l, widgets: updatedWidgets, gridLayout: updatedGrid, updatedAt: Date.now() }
              : l
          ),
        }));
      },

      setActiveLayout: (id) => set({ activeLayoutId: id }),

      addWidget: (widget, gridItem) =>
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === s.activeLayoutId
              ? {
                  ...l,
                  widgets: [...l.widgets, widget],
                  gridLayout: [...l.gridLayout, gridItem],
                  updatedAt: Date.now(),
                }
              : l
          ),
        })),

      removeWidget: (widgetId) =>
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === s.activeLayoutId
              ? {
                  ...l,
                  widgets: l.widgets.filter((w) => w.id !== widgetId),
                  gridLayout: l.gridLayout.filter((g) => g.i !== widgetId),
                  updatedAt: Date.now(),
                }
              : l
          ),
        })),

      updateWidget: (widgetId, updates) =>
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === s.activeLayoutId
              ? {
                  ...l,
                  widgets: l.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
                  updatedAt: Date.now(),
                }
              : l
          ),
        })),

      duplicateWidget: (widgetId) => {
        const { layouts, activeLayoutId } = get();
        const layout = layouts.find((l) => l.id === activeLayoutId);
        if (!layout) return;
        const original = layout.widgets.find((w) => w.id === widgetId);
        const originalGrid = layout.gridLayout.find((g) => g.i === widgetId);
        if (!original || !originalGrid) return;
        const newId = `widget-${nanoid()}`;
        const newWidget: WidgetConfig = { ...original, id: newId, title: `${original.title} (copy)`, sensorCategory: undefined };
        const newGridItem: GridItemLayout = { ...originalGrid, i: newId, y: originalGrid.y + originalGrid.h };
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === activeLayoutId
              ? {
                  ...l,
                  widgets: [...l.widgets, newWidget],
                  gridLayout: [...l.gridLayout, newGridItem],
                  updatedAt: Date.now(),
                }
              : l
          ),
        }));
      },

      updateGridLayout: (layoutId, gridLayout) =>
        set((s) => ({
          layouts: s.layouts.map((l) =>
            l.id === layoutId ? { ...l, gridLayout, updatedAt: Date.now() } : l
          ),
        })),

      saveLayout: (name) => {
        const { layouts, activeLayoutId } = get();
        const active = layouts.find((l) => l.id === activeLayoutId);
        if (!active) return;
        const newLayout: DashboardLayout = {
          ...active,
          id: `layout-${nanoid()}`,
          name,
          isDefault: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ layouts: [...s.layouts, newLayout] }));
      },

      deleteLayout: (id) =>
        set((s) => {
          const remaining = s.layouts.filter((l) => l.id !== id);
          return {
            layouts: remaining,
            activeLayoutId:
              s.activeLayoutId === id ? (remaining[0]?.id ?? 'default') : s.activeLayoutId,
          };
        }),

      setEditing: (isEditing) => set({ isEditing }),

      resetToDefault: (configuredSensorIds) => {
        const defaultLayout = createDefaultLayout(configuredSensorIds);
        set((s) => ({
          layouts: [defaultLayout, ...s.layouts.filter((l) => !l.isDefault)],
          activeLayoutId: 'default',
        }));
      },
    }),
    {
      name: 'orbitra-dashboard',
      version: 1,
    }
  )
);

// Active layout selector
export const selectActiveLayout = (s: DashboardState): DashboardLayout | undefined =>
  s.layouts.find((l) => l.id === s.activeLayoutId);
