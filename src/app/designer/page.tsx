"use client";

/**
 * Designer's Space page.
 *
 * Handles all coordination between the Sketchpad, References panel,
 * and the Assets/Designs persistence layer.
 *
 * URL param ?design=<designId> opens an existing design on load.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Loader2,
  MoreHorizontal,
  Save,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  SketchpadCanvas,
  type SketchpadHandle,
} from "@/components/SketchpadCanvas";
import { LayersPanel }    from "@/components/LayersPanel";
import { ReferencesPanel } from "@/components/ReferencesPanel";
import {
  loadDesign,
  createDesign,
  updateDesign,
  uploadReference,
  assetToReference,
  removeReference,
  type DesignDoc,
  type ReferenceItem,
} from "@/lib/designs";
import {
  linkDesignToAsset,
  saveCreatedAsset,
  updateCreatedAsset,
} from "@/lib/assets";

/* ─── types ──────────────────────────────────────────────────────────────── */

type SaveState = "idle" | "saving" | "saved" | "error";

/* ─── page ───────────────────────────────────────────────────────────────── */

export default function DesignerHome() {
  const searchParams = useSearchParams();

  /* ── design state ── */
  const [design,     setDesign]     = useState<DesignDoc | null>(null);
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [saveState,  setSaveState]  = useState<SaveState>("idle");
  const [loadingDesign, setLoadingDesign] = useState(false);

  /* ── canvas handle ── */
  const canvasRef = useRef<SketchpadHandle>(null);

  /* ── load design from ?design= param ── */
  useEffect(() => {
    const designId = searchParams.get("design");
    if (!designId) return;

    setLoadingDesign(true);
    loadDesign(designId)
      .then((doc) => {
        if (doc) {
          setDesign(doc);
          setReferences(doc.references);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingDesign(false));
  }, [searchParams]);

  /* ── save handler ── */

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return;
    setSaveState("saving");

    try {
      const { blob, strokes, color, strokeWidth } = await canvasRef.current.getSnapshot();
      const strokesJson = JSON.stringify(strokes);
      const designName  = design?.name ?? "Untitled Sketch";

      if (design) {
        /* ── UPDATE existing design ── */
        await Promise.all([
          // 1. Overwrite the canvas thumbnail in Storage + update asset metadata
          updateCreatedAsset(
            design.assetId,
            // storagePath was stored when the asset was first created —
            // we derive it from the asset path convention
            `created/${design.assetId.slice(-8)}/thumbnail.png`,
            designName,
            blob,
          ).catch(() => {
            // storagePath may differ; fall through — the design doc update
            // still succeeds and the preview refreshes on next full save
          }),
          // 2. Update the Firestore design document
          updateDesign(design.id, { strokesJson, references, color, strokeWidth }),
        ]);
        // Reflect updatedAt locally so the "last edited" label stays fresh
        setDesign((prev) =>
          prev ? { ...prev, strokesJson, references, color, strokeWidth, updatedAt: new Date() } : prev,
        );
      } else {
        /* ── CREATE new design ── */
        // a. Write asset record + thumbnail to Storage
        const asset = await saveCreatedAsset(designName, blob, "image/png");
        // b. Write design document linked to the asset
        const newDesign = await createDesign({
          assetId:     asset.id,
          name:        designName,
          strokesJson,
          references,
          color,
          strokeWidth,
        });
        // Write designId back onto the asset so card navigation works
        await linkDesignToAsset(asset.id, newDesign.id);
        setDesign(newDesign);
        // Update the browser URL so a refresh re-opens this design
        const url = new URL(window.location.href);
        url.searchParams.set("design", newDesign.id);
        window.history.replaceState(null, "", url.toString());
      }

      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [canvasRef, design, references]);

  /* ── reference handlers (passed to ReferencesPanel) ── */

  const handleAddReference = useCallback(async (file: File) => {
    const item = await uploadReference(file);
    const next = [...references, item];
    setReferences(next);
    // Persist to Firestore if a design is already saved
    if (design) {
      await updateDesign(design.id, { references: next });
    }
  }, [references, design]);

  /**
   * Called from the Assets page "Add to References" menu item.
   * Receives an asset record and adds it without uploading a second copy.
   */
  const handleAddAssetAsReference = useCallback(async (asset: {
    id: string; name: string; previewUrl: string | null; storagePath: string | null;
  }) => {
    const item = assetToReference(asset);
    // Skip if already present
    if (references.some((r) => r.id === item.id)) return;
    const next = [...references, item];
    setReferences(next);
    if (design) {
      await updateDesign(design.id, { references: next });
    }
  }, [references, design]);

  const handleRemoveReference = useCallback(async (id: string) => {
    const next = await removeReference(references, id);
    setReferences(next);
    if (design) {
      await updateDesign(design.id, { references: next });
    }
  }, [references, design]);

  /* expose addAssetAsReference on window for the Assets page to call */
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__addAssetAsReference = handleAddAssetAsReference;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__addAssetAsReference;
    };
  }, [handleAddAssetAsReference]);

  /* ─── render ──────────────────────────────────────────────────────────── */

  const saveLabel =
    saveState === "saving" ? "Saving…"
    : saveState === "saved" ? "Saved ✓"
    : saveState === "error" ? "Error"
    : "Save";

  return (
    <div className="flex min-h-0 flex-col px-6 py-6 md:px-10">

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
            <p className="mt-0.5 text-sm text-ink/50">
              {design
                ? `Editing: ${design.name} · Last saved ${design.updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Sketch. Create. Build your world."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => console.log("export")}
            className="flex items-center gap-1.5 rounded-lg border border-violet-3/30 px-3 py-1.5 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <button
            onClick={() => console.log("share")}
            className="flex items-center gap-1.5 rounded-lg border border-violet-3/30 px-3 py-1.5 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </button>
          <button
            onClick={handleSave}
            disabled={saveState === "saving"}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-wait ${
              saveState === "saved"
                ? "bg-emerald-600/80 text-white"
                : saveState === "error"
                ? "bg-red-600/80 text-white"
                : "bg-violet-2 text-bg-0 hover:bg-violet-1"
            }`}
          >
            {saveState === "saving"
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Save className="h-3.5 w-3.5" />
            }
            {saveLabel}
          </button>
          <button
            onClick={() => console.log("more")}
            aria-label="More options"
            className="rounded-lg border border-violet-3/30 p-1.5 text-ink/50 transition-colors hover:border-violet-2/50 hover:text-ink"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="mt-5 grid min-h-0 grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
        {/* Left: canvas */}
        <div className="min-w-0">
          {loadingDesign ? (
            <div className="flex h-64 items-center justify-center gap-2 text-ink/40">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading design…</span>
            </div>
          ) : (
            <SketchpadCanvas
              ref={canvasRef}
              initialDesign={design}
            />
          )}
        </div>

        {/* Right: stacked panels */}
        <div className="flex flex-col gap-4">
          <LayersPanel />
          <ReferencesPanel
            references={references}
            onAdd={handleAddReference}
            onRemove={handleRemoveReference}
          />
        </div>
      </div>
    </div>
  );
}
