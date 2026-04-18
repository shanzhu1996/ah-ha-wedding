"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

interface TablePosition {
  id: string;
  x: number;
  y: number;
  width: number; // approximate bounding box for hit-testing + fit
  height: number;
}

interface Props {
  tables: TablePosition[];
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
  onMoveTable: (id: string, x: number, y: number) => void; // debounced upstream
  renderTable: (tableId: string) => React.ReactNode;
  className?: string;
  /**
   * Height of the canvas region in px. Defaults to 520.
   */
  height?: number;
  /** Hide the footer hint (e.g. when a table is selected) */
  compactFooter?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────

const ZOOM_MIN = 0.3;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 1.2;

// ── Helpers ────────────────────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ── Component ──────────────────────────────────────────────────────────

export function RoomCanvas({
  tables,
  selectedTableId,
  onSelectTable,
  onMoveTable,
  renderTable,
  className,
  height = 520,
  compactFooter = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 800, height });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Pan state
  const panDragRef = useRef<{ startX: number; startY: number; initialPan: { x: number; y: number } } | null>(null);
  // Table drag state
  const tableDragRef = useRef<{
    tableId: string;
    offsetX: number; // pointer offset from table origin, in world coords
    offsetY: number;
    didMove: boolean;
  } | null>(null);

  // Local overlay on table positions (optimistic during drag)
  const [positionOverlay, setPositionOverlay] = useState<
    Record<string, { x: number; y: number }>
  >({});

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewport({ width: el.clientWidth, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  // Apply overlay
  const positionedTables = useMemo(() => {
    return tables.map((t) => {
      const ov = positionOverlay[t.id];
      return ov ? { ...t, x: ov.x, y: ov.y } : t;
    });
  }, [tables, positionOverlay]);

  // ── Auto-layout for tables without saved positions ──

  const laidOutTables = useMemo(() => {
    // If a table has (0,0) and so do others, lay them out in a grid
    const needsLayout = positionedTables.filter(
      (t) => t.x === 0 && t.y === 0
    );
    if (needsLayout.length === 0) return positionedTables;

    const layouted = new Map<string, { x: number; y: number }>();
    const cols = Math.min(4, Math.ceil(Math.sqrt(needsLayout.length)));
    const spacing = 240;
    const startX = 140;
    const startY = 140;
    needsLayout.forEach((t, idx) => {
      layouted.set(t.id, {
        x: startX + (idx % cols) * spacing,
        y: startY + Math.floor(idx / cols) * spacing,
      });
    });

    return positionedTables.map((t) =>
      layouted.has(t.id) ? { ...t, ...layouted.get(t.id)! } : t
    );
  }, [positionedTables]);

  // ── Zoom controls ──

  function zoomIn() {
    setZoom((z) => clamp(z * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  }
  function zoomOut() {
    setZoom((z) => clamp(z / ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
  }
  function fitToView() {
    if (laidOutTables.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    // Compute bounding box of all tables
    const bounds = laidOutTables.reduce(
      (acc, t) => ({
        minX: Math.min(acc.minX, t.x - t.width / 2),
        minY: Math.min(acc.minY, t.y - t.height / 2),
        maxX: Math.max(acc.maxX, t.x + t.width / 2),
        maxY: Math.max(acc.maxY, t.y + t.height / 2),
      }),
      {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
      }
    );
    const contentW = bounds.maxX - bounds.minX + 80; // padding
    const contentH = bounds.maxY - bounds.minY + 80;
    const scaleX = viewport.width / contentW;
    const scaleY = viewport.height / contentH;
    const newZoom = clamp(Math.min(scaleX, scaleY), ZOOM_MIN, ZOOM_MAX);
    // Center the content
    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;
    setZoom(newZoom);
    setPan({
      x: viewport.width / 2 - contentCenterX * newZoom,
      y: viewport.height / 2 - contentCenterY * newZoom,
    });
  }

  // Fit on first render once we have measurements + tables,
  // and re-fit whenever viewport width changes (e.g. detail panel opens)
  const didInitialFit = useRef(false);
  const lastWidthRef = useRef(0);
  useEffect(() => {
    if (laidOutTables.length === 0 || viewport.width === 0) return;
    // Initial fit
    if (!didInitialFit.current) {
      fitToView();
      didInitialFit.current = true;
      lastWidthRef.current = viewport.width;
      return;
    }
    // Re-fit on any meaningful width change (preview pane, window resize, panel toggle)
    if (Math.abs(viewport.width - lastWidthRef.current) > 30) {
      fitToView();
      lastWidthRef.current = viewport.width;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laidOutTables.length, viewport.width]);

  // ── Wheel zoom ──

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const delta = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    setZoom((prevZoom) => {
      const newZoom = clamp(prevZoom * delta, ZOOM_MIN, ZOOM_MAX);
      if (newZoom === prevZoom) return prevZoom;
      // Keep the point under the cursor stable
      const worldX = (cursorX - pan.x) / prevZoom;
      const worldY = (cursorY - pan.y) / prevZoom;
      setPan({
        x: cursorX - worldX * newZoom,
        y: cursorY - worldY * newZoom,
      });
      return newZoom;
    });
  }

  // ── Pointer handlers ──

  function getWorldCoords(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  function handlePointerDownCanvas(e: React.PointerEvent) {
    // If clicked a table (via event delegation), skip pan
    const target = e.target as HTMLElement;
    if (target.closest("[data-table-id]")) return;
    if (e.button !== 0) return;
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPan: pan,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Clicking empty canvas also deselects after this interaction
    // (we'll confirm it's a click and not a drag in pointerup)
  }

  function handlePointerMoveCanvas(e: React.PointerEvent) {
    if (panDragRef.current) {
      const dx = e.clientX - panDragRef.current.startX;
      const dy = e.clientY - panDragRef.current.startY;
      setPan({
        x: panDragRef.current.initialPan.x + dx,
        y: panDragRef.current.initialPan.y + dy,
      });
    }
    if (tableDragRef.current) {
      const world = getWorldCoords(e.clientX, e.clientY);
      const { tableId, offsetX, offsetY } = tableDragRef.current;
      const newX = world.x - offsetX;
      const newY = world.y - offsetY;
      tableDragRef.current.didMove = true;
      setPositionOverlay((prev) => ({
        ...prev,
        [tableId]: { x: newX, y: newY },
      }));
    }
  }

  function handlePointerUpCanvas(e: React.PointerEvent) {
    const wasPanning = panDragRef.current !== null;
    const panMoved =
      wasPanning &&
      (Math.abs(e.clientX - panDragRef.current!.startX) > 4 ||
        Math.abs(e.clientY - panDragRef.current!.startY) > 4);
    panDragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    // Deselect on pure empty-canvas click (no drag)
    if (wasPanning && !panMoved) {
      onSelectTable(null);
    }

    // Handle table drag release
    if (tableDragRef.current) {
      const { tableId, didMove } = tableDragRef.current;
      if (didMove) {
        const final = positionOverlay[tableId];
        if (final) {
          // Clamp to sane world-coord bounds so tables can't be lost in the void
          const boundedX = clamp(Math.round(final.x), -2000, 2000);
          const boundedY = clamp(Math.round(final.y), -2000, 2000);
          onMoveTable(tableId, boundedX, boundedY);
        }
      } else {
        // It was a click on a table (no drag) — select it
        onSelectTable(tableId);
      }
      tableDragRef.current = null;
    }
  }

  // ── Table pointer handlers ──

  function handleTablePointerDown(
    e: React.PointerEvent,
    table: TablePosition & { x: number; y: number }
  ) {
    if (e.button !== 0) return;
    e.stopPropagation(); // don't trigger canvas pan
    const world = getWorldCoords(e.clientX, e.clientY);
    tableDragRef.current = {
      tableId: table.id,
      offsetX: world.x - table.x,
      offsetY: world.y - table.y,
      didMove: false,
    };
    // Use canvas's capture for consistent tracking
    const canvasEl = containerRef.current;
    if (canvasEl) {
      canvasEl.setPointerCapture(e.pointerId);
    }
  }

  // ── Render ──

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border/60 bg-muted/5 overflow-hidden select-none",
        className
      )}
      style={{ height }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0 touch-none"
        style={{
          cursor: panDragRef.current ? "grabbing" : tableDragRef.current ? "grabbing" : "grab",
        }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
      >
        {/* Subtle grid background */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width="100%"
          height="100%"
        >
          <defs>
            <pattern
              id="room-canvas-grid"
              x={pan.x}
              y={pan.y}
              width={40 * zoom}
              height={40 * zoom}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={1}
                cy={1}
                r={1}
                className="fill-muted-foreground/20"
              />
            </pattern>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#room-canvas-grid)"
          />
        </svg>

        {/* Tables layer */}
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            width: 0,
            height: 0,
          }}
        >
          {laidOutTables.map((t) => (
            <div
              key={t.id}
              data-table-id={t.id}
              className={cn(
                "absolute",
                "cursor-grab active:cursor-grabbing",
                selectedTableId === t.id && "z-10"
              )}
              style={{
                left: t.x - t.width / 2,
                top: t.y - t.height / 2,
                width: t.width,
                height: t.height,
              }}
              onPointerDown={(e) => handleTablePointerDown(e, t)}
            >
              {renderTable(t.id)}
            </div>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 bg-background/90 backdrop-blur rounded-md border border-border/60 shadow-sm">
        <button
          type="button"
          onClick={zoomIn}
          className="h-8 w-8 inline-flex items-center justify-center hover:bg-muted/60 transition-colors"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="border-t border-border/60" />
        <button
          type="button"
          onClick={zoomOut}
          className="h-8 w-8 inline-flex items-center justify-center hover:bg-muted/60 transition-colors"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="border-t border-border/60" />
        <button
          type="button"
          onClick={fitToView}
          className="h-8 w-8 inline-flex items-center justify-center hover:bg-muted/60 transition-colors"
          aria-label="Fit to view"
          title="Fit to view"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tip */}
      {laidOutTables.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-muted-foreground">
            Add a table to get started.
          </p>
        </div>
      )}
      {laidOutTables.length > 0 && !compactFooter && (
        <p className="absolute bottom-2 left-3 right-14 text-[10px] text-muted-foreground/60 pointer-events-none truncate sm:whitespace-normal">
          Drag to move · scroll to zoom · click empty space to deselect
        </p>
      )}
    </div>
  );
}
