"use client";

/**
 * DesignerContext
 *
 * Single source of truth for the Designer Space.
 * Scoped per active project — P1 data never leaks into P2.
 *
 * Persistence: localStorage (same pattern as Writer/World/Characters).
 * Firebase Storage is still used for uploaded file blobs (via lib/assets).
 *
 * Data model
 * ──────────
 * Design   { id, projectId, title, width, height, background,
 *            layerIds[], activeLayerId, swatches[], zoom, panX, panY,
 *            referenceIds[], createdAt, updatedAt }
 *
 * Layer    { id, designId, name, order, visible, locked, opacity,
 *            blendMode, data: LayerData }
 *
 * Asset    { id, projectId, kind, filename, mimeType, size,
 *            url, width?, height?, sourceDesignId?, tags[], createdAt }
 *
 * Reference { id, designId, assetId, note, order }
 *
 * LayerData { strokes: VectorStroke[]; shapes: VectorShape[];
 *             texts: TextElement[]; placedImages: PlacedImage[] }
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── primitive geo ────────────────────────────────────────────────────────────

export type Point = { x: number; y: number };

export type VectorStroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  opacity: number;
  erase: boolean;
};

export type VectorShape = {
  id: string;
  kind: "rect" | "ellipse" | "line";
  x: number; y: number; w: number; h: number;
  color: string;
  fill: boolean;
  width: number;
  opacity: number;
};

export type TextElement = {
  id: string;
  x: number; y: number;
  text: string;
  fontSize: number;
  color: string;
  opacity: number;
};

export type PlacedImage = {
  id: string;
  assetId: string;
  url: string;
  x: number; y: number; w: number; h: number;
  opacity: number;
};

export type LayerData = {
  strokes: VectorStroke[];
  shapes: VectorShape[];
  texts: TextElement[];
  placedImages: PlacedImage[];
};

export type BlendMode =
  | "normal" | "multiply" | "screen" | "overlay"
  | "darken" | "lighten" | "color-dodge" | "color-burn"
  | "hard-light" | "soft-light" | "difference" | "exclusion";

export const BLEND_MODES: BlendMode[] = [
  "normal", "multiply", "screen", "overlay",
  "darken", "lighten", "color-dodge", "color-burn",
  "hard-light", "soft-light", "difference", "exclusion",
];

export type Layer = {
  id: string;
  designId: string;
  name: string;
  order: number;    // lower = bottom
  visible: boolean;
  locked: boolean;
  opacity: number;  // 0-100
  blendMode: BlendMode;
  data: LayerData;
};

export type Asset = {
  id: string;
  projectId: string;
  kind: "upload" | "work";
  filename: string;
  mimeType: string;
  size: number;         // bytes
  url: string;          // Firebase Storage download URL
  width?: number;
  height?: number;
  sourceDesignId?: string;
  tags: string[];
  createdAt: number;
};

export type Reference = {
  id: string;
  designId: string;
  assetId: string;
  note: string;
  order: number;
};

export type Design = {
  id: string;
  projectId: string;
  title: string;
  width: number;
  height: number;
  background: string;
  layerIds: string[];
  activeLayerId: string;
  swatches: string[];
  zoom: number;
  panX: number;
  panY: number;
  referenceIds: string[];
  createdAt: number;
  updatedAt: number;
  /** Firestore id of the linked asset record (set after first save) */
  assetId?: string;
  /** Firebase Storage path for the thumbnail (set after first save) */
  assetStoragePath?: string;
};

// ─── undo/redo history entry ──────────────────────────────────────────────────

export type HistoryEntry = {
  layers: Layer[];
  activeLayerId: string;
};

// ─── storage keys ─────────────────────────────────────────────────────────────

const SK = {
  designs:    (pid: string) => `resonance:designer:designs:${pid}`,
  layers:     (pid: string) => `resonance:designer:layers:${pid}`,
  assets:     (pid: string) => `resonance:designer:assets:${pid}`,
  references: (pid: string) => `resonance:designer:refs:${pid}`,
  activeDesign: (pid: string) => `resonance:designer:active:${pid}`,
};

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export function emptyLayerData(): LayerData {
  return { strokes: [], shapes: [], texts: [], placedImages: [] };
}

// ─── context value ────────────────────────────────────────────────────────────

export interface DesignerContextValue {
  projectId: string;

  // Designs
  designs: Design[];
  activeDesign: Design | null;
  openDesign: (id: string) => void;
  createDesign: (title: string, width: number, height: number) => Design;
  updateDesignMeta: (id: string, patch: Partial<Pick<Design,
    "title" | "background" | "swatches" | "zoom" | "panX" | "panY"
    | "assetId" | "assetStoragePath"
  >>) => void;
  saveDesign: (id: string) => void;
  deleteDesign: (id: string) => void;
  setActiveLayerId: (designId: string, layerId: string) => void;

  // Layers
  layers: Layer[];               // all layers for active design, ordered
  activeLayers: Layer[];         // shorthand: ordered layers for activeDesign
  activeLayer: Layer | null;
  addLayer: (designId: string) => Layer;
  updateLayer: (id: string, patch: Partial<Omit<Layer, "id" | "designId" | "data">>) => void;
  updateLayerData: (id: string, data: LayerData) => void;
  reorderLayers: (designId: string, orderedIds: string[]) => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => Layer;
  mergeLayerDown: (id: string) => void;

  // Undo / redo (whole-canvas history)
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Assets (localStorage mirror of Firebase uploads)
  assets: Asset[];
  addAsset: (asset: Asset) => void;
  deleteAsset: (id: string) => void;
  renameAsset: (id: string, filename: string) => void;

  // References
  references: Reference[];
  addReference: (designId: string, assetId: string) => Reference;
  updateReferenceNote: (id: string, note: string) => void;
  removeReference: (id: string) => void;
  reorderReferences: (designId: string, orderedIds: string[]) => void;
  designReferences: (designId: string) => Reference[];
  assetForReference: (ref: Reference) => Asset | undefined;
}

// ─── context ──────────────────────────────────────────────────────────────────

const DesignerContext = createContext<DesignerContextValue | null>(null);

// ─── provider ─────────────────────────────────────────────────────────────────

export function DesignerProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const [designs, setDesigns] = useState<Design[]>(() =>
    load<Design[]>(SK.designs(projectId), [])
  );
  const [layers, setLayers] = useState<Layer[]>(() =>
    load<Layer[]>(SK.layers(projectId), [])
  );
  const [assets, setAssets] = useState<Asset[]>(() =>
    load<Asset[]>(SK.assets(projectId), [])
  );
  const [references, setReferences] = useState<Reference[]>(() =>
    load<Reference[]>(SK.references(projectId), [])
  );
  const [activeDesignId, setActiveDesignId] = useState<string | null>(() =>
    load<string | null>(SK.activeDesign(projectId), null)
  );

  // Undo/redo stacks (in-memory only — not persisted)
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);

  // Persist to localStorage
  useEffect(() => { save(SK.designs(projectId), designs); }, [projectId, designs]);
  useEffect(() => { save(SK.layers(projectId), layers); }, [projectId, layers]);
  useEffect(() => { save(SK.assets(projectId), assets); }, [projectId, assets]);
  useEffect(() => { save(SK.references(projectId), references); }, [projectId, references]);
  useEffect(() => { save(SK.activeDesign(projectId), activeDesignId); }, [projectId, activeDesignId]);

  const activeDesign = designs.find((d) => d.id === activeDesignId) ?? null;

  // Layers for active design, sorted by order
  const activeLayers = layers
    .filter((l) => l.designId === activeDesignId)
    .sort((a, b) => a.order - b.order);

  const activeLayer = activeDesign
    ? (activeLayers.find((l) => l.id === activeDesign.activeLayerId) ?? activeLayers[activeLayers.length - 1] ?? null)
    : null;

  // ── Designs ────────────────────────────────────────────────────────────────

  const openDesign = useCallback((id: string) => {
    setActiveDesignId(id);
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const createDesign = useCallback((title: string, width: number, height: number): Design => {
    const id = uid();
    const now = Date.now();
    // Create default layer
    const layerId = uid();
    const defaultLayer: Layer = {
      id: layerId,
      designId: id,
      name: "Layer 1",
      order: 0,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: "normal",
      data: emptyLayerData(),
    };
    const design: Design = {
      id,
      projectId,
      title,
      width,
      height,
      background: "#f4f1ea",
      layerIds: [layerId],
      activeLayerId: layerId,
      swatches: ["#1a1a1a", "#ffffff", "#a78bfa", "#2dd4bf", "#a67c52", "#6b7a99"],
      zoom: 100,
      panX: 0,
      panY: 0,
      referenceIds: [],
      createdAt: now,
      updatedAt: now,
    };
    setLayers((prev) => [...prev, defaultLayer]);
    setDesigns((prev) => [...prev, design]);
    setActiveDesignId(id);
    setUndoStack([]);
    setRedoStack([]);
    return design;
  }, [projectId]);

  const updateDesignMeta = useCallback((
    id: string,
    patch: Partial<Pick<Design, "title" | "background" | "swatches" | "zoom" | "panX" | "panY" | "assetId" | "assetStoragePath">>
  ) => {
    setDesigns((prev) => prev.map((d) =>
      d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d
    ));
  }, []);

  const saveDesign = useCallback((id: string) => {
    setDesigns((prev) => prev.map((d) =>
      d.id === id ? { ...d, updatedAt: Date.now() } : d
    ));
  }, []);

  const deleteDesign = useCallback((id: string) => {
    // Remove layers, references; keep assets (uploads stay)
    setLayers((prev) => prev.filter((l) => l.designId !== id));
    setReferences((prev) => prev.filter((r) => r.designId !== id));
    // Remove "work" assets that were thumbnails for this design
    setAssets((prev) => prev.filter((a) => !(a.kind === "work" && a.sourceDesignId === id)));
    setDesigns((prev) => prev.filter((d) => d.id !== id));
    setActiveDesignId((prev) => (prev === id ? null : prev));
    // Notify consistency system so discrepancies referencing this design go stale
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("resonance:designDeleted", { detail: { designId: id } }));
    }
  }, []);

  const setActiveLayerId = useCallback((designId: string, layerId: string) => {
    setDesigns((prev) => prev.map((d) =>
      d.id === designId ? { ...d, activeLayerId: layerId } : d
    ));
  }, []);

  // ── Layers ─────────────────────────────────────────────────────────────────

  const addLayer = useCallback((designId: string): Layer => {
    const id = uid();
    const existingOrders = layers
      .filter((l) => l.designId === designId)
      .map((l) => l.order);
    const order = existingOrders.length > 0 ? Math.max(...existingOrders) + 1 : 0;
    const layer: Layer = {
      id,
      designId,
      name: `Layer ${order + 1}`,
      order,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: "normal",
      data: emptyLayerData(),
    };
    setLayers((prev) => [...prev, layer]);
    setDesigns((prev) => prev.map((d) =>
      d.id === designId
        ? { ...d, layerIds: [...d.layerIds, id], activeLayerId: id, updatedAt: Date.now() }
        : d
    ));
    return layer;
  }, [layers]);

  const updateLayer = useCallback((
    id: string,
    patch: Partial<Omit<Layer, "id" | "designId" | "data">>
  ) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  }, []);

  const updateLayerData = useCallback((id: string, data: LayerData) => {
    setLayers((prev) => prev.map((l) => l.id === id ? { ...l, data } : l));
  }, []);

  const reorderLayers = useCallback((designId: string, orderedIds: string[]) => {
    setLayers((prev) => prev.map((l) => {
      if (l.designId !== designId) return l;
      const newOrder = orderedIds.indexOf(l.id);
      return newOrder >= 0 ? { ...l, order: newOrder } : l;
    }));
    setDesigns((prev) => prev.map((d) =>
      d.id === designId ? { ...d, layerIds: orderedIds, updatedAt: Date.now() } : d
    ));
  }, []);

  const deleteLayer = useCallback((id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const remaining = layers
      .filter((l) => l.designId === layer.designId && l.id !== id)
      .sort((a, b) => a.order - b.order);
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setDesigns((prev) => prev.map((d) => {
      if (d.id !== layer.designId) return d;
      const newLayerIds = d.layerIds.filter((lid) => lid !== id);
      const newActive = d.activeLayerId === id
        ? (remaining[remaining.length - 1]?.id ?? "")
        : d.activeLayerId;
      return { ...d, layerIds: newLayerIds, activeLayerId: newActive, updatedAt: Date.now() };
    }));
  }, [layers]);

  const duplicateLayer = useCallback((id: string): Layer => {
    const src = layers.find((l) => l.id === id);
    if (!src) throw new Error("Layer not found");
    const newId = uid();
    const newLayer: Layer = {
      ...src,
      id: newId,
      name: `${src.name} (copy)`,
      order: src.order + 0.5,
      data: JSON.parse(JSON.stringify(src.data)) as LayerData,
    };
    // Normalise orders
    const designLayers = [...layers.filter((l) => l.designId === src.designId), newLayer]
      .sort((a, b) => a.order - b.order)
      .map((l, i) => ({ ...l, order: i }));
    setLayers((prev) => [
      ...prev.filter((l) => l.designId !== src.designId),
      ...designLayers,
    ]);
    setDesigns((prev) => prev.map((d) =>
      d.id === src.designId
        ? { ...d, layerIds: designLayers.map((l) => l.id), updatedAt: Date.now() }
        : d
    ));
    return newLayer;
  }, [layers]);

  const mergeLayerDown = useCallback((id: string) => {
    const src = layers.find((l) => l.id === id);
    if (!src) return;
    const designLayers = layers
      .filter((l) => l.designId === src.designId)
      .sort((a, b) => a.order - b.order);
    const srcIdx = designLayers.findIndex((l) => l.id === id);
    if (srcIdx <= 0) return; // already bottom
    const target = designLayers[srcIdx - 1];
    // Merge src data into target
    const mergedData: LayerData = {
      strokes: [...target.data.strokes, ...src.data.strokes],
      shapes: [...target.data.shapes, ...src.data.shapes],
      texts: [...target.data.texts, ...src.data.texts],
      placedImages: [...target.data.placedImages, ...src.data.placedImages],
    };
    setLayers((prev) => prev
      .filter((l) => l.id !== id)
      .map((l) => l.id === target.id ? { ...l, data: mergedData } : l)
    );
    setDesigns((prev) => prev.map((d) =>
      d.id === src.designId
        ? { ...d, layerIds: d.layerIds.filter((lid) => lid !== id), updatedAt: Date.now() }
        : d
    ));
  }, [layers]);

  // ── Undo / redo ─────────────────────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    if (!activeDesignId) return;
    const snapshot: HistoryEntry = {
      layers: JSON.parse(JSON.stringify(
        layers.filter((l) => l.designId === activeDesignId)
      )) as Layer[],
      activeLayerId: activeDesign?.activeLayerId ?? "",
    };
    setUndoStack((prev) => [...prev.slice(-49), snapshot]);
    setRedoStack([]);
  }, [activeDesignId, layers, activeDesign]);

  const undo = useCallback(() => {
    if (!activeDesignId) return;
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      // Save current state to redo
      const current: HistoryEntry = {
        layers: JSON.parse(JSON.stringify(
          layers.filter((l) => l.designId === activeDesignId)
        )) as Layer[],
        activeLayerId: activeDesign?.activeLayerId ?? "",
      };
      setRedoStack((r) => [...r, current]);

      // Restore
      setLayers((allLayers) => [
        ...allLayers.filter((l) => l.designId !== activeDesignId),
        ...entry.layers,
      ]);
      setDesigns((d) => d.map((des) =>
        des.id === activeDesignId
          ? { ...des, activeLayerId: entry.activeLayerId, layerIds: entry.layers.map((l) => l.id) }
          : des
      ));
      return rest;
    });
  }, [activeDesignId, layers, activeDesign]);

  const redo = useCallback(() => {
    if (!activeDesignId) return;
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const entry = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      const current: HistoryEntry = {
        layers: JSON.parse(JSON.stringify(
          layers.filter((l) => l.designId === activeDesignId)
        )) as Layer[],
        activeLayerId: activeDesign?.activeLayerId ?? "",
      };
      setUndoStack((u) => [...u, current]);

      setLayers((allLayers) => [
        ...allLayers.filter((l) => l.designId !== activeDesignId),
        ...entry.layers,
      ]);
      setDesigns((d) => d.map((des) =>
        des.id === activeDesignId
          ? { ...des, activeLayerId: entry.activeLayerId, layerIds: entry.layers.map((l) => l.id) }
          : des
      ));
      return rest;
    });
  }, [activeDesignId, layers, activeDesign]);

  // ── Assets ─────────────────────────────────────────────────────────────────

  const addAsset = useCallback((asset: Asset) => {
    setAssets((prev) => {
      if (prev.some((a) => a.id === asset.id)) return prev;
      return [asset, ...prev];
    });
  }, []);

  const deleteAsset = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const renameAsset = useCallback((id: string, filename: string) => {
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, filename } : a));
  }, []);

  // ── References ─────────────────────────────────────────────────────────────

  const addReference = useCallback((designId: string, assetId: string): Reference => {
    const id = uid();
    const designRefs = references.filter((r) => r.designId === designId);
    const order = designRefs.length;
    const ref: Reference = { id, designId, assetId, note: "", order };
    setReferences((prev) => [...prev, ref]);
    setDesigns((prev) => prev.map((d) =>
      d.id === designId ? { ...d, referenceIds: [...d.referenceIds, id], updatedAt: Date.now() } : d
    ));
    return ref;
  }, [references]);

  const updateReferenceNote = useCallback((id: string, note: string) => {
    setReferences((prev) => prev.map((r) => r.id === id ? { ...r, note } : r));
  }, []);

  const removeReference = useCallback((id: string) => {
    const ref = references.find((r) => r.id === id);
    setReferences((prev) => prev.filter((r) => r.id !== id));
    if (ref) {
      setDesigns((prev) => prev.map((d) =>
        d.id === ref.designId
          ? { ...d, referenceIds: d.referenceIds.filter((rid) => rid !== id), updatedAt: Date.now() }
          : d
      ));
    }
  }, [references]);

  const reorderReferences = useCallback((designId: string, orderedIds: string[]) => {
    setReferences((prev) => prev.map((r) => {
      if (r.designId !== designId) return r;
      const newOrder = orderedIds.indexOf(r.id);
      return newOrder >= 0 ? { ...r, order: newOrder } : r;
    }));
  }, []);

  const designReferences = useCallback((designId: string): Reference[] => {
    return references
      .filter((r) => r.designId === designId)
      .sort((a, b) => a.order - b.order);
  }, [references]);

  const assetForReference = useCallback((ref: Reference): Asset | undefined => {
    return assets.find((a) => a.id === ref.assetId);
  }, [assets]);

  return (
    <DesignerContext.Provider value={{
      projectId,
      designs,
      activeDesign,
      openDesign,
      createDesign,
      updateDesignMeta,
      saveDesign,
      deleteDesign,
      setActiveLayerId,
      layers,
      activeLayers,
      activeLayer,
      addLayer,
      updateLayer,
      updateLayerData,
      reorderLayers,
      deleteLayer,
      duplicateLayer,
      mergeLayerDown,
      canUndo: undoStack.length > 0,
      canRedo: redoStack.length > 0,
      pushHistory,
      undo,
      redo,
      assets,
      addAsset,
      deleteAsset,
      renameAsset,
      references,
      addReference,
      updateReferenceNote,
      removeReference,
      reorderReferences,
      designReferences,
      assetForReference,
    }}>
      {children}
    </DesignerContext.Provider>
  );
}

export function useDesigner(): DesignerContextValue {
  const ctx = useContext(DesignerContext);
  if (!ctx) throw new Error("useDesigner must be used inside DesignerProvider");
  return ctx;
}
