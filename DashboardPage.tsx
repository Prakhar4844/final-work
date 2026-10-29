import { useCallback, useState, useRef, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Plus, Edit3, RotateCcw, LayoutGrid, ChevronDown } from 'lucide-react';
import { useDashboardStore, selectActiveLayout } from '../../stores/dashboardStore';
import { useMissionStore } from '../../stores/missionStore';
import { WidgetRenderer } from './WidgetRenderer';
import { AddWidgetModal } from './AddWidgetModal';
import type { GridItemLayout } from '../../types/telemetry';

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Page — React Grid Layout with drag-and-drop widgets
// ─────────────────────────────────────────────────────────────────────────────

const COLS = 12;
const ROW_HEIGHT = 60;

/** Minimal shape of what react-grid-layout v1 passes to onLayoutChange */
interface RGLItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export function DashboardPage() {
  const store = useDashboardStore();
  const activeLayout = useDashboardStore(selectActiveLayout);
  const configuredSensorIds = useMissionStore(s => s.configuredSensorIds);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);

  useEffect(() => {
    if (!gridContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 50) {
          setGridWidth(Math.floor(entry.contentRect.width - 24));
        }
      }
    });
    observer.observe(gridContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleLayoutChange = useCallback(
    (layout: RGLItem[]) => {
      if (!activeLayout) return;
      const updated: GridItemLayout[] = layout.map(item => {
        const existing = activeLayout.gridLayout.find(g => g.i === item.i);
        return {
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: existing?.minW,
          minH: existing?.minH,
        };
      });
      store.updateGridLayout(activeLayout.id, updated);
    },
    [activeLayout, store]
  );

  if (!activeLayout) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500">
        <div className="text-center">
          <LayoutGrid size={40} className="mx-auto mb-3 opacity-30" />
          <p>No layout found. Reload to initialize.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/60 bg-slate-900/40 shrink-0">
        {/* Layout selector */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(m => !m)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 rounded-lg text-sm transition-all"
          >
            <LayoutGrid size={13} />
            {activeLayout.name}
            <ChevronDown size={12} />
          </button>
          {showLayoutMenu && (
            <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700/50 rounded-xl shadow-xl z-30 w-52 overflow-hidden">
              {store.layouts.map(l => (
                <button
                  key={l.id}
                  onClick={() => { store.setActiveLayout(l.id); setShowLayoutMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-all ${l.id === activeLayout.id ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  {l.name}
                  {l.isDefault && <span className="text-slate-600 text-xs ml-1">(default)</span>}
                </button>
              ))}
              <div className="border-t border-slate-800 p-2">
                <div className="flex gap-1.5">
                  <input
                    value={newLayoutName}
                    onChange={e => setNewLayoutName(e.target.value)}
                    placeholder="New layout name…"
                    className="flex-1 text-xs bg-slate-800 border border-slate-700 text-white rounded px-2 py-1 focus:outline-none focus:border-cyan-500/50"
                    onKeyDown={e => { if (e.key === 'Enter' && newLayoutName) { store.saveLayout(newLayoutName); setNewLayoutName(''); } }}
                  />
                  <button
                    onClick={() => { if (newLayoutName) { store.saveLayout(newLayoutName); setNewLayoutName(''); } }}
                    className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30 transition-all"
                  >Save</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowAddWidget(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm transition-all"
        >
          <Plus size={13} /> Add Widget
        </button>

        <button
          onClick={() => store.setEditing(!store.isEditing)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm transition-all ${
            store.isEditing
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'border-slate-700/40 text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Edit3 size={13} /> {store.isEditing ? 'Editing…' : 'Edit Layout'}
        </button>

        <button
          onClick={() => store.resetToDefault(configuredSensorIds)}
          className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 rounded-lg transition-all"
          title="Reset to default layout"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {store.isEditing && (
        <div className="px-4 py-1.5 bg-amber-500/5 border-b border-amber-500/20 text-amber-400/70 text-xs shrink-0">
          Edit mode — drag to rearrange, resize from corners, click ⚙ to configure
        </div>
      )}

      {/* Grid */}
      <div ref={gridContainerRef} className="flex-1 overflow-auto p-3">
        <GridLayout
          className="layout"
          layout={activeLayout.gridLayout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          width={gridWidth}
          isDraggable={store.isEditing}
          isResizable={store.isEditing}
          onLayoutChange={handleLayoutChange as (layout: ReactGridLayoutItem[]) => void}
          draggableHandle=".widget-drag-handle"
          margin={[8, 8]}
          useCSSTransforms={true}
        >
          {activeLayout.widgets.map((widget) => (
            <div key={widget.id} className="overflow-hidden">
              <WidgetRenderer widget={widget} isEditing={store.isEditing} />
            </div>
          ))}
        </GridLayout>

        {activeLayout.widgets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-3">
            <LayoutGrid size={40} className="opacity-30" />
            <p className="text-sm">No widgets yet</p>
            <button
              onClick={() => setShowAddWidget(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm hover:bg-cyan-500/25 transition-all"
            >
              <Plus size={14} /> Add your first widget
            </button>
          </div>
        )}
      </div>

      {showAddWidget && <AddWidgetModal onClose={() => setShowAddWidget(false)} />}
    </div>
  );
}

// Alias to silence any leftover type alias references
type ReactGridLayoutItem = RGLItem;
