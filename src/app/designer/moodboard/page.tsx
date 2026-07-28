"use client";

import { useState } from "react";
import {
  Filter,
  Grid3x3,
  Link2,
  List,
  Plus,
} from "lucide-react";
import { MoodboardViewer } from "@/components/MoodboardViewer";

function YouTubeMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path d="M10 8.5l6 3.5-6 3.5v-7z" fill="white" />
    </svg>
  );
}

function SpotifyMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1DB954" />
      <path
        d="M6.5 9.8c3.2-1 7.4-.7 9.9.8M6.9 12.9c2.6-.8 6-.6 8.3.7M7.3 15.8c2.2-.6 4.9-.5 6.7.6"
        stroke="white"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function Moodboard() {
  const [linkValue, setLinkValue] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-violet-1">
            The Designer&apos;s Space{" "}
            <span className="text-ink/40">&gt;</span> Moodboard
          </h1>
          <p className="mt-1 text-ink/70">
            Drop links or images to define the vibe. The AI translates it
            into inspiration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-violet-3/30 p-1">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`rounded-md p-1.5 ${
                view === "grid"
                  ? "bg-violet-2/15 text-violet-1"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={`rounded-md p-1.5 ${
                view === "list"
                  ? "bg-violet-2/15 text-violet-1"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => console.log("filter moodboard")}
            className="flex items-center gap-2 rounded-md border border-violet-3/30 px-3 py-1.5 text-sm text-ink hover:border-violet-2/50"
          >
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
        </div>
      </div>

      {/* Link / image input bar — write actions stay on this page */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-violet-3/25 bg-bg-1 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2.5">
          <Link2 className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="Paste YouTube / Spotify link here..."
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => console.log("add youtube link")}
            className="flex items-center gap-2 rounded-lg border border-violet-3/25 px-3 py-2.5 text-sm text-ink hover:border-violet-2/50"
          >
            <YouTubeMark />
            YouTube
          </button>
          <button
            onClick={() => console.log("add spotify link")}
            className="flex items-center gap-2 rounded-lg border border-violet-3/25 px-3 py-2.5 text-sm text-ink hover:border-violet-2/50"
          >
            <SpotifyMark />
            Spotify
          </button>
          <button
            onClick={() => console.log("add image")}
            className="flex items-center gap-2 rounded-lg bg-violet-2 px-3 py-2.5 text-sm font-medium text-bg-0 hover:bg-violet-1"
          >
            <Plus className="h-4 w-4" />
            Add Image
          </button>
        </div>
      </div>

      <div className="mt-6">
        <MoodboardViewer />
      </div>
    </div>
  );
}
