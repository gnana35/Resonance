/**
 * assets.ts
 *
 * All Firestore + Firebase Storage operations for the Assets library.
 *
 * Two collections live under Firestore:
 *   assets/  — metadata records for every asset (created or uploaded)
 *
 * Firebase Storage paths:
 *   uploads/{assetId}/{filename}  — raw uploaded files
 *
 * "source" field determines which UI section an asset lands in:
 *   "created"  → Your Work  (saved from the Sketchpad)
 *   "uploaded" → Uploads    (brought in from device)
 */

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTask,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";

/* ─── types ──────────────────────────────────────────────────────────────── */

export type AssetSource = "created" | "uploaded";

export interface AssetRecord {
  id:          string;          // Firestore document id
  name:        string;          // display name (editable)
  mimeType:    string;          // e.g. "image/png", "application/pdf"
  source:      AssetSource;     // "created" | "uploaded"
  previewUrl:  string | null;   // download URL for images; null for non-images
  storagePath: string | null;   // path inside Firebase Storage; null for created
  /** Firestore id of the linked DesignDoc — only set for source==="created" */
  designId:    string | null;
  createdAt:   Date;
  updatedAt:   Date;
}

/* ─── internal helpers ───────────────────────────────────────────────────── */

const ASSETS_COL = "assets";

function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Format a Firestore Timestamp or JS Date into a human-readable string */
export function formatAssetDate(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth()    === now.getMonth()    &&
    d.getDate()     === now.getDate();

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth()    === yesterday.getMonth()    &&
    d.getDate()     === yesterday.getDate();

  if (sameYesterday) return `Yesterday, ${timeStr}`;

  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/** Return a human-readable label for a MIME type */
export function mimeLabel(mime: string): string {
  const map: Record<string, string> = {
    "image/png":      "PNG",
    "image/jpeg":     "JPG",
    "image/jpg":      "JPG",
    "image/gif":      "GIF",
    "image/webp":     "WEBP",
    "image/svg+xml":  "SVG",
    "application/pdf": "PDF",
    "audio/mpeg":     "MP3",
    "audio/wav":      "WAV",
    "video/mp4":      "MP4",
    "video/webm":     "WEBM",
    "text/plain":     "TXT",
  };
  return map[mime] ?? mime.split("/")[1]?.toUpperCase() ?? "FILE";
}

/* Convert a raw Firestore doc to AssetRecord */
function docToRecord(id: string, data: Record<string, unknown>): AssetRecord {
  const created = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate()
    : new Date(data.createdAt as string ?? Date.now());
  const updated = data.updatedAt instanceof Timestamp
    ? data.updatedAt.toDate()
    : new Date(data.updatedAt as string ?? Date.now());

  return {
    id,
    name:        String(data.name        ?? "Untitled"),
    mimeType:    String(data.mimeType    ?? "application/octet-stream"),
    source:      (data.source as AssetSource) ?? "uploaded",
    previewUrl:  (data.previewUrl  as string | null) ?? null,
    storagePath: (data.storagePath as string | null) ?? null,
    designId:    (data.designId    as string | null) ?? null,
    createdAt:   created,
    updatedAt:   updated,
  };
}

/* ─── public API ─────────────────────────────────────────────────────────── */

/**
 * Subscribe to all assets in real-time, ordered by creation date desc.
 * Returns an unsubscribe function — call it in a useEffect cleanup.
 */
export function subscribeAssets(
  onData: (assets: AssetRecord[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, ASSETS_COL),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const records = snap.docs.map((d) =>
        docToRecord(d.id, d.data() as Record<string, unknown>),
      );
      onData(records);
    },
    (err) => onError?.(err),
  );
}

/**
 * Upload a file to Firebase Storage, then write a metadata doc to Firestore.
 *
 * Returns { task, promise }:
 *   task    — the UploadTask so the caller can track progress with task.on(...)
 *   promise — resolves with the new AssetRecord once both storage + Firestore
 *             writes are complete
 */
export function uploadAsset(file: File): {
  task: UploadTask;
  promise: Promise<AssetRecord>;
} {
  // Unique id for path disambiguation
  const uid  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `uploads/${uid}/${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  const promise = new Promise<AssetRecord>((resolve, reject) => {
    task.on(
      "state_changed",
      null,
      reject,
      async () => {
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          const previewUrl  = isImage(file.type) ? downloadUrl : null;

          const docRef = await addDoc(collection(db, ASSETS_COL), {
            name:        file.name,
            mimeType:    file.type || "application/octet-stream",
            source:      "uploaded" as AssetSource,
            previewUrl,
            storagePath: path,
            designId:    null,
            createdAt:   serverTimestamp(),
            updatedAt:   serverTimestamp(),
          });

          resolve({
            id:          docRef.id,
            name:        file.name,
            mimeType:    file.type || "application/octet-stream",
            source:      "uploaded",
            previewUrl,
            storagePath: path,
            designId:    null,
            createdAt:   new Date(),
            updatedAt:   new Date(),
          });
        } catch (err) {
          reject(err);
        }
      },
    );
  });

  return { task, promise };
}

/**
 * Create a new "created" asset from a canvas PNG blob.
 * Returns both the new AssetRecord id and a previewUrl.
 * The Storage path lives at created/{uid}/thumbnail.png.
 */
export async function saveCreatedAsset(
  name: string,
  blob: Blob,
  mimeType: string,
): Promise<AssetRecord> {
  const uid  = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `created/${uid}/thumbnail.png`;
  const storageRef = ref(storage, path);
  await uploadBytesResumable(storageRef, blob).then(() => {});
  const downloadUrl = await getDownloadURL(storageRef);
  const previewUrl  = isImage(mimeType) ? downloadUrl : null;

  const docRef = await addDoc(collection(db, ASSETS_COL), {
    name,
    mimeType,
    source:      "created" as AssetSource,
    previewUrl,
    storagePath: path,
    designId:    null,           // filled in by linkDesignToAsset after design doc is created
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });

  return {
    id:          docRef.id,
    name,
    mimeType,
    source:      "created",
    previewUrl,
    storagePath: path,
    designId:    null,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  };
}

/**
 * After a design document is created, write its id back onto the asset record
 * so that asset cards can navigate directly to ?design=<designId>.
 */
export async function linkDesignToAsset(
  assetId:  string,
  designId: string,
): Promise<void> {
  await updateDoc(doc(db, ASSETS_COL, assetId), { designId });
}

/**
 * Update an EXISTING created-asset thumbnail in Storage and refresh the
 * Firestore metadata document.  Never creates a duplicate.
 *
 * The Storage path is reused (same uid embedded in storagePath) so the
 * old thumbnail is overwritten, keeping Storage tidy.
 */
export async function updateCreatedAsset(
  assetId:     string,
  storagePath: string,
  name:        string,
  blob:        Blob,
): Promise<void> {
  // Overwrite the existing thumbnail in-place
  const storageRef = ref(storage, storagePath);
  await uploadBytesResumable(storageRef, blob).then(() => {});
  const previewUrl = await getDownloadURL(storageRef);

  await updateDoc(doc(db, ASSETS_COL, assetId), {
    name,
    previewUrl,
    updatedAt: serverTimestamp(),
  });
}

/** Rename an asset (Firestore only — the storage file keeps its path). */
export async function renameAsset(id: string, newName: string): Promise<void> {
  await updateDoc(doc(db, ASSETS_COL, id), {
    name:      newName,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an asset — removes the Storage file (if any) then the Firestore doc.
 * Storage errors are swallowed if the file was already missing.
 */
export async function deleteAsset(record: AssetRecord): Promise<void> {
  if (record.storagePath) {
    try {
      await deleteObject(ref(storage, record.storagePath));
    } catch {
      // File already gone — continue to remove the metadata doc
    }
  }
  await deleteDoc(doc(db, ASSETS_COL, record.id));
}

/**
 * Duplicate a "created" asset record (Firestore only — no Storage copy needed
 * because the preview URL stays the same).
 */
export async function duplicateAsset(record: AssetRecord): Promise<AssetRecord> {
  const docRef = await addDoc(collection(db, ASSETS_COL), {
    name:        `${record.name} (copy)`,
    mimeType:    record.mimeType,
    source:      record.source,
    previewUrl:  record.previewUrl,
    storagePath: record.storagePath,
    // Duplicates do not inherit the original designId — they are new records
    designId:    null,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  });

  return {
    id:          docRef.id,
    name:        `${record.name} (copy)`,
    mimeType:    record.mimeType,
    source:      record.source,
    previewUrl:  record.previewUrl,
    storagePath: record.storagePath,
    designId:    null,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  };
}
