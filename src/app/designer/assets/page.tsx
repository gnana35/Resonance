"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  FileText,
  Folder,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Music,
  Package,
  Search,
  Video,
} from "lucide-react";
import {
  ASSET_CATEGORIES,
  ASSET_FOLDERS,
  ASSET_STATS,
  COLLECTIONS,
  RECENT_ASSETS,
  RECENT_FILES,
  type AssetCategory,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

const STAT_ICONS: Record<string, typeof ImageIcon> = {
  "Total Assets": ImageIcon,
  Images: ImageIcon,
  Documents: FileText,
  Audio: Music,
  Videos: Video,
  Other: Package,
};

const FILTERS = [
  { label: "Asset Type", value: "All Types" },
  { label: "File Type", value: "All Formats" },
  { label: "Tags", value: "Select tags" },
  { label: "Added By", value: "Anyone" },
  { label: "Date Added", value: "Anytime" },
];

export default function Assets() {
  const [category, setCategory] = useState<AssetCategory | "All Assets">(
    "All Assets",
  );
  const [query, setQuery] = useState("");

  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECENT_ASSETS.filter((asset) => {
      const matchesCategory =
        category === "All Assets" || asset.category === category;
      const matchesQuery =
        q.length === 0 || asset.filename.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECENT_FILES.filter((file) => {
      const matchesCategory =
        category === "All Assets" || file.category === category;
      const matchesQuery =
        q.length === 0 || file.filename.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div className="px-6 py-8 md:px-10">
      <h1 className="font-display text-2xl text-violet-1">Assets</h1>
      <p className="mt-1 text-ink/70">
        Organize, preview, and manage all your creative resources.
      </p>

      <div className="mt-6 flex items-center gap-3 rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-ink/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
        />
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {ASSET_CATEGORIES.map((cat) => (
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

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {ASSET_STATS.map((stat) => {
          const Icon = STAT_ICONS[stat.label] ?? Package;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-violet-3/25 bg-bg-1 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink/60">{stat.label}</p>
                <Icon className="h-4 w-4 text-violet-2" />
              </div>
              <p className="mt-2 font-display text-xl text-ink">
                {stat.value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-emerald-400/80">{stat.delta}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-ink">Recently Added</p>
              <button
                onClick={() => console.log("view all recently added")}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                View all
              </button>
            </div>
            {filteredAssets.length === 0 ? (
              <p className="mt-6 text-sm text-ink/50">
                No assets match your search.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {filteredAssets.map((asset) => (
                  <div key={asset.id}>
                    <div className="relative">
                      <PlaceholderImage
                        seed={asset.id}
                        className="h-28 w-full rounded-lg"
                      />
                      <span className="absolute bottom-2 left-2 rounded bg-bg-0/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/80">
                        {asset.fileType}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-ink">
                      {asset.filename}
                    </p>
                    <p className="text-xs text-ink/50">{asset.timeAgo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-ink">Folders</p>
              <button
                onClick={() => console.log("view all folders")}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                View all
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {ASSET_FOLDERS.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCategory(folder.name as AssetCategory)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-violet-3/25 bg-bg-1 py-5 text-center transition-colors hover:border-violet-2/50"
                >
                  <Folder className="h-8 w-8 fill-violet-2/30 text-violet-2" />
                  <span className="text-sm text-ink">{folder.name}</span>
                  <span className="text-xs text-ink/50">
                    {folder.count} assets
                  </span>
                </button>
              ))}
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
            <div className="flex items-center justify-between">
              <p className="text-ink">Recent Files</p>
              <button
                onClick={() => console.log("view all files")}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                View all
              </button>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-violet-3/25 bg-bg-1">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-violet-3/20 text-ink/50">
                    <th className="px-4 py-3 font-normal">Name</th>
                    <th className="px-4 py-3 font-normal">Type</th>
                    <th className="px-4 py-3 font-normal">Size</th>
                    <th className="px-4 py-3 font-normal">Date Added</th>
                    <th className="px-4 py-3 font-normal">Added By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFiles.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-ink/50">
                        No files match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredFiles.map((file) => (
                      <tr
                        key={file.id}
                        className="border-b border-violet-3/10 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <PlaceholderImage
                              seed={file.id}
                              className="h-9 w-9 shrink-0 rounded-md"
                            />
                            <div className="min-w-0">
                              <p className="truncate text-ink">
                                {file.filename}
                              </p>
                              <p className="truncate text-xs text-ink/40">
                                {file.path}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink/70">{file.type}</td>
                        <td className="px-4 py-3 text-ink/70">{file.size}</td>
                        <td className="px-4 py-3 text-ink/70">
                          {file.dateAdded}
                        </td>
                        <td className="px-4 py-3 text-ink/70">
                          {file.addedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-ink">
                <Layers className="h-4 w-4 text-violet-2" />
                Collections
              </div>
              <button
                onClick={() => console.log("new collection")}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                + New
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              {COLLECTIONS.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => console.log("open collection", collection.id)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-violet-2/5"
                >
                  <span className="truncate text-ink">{collection.name}</span>
                  <span className="shrink-0 text-ink/40">
                    {collection.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between">
              <p className="text-ink">Filters</p>
              <button
                onClick={() => console.log("clear filters")}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                Clear all
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {FILTERS.map((filter) => (
                <div key={filter.label}>
                  <p className="text-sm text-ink/60">{filter.label}</p>
                  <button
                    onClick={() => console.log("open filter", filter.label)}
                    className="mt-1.5 flex w-full items-center justify-between rounded-md border border-violet-3/30 px-3 py-2 text-sm text-ink hover:border-violet-2/50"
                  >
                    {filter.value}
                    <ChevronDown className="h-3.5 w-3.5 text-ink/50" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
