"use client";

/**
 * Designer's Space — main workspace.
 *
 * Provides DesignerProvider, manages all tool/canvas state, handles:
 *   - New Design modal with title + dimensions
 *   - Save Details modal — captures character/scene/description on first save
 *   - Design picker (list of designs in project)
 *   - Save → thumbnail written as Asset with metadata, design persisted to localStorage
 *   - Export → flat PNG download
 *   - Autosave with 3-second debounce
 *   - Navigate-away warning when there are unsaved changes
 *   - Blocked-draw toast when drawing on locked/hidden layer
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Loader2,
  PenTool,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  DesignerProvider,
  useDesigner,
} from "@/context/DesignerContext";
import {
  SketchpadCanvas,
  type SketchpadHandle,
  type CanvasTool,
} from "@/components/SketchpadCanvas";
import { CanvasBottomBar } from "@/components/CanvasBottomBar";
import { LayersPanel }    from "@/components/LayersPanel";
import { ReferencesPanel } from "@/components/ReferencesPanel";
import { ApprovalsPanel } from "@/components/ApprovalsPanel";
import {
  saveCreatedAsset,
  updateCreatedAsset,
  updateAssetMeta,
  linkDesignToAsset,
  uploadAsset,
  type SaveCreatedAssetOpts,
} from "@/lib/assets";

/* ────────────────────────────────────────────────────────────────────────── */
/*  New Design modal                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

const PRESETS = [
  { label: "Standard",   w: 1200, h: 560 },
  { label: "Square",     w: 800,  h: 800 },
  { label: "Portrait",   w: 600,  h: 900 },
  { label: "Wide",       w: 1600, h: 600 },
];

function NewDesignModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (title: string, w: number, h: number) => void;
  onClose: () => void;
}) {
  const [title,    setTitle]   = useState("Untitled Design");
  const [preset,   setPreset]  = useState(PRESETS[0]);
  const [customW,  setCustomW] = useState(1200);
  const [customH,  setCustomH] = useState(560);
  const [useCustom, setUseCustom] = useState(false);

  const w = useCustom ? customW  : preset.w;
  const h = useCustom ? customH  : preset.h;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-violet-3/30 bg-bg-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-lg text-violet-1">New Design</p>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink/60">
            Name
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
              placeholder="Untitled Design"
              autoFocus
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-sm text-ink/60">Canvas size</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setPreset(p); setUseCustom(false); }}
                  className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                    !useCustom && preset.label === p.label
                      ? "bg-violet-2 text-bg-0"
                      : "border border-violet-3/25 text-ink/60 hover:border-violet-2/40 hover:text-ink"
                  }`}
                >
                  {p.label} <span className="opacity-60">({p.w}×{p.h})</span>
                </button>
              ))}
              <button
                onClick={() => setUseCustom(true)}
                className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                  useCustom
                    ? "bg-violet-2 text-bg-0"
                    : "border border-violet-3/25 text-ink/60 hover:border-violet-2/40 hover:text-ink"
                }`}
              >
                Custom
              </button>
            </div>
            {useCustom && (
              <div className="mt-1.5 flex items-center gap-2 text-sm text-ink/60">
                <input
                  type="number" min={100} max={4000}
                  value={customW}
                  onChange={(e) => setCustomW(Number(e.target.value))}
                  className="w-20 rounded border border-violet-3/25 bg-bg-0 px-2 py-1 text-sm text-ink focus:border-violet-2/50 focus:outline-none"
                />
                <span>×</span>
                <input
                  type="number" min={100} max={4000}
                  value={customH}
                  onChange={(e) => setCustomH(Number(e.target.value))}
                  className="w-20 rounded border border-violet-3/25 bg-bg-0 px-2 py-1 text-sm text-ink focus:border-violet-2/50 focus:outline-none"
                />
                <span className="text-xs text-ink/40">px</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-violet-3/30 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(title.trim() || "Untitled Design", w, h)}
            className="rounded-lg bg-violet-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-violet-1"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Save Details modal — collected on every explicit Save                     */
/* ────────────────────────────────────────────────────────────────────────── */

function SaveDetailsModal({
  initialName,
  initialOpts,
  onConfirm,
  onClose,
}: {
  initialName: string;
  initialOpts: SaveCreatedAssetOpts;
  onConfirm:   (name: string, opts: SaveCreatedAssetOpts) => void;
  onClose:     () => void;
}) {
  const [name,        setName]        = useState(initialName);
  const [characterId, setCharacterId] = useState(initialOpts.characterId ?? "");
  const [sceneId,     setSceneId]     = useState(initialOpts.sceneId     ?? "");
  const [description, setDescription] = useState(initialOpts.description ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-violet-3/30 bg-bg-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-lg text-violet-1">Save to Assets</p>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink/50">
          Add details so your writer knows what this design depicts.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink/60">
            Asset name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
              placeholder="e.g. Lyra — concept art"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/60">
            Character / entity
            <input
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
              placeholder="e.g. Lyra, Chapter 3 tavern scene…"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/60">
            Scene / chapter reference
            <input
              value={sceneId}
              onChange={(e) => setSceneId(e.target.value)}
              className="rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
              placeholder="e.g. Ch. 3 — The Heist"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-ink/60">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
              placeholder="Brief description of what is depicted…"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-violet-3/30 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onConfirm(name.trim() || initialName, {
                characterId: characterId.trim() || undefined,
                sceneId:     sceneId.trim()     || undefined,
                description: description.trim() || undefined,
              })
            }
            className="flex items-center gap-2 rounded-lg bg-violet-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-violet-1"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Blocked-draw toast                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

function BlockedToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-400 shadow-lg backdrop-blur-sm">
      {message}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Inner workspace (needs DesignerContext)                                   */
/* ────────────────────────────────────────────────────────────────────────── */

type WorkspaceTab = "Sketchpad" | "Approvals";
type SaveState    = "idle" | "saving" | "saved" | "error";

function DesignerWorkspace() {
  const {
    designs, activeDesign, createDesign, openDesign,
    updateDesignMeta, saveDesign,
    canUndo, canRedo, undo, redo,
    activeLayers,
  } = useDesigner();

  const searchParams = useSearchParams();

  /* ── tool state ── */
  const [tool,        setTool]        = useState<CanvasTool>("pencil");
  const [color,       setColor]       = useState("#a78bfa");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [opacity,     setOpacity]     = useState(100);

  /* ── ui state ── */
  const [tab,             setTab]             = useState<WorkspaceTab>("Sketchpad");
  const [saveState,       setSaveState]       = useState<SaveState>("idle");
  const [showNewModal,    setShowNewModal]     = useState(false);
  const [showSaveDetails, setShowSaveDetails] = useState(false);
  const [blockedMsg,      setBlockedMsg]       = useState<string | null>(null);
  const [dirty,           setDirty]           = useState(false);
  const [autosaveMsg,     setAutosaveMsg]     = useState<string | null>(null);

  /** Pending save opts — set when the user opens the Save Details modal */
  const pendingSaveOpts = useRef<SaveCreatedAssetOpts>({});

  const canvasRef      = useRef<SketchpadHandle>(null);
  const autosaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSaveRef  = useRef<(isAutosave?: boolean, opts?: SaveCreatedAssetOpts) => Promise<void>>(() => Promise.resolve());
  const uploadInputRef = useRef<HTMLInputElement>(null);

  /* ── open design from ?design= URL param ──
   * Designs load from localStorage a frame after mount now, so wait until they
   * are available, then auto-open exactly once. (A previously-active design is
   * already restored by the context via its persisted activeDesignId.) */
  const didAutoOpen = useRef(false);
  useEffect(() => {
    if (didAutoOpen.current || designs.length === 0) return;
    didAutoOpen.current = true;
    const id = searchParams.get("design");
    if (id && designs.some((d) => d.id === id)) {
      openDesign(id);
    } else if (!activeDesign) {
      openDesign(designs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designs]);

  /* ── dirty tracking ─────────────────────────────────────────────────────
   * mountedRef:  skip the very first render (context load, not user change)
   * savingRef:   set to true while a save is in-flight so the layer write
   *              that context does during saveDesign() doesn't re-dirty.
   * ──────────────────────────────────────────────────────────────────── */
  const mountedRef = useRef(false);
  const savingRef  = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (savingRef.current) return;
    setDirty(true);
  }, [activeLayers]);

  /* ── navigate-away warning ── */
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* ── save ───────────────────────────────────────────────────────────────
   * First save:   render thumbnail blob → saveCreatedAsset (Firebase Storage
   *               + Firestore) → linkDesignToAsset → store assetId +
   *               assetStoragePath on the Design so we can update next time.
   *               If called with opts (from Save Details modal), those are
   *               persisted on the asset record.
   * Subsequent:   updateCreatedAsset (overwrites Storage thumbnail, refreshes
   *               Firestore doc) — never creates a second record.
   *               If opts are provided, also calls updateAssetMeta.
   * ──────────────────────────────────────────────────────────────────── */
  const handleSave = useCallback(async (
    isAutosave = false,
    opts: SaveCreatedAssetOpts = {},
  ) => {
    if (!activeDesign || !canvasRef.current) return;
    if (!isAutosave) setSaveState("saving");

    savingRef.current = true;
    try {
      const blob = await canvasRef.current.getThumbnailBlob();

      if (activeDesign.assetId && activeDesign.assetStoragePath) {
        // ── UPDATE existing asset ──────────────────────────────────────
        await updateCreatedAsset(
          activeDesign.assetId,
          activeDesign.assetStoragePath,
          activeDesign.title,
          blob,
        );
        // If the user supplied new metadata, patch it too
        if (opts.characterId !== undefined || opts.sceneId !== undefined || opts.description !== undefined) {
          await updateAssetMeta(activeDesign.assetId, opts);
        }
        saveDesign(activeDesign.id);
      } else {
        // ── CREATE new asset ───────────────────────────────────────────
        const assetRecord = await saveCreatedAsset(
          activeDesign.title,
          blob,
          "image/png",
          opts,
        );
        await linkDesignToAsset(assetRecord.id, activeDesign.id);
        updateDesignMeta(activeDesign.id, {
          assetId:          assetRecord.id,
          assetStoragePath: assetRecord.storagePath ?? undefined,
        });
        saveDesign(activeDesign.id);
      }

      // Fire consistency event
      window.dispatchEvent(
        new CustomEvent("resonance:designSaved", {
          detail: {
            designId:  activeDesign.id,
            projectId: activeDesign.projectId,
            design:    activeDesign,
            layers:    activeLayers,
          },
        }),
      );

      setDirty(false);
      if (isAutosave) {
        setAutosaveMsg("Saved to Assets");
        setTimeout(() => setAutosaveMsg(null), 2500);
      } else {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2500);
      }
    } catch (err) {
      console.error("Save failed:", err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    } finally {
      savingRef.current = false;
    }
  }, [activeDesign, activeLayers, saveDesign, updateDesignMeta]);

  // Keep the ref always pointing at the latest handleSave
  useEffect(() => { handleSaveRef.current = handleSave; }, [handleSave]);

  /* ── autosave (3 s debounce after last user change) ── */
  useEffect(() => {
    if (!dirty || !activeDesign) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      handleSaveRef.current(true);
    }, 3000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [dirty, activeLayers, activeDesign]);

  /* ── explicit save — opens Save Details modal ── */
  function openSaveModal() {
    if (!activeDesign) return;
    setShowSaveDetails(true);
  }

  /* ── export (flat PNG download) ── */
  const handleExport = useCallback(async () => {
    if (!canvasRef.current || !activeDesign) return;
    try {
      const blob = await canvasRef.current.getExportBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${activeDesign.title}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [activeDesign]);

  /* ── create new design ── */
  function handleCreateDesign(title: string, w: number, h: number) {
    createDesign(title, w, h);
    setShowNewModal(false);
    setDirty(false);
  }

  /* ── upload files to assets ── */
  const handleUploadFiles = useCallback((files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const { promise } = uploadAsset(file);
      promise
        .then(() => {
          setAutosaveMsg(`"${file.name}" uploaded to Assets`);
          setTimeout(() => setAutosaveMsg(null), 2500);
        })
        .catch((err) => console.error("Upload failed:", err));
    }
  }, []);

  const saveLabel =
    saveState === "saving" ? "Saving…"
    : saveState === "saved" ? "Saved ✓"
    : saveState === "error" ? "Error ✕"
    : dirty ? "Save*"
    : "Save";

  /* ─── render ──────────────────────────────────────────────────────────── */

  return (
    <div className="flex min-h-0 flex-col px-6 py-6 md:px-10">

      {showNewModal && (
        <NewDesignModal
          onConfirm={handleCreateDesign}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {showSaveDetails && activeDesign && (
        <SaveDetailsModal
          initialName={activeDesign.title}
          initialOpts={pendingSaveOpts.current}
          onConfirm={(name, opts) => {
            pendingSaveOpts.current = opts;
            setShowSaveDetails(false);
            handleSave(false, { ...opts, characterId: opts.characterId, sceneId: opts.sceneId, description: opts.description });
          }}
          onClose={() => setShowSaveDetails(false)}
        />
      )}

      {blockedMsg && (
        <BlockedToast message={blockedMsg} onDismiss={() => setBlockedMsg(null)} />
      )}

      {/* Hidden file input for uploads */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,audio/*,video/*,text/*,.svg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleUploadFiles(e.target.files);
            e.target.value = "";
          }
        }}
      />

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-2/15">
            <Sparkles className="h-4 w-4 text-violet-2" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-violet-1">
              Designer Space
            </h1>
            <p className="mt-0.5 flex items-center gap-2 text-sm text-ink/50">
              {activeDesign
                ? `Editing: ${activeDesign.title}${dirty ? " · unsaved" : ""}`
                : "Sketch. Create. Build your world."}
              {autosaveMsg && (
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" />
                  {autosaveMsg}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Design picker */}
          <select
            value={activeDesign?.id ?? ""}
            onChange={(e) => { if (e.target.value) openDesign(e.target.value); }}
            className="rounded-lg border border-violet-3/30 bg-bg-1 px-3 py-1.5 text-sm text-ink/70 focus:border-violet-2/50 focus:outline-none"
          >
            {designs.length === 0 && <option value="">No designs yet</option>}
            {designs.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-violet-3/30 px-3 py-1.5 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>

          {/* Upload files directly to Assets */}
          <button
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-violet-3/30 px-3 py-1.5 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload
          </button>

          <button
            onClick={handleExport}
            disabled={!activeDesign}
            className="flex items-center gap-1.5 rounded-lg border border-violet-3/30 px-3 py-1.5 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>

          <button
            onClick={openSaveModal}
            disabled={saveState === "saving" || !activeDesign}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-wait ${
              saveState === "saved"
                ? "bg-emerald-600/80 text-white"
                : saveState === "error"
                ? "bg-red-600/80 text-white"
                : "bg-violet-2 text-bg-0 hover:bg-violet-1 disabled:opacity-40"
            }`}
          >
            {saveState === "saving"
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Save className="h-3.5 w-3.5" />
            }
            {saveLabel}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-5 flex gap-1 border-b border-violet-3/20">
        {(["Sketchpad", "Approvals"] as WorkspaceTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 border-b-2 px-4 pb-2.5 pt-1 text-sm transition-colors ${
              tab === t
                ? "border-violet-2 text-violet-1"
                : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {t === "Sketchpad" ? (
              <PenTool className="h-3.5 w-3.5" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {t}
          </button>
        ))}
      </div>

      {/* ── Sketchpad tab ── */}
      {tab === "Sketchpad" && (
        <>
          {!activeDesign ? (
            <div className="mt-16 flex flex-col items-center justify-center gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-3/30 bg-bg-1">
                <PenTool className="h-7 w-7 text-violet-3/50" />
              </div>
              <div>
                <p className="text-ink/70">No design open</p>
                <p className="mt-1 text-sm text-ink/40">Create your first design to start drawing.</p>
              </div>
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 rounded-lg bg-violet-2 px-5 py-2.5 text-sm font-medium text-bg-0 transition-colors hover:bg-violet-1"
              >
                <Plus className="h-4 w-4" />
                New Design
              </button>
            </div>
          ) : (
            <div className="mt-5 grid min-h-0 grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
              {/* Left: canvas + bottom bar */}
              <div className="flex min-w-0 flex-col gap-0">
                <SketchpadCanvas
                  ref={canvasRef}
                  designId={activeDesign.id}
                  tool={tool}
                  color={color}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  onToolChange={setTool}
                  onColorChange={setColor}
                  onStrokeWidthChange={setStrokeWidth}
                  onOpacityChange={setOpacity}
                  onBlockedDraw={(msg) => setBlockedMsg(msg)}
                />
                <CanvasBottomBar
                  color={color}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={undo}
                  onRedo={redo}
                  onColorChange={setColor}
                  onStrokeWidthChange={setStrokeWidth}
                  onOpacityChange={setOpacity}
                  swatches={activeDesign.swatches}
                  onSwatchAdd={(c) =>
                    updateDesignMeta(activeDesign.id, {
                      swatches: [...activeDesign.swatches, c],
                    })
                  }
                />
              </div>

              {/* Right: stacked panels */}
              <div className="flex flex-col gap-4">
                <LayersPanel />
                <ReferencesPanel />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Approvals tab ── */}
      {tab === "Approvals" && (
        <div className="mt-5">
          <ApprovalsPanel />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Wrapper — provides DesignerProvider with active project id               */
/* ────────────────────────────────────────────────────────────────────────── */

function DesignerPageInner() {
  // The whole workspace is driven by localStorage (designs, active design, …),
  // which is empty on the server. Mount it only on the client so the server and
  // first client render are identical (both nothing) — this is what prevents
  // the "Editing: … / Sketch. Create …" hydration mismatch in the header. After
  // mount the subtree renders fresh on the client, so nothing is ever hydrated.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const projectId = localStorage.getItem("resonance:activeProject") ?? "default";
  return (
    <DesignerProvider projectId={projectId}>
      <Suspense>
        <DesignerWorkspace />
      </Suspense>
    </DesignerProvider>
  );
}

export default function DesignerPage() {
  return (
    <Suspense>
      <DesignerPageInner />
    </Suspense>
  );
}
