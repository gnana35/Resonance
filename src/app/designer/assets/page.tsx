"use client";

/**
 * Assets page — functional creative library.
 *
 * Section 1 "Your Work"  — assets with source === "created"
 * Section 2 "Uploads"    — assets with source === "uploaded"
 *
 * Created assets show:
 *   - Thumbnail preview
 *   - Character / scene metadata (if set)
 *   - Validation status badge (Pending / Approved / Needs Revision)
 *   - Share status: shared assets get a ✓ checkmark; unshared get "Share with Writer"
 *   - Rename, Download, Delete actions
 *
 * Sharing an asset fires shareAssetWithWriter(), which:
 *   1. Sets shareStatus = "shared" and validationStatus = "pending" on the asset
 *   2. Writes a designShareNotifs record so the writer sees it in Notifications
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
  Clock,
  Download,
  File,
  FileAudio,
  FileText,
  FileVideo,
  MessagesSquare,
  PenTool,
  Search,
  Send,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import {
  deleteAsset,
  formatAssetDate,
  mimeLabel,
  renameAsset,
  shareAssetWithWriter,
  subscribeAssets,
  subscribeAssetChat,
  uploadAsset,
  type AssetRecord,
  type AssetValidationStatus,
  type DesignFeedbackMsg,
} from "@/lib/assets";
import { AssetChat } from "@/components/AssetChat";
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

/* ─── validation badge ──────────────────────────────────────────────────── */

function ValidationBadge({ status }: { status: AssetValidationStatus }) {
  if (status === "approved") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </span>
    );
  }
  if (status === "needs_revision") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
        <XCircle className="h-3 w-3" />
        Needs Revision
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    );
  }
  // pending
  return (
    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
      <Clock className="h-3 w-3" />
      Pending
    </span>
  );
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

/* ─── asset discussion modal ────────────────────────────────────────────── */

function ChatModal({ record, onClose }: { record: AssetRecord; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-2xl border border-violet-3/30 bg-bg-1 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-violet-3/20 bg-bg-0">
              {record.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={record.previewUrl} alt={record.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <PenTool className="h-5 w-5 text-violet-3/40" />
                </div>
              )}
            </div>
            <div>
              <p className="font-display text-lg text-violet-1">{record.name}</p>
              <p className="text-xs text-ink/45">Conversation with the writer</p>
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">
          <AssetChat
            assetId={record.id}
            assetName={record.name}
            characterId={record.characterId}
            me="designer"
            accent="violet"
            emptyHint="No messages yet. The writer's change requests and your replies will appear here."
          />
        </div>
      </div>
    </div>
  );
}

/* ─── card action bar ────────────────────────────────────────────────────── */

function CardActions({
  onRename,
  onDownload,
  onDelete,
}: {
  onRename: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={(e) => { e.stopPropagation(); onRename(); }}
        aria-label="Rename"
        title="Rename"
        className="rounded p-1 text-ink/40 transition-colors hover:bg-violet-2/10 hover:text-ink"
      >
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
  chatCount,
  onRename,
  onDelete,
  onShare,
  onOpenChat,
}: {
  record: AssetRecord;
  inUseBy: string[];
  chatCount: number;
  onRename: (id: string, name: string) => void;
  onDelete: (record: AssetRecord, inUseBy: string[]) => void;
  onShare:  (record: AssetRecord) => void;
  onOpenChat: (record: AssetRecord) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const isShared = record.shareStatus === "shared";
  // The writer asked for changes (or rejected) — re-open sharing so the
  // reworked design can be sent back.
  const needsResend =
    record.validationStatus === "needs_revision" || record.validationStatus === "rejected";
  const needsAttention =
    record.validationStatus === "needs_revision" || record.validationStatus === "rejected";

  return (
    <div className="group flex flex-col rounded-xl border border-violet-3/20 bg-bg-1 transition-colors hover:border-violet-2/30">
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

        {/* Shared checkmark overlay */}
        {isShared && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Meta + actions */}
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <InlineName
              name={record.name}
              editing={renaming}
              onCommit={(n) => { onRename(record.id, n); setRenaming(false); }}
              onCancel={() => setRenaming(false)}
            />
          </div>
          <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
            <CardActions
              onRename={() => setRenaming(true)}
              onDownload={() => downloadRecord(record)}
              onDelete={() => onDelete(record, inUseBy)}
            />
          </div>
        </div>

        {/* Character / scene metadata */}
        {(record.characterId || record.sceneId) && (
          <p className="truncate text-xs text-ink/40">
            {[record.characterId, record.sceneId].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Description */}
        {record.description && (
          <p className="line-clamp-2 text-xs text-ink/50" title={record.description}>
            {record.description}
          </p>
        )}

        {/* Footer row: date + validation badge */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
          <p className="text-xs text-ink/35">
            {formatAssetDate(record.updatedAt)}
          </p>
          <ValidationBadge status={record.validationStatus} />
        </div>

        {/* Share with Writer button.
            Once the writer asks for changes or rejects a design, the asset goes
            to needs_revision / rejected — the designer must be able to send the
            reworked version. Sharing again resets validationStatus to pending
            and raises a fresh notification, so the loop can repeat. */}
        <button
          onClick={(e) => { e.stopPropagation(); onShare(record); }}
          disabled={isShared && !needsResend}
          className={`mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            needsResend
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              : isShared
              ? "cursor-default border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-violet-3/30 text-ink/60 hover:border-violet-2/50 hover:bg-violet-2/5 hover:text-violet-2"
          }`}
        >
          {needsResend ? (
            <>
              <Send className="h-3.5 w-3.5" />
              Send Updated Design
            </>
          ) : isShared ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Shared with Writer
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Share with Writer
            </>
          )}
        </button>

        {/* Discussion — the writer's feedback thread for this design */}
        {(isShared || chatCount > 0) && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenChat(record); }}
            className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              needsAttention
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15"
                : "border-violet-3/30 text-ink/60 hover:border-violet-2/50 hover:bg-violet-2/5 hover:text-violet-2"
            }`}
          >
            <MessagesSquare className="h-3.5 w-3.5" />
            {needsAttention ? "View feedback" : "Discussion"}
            {chatCount > 0 && (
              <span className="rounded-full bg-bg-0/40 px-1.5 text-[10px]">{chatCount}</span>
            )}
          </button>
        )}
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
}: {
  record: AssetRecord;
  inUseBy: string[];
  onRename: (id: string, name: string) => void;
  onDelete: (record: AssetRecord, inUseBy: string[]) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const isImg = record.mimeType.startsWith("image/");

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

/* ─── share toast ────────────────────────────────────────────────────────── */

function ShareToast({ name, onDismiss }: { name: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-400 shadow-lg backdrop-blur-sm">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>&ldquo;{name}&rdquo; shared — writer notified.</span>
    </div>
  );
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
  const [shareToast,   setShareToast]   = useState<string | null>(null);
  const [sharing,      setSharing]      = useState<string | null>(null); // assetId being shared
  const [chatTarget,   setChatTarget]   = useState<AssetRecord | null>(null);
  const [chatMsgs,     setChatMsgs]     = useState<DesignFeedbackMsg[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── real-time Firestore subscription ── */
  useEffect(() => {
    const unsub = subscribeAssets(
      (records) => setAssets(records),
      (err) => setLoadError(err.message),
    );
    return unsub;
  }, []);

  /* ── design conversations (all assets) → per-asset message counts ── */
  useEffect(() => subscribeAssetChat((rows) => setChatMsgs(rows)), []);
  const chatCountByAsset = new Map<string, number>();
  for (const m of chatMsgs) chatCountByAsset.set(m.assetId, (chatCountByAsset.get(m.assetId) ?? 0) + 1);

  // Keep the open chat modal's record in sync with live asset updates.
  const chatTargetLive = chatTarget ? assets.find((a) => a.id === chatTarget.id) ?? chatTarget : null;

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
      const { task, promise } = uploadAsset(file);
      // track progress while upload runs (Supabase path)
      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, progress: pct } : u));
        },
        null,
        null,
      );
      // use promise for reliable completion (works for both fast localStorage and async Supabase paths)
      promise
        .then(() => setUploads((prev) => prev.filter((u) => u.id !== tempId)))
        .catch((err: Error) => setUploads((prev) => prev.map((u) => u.id === tempId ? { ...u, error: err.message } : u)));
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

  /* ── share with writer ── */
  async function handleShare(record: AssetRecord) {
    // Re-sharing IS allowed once the writer has asked for changes or rejected
    // the design — that is how the reworked version gets back to them. Only
    // block a duplicate share of an already-approved/pending design, and any
    // double-click while a share is in flight.
    const awaitingRework =
      record.validationStatus === "needs_revision" ||
      record.validationStatus === "rejected";
    if ((record.shareStatus === "shared" && !awaitingRework) || sharing === record.id) return;
    setSharing(record.id);
    try {
      await shareAssetWithWriter(record);
      setShareToast(record.name);
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setSharing(null);
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

      {/* Share confirmation toast */}
      {shareToast && (
        <ShareToast name={shareToast} onDismiss={() => setShareToast(null)} />
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
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm tracking-widest text-ink/40 uppercase">Your Work</h2>
              {createdAssets.length > 0 && (
                <p className="text-xs text-ink/35">
                  {createdAssets.filter((a) => a.shareStatus === "shared").length} of {createdAssets.length} shared
                </p>
              )}
            </div>
            {createdAssets.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-violet-3/20 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-3/30 bg-bg-1">
                  <PenTool className="h-5 w-5 text-violet-3/60" />
                </div>
                <div>
                  <p className="text-ink/70">Nothing saved yet</p>
                  <p className="mt-1 max-w-xs text-sm text-ink/40">
                    Designs you save in the Designer Space will appear here.
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
                    chatCount={chatCountByAsset.get(record.id) ?? 0}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onShare={handleShare}
                    onOpenChat={setChatTarget}
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

      {/* ── Discussion modal ── */}
      {chatTargetLive && (
        <ChatModal record={chatTargetLive} onClose={() => setChatTarget(null)} />
      )}
    </div>
  );
}

/* ─── wrappers ───────────────────────────────────────────────────────────── */

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
