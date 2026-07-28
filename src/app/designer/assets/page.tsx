"use client";

import { useRef, useMemo, useState } from "react";
import {
  Check,
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
  X,
} from "lucide-react";
import {
  ASSET_CATEGORIES,
  ASSET_FOLDERS,
  ASSET_STATS,
  COLLECTIONS,
  RECENT_ASSETS,
  RECENT_FILES,
  type AssetCategory,
  type Collection,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

/* ─── static data ─────────────────────────────────────────────────────── */

const STAT_ICONS: Record<string, typeof ImageIcon> = {
  "Total Assets": ImageIcon,
  Images: ImageIcon,
  Documents: FileText,
  Audio: Music,
  Videos: Video,
  Other: Package,
};

const FILTER_OPTIONS: Record<string, string[]> = {
  "Asset Type":  ["All Types",   "Image", "Document", "Audio", "Video", "Other"],
  "File Type":   ["All Formats", "PNG", "JPG", "SVG", "MP3", "WAV", "PDF", "MP4"],
  "Tags":        ["Select tags", "Character", "Environment", "UI", "Concept", "Final"],
  "Added By":    ["Anyone",      "Me", "Team", "Collaborators"],
  "Date Added":  ["Anytime",     "Today", "This week", "This month", "This year"],
};

/* ─── helpers ─────────────────────────────────────────────────────────── */

function FilterDropdown({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = FILTER_OPTIONS[label] ?? [];

  return (
    <div className="relative">
      <p className="text-sm text-ink/60">{label}</p>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 flex w-full items-center justify-between rounded-md border border-violet-3/30 px-3 py-2 text-sm text-ink hover:border-violet-2/50"
      >
        {value}
        <ChevronDown className={`h-3.5 w-3.5 text-ink/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-md border border-violet-3/30 bg-bg-1 py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink/80 hover:bg-violet-2/10 hover:text-ink"
            >
              {opt}
              {opt === value && <Check className="h-3.5 w-3.5 text-violet-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────────────────── */

export default function Assets() {
  const [category, setCategory] = useState<AssetCategory | "All Assets">("All Assets");
  const [query, setQuery] = useState("");

  // Filter panel values
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    "Asset Type": "All Types",
    "File Type":  "All Formats",
    "Tags":       "Select tags",
    "Added By":   "Anyone",
    "Date Added": "Anytime",
  });

  // New folder state
  const [folders, setFolders] = useState(ASSET_FOLDERS);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);

  // New collection state
  const [collections, setCollections] = useState<Collection[]>(COLLECTIONS);
  const [addingCollection, setAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const collectionInputRef = useRef<HTMLInputElement>(null);

  // "View all" toggles — expand/collapse sections
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);

  // Filtered data
  const filteredAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECENT_ASSETS.filter((asset) => {
      const matchesCategory = category === "All Assets" || asset.category === category;
      const matchesQuery = q.length === 0 || asset.filename.toLowerCase().includes(q);
      
      // Apply filter panel values
      const assetTypeFilter = filterValues["Asset Type"];
      const fileTypeFilter = filterValues["File Type"];
      const tagsFilter = filterValues["Tags"];
      const addedByFilter = filterValues["Added By"];
      
      const matchesAssetType = assetTypeFilter === "All Types" || asset.fileType === assetTypeFilter;
      const matchesFileType = fileTypeFilter === "All Formats" || asset.fileType === fileTypeFilter;
      const matchesTags = tagsFilter === "Select tags"; // Placeholder: no tags in data
      const matchesAddedBy = addedByFilter === "Anyone"; // Placeholder: no addedBy in RECENT_ASSETS

      return matchesCategory && matchesQuery && matchesAssetType && matchesFileType && matchesTags && matchesAddedBy;
    });
  }, [category, query, filterValues]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECENT_FILES.filter((file) => {
      const matchesCategory = category === "All Assets" || file.category === category;
      const matchesQuery = q.length === 0 || file.filename.toLowerCase().includes(q);
      
      // Apply filter panel values
      const assetTypeFilter = filterValues["Asset Type"];
      const fileTypeFilter = filterValues["File Type"];
      const addedByFilter = filterValues["Added By"];
      const dateAddedFilter = filterValues["Date Added"];
      
      const matchesAssetType = assetTypeFilter === "All Types" || file.type === assetTypeFilter;
      const matchesFileType = fileTypeFilter === "All Formats" || file.type === fileTypeFilter;
      const matchesAddedBy = addedByFilter === "Anyone" || file.addedBy === addedByFilter;
      const matchesDateAdded = dateAddedFilter === "Anytime"; // Placeholder: no structured date in data
      
      return matchesCategory && matchesQuery && matchesAssetType && matchesFileType && matchesAddedBy && matchesDateAdded;
    });
  }, [category, query, filterValues]);

  // Sliced lists (collapse until "View all" is clicked)
  const visibleAssets  = showAllAssets  ? filteredAssets  : filteredAssets.slice(0, 6);
  const visibleFolders = showAllFolders ? folders         : folders.slice(0, 4);
  const visibleFiles   = showAllFiles   ? filteredFiles   : filteredFiles.slice(0, 5);

  // Refs for scroll-to-section behaviour
  const assetsRef    = useRef<HTMLDivElement>(null);
  const foldersRef   = useRef<HTMLDivElement>(null);
  const filesRef     = useRef<HTMLDivElement>(null);

  function handleViewAllAssets() {
    setShowAllAssets(true);
    setTimeout(() => assetsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function handleViewAllFolders() {
    setShowAllFolders(true);
    setTimeout(() => foldersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
  function handleViewAllFiles() {
    setShowAllFiles(true);
    setTimeout(() => filesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function handleNewFolder() {
    setAddingFolder(true);
    setTimeout(() => folderInputRef.current?.focus(), 50);
  }

  function commitNewFolder() {
    const name = newFolderName.trim();
    if (name) {
      setFolders((prev) => [...prev, { id: `folder-${Date.now()}`, name, count: 0 }]);
    }
    setNewFolderName("");
    setAddingFolder(false);
  }

  function handleNewCollection() {
    setAddingCollection(true);
    setTimeout(() => collectionInputRef.current?.focus(), 50);
  }

  function commitNewCollection() {
    const name = newCollectionName.trim();
    if (name) {
      setCollections((prev) => [...prev, { id: `col-${Date.now()}`, name, count: 0 }]);
    }
    setNewCollectionName("");
    setAddingCollection(false);
  }

  function clearFilters() {
    setFilterValues({
      "Asset Type": "All Types",
      "File Type":  "All Formats",
      "Tags":       "Select tags",
      "Added By":   "Anyone",
      "Date Added": "Anytime",
    });
    setCategory("All Assets");
    setQuery("");
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <h1 className="font-display text-2xl text-violet-1">Assets</h1>
      <p className="mt-1 text-ink/70">
        Organize, preview, and manage all your creative resources.
      </p>

      {/* Search */}
      <div className="mt-6 flex items-center gap-3 rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-ink/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets..."
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
        />
        {query && (
          <button onClick={() => setQuery("")} className="shrink-0 text-ink/40 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {ASSET_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
              category === cat ? "bg-violet-2 text-bg-0" : "bg-bg-1 text-ink/70 hover:text-ink"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {ASSET_STATS.map((stat) => {
          const Icon = STAT_ICONS[stat.label] ?? Package;
          return (
            <div key={stat.label} className="rounded-xl border border-violet-3/25 bg-bg-1 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink/60">{stat.label}</p>
                <Icon className="h-4 w-4 text-violet-2" />
              </div>
              <p className="mt-2 font-display text-xl text-ink">{stat.value.toLocaleString()}</p>
              <p className="mt-1 text-xs text-emerald-400/80">{stat.delta}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">

          {/* Recently Added */}
          <div ref={assetsRef}>
            <div className="flex items-center justify-between">
              <p className="text-ink">Recently Added</p>
              {!showAllAssets && filteredAssets.length > 6 && (
                <button
                  onClick={handleViewAllAssets}
                  className="text-sm text-violet-2 hover:text-violet-1"
                >
                  View all ({filteredAssets.length})
                </button>
              )}
              {showAllAssets && (
                <button
                  onClick={() => setShowAllAssets(false)}
                  className="text-sm text-violet-2 hover:text-violet-1"
                >
                  Show less
                </button>
              )}
            </div>
            {filteredAssets.length === 0 ? (
              <p className="mt-6 text-sm text-ink/50">No assets match your search.</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {visibleAssets.map((asset) => (
                  <div key={asset.id}>
                    <div className="relative">
                      <PlaceholderImage seed={asset.id} className="h-28 w-full rounded-lg" />
                      <span className="absolute bottom-2 left-2 rounded bg-bg-0/80 px-1.5 py-0.5 text-[10px] font-medium text-ink/80">
                        {asset.fileType}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-ink">{asset.filename}</p>
                    <p className="text-xs text-ink/50">{asset.timeAgo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Folders */}
          <div ref={foldersRef}>
            <div className="flex items-center justify-between">
              <p className="text-ink">Folders</p>
              {!showAllFolders && folders.length > 4 && (
                <button
                  onClick={handleViewAllFolders}
                  className="text-sm text-violet-2 hover:text-violet-1"
                >
                  View all ({folders.length})
                </button>
              )}
              {showAllFolders && (
                <button
                  onClick={() => setShowAllFolders(false)}
                  className="text-sm text-violet-2 hover:text-violet-1"
                >
                  Show less
                </button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {visibleFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setCategory(folder.name as AssetCategory)}
                  className={`flex flex-col items-center gap-2 rounded-xl border bg-bg-1 py-5 text-center transition-colors hover:border-violet-2/50 ${
                    category === folder.name
                      ? "border-violet-2/60 bg-violet-2/5"
                      : "border-violet-3/25"
                  }`}
                >
                  <Folder className="h-8 w-8 fill-violet-2/30 text-violet-2" />
                  <span className="text-sm text-ink">{folder.name}</span>
                  <span className="text-xs text-ink/50">{folder.count} assets</span>
                </button>
              ))}

              {/* New folder — inline input or button */}
              {addingFolder ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-violet-2/40 bg-bg-1 px-3 py-5">
                  <FolderPlus className="h-6 w-6 text-violet-2" />
                  <input
                    ref={folderInputRef}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitNewFolder();
                      if (e.key === "Escape") { setAddingFolder(false); setNewFolderName(""); }
                    }}
                    placeholder="Folder name"
                    className="w-full bg-transparent text-center text-sm text-ink placeholder:text-ink/30 focus:outline-none"
                  />
                  <div className="flex gap-2 text-xs">
                    <button onClick={commitNewFolder} className="text-violet-2 hover:text-violet-1">Save</button>
                    <button onClick={() => { setAddingFolder(false); setNewFolderName(""); }} className="text-ink/40 hover:text-ink">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleNewFolder}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-violet-3/40 py-5 text-sm text-violet-2 hover:border-violet-2"
                >
                  <FolderPlus className="h-6 w-6" />
                  New Folder
                </button>
              )}
            </div>
          </div>

          {/* Recent Files */}
          <div ref={filesRef}>
            <div className="flex items-center justify-between">
              <p className="text-ink">Recent Files</p>
              {!showAllFiles && filteredFiles.length > 5 && (
                <button
                  onClick={handleViewAllFiles}
                  className="text-sm text-violet-2 hover:text-violet-1"
                >
                  View all ({filteredFiles.length})
                </button>
              )}
              {showAllFiles && (
                <button
                  onClick={() => setShowAllFiles(false)}
                  className="text-sm text-violet-2 hover:text-violet-1"
                >
                  Show less
                </button>
              )}
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
                    visibleFiles.map((file) => (
                      <tr key={file.id} className="border-b border-violet-3/10 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <PlaceholderImage seed={file.id} className="h-9 w-9 shrink-0 rounded-md" />
                            <div className="min-w-0">
                              <p className="truncate text-ink">{file.filename}</p>
                              <p className="truncate text-xs text-ink/40">{file.path}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink/70">{file.type}</td>
                        <td className="px-4 py-3 text-ink/70">{file.size}</td>
                        <td className="px-4 py-3 text-ink/70">{file.dateAdded}</td>
                        <td className="px-4 py-3 text-ink/70">{file.addedBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-6">
          {/* Collections */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-ink">
                <Layers className="h-4 w-4 text-violet-2" />
                Collections
              </div>
              <button
                onClick={handleNewCollection}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                + New
              </button>
            </div>

            {/* Inline new-collection input */}
            {addingCollection && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-violet-2/40 bg-bg-0 px-3 py-2">
                <input
                  ref={collectionInputRef}
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitNewCollection();
                    if (e.key === "Escape") { setAddingCollection(false); setNewCollectionName(""); }
                  }}
                  placeholder="Collection name"
                  className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/30 focus:outline-none"
                />
                <button onClick={commitNewCollection} className="text-xs text-violet-2 hover:text-violet-1">Save</button>
                <button onClick={() => { setAddingCollection(false); setNewCollectionName(""); }} className="text-ink/40 hover:text-ink">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-1">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  onClick={() => {
                    // Filter assets by matching collection name to category if possible
                    const asMatch = ASSET_CATEGORIES.find(
                      (c) => c.toLowerCase() === collection.name.toLowerCase(),
                    );
                    if (asMatch) setCategory(asMatch);
                  }}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-violet-2/5"
                >
                  <span className="truncate text-ink">{collection.name}</span>
                  <span className="shrink-0 text-ink/40">{collection.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between">
              <p className="text-ink">Filters</p>
              <button
                onClick={clearFilters}
                className="text-sm text-violet-2 hover:text-violet-1"
              >
                Clear all
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {Object.keys(FILTER_OPTIONS).map((label) => (
                <FilterDropdown
                  key={label}
                  label={label}
                  value={filterValues[label]}
                  onChange={(v) => setFilterValues((prev) => ({ ...prev, [label]: v }))}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
