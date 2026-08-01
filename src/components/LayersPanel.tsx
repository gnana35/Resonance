"use client";

/**
 * LayersPanel
 *
 * Fully wired to DesignerContext. All operations are real:
 *   Add, reorder (drag), visibility toggle, lock toggle,
 *   opacity slider, blend mode picker, inline rename,
 *   duplicate, merge-down, delete (with confirm).
 *
 * Layer thumbnails render a mini canvas (throttled).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  Merge,
  Plus,
  Search,
  Trash2,
  Unlock,
} from "lucide-react";
import {
  useDesigner,
  type Layer,
  type BlendMode,
  BLEND_MODES,
} from "@/context/DesignerContext";
import { renderLayerThumb } from "@/lib/layerThumb";

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-xs rounded-2xl border border-violet-3/30 bg-bg-1 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-base text-violet-1">Delete layer?</p>
        <p className="mt-1 text-sm text-ink/60">
          &ldquo;{name}&rdquo; will be permanently deleted.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-violet-3/30 py-2 text-sm text-ink/70 hover:border-violet-2/50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-600/80 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Layer thumbnail ──────────────────────────────────────────────────────────

function LayerThumbnail({ layer }: { layer: Layer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderLayerThumb(canvas, layer, 48, 36);
  }, [layer.data]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      width={48}
      height={36}
      className="rounded border border-violet-3/20 bg-bg-0"
    />
  );
}

// ─── Blend mode picker ────────────────────────────────────────────────────────

function BlendModeSelect({
  value,
  onChange,
}: {
  value: BlendMode;
  onChange: (v: BlendMode) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BlendMode)}
        className="w-full appearance-none rounded border border-violet-3/25 bg-bg-0 px-2 py-1 text-[10px] text-ink/70 focus:border-violet-2/50 focus:outline-none"
      >
        {BLEND_MODES.map((m) => (
          <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace("-", " ")}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-ink/35" />
    </div>
  );
}

// ─── Single layer row ─────────────────────────────────────────────────────────

function LayerRow({
  layer,
  isActive,
  isGrabbing,
  onActivate,
  onVisibilityToggle,
  onLockToggle,
  onOpacityChange,
  onBlendModeChange,
  onRename,
  onDuplicate,
  onMergeDown,
  onDeleteRequest,
  onDragStart,
  onDragEnter,
  onDragEnd,
  canMergeDown,
}: {
  layer: Layer;
  isActive: boolean;
  isGrabbing: boolean;
  onActivate: () => void;
  onVisibilityToggle: () => void;
  onLockToggle: () => void;
  onOpacityChange: (v: number) => void;
  onBlendModeChange: (v: BlendMode) => void;
  onRename: (name: string) => void;
  onDuplicate: () => void;
  onMergeDown: () => void;
  onDeleteRequest: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  canMergeDown: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(layer.name);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== layer.name) onRename(trimmed);
    setEditing(false);
  }

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onClick={onActivate}
      className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
        isActive
          ? "bg-violet-2/15 ring-1 ring-violet-2/30"
          : "hover:bg-ink/5"
      } ${isGrabbing ? "opacity-50" : ""}`}
    >
      {/* Drag handle */}
      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-ink/20 group-hover:text-ink/40" />

      {/* Thumbnail */}
      <LayerThumbnail layer={layer} />

      {/* Name + controls */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1">
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 rounded border border-violet-2/50 bg-bg-0 px-1 py-0.5 text-xs text-ink focus:outline-none"
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(layer.name); }}
              className="min-w-0 flex-1 truncate text-xs font-medium text-ink"
              title={`Double-click to rename — ${layer.name}`}
            >
              {layer.name}
            </span>
          )}
        </div>

        {/* Opacity + blend mode */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="range"
            min={0}
            max={100}
            value={layer.opacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            className="h-1 flex-1 cursor-pointer accent-violet-2"
            title={`Opacity: ${layer.opacity}%`}
          />
          <span className="w-7 text-right text-[10px] text-ink/40">{layer.opacity}%</span>
          <div className="w-20" onClick={(e) => e.stopPropagation()}>
            <BlendModeSelect value={layer.blendMode} onChange={onBlendModeChange} />
          </div>
        </div>
      </div>

      {/* Action icons */}
      <div
        className="flex shrink-0 flex-col items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onVisibilityToggle}
          title={layer.visible ? "Hide layer" : "Show layer"}
          className="rounded p-1 text-ink/30 transition-colors hover:bg-ink/8 hover:text-ink"
        >
          {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-ink/20" />}
        </button>
        <button
          onClick={onLockToggle}
          title={layer.locked ? "Unlock layer" : "Lock layer"}
          className="rounded p-1 text-ink/30 transition-colors hover:bg-ink/8 hover:text-ink"
        >
          {layer.locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : <Unlock className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onDuplicate}
          title="Duplicate layer"
          className="rounded p-1 text-ink/30 transition-colors hover:bg-ink/8 hover:text-ink"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        {canMergeDown && (
          <button
            onClick={onMergeDown}
            title="Merge down"
            className="rounded p-1 text-ink/30 transition-colors hover:bg-ink/8 hover:text-ink"
          >
            <Merge className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onDeleteRequest}
          title="Delete layer"
          className="rounded p-1 text-ink/30 transition-colors hover:bg-ink/8 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── panel ────────────────────────────────────────────────────────────────────

export function LayersPanel() {
  const {
    activeDesign,
    activeLayers,
    activeLayer,
    addLayer,
    updateLayer,
    reorderLayers,
    deleteLayer,
    duplicateLayer,
    mergeLayerDown,
    setActiveLayerId,
    pushHistory,
  } = useDesigner();

  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Layer | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const filtered = activeLayers.filter((l) =>
    query.length === 0 || l.name.toLowerCase().includes(query.toLowerCase())
  );

  // ── Reorder via drag ──────────────────────────────────────────────────────

  function handleDragEnd() {
    if (!activeDesign || !dragging || !dragOver || dragging === dragOver) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    // Build new order
    const ids = activeLayers.map((l) => l.id);
    const fromIdx = ids.indexOf(dragging);
    const toIdx = ids.indexOf(dragOver);
    if (fromIdx < 0 || toIdx < 0) { setDragging(null); setDragOver(null); return; }
    const newIds = [...ids];
    newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, dragging);
    reorderLayers(activeDesign.id, newIds);
    setDragging(null);
    setDragOver(null);
  }

  if (!activeDesign) {
    return (
      <div className="flex flex-col rounded-xl border border-violet-3/25 bg-bg-1 p-4">
        <p className="text-center text-xs text-ink/40">No design open</p>
      </div>
    );
  }

  return (
    <>
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={() => { deleteLayer(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="flex flex-col rounded-xl border border-violet-3/25 bg-bg-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-violet-3/20 px-4 py-3">
          <span className="text-sm font-medium text-ink">
            Layers
            {activeLayers.length > 0 && (
              <span className="ml-1.5 text-[11px] text-ink/30">({activeLayers.length})</span>
            )}
          </span>
          <button
            onClick={() => addLayer(activeDesign.id)}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-violet-2 transition-colors hover:bg-violet-2/10 hover:text-violet-1"
          >
            <Plus className="h-3 w-3" />
            Add Layer
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-violet-3/20 px-3 py-2">
          <div className="flex items-center gap-2 rounded-md border border-violet-3/20 bg-bg-0 px-2.5 py-1.5">
            <Search className="h-3 w-3 shrink-0 text-ink/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search layers…"
              className="w-full bg-transparent text-xs text-ink placeholder:text-ink/35 focus:outline-none"
            />
          </div>
        </div>

        {/* Layer list */}
        <div className="flex flex-col gap-0.5 p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
              {query ? (
                <p className="text-xs text-ink/40">No layers match &ldquo;{query}&rdquo;</p>
              ) : (
                <>
                  <p className="text-sm text-ink/60">No layers yet</p>
                  <p className="text-xs text-ink/35">Create your first layer to get started</p>
                  <button
                    onClick={() => addLayer(activeDesign.id)}
                    className="mt-1 flex items-center gap-1.5 rounded-md border border-violet-3/35 px-3 py-1.5 text-xs text-violet-2 transition-colors hover:border-violet-2/50 hover:bg-violet-2/10"
                  >
                    <Plus className="h-3 w-3" />
                    Create New Layer
                  </button>
                </>
              )}
            </div>
          ) : (
            // Render reversed so top layer is at top of panel (highest order = topmost)
            [...filtered].reverse().map((layer, reversedIdx, arr) => {
              const originalIdx = activeLayers.findIndex((l) => l.id === layer.id);
              const canMergeDown = originalIdx > 0;
              return (
                <LayerRow
                  key={layer.id}
                  layer={layer}
                  isActive={activeLayer?.id === layer.id}
                  isGrabbing={dragging === layer.id}
                  onActivate={() => setActiveLayerId(activeDesign.id, layer.id)}
                  onVisibilityToggle={() => updateLayer(layer.id, { visible: !layer.visible })}
                  onLockToggle={() => updateLayer(layer.id, { locked: !layer.locked })}
                  onOpacityChange={(v) => updateLayer(layer.id, { opacity: v })}
                  onBlendModeChange={(v) => updateLayer(layer.id, { blendMode: v })}
                  onRename={(name) => updateLayer(layer.id, { name })}
                  onDuplicate={() => duplicateLayer(layer.id)}
                  onMergeDown={() => { pushHistory(); mergeLayerDown(layer.id); }}
                  onDeleteRequest={() => setDeleteTarget(layer)}
                  onDragStart={() => setDragging(layer.id)}
                  onDragEnter={() => setDragOver(layer.id)}
                  onDragEnd={handleDragEnd}
                  canMergeDown={canMergeDown}
                />
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
