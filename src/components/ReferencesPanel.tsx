"use client";

/**
 * ReferencesPanel
 *
 * Fully wired to DesignerContext. Features:
 * - Upload with per-file progress (via Firebase Storage UploadTask)
 * - Choose from Assets (no re-upload)
 * - Note field per reference
 * - Grid / list toggle (both work)
 * - Search (works)
 * - Drag reference tile onto canvas (dataTransfer with asset id + url)
 * - Full-size viewer on click
 * - Remove from design / delete from project confirm
 * - Empty state
 */

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BookImage,
  ChevronDown,
  FolderOpen,
  Grid3x3,
  List,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { uploadAsset } from "@/lib/assets";
import { useDesigner, type Reference, type Asset } from "@/context/DesignerContext";

// ─── per-upload progress entry ────────────────────────────────────────────────

type UploadEntry = {
  id: string;
  filename: string;
  progress: number;
  error: string | null;
};

// ─── viewer modal ─────────────────────────────────────────────────────────────

function ReferenceViewer({
  ref_: _ref,
  asset,
  note,
  onNoteChange,
  onClose,
}: {
  ref_: Reference;
  asset: Asset | undefined;
  note: string;
  onNoteChange: (note: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-violet-3/30 bg-bg-1 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-violet-3/20 px-5 py-4">
          <span className="font-display text-sm text-violet-1">{asset?.filename ?? "Reference"}</span>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink/40 hover:bg-ink/8 hover:text-ink transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Image */}
          <div className="flex flex-1 items-center justify-center overflow-hidden bg-bg-0 p-4">
            {asset?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.url}
                alt={asset.filename}
                className="max-h-[60vh] max-w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-ink/30">
                <BookImage className="h-10 w-10" />
                <p className="text-sm">No preview</p>
              </div>
            )}
          </div>
          {/* Note */}
          <div className="flex w-56 shrink-0 flex-col border-l border-violet-3/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/40">Note</p>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Add a note about this reference…"
              rows={6}
              className="mt-2 flex-1 resize-none rounded-lg border border-violet-3/25 bg-bg-0 p-3 text-sm text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── choose-from-assets modal ─────────────────────────────────────────────────

function ChooseAssetModal({
  assets,
  alreadyAdded,
  onChoose,
  onClose,
}: {
  assets: Asset[];
  alreadyAdded: Set<string>;
  onChoose: (asset: Asset) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = assets.filter(
    (a) =>
      a.mimeType.startsWith("image/") &&
      (q.length === 0 || a.filename.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-violet-3/30 bg-bg-1 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-violet-3/20 px-5 py-4">
          <span className="font-display text-sm text-violet-1">Choose from Assets</span>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-violet-3/20 px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-ink/35" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search assets…"
              className="w-full bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink/40">
              {q ? `No images match "${q}"` : "No image assets yet. Upload something first."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((asset) => {
                const added = alreadyAdded.has(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => !added && onChoose(asset)}
                    disabled={added}
                    className={`group relative overflow-hidden rounded-lg border transition-colors ${
                      added
                        ? "border-violet-2/40 opacity-50"
                        : "border-violet-3/20 hover:border-violet-2/60"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.filename}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-bg-0/80 px-1.5 py-1">
                      <p className="truncate text-[10px] text-ink/70">{asset.filename}</p>
                    </div>
                    {added && (
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-0/60">
                        <span className="text-[10px] text-violet-2 font-semibold">Added</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── remove confirm ───────────────────────────────────────────────────────────

function RemoveConfirm({
  filename,
  onRemoveFromDesign,
  onDeleteFromProject,
  onCancel,
}: {
  filename: string;
  onRemoveFromDesign: () => void;
  onDeleteFromProject: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-violet-3/30 bg-bg-1 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-base text-violet-1">Remove reference?</p>
        <p className="mt-1.5 text-sm text-ink/60">
          &ldquo;{filename}&rdquo;
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={onRemoveFromDesign}
            className="rounded-lg border border-violet-3/30 px-4 py-2.5 text-left text-sm text-ink/80 hover:border-violet-2/50 hover:bg-violet-2/5 transition-colors"
          >
            <p className="font-medium">Remove from this design</p>
            <p className="mt-0.5 text-xs text-ink/45">The file stays in your Assets library.</p>
          </button>
          <button
            onClick={onDeleteFromProject}
            className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <p className="font-medium">Delete from project</p>
            <p className="mt-0.5 text-xs text-red-400/60">Removes the file from Assets too. Cannot be undone.</p>
          </button>
          <button
            onClick={onCancel}
            className="mt-1 text-sm text-ink/40 hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

export function ReferencesPanel() {
  const {
    activeDesign,
    assets,
    addAsset,
    deleteAsset: deleteAssetFromContext,
    references,
    addReference,
    updateReferenceNote,
    removeReference,
    designReferences,
    assetForReference,
  } = useDesigner();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("All References");
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadEntry[]>([]);
  const [viewer, setViewer] = useState<Reference | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Reference | null>(null);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const designId = activeDesign?.id ?? "";
  const designRefs = designId ? designReferences(designId) : [];

  const alreadyAddedAssetIds = new Set(designRefs.map((r) => r.assetId));

  // Filter visible refs
  const visible = designRefs.filter((r) => {
    if (query.length > 0) {
      const asset = assetForReference(r);
      if (!asset) return false;
      return asset.filename.toLowerCase().includes(query.toLowerCase());
    }
    return true;
  });

  // ── Upload files ───────────────────────────────────────────────────────────

  function handleFiles(files: FileList | File[]) {
    if (!designId) return;
    const list = Array.from(files);
    for (const file of list) {
      const tempId = `up-${Date.now()}-${Math.random()}`;
      setUploads((prev) => [...prev, { id: tempId, filename: file.name, progress: 0, error: null }]);

      const { task, promise } = uploadAsset(file);
      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, progress: pct } : u));
        },
        (err) => {
          setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, error: err.message } : u));
        },
      );
      promise.then((record) => {
        // Persist to DesignerContext assets so it shows in Assets page
        const asset: Asset = {
          id: record.id,
          projectId: activeDesign?.projectId ?? "",
          kind: "upload",
          filename: record.name,
          mimeType: record.mimeType,
          size: file.size,
          url: record.previewUrl ?? record.storagePath ?? "",
          tags: [],
          createdAt: Date.now(),
        };
        addAsset(asset);
        addReference(designId, record.id);
        setUploads((prev) => prev.filter((u) => u.id !== tempId));
      }).catch(() => {
        setUploads((prev) => prev.map((u) =>
          u.id === tempId ? { ...u, error: "Upload failed — click retry" } : u
        ));
      });
    }
  }

  function retryUpload(entry: UploadEntry) {
    // Re-trigger by asking user to pick again
    fileInputRef.current?.click();
    setUploads((prev) => prev.filter((u) => u.id !== entry.id));
  }

  // ── Choose from assets ────────────────────────────────────────────────────

  function handleChooseAsset(asset: Asset) {
    if (!designId) return;
    addReference(designId, asset.id);
    setShowAssetPicker(false);
  }

  // ── Remove reference ──────────────────────────────────────────────────────

  function handleRemoveFromDesign(ref: Reference) {
    removeReference(ref.id);
    setRemoveTarget(null);
  }

  function handleDeleteFromProject(ref: Reference) {
    removeReference(ref.id);
    deleteAssetFromContext(ref.assetId);
    setRemoveTarget(null);
  }

  // ── Drag to canvas ────────────────────────────────────────────────────────

  function handleTileDragStart(e: React.DragEvent, ref: Reference) {
    const asset = assetForReference(ref);
    if (!asset) return;
    e.dataTransfer.setData("text/x-asset-id", asset.id);
    e.dataTransfer.setData("text/x-asset-url", asset.url);
    e.dataTransfer.effectAllowed = "copy";
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
      {/* Viewer modal */}
      {viewer && (
        <ReferenceViewer
          ref_={viewer}
          asset={assetForReference(viewer)}
          note={viewer.note}
          onNoteChange={(note) => updateReferenceNote(viewer.id, note)}
          onClose={() => setViewer(null)}
        />
      )}

      {/* Remove confirm */}
      {removeTarget && (
        <RemoveConfirm
          filename={assetForReference(removeTarget)?.filename ?? "this reference"}
          onRemoveFromDesign={() => handleRemoveFromDesign(removeTarget)}
          onDeleteFromProject={() => handleDeleteFromProject(removeTarget)}
          onCancel={() => setRemoveTarget(null)}
        />
      )}

      {/* Asset picker */}
      {showAssetPicker && (
        <ChooseAssetModal
          assets={assets}
          alreadyAdded={alreadyAddedAssetIds}
          onChoose={handleChooseAsset}
          onClose={() => setShowAssetPicker(false)}
        />
      )}

      <div className="flex flex-col rounded-xl border border-violet-3/25 bg-bg-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-violet-3/20 px-4 py-3">
          <span className="text-sm font-medium text-ink">
            References
            {designRefs.length > 0 && (
              <span className="ml-1.5 text-ink/35">({designRefs.length})</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            {/* Grid / List toggle */}
            <div className="flex items-center gap-0.5 rounded-md border border-violet-3/20 p-0.5">
              <button
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={`rounded p-1 transition-colors ${view === "grid" ? "bg-violet-2/15 text-violet-1" : "text-ink/40 hover:text-ink"}`}
              >
                <Grid3x3 className="h-3 w-3" />
              </button>
              <button
                onClick={() => setView("list")}
                aria-label="List view"
                className={`rounded p-1 transition-colors ${view === "list" ? "bg-violet-2/15 text-violet-1" : "text-ink/40 hover:text-ink"}`}
              >
                <List className="h-3 w-3" />
              </button>
            </div>
            {/* Choose from assets */}
            <button
              onClick={() => setShowAssetPicker(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-ink/60 transition-colors hover:bg-ink/8 hover:text-ink"
              title="Choose from project assets"
            >
              <FolderOpen className="h-3 w-3" />
            </button>
            {/* Add new */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-violet-2 transition-colors hover:bg-violet-2/10 hover:text-violet-1"
            >
              <Plus className="h-3 w-3" />
              Add Reference
            </button>
          </div>
        </div>

        {/* Filter + search */}
        <div className="flex items-center gap-2 border-b border-violet-3/20 px-3 py-2">
          <div className="relative">
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className="flex items-center gap-1 rounded-md border border-violet-3/20 bg-bg-0 px-2.5 py-1.5 text-xs text-ink/70 transition-colors hover:border-violet-2/40"
            >
              {filter}
              <ChevronDown className={`h-3 w-3 text-ink/35 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
            </button>
            {filterOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-max rounded-lg border border-violet-3/30 bg-bg-0 py-1 shadow-lg">
                {["All References", "Images", "Used in Canvas"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setFilter(opt); setFilterOpen(false); }}
                    className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-violet-2/10 ${filter === opt ? "text-violet-1" : "text-ink/70"}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-md border border-violet-3/20 bg-bg-0 px-2.5 py-1.5">
            <Search className="h-3 w-3 shrink-0 text-ink/35" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search references…"
              className="w-full bg-transparent text-xs text-ink placeholder:text-ink/35 focus:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-3">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-center transition-colors ${
              isDragging
                ? "border-violet-2 bg-violet-2/10"
                : "border-violet-3/35 hover:border-violet-2/50 hover:bg-violet-2/5"
            }`}
          >
            <Upload className="h-4 w-4 text-ink/35" />
            <div>
              <p className="text-xs text-ink/60">Drag &amp; drop or click to upload</p>
              <p className="mt-0.5 text-[10px] text-ink/35">or use <span className="text-violet-2">Choose from Assets</span> above</p>
            </div>
          </div>

          {/* Upload progress rows */}
          {uploads.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border border-violet-3/20 bg-bg-0 px-3 py-2">
              <Upload className="h-3.5 w-3.5 shrink-0 text-violet-2" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-ink">{u.filename}</p>
                {u.error ? (
                  <p className="mt-0.5 text-[10px] text-red-400">{u.error}</p>
                ) : (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-violet-3/20">
                    <div
                      className="h-full rounded-full bg-violet-2 transition-all"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {u.error ? (
                <button
                  onClick={() => retryUpload(u)}
                  className="shrink-0 rounded p-1 text-ink/40 hover:text-ink transition-colors"
                  title="Retry"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              ) : (
                <span className="shrink-0 text-[10px] text-ink/35">
                  {u.progress < 100 ? `${u.progress}%` : "Processing…"}
                </span>
              )}
            </div>
          ))}

          {/* Reference grid or list */}
          {visible.length > 0 && (
            <div
              className={
                view === "grid"
                  ? "grid grid-cols-3 gap-2"
                  : "flex flex-col gap-1.5"
              }
            >
              {visible.map((ref) => {
                const asset = assetForReference(ref);
                if (!asset) return null;
                return (
                  <div
                    key={ref.id}
                    draggable
                    onDragStart={(e) => handleTileDragStart(e, ref)}
                    className="group relative cursor-grab"
                    onClick={() => setViewer(ref)}
                  >
                    {view === "grid" ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="h-20 w-full rounded-md object-cover"
                        />
                        {ref.note && (
                          <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-bg-0/80 px-1.5 py-0.5">
                            <p className="truncate text-[9px] text-ink/60">{ref.note}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-violet-3/20 bg-bg-0 p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="h-10 w-14 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-ink">{asset.filename}</p>
                          {ref.note && (
                            <p className="mt-0.5 truncate text-[10px] text-ink/45">{ref.note}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Remove button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setRemoveTarget(ref); }}
                      aria-label={`Remove ${asset.filename}`}
                      className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-bg-0/85 text-red-400 group-hover:flex hover:bg-bg-0"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {designRefs.length === 0 && uploads.length === 0 && (
            <p className="text-center text-xs text-ink/30">No references yet</p>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>
    </>
  );
}
