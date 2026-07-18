"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Map as MapIcon,
  Mountain,
  Package,
  Pencil,
  PenTool,
  Play,
  Sparkles,
  Sword,
  User,
} from "lucide-react";
import {
  DESIGN_PROGRESS,
  MOOD_SWATCHES,
  MOOD_TAGS,
  MUSIC_THEMES,
  OUTFIT_PROMPTS,
  SUBMISSIONS,
  type SubmissionType,
} from "@/data/designer";

const TYPE_ICONS: Record<SubmissionType, typeof User> = {
  "Concept Art": PenTool,
  Weapon: Sword,
  Character: User,
  Map: MapIcon,
  Prop: Package,
  Environment: Mountain,
};

const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-300",
  Approved: "bg-emerald-500/15 text-emerald-300",
  Rejected: "bg-red-500/15 text-red-300",
  "Needs Changes": "bg-violet-500/15 text-violet-300",
  Draft: "bg-ink/10 text-ink/60",
};

export default function DesignerHome() {
  const [selectedSwatch, setSelectedSwatch] = useState("royal-violet");
  const [museTab, setMuseTab] = useState<"Music Themes" | "Outfit Prompts">(
    "Music Themes",
  );

  const progressPct = Math.round(
    (DESIGN_PROGRESS.completed / DESIGN_PROGRESS.total) * 100,
  );
  const ringOffset =
    RING_CIRCUMFERENCE - (progressPct / 100) * RING_CIRCUMFERENCE;

  const suggestions = museTab === "Music Themes" ? MUSIC_THEMES : OUTFIT_PROMPTS;

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-4xl text-violet-1">
            The Designer&apos;s Space
          </h1>
          <p className="mt-2 text-lg text-violet-2">Visuals, Audio, Vibe</p>
          <p className="mt-4 max-w-xl text-ink/70">
            Built-in sketchpad, Image nodes.
          </p>
          <p className="max-w-xl text-ink/70">
            The Creative Muse: Suggests musical themes, generates outfit
            prompts.
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="w-64 rounded-xl border border-violet-3/30 bg-bg-1 p-4">
            <p className="text-sm text-ink/70">Mood Vibe</p>
            <p className="mt-2 text-ink">
              {MOOD_TAGS.join(" · ")}
            </p>
            <div className="mt-3 flex items-center gap-2.5">
              {MOOD_SWATCHES.map((swatch) => {
                const selected = selectedSwatch === swatch.id;
                return (
                  <button
                    key={swatch.id}
                    onClick={() => setSelectedSwatch(swatch.id)}
                    aria-label={swatch.id}
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: swatch.color,
                      boxShadow: selected
                        ? `0 0 0 2px #0a0e1c, 0 0 0 4px #a78bfa`
                        : undefined,
                    }}
                  >
                    {selected && (
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => console.log("edit mood vibe")}
                aria-label="Edit mood vibe"
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-violet-3/40 text-ink/60 hover:border-violet-2/60 hover:text-violet-1"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="w-56 rounded-xl border border-violet-3/30 bg-bg-1 p-4">
            <p className="text-sm text-ink/70">Design Progress</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 100 100" className="h-16 w-16 -rotate-90">
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
                  {progressPct}%
                </div>
              </div>
              <div>
                <p className="text-ink">
                  {DESIGN_PROGRESS.completed} / {DESIGN_PROGRESS.total}
                </p>
                <p className="text-sm text-ink/50">Assets Completed</p>
              </div>
            </div>
            <Link
              href="/designer/assets"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-full border border-violet-2/50 py-2 text-sm text-violet-1 transition-colors hover:border-violet-1"
            >
              View All Assets
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-violet-3/30 bg-bg-1 p-5">
          <div className="flex items-center gap-2 text-ink">
            <Sparkles className="h-4 w-4 text-violet-2" />
            The Creative Muse
          </div>
          <p className="mt-1 text-sm text-ink/50">
            AI suggestions to inspire your creativity
          </p>

          <div className="mt-4 flex gap-6 border-b border-violet-3/20">
            {(["Music Themes", "Outfit Prompts"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMuseTab(tab)}
                className={`-mb-px border-b-2 pb-2 text-sm transition-colors ${
                  museTab === tab
                    ? "border-violet-2 text-violet-1"
                    : "border-transparent text-ink/50 hover:text-ink"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {suggestions.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <button
                  onClick={() => console.log("play", item.id)}
                  aria-label={`Play ${item.title}`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-2/15 text-violet-1 transition-colors hover:bg-violet-2/25"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-ink">{item.title}</p>
                  <div className="mt-1 flex gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-violet-2/10 px-2.5 py-0.5 text-xs text-violet-2"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => console.log("generate more", museTab)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-violet-2 py-2.5 text-sm font-medium text-bg-0 transition-colors hover:bg-violet-1"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate More {museTab === "Music Themes" ? "Themes" : "Prompts"}
          </button>
        </div>

        <div className="rounded-2xl border border-violet-3/30 bg-bg-1 p-5">
          <div className="flex items-center gap-2 text-ink">
            <ClipboardCheck className="h-4 w-4 text-violet-2" />
            Approval Workflow
          </div>
          <p className="mt-1 text-sm text-ink/50">
            Submit your designs for writer review
          </p>

          <div className="mt-4 flex gap-2">
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs text-amber-300">
              Pending (
              {SUBMISSIONS.filter((s) => s.status === "Pending").length})
            </span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
              Approved (
              {SUBMISSIONS.filter((s) => s.status === "Approved").length})
            </span>
            <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300">
              Rejected (
              {SUBMISSIONS.filter((s) => s.status === "Rejected").length})
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {SUBMISSIONS.slice(0, 2).map((submission) => {
              const Icon = TYPE_ICONS[submission.type];
              return (
                <div key={submission.id} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-2/10 text-violet-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">{submission.title}</p>
                    <p className="text-sm text-ink/50">
                      Submitted by {submission.submittedBy} · {submission.date}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${STATUS_STYLES[submission.status]}`}
                  >
                    {submission.status}
                  </span>
                </div>
              );
            })}
          </div>

          <Link
            href="/designer/approvals"
            className="mt-5 flex items-center justify-center gap-1.5 rounded-full border border-violet-2/50 py-2.5 text-sm text-violet-1 transition-colors hover:border-violet-1"
          >
            View All Submissions
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
