"use client";

/**
 * Assets page — functional creative library.
 *
 * Section 1 "Your Work"  — assets with source === "created"
 * Section 2 "Uploads"    — assets with source === "uploaded"
 *
 * No 3-dot menus. Actions are visible icon buttons: Rename, Download, Delete.
 * Destructive actions require confirmation.
 * Deleting an asset that is referenced warns which designs use it.
 * Clicking a "Your Work" tile opens the linked design in the Sketchpad.
 *
 * Persistence: Firestore real-time listener (subscribeAssets).
 * File storage: Firebase Storage via uploadAsset().
 */

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  File,
  FileAudio,
  FileText,
  FileVideo,
  PenTool,
  Search,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  deleteAsset,
  formatAssetDate,
  mimeLabel,
  renameAsset,
  subscribeAssets,
  uploadAsset,
  shareAssetWithWriter,
  reshareAssetWithWriter,
  type AssetRecord,
} from "@/lib/assetLibrary";
import {
  DesignerProvider,
  useDesigner,
} from "@/context/DesignerContext";

/* ─── helpers ────────────────────────────────────────────────────────────── */

function FileTypeIcon({ mime, className = "h-8 w-8" }: { mime: string; className?: string }) {
  if (mime.startsWith("audio/")) return <FileAudio className={className} />;
  if (mime.startsWith("video/")) return <FileVideo className={className} />;
  if (mime === "application/pdf" || mime.startsWith("text/")) return <FileText className={className} />;
  return <File className={className} />;
}

/* ─── inline rename ─────────────────────────────────────────────────────── */

function InlineName({
  name,
  editing,
  onCommit,
  onCancel,
}: {
  name: string;
  editing: boolean;
  onCommit: (n: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(name);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) { setDraft(name); setTimeout(() => ref.current?.select(), 20); }
  }, [editing, name]);

  if (!editing) {
    return (
      <span className="block cursor-default truncate text-sm text-ink" title={name}>{name}</span>
    );
  }
  return (
    <input
      ref={ref}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { const t = draft.trim(); if (t && t !== name) onCommit(t); else onCancel(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { const t = draft.trim(); if (t && t !== name) onCommit(t); else onCancel(); }
        if (e.key === "Escape") onCancel();
      }}
      className="w-full rounded border border-violet-2/50 bg-bg-0 px-1 py-0.5 text-sm text-ink outline-none"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/* ─── delete confirm dialog ─────────────────────────────────────────────── */

function DeleteConfirm({
  name,
  inUseBy,
  onConfirm,
  onCancel,
}: {
  name: string;
  inUseBy: string[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-violet-3/30 bg-bg-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg text-violet-1">Delete asset?</p>
            <p className="mt-1 text-sm text-ink/60">
              <span className="text-ink">&ldquo;{name}&rdquo;</span> will be permanently removed.
              This cannot be undone.
            </p>
            {inUseBy.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-xs font-medium text-amber-400">
                  This asset is referenced in {inUseBy.length} design{inUseBy.length !== 1 ? "s" : ""}:
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {inUseBy.map((d) => (
                    <li key={d} className="text-xs text-amber-300/80">{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <button onClick={onCancel} className="shrink-0 text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-violet-3/30 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-lg bg-red-600/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── card action bar (visible icons, no dropdown) ──────────────────────── */

function CardActions({
  onRename,
  onDownload,
  onDelete,
  onShare,
  shared,
  needsRevision,
}: {
  onRename:       () => void;
  onDownload:     () => void;
  onDelete:       () => void;
  onShare?:       () => void;
  shared?:        boolean;
  needsRevision?: boolean;
}) {
  // needsRevision = writer requested changes; share button means "send updated artwork"
  const shareDisabled  = shared && !needsRevision;
  const shareTitle     = needsRevision
    ? "Send updated artwork to writer"
    : shared
    ? "Already shared with writer"
    : "Share with Writer";
  const shareAriaLabel = needsRevision ? "Send updated artwork" : shareTitle;

  return (
    <div className="flex items-center gap-0.5">
      {onShare && (
        <button
          onClick={(e) => { e.stopPropagation(); onShare(); }}
          aria-label={shareAriaLabel}
          title={shareTitle}
          disabled={shareDisabled}
          className={`rounded p-1 transition-colors ${
            shareDisabled
              ? "cursor-not-allowed text-emerald-400/60"
              : needsRevision
              ? "text-amber-400/70 hover:bg-amber-400/10 hover:text-amber-300"
              : "text-ink/40 hover:bg-violet-2/10 hover:text-violet-2"
          }`}
        >
          {shareDisabled
            ? <CheckCircle2 className="h-3.5 w-3.5" />
            : <Share2 className="h-3.5 w-3.5" />}
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onRename(); }}
        aria-label="Rename"
        title="Rename"
        className="rounded p-1 text-ink/40 transition-colors hover:bg-violet-2/10 hover:text-ink"
      >
        {/* pencil icon inline */}
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDownload(); }}
        aria-label="Download"
        title="Download"
        className="rounded p-1 text-ink/40 transition-colors hover:bg-violet-2/10 hover:text-ink"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        aria-label="Delete"
        title="Delete"
        className="rounded p-1 text-red-400/50 transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─── download helper ────────────────────────────────────────────────────── */

function downloadRecord(record: AssetRecord) {
  const url = record.previewUrl ?? "";
  if (!url) return;
  const a = document.createElement("a");
  a.href = url; a.download = record.name; a.target = "_blank"; a.rel = "noopener noreferrer";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

/* ─── CreatedCard ────────────────────────────────────────────────────────── */

function CreatedCard({
  record,
  inUseBy,
  onRename,
  onDelete,
  onShare,
}: {
  record: AssetRecord;
  inUseBy: string[];
  onRename: (id: string, name: string) => void;
  onDelete: (record: AssetRecord, inUseBy: string[]) => void;
  onShare:  (record: AssetRecord) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const isShared = record.shareStatus === "shared";

  return (
    <div className="group rounded-xl border border-violet-3/20 bg-bg-1 transition-colors hover:border-violet-2/30">
      {/* Thumbnail */}
      <div
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-t-xl bg-bg-0"
        onClick={() => {
          const href = record.designId ? `/designer?design=${record.designId}` : "/designer";
          window.location.href = href;
        }}
      >
        {record.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.previewUrl} alt={record.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PenTool className="h-10 w-10 text-violet-3/40" />
          </div>
        )}
        {/* Shared badge */}
        {isShared && (
          <div
            className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-bg-0/90 px-1.5 py-0.5"
            title={record.sharedAt ? `Shared ${formatAssetDate(record.sharedAt)}` : "Shared with writer"}
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span className="text-[9px] text-emerald-400">Shared</span>
          </div>
        )}
      </div>

      {/* Meta + actions */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <InlineName
            name={record.name}
            editing={renaming}
            onCommit={(n) => { onRename(record.id, n); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
          <p className="mt-0.5 truncate text-xs text-ink/40">
            Last edited · {formatAssetDate(record.updatedAt)}
          </p>
        </div>
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <CardActions
            onRename={() => setRenaming(true)}
            onDownload={() => downloadRecord(record)}
            onDelete={() => onDelete(record, inUseBy)}
            onShare={() => onShare(record)}
            shared={isShared}
            needsRevision={record.validationStatus === "needs_revision"}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── UploadedCard ───────────────────────────────────────────────────────── */

function UploadedCard({
  record,
  inUseBy,
  onRename,
  onDelete,
  onShare,
}: {
  record: AssetRecord;
  inUseBy: string[];
  onRename: (id: string, name: string) => void;
  onDelete: (record: AssetRecord, inUseBy: string[]) => void;
  onShare:  (record: AssetRecord) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const isImg    = record.mimeType.startsWith("image/");
  const isShared = record.shareStatus === "shared";

  return (
    <div className="group rounded-xl border border-violet-3/20 bg-bg-1 transition-colors hover:border-violet-2/30">
      {/* Thumbnail / icon */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-bg-0">
        {isImg && record.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={record.previewUrl} alt={record.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <FileTypeIcon mime={record.mimeType} className="h-10 w-10 text-violet-3/50" />
            <span className="rounded bg-violet-3/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink/50">
              {mimeLabel(record.mimeType)}
            </span>
          </div>
        )}
        {/* Shared badge */}
        {isShared && (
          <div
            className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-bg-0/90 px-1.5 py-0.5"
            title={record.sharedAt ? `Shared ${formatAssetDate(record.sharedAt)}` : "Shared with writer"}
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            <span className="text-[9px] text-emerald-400">Shared</span>
          </div>
        )}
      </div>

      {/* Meta + actions */}
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <InlineName
            name={record.name}
            editing={renaming}
            onCommit={(n) => { onRename(record.id, n); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
          <p className="mt-0.5 truncate text-xs text-ink/40">
            {mimeLabel(record.mimeType)} · {formatAssetDate(record.createdAt)}
          </p>
        </div>
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <CardActions
            onRename={() => setRenaming(true)}
            onDownload={() => downloadRecord(record)}
            onDelete={() => onDelete(record, inUseBy)}
            onShare={() => onShare(record)}
            shared={isShared}
            needsRevision={record.validationStatus === "needs_revision"}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── upload progress tracker ────────────────────────────────────────────── */

interface UploadEntry {
  id: string;
  filename: string;
  progress: number;
  error: string | null;
}

/* ─── page body ──────────────────────────────────────────────────────────── */

function AssetsPageBody() {
  const { designs, references } = useDesigner();

  /* ── data ── */
  const [assets,       setAssets]       = useState<AssetRecord[]>([]);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [uploads,      setUploads]      = useState<UploadEntry[]>([]);
  const [isDragging,   setIsDragging]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ record: AssetRecord; inUseBy: string[] } | null>(null);
  const [query,        setQuery]        = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── real-time Firestore subscription ── */
  useEffect(() => {
    const unsub = subscribeAssets(
      (records) => setAssets(records),
      (err) => setLoadError(err.message),
    );
    return unsub;
  }, []);

  /* ── derived in-use map (assetId → design titles) ── */
  const inUseMap = new Map<string, string[]>();
  for (const ref of references) {
    const design = designs.find((d) => d.id === ref.designId);
    if (design) {
      const prev = inUseMap.get(ref.assetId) ?? [];
      inUseMap.set(ref.assetId, [...prev, design.title]);
    }
  }

  /* ── filtered lists ── */
  const q = query.trim().toLowerCase();
  const createdAssets  = assets.filter((a) => a.source === "created"  && (!q || a.name.toLowerCase().includes(q)));
  const uploadedAssets = assets.filter((a) => a.source === "uploaded" && (!q || a.name.toLowerCase().includes(q)));
  const noResults      = q.length > 0 && createdAssets.length === 0 && uploadedAssets.length === 0;

  /* ── upload handler ── */
  const handleFiles = useCallback((files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const tempId = `upload-${Date.now()}-${Math.random()}`;
      setUploads((prev) => [...prev, { id: tempId, filename: file.name, progress: 0, error: null }]);
      const { task } = uploadAsset(file);
      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, progress: pct } : u));
        },
        (err) => {
          setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, error: err.message } : u));
        },
        () => { setUploads((prev) => prev.filter((u) => u.id !== tempId)); },
      );
    }
  }, []);

  /* ── drag + drop ── */
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true); }
  function onDragLeave() { setIsDragging(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  /* ── asset actions ── */
  function handleRename(id: string, newName: string) { renameAsset(id, newName).catch(console.error); }
  function handleDelete(record: AssetRecord, inUseBy: string[]) {
    setDeleteTarget({ record, inUseBy });
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    deleteAsset(deleteTarget.record).catch(console.error);
    setDeleteTarget(null);
  }
  function handleShare(record: AssetRecord) {
    // If writer already requested revisions, this becomes "artwork-updated".
    if (record.validationStatus === "needs_revision") {
      reshareAssetWithWriter(record).catch(console.error);
    } else {
      shareAssetWithWriter(record).catch(console.error);
    }
  }

  /* ─── render ──────────────────────────────────────────────────────────── */

  return (
    <div
      className="px-6 py-8 md:px-10"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Global drag overlay */}
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center border-4 border-dashed border-violet-2/60 bg-violet-2/5">
          <div className="rounded-2xl border border-violet-2/40 bg-bg-0/90 px-8 py-6 text-center backdrop-blur-sm">
            <Upload className="mx-auto h-8 w-8 text-violet-2" />
            <p className="mt-3 font-display text-lg text-violet-1">Drop to upload</p>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-violet-1">ASSETS</h1>
          <p className="mt-1 text-sm text-ink/50">Everything you create and upload, in one place.</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg bg-violet-2 px-4 py-2 text-sm font-medium text-bg-0 transition-colors hover:bg-violet-1"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file" multiple
        accept="image/*,application/pdf,audio/*,video/*,text/*,.svg,.docx,.doc"
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) { handleFiles(e.target.files); e.target.value = ""; } }}
      />

      {/* ── Search ── */}
      <div className="mt-5 flex items-center gap-3 rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-ink/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your assets..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="shrink-0 text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {loadError && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Could not load assets: {loadError}
        </div>
      )}

      {noResults && (
        <p className="mt-12 text-center text-sm text-ink/40">No assets found.</p>
      )}

      {!noResults && (
        <div className="mt-10 flex flex-col gap-12">

          {/* ── Your Work ── */}
          <section>
            <h2 className="font-display text-sm tracking-widest text-ink/40 uppercase">Your Work</h2>
            {createdAssets.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-violet-3/20 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-3/30 bg-bg-1">
                  <PenTool className="h-5 w-5 text-violet-3/60" />
                </div>
                <div>
                  <p className="text-ink/70">Nothing saved yet</p>
                  <p className="mt-1 max-w-xs text-sm text-ink/40">
                    Designs you save in Resonance will appear here.
                  </p>
                </div>
                <Link
                  href="/designer"
                  className="mt-1 flex items-center gap-2 rounded-lg border border-violet-3/30 px-4 py-2 text-sm text-violet-2 transition-colors hover:border-violet-2/60 hover:bg-violet-2/5"
                >
                  <PenTool className="h-3.5 w-3.5" />
                  Open Designer
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {createdAssets.map((record) => (
                  <CreatedCard
                    key={record.id}
                    record={record}
                    inUseBy={inUseMap.get(record.id) ?? []}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onShare={handleShare}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Uploads ── */}
          <section>
            <h2 className="font-display text-sm tracking-widest text-ink/40 uppercase">Uploads</h2>

            {uploads.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {uploads.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 rounded-lg border border-violet-3/20 bg-bg-1 px-4 py-3">
                    <Upload className="h-4 w-4 shrink-0 text-violet-2" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{u.filename}</p>
                      {u.error ? (
                        <p className="mt-0.5 text-xs text-red-400">{u.error}</p>
                      ) : (
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-violet-3/20">
                          <div className="h-full rounded-full bg-violet-2 transition-all duration-300" style={{ width: `${u.progress}%` }} />
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-ink/40">
                      {u.error ? "Failed" : u.progress < 100 ? `${u.progress}%` : "Processing…"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {uploadedAssets.length === 0 && uploads.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); setIsDragging(true); }}
                onDrop={(e) => { e.stopPropagation(); onDrop(e); }}
                className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-violet-3/20 py-14 text-center transition-colors hover:border-violet-2/40 hover:bg-violet-2/[0.03]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-3/30 bg-bg-1">
                  <Upload className="h-5 w-5 text-violet-3/60" />
                </div>
                <div>
                  <p className="text-ink/70">Upload your first asset</p>
                  <p className="mt-1 text-sm text-ink/40">Drag and drop files here or browse your device.</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="mt-1 flex items-center gap-2 rounded-lg border border-violet-3/30 px-4 py-2 text-sm text-violet-2 transition-colors hover:border-violet-2/60 hover:bg-violet-2/5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
              </div>
            ) : uploadedAssets.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {uploadedAssets.map((record) => (
                  <UploadedCard
                    key={record.id}
                    record={record}
                    inUseBy={inUseMap.get(record.id) ?? []}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onShare={handleShare}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>
      )}

      {/* ── Delete confirmation dialog ── */}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.record.name}
          inUseBy={deleteTarget.inUseBy}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

/* ─── page (wrapped with DesignerProvider for project scoping) ───────────── */

function AssetsInner() {
  const projectId =
    typeof window !== "undefined"
      ? (localStorage.getItem("resonance:activeProject") ?? "default")
      : "default";
  return (
    <DesignerProvider projectId={projectId}>
      <AssetsPageBody />
    </DesignerProvider>
  );
}

export default function AssetsPage() {
  return (
    <Suspense>
      <AssetsInner />
    </Suspense>
  );
}
