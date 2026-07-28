"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";

export function LayersPanel() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex flex-col rounded-xl border border-violet-3/25 bg-bg-1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-violet-3/20 px-4 py-3">
        <span className="text-sm font-medium text-ink">Layers</span>
        <button
          onClick={() => console.log("add layer")}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-violet-2 transition-colors hover:bg-violet-2/10 hover:text-violet-1"
        >
          <Plus className="h-3 w-3" />
          Add Layer
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-violet-3/20 px-3 py-2">
        <div className="flex items-center gap-2 rounded-md border border-violet-3/20 bg-bg-0 px-2.5 py-1.5">
          <Search className="h-3 w-3 shrink-0 text-ink/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search layers…"
            className="w-full bg-transparent text-xs text-ink placeholder:text-ink/35 focus:outline-none"
          />
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-violet-3/30 bg-bg-0">
          <Plus className="h-4 w-4 text-violet-3/60" />
        </div>
        <div>
          <p className="text-sm text-ink/60">No layers yet</p>
          <p className="mt-0.5 text-xs text-ink/35">
            Create your first layer to get started
          </p>
        </div>
        <button
          onClick={() => console.log("create new layer")}
          className="mt-1 flex items-center gap-1.5 rounded-md border border-violet-3/35 px-3 py-1.5 text-xs text-violet-2 transition-colors hover:border-violet-2/50 hover:bg-violet-2/10"
        >
          <Plus className="h-3 w-3" />
          Create New Layer
        </button>
      </div>
    </div>
  );
}
