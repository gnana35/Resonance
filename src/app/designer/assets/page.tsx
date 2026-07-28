"use client";

/**
 * Assets page — functional creative library.
 *
 * Section 1 "Your Work"  — assets with source === "created"
 * Section 2 "Uploads"    — assets with source === "uploaded"
 *
 * Persistence: Firestore real-time listener (subscribeAssets).
 * File storage: Firebase Storage via uploadAsset().
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  File,
  FileAudio,
  FileText,
  FileVideo,
  MoreHorizontal,
  PenTool,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  deleteAsset,
  duplicateAsset,
  formatAssetDate,
  mimeLabel,
  renameAsset,
  subscribeAssets,
  uploadAsset,
  type AssetRecord,
} from "@/lib/assets";

/* ─── helpers ────────────────────────────────────────────────────────────── */

/** Pick a file-type icon for non-image assets */
function FileTypeIcon({
  mime,
  className = "h-8 w-8",
}: {
  mime: string;
  className?: string;
}) {
  if (mime.startsWith("audio/"))
    return <FileAudio className={className} />;
  if (mime.startsWith("video/"))
    return <FileVideo className={className} />;
  if (mime === "application/pdf" || mime.startsWith("text/"))
    return <FileText className={className} />;
  return <File className={className} />;
}

/* ─── sub-components ─────────────────────────────────────────────────────── */

/**
 * Three-dot context menu shared by both card types.
 * `items` is a flat list of { label, onClick, danger? }.
 */
function DotMenu({
  items,
}: {
  items: { label: string; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Options"
        className="flex h-7 w-7 items-center justify-center rounded-md text-ink/40 transition-colors hover:bg-violet-2/10 hover:text-ink"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[160px] rounded-xl border border-violet-3/25 bg-bg-0 py-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
                setOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-violet-2/10 ${
                item.danger ? "text-red-400" : "text-ink/80 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Inline rename field — replaces the name text when active */
function InlineName({
  name,
  onCommit,
}: {
  name: string;
  onCommit: (newName: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraft(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 20);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onCommit(trimmed);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full rounded border border-violet-2/50 bg-bg-0 px-1 py-0.5 text-sm text-ink outline-none"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <span
      className="block cursor-default truncate text-sm text-ink"
      onDoubleClick={startEdit}
      title="Double-click to rename"
    >
      {name}
    </span>
  );
}

/**
 * Confirm-delete dialog — simple overlay, no library dependency.
 */
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
        className="mx-4 w-full max-w-sm rounded-2xl border border-violet-3/30 bg-bg-1 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg text-violet-1">Delete asset?</p>
            <p className="mt-1 text-sm text-ink/60">
              <span className="text-ink">&ldquo;{name}&rdquo;</span> will be
              permanently removed. This cannot be undone.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 text-ink/40 hover:text-ink"
          >
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

/** Card for "Your Work" (created) assets */
function CreatedCard({
  record,
  onRename,
  onDelete,
  onDuplicate,
}: {
  record: AssetRecord;
  onRename: (id: string, name: string) => void;
  onDelete: (record: AssetRecord) => void;
  onDuplicate: (record: AssetRecord) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const menuItems = [
    {
      label: "Rename",
      onClick: () => {
        // Trigger the InlineName by simulating double-click is not straightforward,
        // so we expose a rename prop that the InlineName watches via a key.
        setRenameActive(true);
      },
    },
    { label: "Duplicate",      onClick: () => onDuplicate(record) },
    { label: "Download/Export", onClick: () => downloadRecord(record) },
    { label: "Delete",         onClick: () => setConfirmDelete(true), danger: true },
  ];

  // Rename trigger from menu
  const [renameActive, setRenameActive] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (renameActive) {
      // Find the input inside InlineName and select it
      const input = nameRef.current?.querySelector("input");
      if (input) {
        input.focus();
        input.select();
      }
      setRenameActive(false);
    }
  }, [renameActive]);

  return (
    <>
      {confirmDelete && (
        <DeleteConfirm
          name={record.name}
          onConfirm={() => { onDelete(record); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div className="group rounded-xl border border-violet-3/20 bg-bg-1 transition-colors hover:border-violet-2/30">
        {/* Thumbnail — navigates to the linked design */}
        <div
          className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-t-xl bg-bg-0"
          onClick={() => {
            const href = record.designId
              ? `/designer?design=${record.designId}`
              : "/designer";
            window.location.href = href;
          }}
        >
          {record.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.previewUrl}
              alt={record.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PenTool className="h-10 w-10 text-violet-3/40" />
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div ref={nameRef} className="min-w-0 flex-1">
            <InlineName
              name={record.name}
              onCommit={(n) => onRename(record.id, n)}
            />
            <p className="mt-0.5 truncate text-xs text-ink/40">
              Last edited · {formatAssetDate(record.updatedAt)}
            </p>
          </div>
          <DotMenu items={menuItems} />
        </div>
      </div>
    </>
  );
}

/** Card for "Uploads" assets */
function UploadedCard({
  record,
  onRename,
  onDelete,
}: {
  record: AssetRecord;
  onRename: (id: string, name: string) => void;
  onDelete: (record: AssetRecord) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isImg = record.mimeType.startsWith("image/");

  const menuItems = [
    { label: "Rename",   onClick: () => setRenameActive(true) },
    { label: "Download", onClick: () => downloadRecord(record) },
    {
      label: "Add to References",
      onClick: () => {
        // Call the handler registered by the designer page, if present
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (window as any).__addAssetAsReference;
        if (typeof fn === "function") {
          fn({ id: record.id, name: record.name, previewUrl: record.previewUrl, storagePath: record.storagePath })
            .catch(console.error);
        } else {
          // Designer page isn't open in this tab — navigate and pass a flag
          window.location.href = `/designer?addRef=${record.id}`;
        }
      },
    },
    { label: "Delete", onClick: () => setConfirmDelete(true), danger: true },
  ];

  const [renameActive, setRenameActive] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (renameActive) {
      const input = nameRef.current?.querySelector("input");
      if (input) { input.focus(); input.select(); }
      setRenameActive(false);
    }
  }, [renameActive]);

  return (
    <>
      {confirmDelete && (
        <DeleteConfirm
          name={record.name}
          onConfirm={() => { onDelete(record); setConfirmDelete(false); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div className="group rounded-xl border border-violet-3/20 bg-bg-1 transition-colors hover:border-violet-2/30">
        {/* Thumbnail or file icon */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-bg-0">
          {isImg && record.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={record.previewUrl}
              alt={record.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2">
              <FileTypeIcon
                mime={record.mimeType}
                className="h-10 w-10 text-violet-3/50"
              />
              <span className="rounded bg-violet-3/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-ink/50">
                {mimeLabel(record.mimeType)}
              </span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div ref={nameRef} className="min-w-0 flex-1">
            <InlineName
              name={record.name}
              onCommit={(n) => onRename(record.id, n)}
            />
            <p className="mt-0.5 truncate text-xs text-ink/40">
              {mimeLabel(record.mimeType)} · {formatAssetDate(record.createdAt)}
            </p>
          </div>
          <DotMenu items={menuItems} />
        </div>
      </div>
    </>
  );
}

/* ─── shared download helper ─────────────────────────────────────────────── */

function downloadRecord(record: AssetRecord) {
  if (!record.previewUrl && !record.storagePath) return;
  const url = record.previewUrl ?? "";
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = record.name;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ─── upload progress tracker ────────────────────────────────────────────── */

interface UploadEntry {
  id:       string;   // temporary local id
  filename: string;
  progress: number;   // 0-100
  error:    string | null;
}

/* ─── page ───────────────────────────────────────────────────────────────── */

export default function AssetsPage() {
  /* ── data ── */
  const [assets,       setAssets]       = useState<AssetRecord[]>([]);
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [uploads,      setUploads]      = useState<UploadEntry[]>([]);
  const [isDragging,   setIsDragging]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AssetRecord | null>(null);

  /* ── search ── */
  const [query, setQuery] = useState("");

  /* ── refs ── */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── real-time Firestore subscription ── */
  useEffect(() => {
    const unsub = subscribeAssets(
      (records) => setAssets(records),
      (err) => setLoadError(err.message),
    );
    return unsub;
  }, []);

  /* ── derived lists ── */
  const q = query.trim().toLowerCase();

  const createdAssets = assets.filter(
    (a) =>
      a.source === "created" &&
      (q.length === 0 || a.name.toLowerCase().includes(q)),
  );

  const uploadedAssets = assets.filter(
    (a) =>
      a.source === "uploaded" &&
      (q.length === 0 || a.name.toLowerCase().includes(q)),
  );

  const noResults =
    q.length > 0 && createdAssets.length === 0 && uploadedAssets.length === 0;

  /* ── upload handler ── */
  const handleFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files);
    for (const file of list) {
      const tempId = `upload-${Date.now()}-${Math.random()}`;

      setUploads((prev) => [
        ...prev,
        { id: tempId, filename: file.name, progress: 0, error: null },
      ]);

      const { task } = uploadAsset(file);

      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round(
            (snap.bytesTransferred / snap.totalBytes) * 100,
          );
          setUploads((prev) =>
            prev.map((u) => (u.id === tempId ? { ...u, progress: pct } : u)),
          );
        },
        (err) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === tempId ? { ...u, error: err.message } : u,
            ),
          );
        },
        () => {
          // Firestore doc written inside uploadAsset's completion callback;
          // onSnapshot will push the new record automatically. Remove tracker.
          setUploads((prev) => prev.filter((u) => u.id !== tempId));
        },
      );
    }
  }, []);

  /* ── drag and drop ── */
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave() { setIsDragging(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  /* ── asset actions ── */
  function handleRename(id: string, newName: string) {
    renameAsset(id, newName).catch(console.error);
  }

  function handleDelete(record: AssetRecord) {
    deleteAsset(record).catch(console.error);
  }

  function handleDuplicate(record: AssetRecord) {
    duplicateAsset(record).catch(console.error);
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
          <h1 className="font-display text-3xl tracking-wide text-violet-1">
            ASSETS
          </h1>
          <p className="mt-1 text-sm text-ink/50">
            Everything you create and upload, in one place.
          </p>
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
        type="file"
        multiple
        accept="image/*,application/pdf,audio/*,video/*,text/*,.svg,.docx,.doc"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleFiles(e.target.files);
            e.target.value = "";
          }
        }}
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
          <button
            onClick={() => setQuery("")}
            className="shrink-0 text-ink/40 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Firestore error banner */}
      {loadError && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Could not load assets: {loadError}
        </div>
      )}

      {/* No results from search */}
      {noResults && (
        <p className="mt-12 text-center text-sm text-ink/40">
          No assets found.
        </p>
      )}

      {!noResults && (
        <div className="mt-10 flex flex-col gap-12">

          {/* ── Section 1: Your Work ── */}
          <section>
            <h2 className="font-display text-sm tracking-widest text-ink/40 uppercase">
              Your Work
            </h2>

            {createdAssets.length === 0 ? (
              /* Empty state */
              <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-violet-3/20 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-3/30 bg-bg-1">
                  <PenTool className="h-5 w-5 text-violet-3/60" />
                </div>
                <div>
                  <p className="text-ink/70">Nothing saved yet</p>
                  <p className="mt-1 max-w-xs text-sm text-ink/40">
                    Designs and sketches you save in Resonance will appear here.
                  </p>
                </div>
                <Link
                  href="/designer"
                  className="mt-1 flex items-center gap-2 rounded-lg border border-violet-3/30 px-4 py-2 text-sm text-violet-2 transition-colors hover:border-violet-2/60 hover:bg-violet-2/5"
                >
                  <PenTool className="h-3.5 w-3.5" />
                  Open Sketchpad
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {createdAssets.map((record) => (
                  <CreatedCard
                    key={record.id}
                    record={record}
                    onRename={handleRename}
                    onDelete={(r) => setDeleteTarget(r)}
                    onDuplicate={handleDuplicate}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Section 2: Uploads ── */}
          <section>
            <h2 className="font-display text-sm tracking-widest text-ink/40 uppercase">
              Uploads
            </h2>

            {/* Active upload progress entries */}
            {uploads.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {uploads.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg border border-violet-3/20 bg-bg-1 px-4 py-3"
                  >
                    <Upload className="h-4 w-4 shrink-0 text-violet-2" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{u.filename}</p>
                      {u.error ? (
                        <p className="mt-0.5 text-xs text-red-400">{u.error}</p>
                      ) : (
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-violet-3/20">
                          <div
                            className="h-full rounded-full bg-violet-2 transition-all duration-300"
                            style={{ width: `${u.progress}%` }}
                          />
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
              /* Empty state with embedded drop zone */
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
                  <p className="mt-1 text-sm text-ink/40">
                    Drag and drop files here or browse your device.
                  </p>
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
                    onRename={handleRename}
                    onDelete={(r) => setDeleteTarget(r)}
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
          name={deleteTarget.name}
          onConfirm={() => {
            handleDelete(deleteTarget);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
