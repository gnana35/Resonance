"use client";

import { useState } from "react";
import {
  Crown,
  Filter,
  Grid3x3,
  Landmark,
  Link2,
  List,
  Moon,
  Play,
  Plus,
  Shuffle,
  Sparkles,
  Thermometer,
} from "lucide-react";
import {
  AI_INSPIRATION_IMAGES,
  COLOR_PALETTE,
  CORE_VIBE_IMAGES,
  MOOD_REFERENCES,
  MOODBOARD_KEYWORDS,
  TEXTURE_REFERENCES,
  VIBE_BREAKDOWN,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

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

const VIBE_ICONS = [Moon, Crown, Thermometer, Landmark, Shuffle];

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

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center gap-2 text-ink">
              <span className="h-2 w-2 rounded-full bg-violet-2" />
              Core Vibe
            </div>

            <div
              className={
                view === "grid"
                  ? "mt-4 grid grid-cols-3 gap-3"
                  : "mt-4 flex flex-col gap-3"
              }
            >
              {CORE_VIBE_IMAGES.map((seed) => (
                <PlaceholderImage
                  key={seed}
                  seed={seed}
                  className={
                    view === "grid" ? "h-28 rounded-lg" : "h-16 rounded-lg"
                  }
                />
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-ink">
              <span className="h-2 w-2 rounded-full bg-violet-2" />
              Color Palette
            </div>
            <div className="mt-3 flex flex-wrap gap-5">
              {COLOR_PALETTE.map((c) => (
                <div key={c.hex} className="flex flex-col items-center gap-1.5">
                  <span
                    className="h-9 w-9 rounded-full border border-white/10"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-xs text-ink/50">{c.hex}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2 text-ink">
              <span className="h-2 w-2 rounded-full bg-violet-2" />
              Keywords
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOODBOARD_KEYWORDS.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-violet-2/10 px-3 py-1 text-sm text-violet-2"
                >
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
              <p className="text-ink">Mood References</p>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
                {MOOD_REFERENCES.map((ref) => (
                  <div key={ref.id} className="w-32 shrink-0">
                    <div className="relative">
                      <PlaceholderImage
                        seed={ref.id}
                        className="h-36 w-32 rounded-lg"
                      />
                      <button
                        onClick={() => console.log("play", ref.id)}
                        aria-label={`Play ${ref.title}`}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-0/70 text-violet-1">
                          <Play className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-ink">{ref.title}</p>
                    <p className="text-xs text-ink/50">
                      {ref.tags.join(" · ")}
                    </p>
                  </div>
                ))}
                <button
                  onClick={() => console.log("add more mood references")}
                  className="flex w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-violet-3/40 text-sm text-violet-2 hover:border-violet-2"
                >
                  <Plus className="h-5 w-5" />
                  Add More
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
              <p className="text-ink">Texture &amp; Material References</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {TEXTURE_REFERENCES.map((tex) => (
                  <div key={tex.id}>
                    <PlaceholderImage seed={tex.id} className="h-20 rounded-lg" />
                    <p className="mt-1.5 text-xs text-ink/60">{tex.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">AI Inspiration (Generated from your vibe)</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {AI_INSPIRATION_IMAGES.map((seed) => (
                <PlaceholderImage key={seed} seed={seed} className="h-28 rounded-lg" />
              ))}
              <button
                onClick={() => console.log("generate more inspiration")}
                className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-violet-3/40 p-2 text-center"
              >
                <Sparkles className="h-4 w-4 text-violet-2" />
                <span className="text-xs text-violet-1">Generate More</span>
                <span className="rounded-full bg-violet-2 px-2 py-0.5 text-[10px] font-medium text-bg-0">
                  Generate
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="h-4 w-4 text-violet-2" />
            Vibe Breakdown
          </div>
          <p className="mt-1 text-sm text-ink/50">
            AI analysis of your moodboard
          </p>

          <div className="mt-5 flex flex-col gap-4">
            {VIBE_BREAKDOWN.map((metric, i) => {
              const Icon = VIBE_ICONS[i % VIBE_ICONS.length];
              return (
                <div key={metric.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink/70">
                      <Icon className="h-3.5 w-3.5 text-violet-2" />
                      {metric.label}
                    </span>
                    <span className="text-ink">{metric.value}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-0">
                    <div
                      className="h-full rounded-full bg-violet-2"
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
