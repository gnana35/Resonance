"use client";

import { useMemo, useState } from "react";
import {
  CloudUpload,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  Music,
  Play,
  Search,
  Share2,
  Upload,
} from "lucide-react";
import {
  RECENT_UPLOADS,
  STORAGE_BREAKDOWN,
  STORAGE_TOTAL_GB,
  UPLOAD_CATEGORIES,
  UPLOAD_FILES,
  UPLOAD_FOLDERS,
  UPLOAD_QUICK_ACTIONS,
  type UploadCategory,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const FOLDER_ICONS: Record<string, typeof Folder> = {
  "audio-folder": Music,
  "documents-folder": FileText,
};

const DOCUMENT_TILE_STYLES: Record<string, { bg: string; icon: typeof FileText }> = {
  DOCX: { bg: "#3b82f6", icon: FileText },
  PDF: { bg: "#ef4444", icon: FileText },
  XLSX: { bg: "#22c55e", icon: FileSpreadsheet },
  MP3: { bg: "#8b5cf6", icon: Music },
};

const QUICK_ACTION_ICONS: Record<string, typeof Upload> = {
  "upload-files": Upload,
  "create-folder": FolderPlus,
  "share-link": Share2,
  "move-to-folder": FolderInput,
};

export default function MyUploads() {
  const [category, setCategory] = useState<UploadCategory>("All Files");
  const [query, setQuery] = useState("");

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return UPLOAD_FILES.filter((file) => {
      const matchesCategory =
        category === "All Files" || file.category === category;
      const matchesQuery =
        q.length === 0 || file.filename.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const storageUsed = STORAGE_BREAKDOWN.reduce((sum, s) => sum + s.gb, 0);
  const storagePct = Math.round((storageUsed / STORAGE_TOTAL_GB) * 100);
  const ringOffset =
    RING_CIRCUMFERENCE - (storagePct / 100) * RING_CIRCUMFERENCE;

  const recentUploads = useMemo(
    () =>
      RECENT_UPLOADS.map((r) => {
        const file = UPLOAD_FILES.find((f) => f.id === r.fileId);
        return file ? { file, timeAgo: r.timeAgo } : null;
      }).filter((r): r is { file: (typeof UPLOAD_FILES)[number]; timeAgo: string } =>
        Boolean(r),
      ),
    [],
  );

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex items-start gap-2">
        <CloudUpload className="mt-1 h-5 w-5 text-violet-2" />
        <div>
          <h1 className="font-display text-2xl text-violet-1">My Uploads</h1>
          <p className="mt-1 text-ink/70">
            All your uploaded files, organized and ready to use in your
            projects.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {UPLOAD_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
              category === cat
                ? "bg-violet-2 text-bg-0"
                : "bg-bg-1 text-ink/70 hover:text-ink"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-ink/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your uploads..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-ink">Folders</p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {UPLOAD_FOLDERS.map((folder) => {
                const Icon = FOLDER_ICONS[folder.id] ?? Folder;
                return (
                  <button
                    key={folder.id}
                    onClick={() =>
                      console.log("open folder", folder.id)
                    }
                    className="flex flex-col items-center gap-2 rounded-xl border border-violet-3/25 bg-bg-1 py-5 text-center transition-colors hover:border-violet-2/50"
                  >
                    <Icon className="h-8 w-8 fill-violet-2/30 text-violet-2" />
                    <span className="text-sm text-ink">{folder.name}</span>
                    <span className="text-xs text-ink/50">
                      {folder.fileCount} files
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => console.log("new folder")}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-violet-3/40 py-5 text-sm text-violet-2 hover:border-violet-2"
              >
                <FolderPlus className="h-6 w-6" />
                New Folder
              </button>
            </div>
          </div>

          <div>
            <p className="text-ink">Files</p>
            {filteredFiles.length === 0 ? (
              <p className="mt-6 text-sm text-ink/50">
                No files match your search.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {filteredFiles.map((file) => {
                  const docStyle = DOCUMENT_TILE_STYLES[file.fileType];
                  return (
                    <div key={file.id}>
                      <div className="relative">
                        {docStyle ? (
                          <div
                            className="flex h-28 w-full items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${docStyle.bg}22` }}
                          >
                            <docStyle.icon
                              className="h-8 w-8"
                              style={{ color: docStyle.bg }}
                            />
                          </div>
                        ) : (
                          <PlaceholderImage
                            seed={file.id}
                            className="h-28 w-full rounded-lg"
                          />
                        )}

                        {file.fileType === "MP4" && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-0/70 text-violet-1">
                              <Play className="h-3.5 w-3.5" />
                            </span>
                          </span>
                        )}

                        <span className="absolute right-1.5 top-1.5 rounded bg-bg-0/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/80">
                          {file.fileType}
                        </span>

                        {file.duration && (
                          <span className="absolute bottom-1.5 right-1.5 rounded bg-bg-0/80 px-1.5 py-0.5 text-[10px] text-ink/80">
                            {file.duration}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 truncate text-sm text-ink">
                        {file.filename}
                      </p>
                      <p className="truncate text-xs text-ink/50">
                        {file.size}
                        {file.dimensions ? ` · ${file.dimensions}` : ""}
                      </p>
                      <p className="text-xs text-ink/40">{file.dateAdded}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Storage Overview</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 100 100" className="h-20 w-20 -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r={RING_RADIUS}
                    stroke="#5b4d8f44"
                    strokeWidth="10"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={RING_RADIUS}
                    stroke="#a78bfa"
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-display text-sm text-violet-1">
                  {storagePct}%
                </div>
              </div>
              <div>
                <p className="text-ink">of {STORAGE_TOTAL_GB} GB used</p>
                <p className="text-sm text-ink/50">
                  {storageUsed.toFixed(1)} GB / {STORAGE_TOTAL_GB} GB
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm">
              {STORAGE_BREAKDOWN.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-ink/70">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </span>
                  <span className="text-ink/60">{item.gb} GB</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between">
              <p className="text-ink">Recent Uploads</p>
              <button
                onClick={() => console.log("view all recent uploads")}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                View all
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {recentUploads.map(({ file, timeAgo }) => (
                <div key={file.id} className="flex items-center gap-3">
                  <PlaceholderImage
                    seed={file.id}
                    className="h-9 w-9 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {file.filename}
                    </p>
                    <p className="text-xs text-ink/50">
                      {file.size} · {timeAgo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Quick Actions</p>
            <div className="mt-3 flex flex-col gap-1">
              {UPLOAD_QUICK_ACTIONS.map((action) => {
                const Icon = QUICK_ACTION_ICONS[action.id] ?? Upload;
                return (
                  <button
                    key={action.id}
                    onClick={() => console.log(action.id)}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-violet-2/5"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-violet-2" />
                    <span>
                      <span className="block text-sm text-ink">
                        {action.title}
                      </span>
                      <span className="block text-xs text-ink/50">
                        {action.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
