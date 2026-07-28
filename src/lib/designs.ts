/**
 * designs.ts
 *
 * Firestore persistence for Sketchpad design documents.
 *
 * Collection: designs/{designId}
 *   Fields:
 *     assetId     — the linked AssetRecord id in the "assets" collection
 *     name        — display name (kept in sync with the asset)
 *     strokes     — serialised stroke array (JSON string to avoid Firestore
 *                   array-of-maps size limits)
 *     references  — array of ReferenceItem (url + name, already stored in
 *                   Firebase Storage, so just a URL reference)
 *     color       — last active colour
 *     strokeWidth — last active stroke width
 *     createdAt / updatedAt
 */

import {
  collection,
  addDoc,
  updateDoc,
  getDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";

/* ─── types ──────────────────────────────────────────────────────────────── */

export interface ReferenceItem {
  id:          string;   // stable local id (uuid-lite)
  name:        string;
  previewUrl:  string;   // Firebase Storage download URL
  storagePath: string;   // path inside Storage so we can delete later
}

export interface DesignDoc {
  id:          string;        // Firestore document id
  assetId:     string;        // linked AssetRecord id
  name:        string;
  strokesJson: string;        // JSON-encoded Stroke[]
  references:  ReferenceItem[];
  color:       string;
  strokeWidth: number;
  createdAt:   Date;
  updatedAt:   Date;
}

/* ─── internal ───────────────────────────────────────────────────────────── */

const DESIGNS_COL = "designs";

function docToDesign(id: string, data: Record<string, unknown>): DesignDoc {
  const ts = (v: unknown) =>
    v instanceof Timestamp ? v.toDate() : new Date(Date.now());

  return {
    id,
    assetId:     String(data.assetId     ?? ""),
    name:        String(data.name        ?? "Untitled"),
    strokesJson: String(data.strokesJson ?? "[]"),
    references:  (data.references as ReferenceItem[]) ?? [],
    color:       String(data.color       ?? "#1a1a1a"),
    strokeWidth: Number(data.strokeWidth ?? 4),
    createdAt:   ts(data.createdAt),
    updatedAt:   ts(data.updatedAt),
  };
}

/** Stable short id — no external library needed */
function shortId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ─── public API ─────────────────────────────────────────────────────────── */

/** Load a single design document by its Firestore id. */
export async function loadDesign(designId: string): Promise<DesignDoc | null> {
  const snap = await getDoc(doc(db, DESIGNS_COL, designId));
  if (!snap.exists()) return null;
  return docToDesign(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Create a brand-new design document.
 * The caller is responsible for also creating/linking an AssetRecord.
 */
export async function createDesign(opts: {
  assetId:     string;
  name:        string;
  strokesJson: string;
  references:  ReferenceItem[];
  color:       string;
  strokeWidth: number;
}): Promise<DesignDoc> {
  const docRef = await addDoc(collection(db, DESIGNS_COL), {
    ...opts,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return {
    id: docRef.id,
    ...opts,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Overwrite strokes, references, and settings on an existing design.
 * Always updates updatedAt — never creates a second document.
 */
export async function updateDesign(
  designId: string,
  opts: {
    name?:        string;
    strokesJson?: string;
    references?:  ReferenceItem[];
    color?:       string;
    strokeWidth?: number;
  },
): Promise<void> {
  await updateDoc(doc(db, DESIGNS_COL, designId), {
    ...opts,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Upload a reference image to Firebase Storage and return a ReferenceItem.
 * The file lives at references/{shortId}/{filename}.
 */
export async function uploadReference(file: File): Promise<ReferenceItem> {
  const id   = shortId();
  const path = `references/${id}/${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { id, name: file.name, previewUrl: url, storagePath: path };
}

/**
 * Add an already-stored asset (uploaded image) as a reference, without
 * copying the underlying file.  Just wraps the existing URL.
 */
export function assetToReference(asset: {
  id: string;
  name: string;
  previewUrl: string | null;
  storagePath: string | null;
}): ReferenceItem {
  return {
    id:          `asset-ref-${asset.id}`,
    name:        asset.name,
    previewUrl:  asset.previewUrl ?? "",
    storagePath: asset.storagePath ?? "",
  };
}

/** Remove a reference's Storage file and return the filtered list. */
export async function removeReference(
  refs: ReferenceItem[],
  refId: string,
): Promise<ReferenceItem[]> {
  const target = refs.find((r) => r.id === refId);
  // Only delete from Storage if the path belongs to references/ (not an
  // asset-ref pointing to a shared uploads/ file).
  if (target?.storagePath?.startsWith("references/")) {
    try {
      await deleteObject(ref(storage, target.storagePath));
    } catch { /* already gone */ }
  }
  return refs.filter((r) => r.id !== refId);
}
