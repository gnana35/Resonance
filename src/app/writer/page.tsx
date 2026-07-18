"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronLeft,
  Check,
  ChevronRight,
  File,
  Flag,
  Maximize2,
  MoreHorizontal,
  Plus,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import { DocumentEditor } from "@/components/DocumentEditor";

type Issue = {
  id: string;
  type: "Plot Hole" | "Arc Break";
  tag: string;
  description: string;
};

const ISSUES: Issue[] = [
  {
    id: "1",
    type: "Plot Hole",
    tag: "Chapter 2",
    description:
      "Lira's wound disappears between chapters. Consider showing recovery or consequences.",
  },
  {
    id: "2",
    type: "Plot Hole",
    tag: "Chapter 3",
    description:
      "The guard at the east gate doesn't recognize Lira, though they met in Chapter 1.",
  },
  {
    id: "3",
    type: "Arc Break",
    tag: "Kael",
    description:
      "Kael's motivation shifts suddenly. Consider adding internal conflict or a reason for the change.",
  },
];

const SEED_DOCUMENT_HTML = `
  <p>The wind carried whispers tonight.</p>
  <p>Lira stood at the edge of the cliff, her cloak dancing in the clouds below. The city of Veyndor glimmered in the distance—beautiful, uncaring.</p>
  <p>"You shouldn't be here," a voice said.</p>
  <p>She didn't turn.</p>
  <p>"I'm always here," she replied.</p>
`;

const DAILY_GOAL = 3000;
const WORDS_TODAY = 320;

export default function WriterHome() {
  const [hasDocument, setHasDocument] = useState(false);
  const [issueFilter, setIssueFilter] = useState<
    "All" | "Plot Hole" | "Arc Break"
  >("All");

  const plotHoleCount = ISSUES.filter((i) => i.type === "Plot Hole").length;
  const arcBreakCount = ISSUES.filter((i) => i.type === "Arc Break").length;
  const filteredIssues =
    issueFilter === "All"
      ? ISSUES
      : ISSUES.filter((i) => i.type === issueFilter);

  const goalProgress = Math.min(100, Math.round((WORDS_TODAY / DAILY_GOAL) * 100));

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-4xl text-gold-1">
            The Writer&apos;s Space
          </h1>
          <p className="mt-2 text-lg text-ink">Plot, Continuity, Dialogue</p>
          <p className="mt-4 max-w-xl text-ink/70">
            Built-in distraction-free editor.
          </p>
          <p className="max-w-xl text-ink/70">
            The Continuity Editor: Flags plot holes and character arc breaks.
          </p>
        </div>

        <div className="flex gap-4">
          <div className="w-48 rounded-xl border border-gold-3/25 bg-bg-1 p-4">
            <div className="flex items-center justify-between text-sm text-ink/70">
              Project
              <ChevronLeft className="h-3.5 w-3.5 -rotate-90" />
            </div>
            {hasDocument ? (
              <>
                <p className="mt-3 text-lg text-ink">Echoes of Aether</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Last saved just now
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-xl text-ink/40">—</p>
                <p className="mt-1 text-sm text-ink/50">No project selected</p>
              </>
            )}
          </div>
          <div className="w-48 rounded-xl border border-gold-3/25 bg-bg-1 p-4">
            <p className="text-sm text-ink/70">Words</p>
            {hasDocument ? (
              <>
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-xl text-ink">2,734</p>
                  <svg
                    width="60"
                    height="24"
                    viewBox="0 0 60 24"
                    className="text-gold-2"
                  >
                    <polyline
                      points="0,20 10,17 20,18 30,10 40,12 50,4 60,6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
                <p className="mt-1 text-sm text-emerald-400/80">
                  + {WORDS_TODAY} today
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-xl text-ink/40">—</p>
                <p className="mt-1 text-sm text-ink/50">No words yet</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1">
          <div className="flex items-center justify-between border-b border-gold-3/20 px-6 py-4">
            <div className="flex items-center gap-2 text-ink">
              <ChevronLeft className="h-4 w-4" />
              {hasDocument ? "Chapter 3: The First Whisper" : "New Document"}
            </div>
            <div className="flex items-center gap-4 text-sm text-ink/60">
              <span className="flex items-center gap-1.5 text-emerald-400/80">
                <Check className="h-3.5 w-3.5" />
                {hasDocument ? "Auto-saved" : "Auto-save on"}
              </span>
              <Maximize2 className="h-4 w-4 cursor-pointer hover:text-ink" />
              <MoreHorizontal className="h-4 w-4 cursor-pointer hover:text-ink" />
            </div>
          </div>

          {hasDocument ? (
            <DocumentEditor initialHtml={SEED_DOCUMENT_HTML} />
          ) : (
            <div className="flex flex-col items-center px-6 py-24 text-center">
              <button
                onClick={() => setHasDocument(true)}
                aria-label="Start a new document"
                className="flex h-24 w-24 items-center justify-center rounded-full border border-gold-3/40 text-gold-2 transition-colors hover:border-gold-2 hover:text-gold-1"
              >
                <Plus className="h-8 w-8" />
              </button>

              <h2 className="mt-8 font-display text-3xl text-gold-1">
                Start a new document
              </h2>
              <p className="mt-3 max-w-sm text-ink/70">
                Capture your ideas, write your story, and build your world.
              </p>

              <button
                onClick={() => setHasDocument(true)}
                className="mt-8 flex items-center gap-2 rounded-full bg-gold-2 px-6 py-3 font-medium text-bg-0 transition-colors hover:bg-gold-1"
              >
                <Plus className="h-4 w-4" />
                New Document
              </button>

              <p className="mt-4 text-sm text-ink/50">or</p>

              <button
                onClick={() => setHasDocument(true)}
                className="mt-2 flex items-center gap-2 text-sm text-ink/70 transition-colors hover:text-gold-1"
              >
                <File className="h-3.5 w-3.5" />
                Choose a template
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <div className="flex items-center gap-2 text-ink">
              <Activity className="h-4 w-4 text-gold-2" />
              Continuity Editor
            </div>

            {hasDocument ? (
              <>
                <button
                  onClick={() => console.log("review issues")}
                  className="mt-4 flex w-full items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left"
                >
                  <span className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      <span className="block text-sm font-medium text-amber-300">
                        {ISSUES.length} Issues Found
                      </span>
                      <span className="block text-xs text-ink/60">
                        Review to strengthen your story
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink/50" />
                </button>

                <div className="mt-4 flex gap-4 border-b border-gold-3/20 text-sm">
                  {(
                    [
                      { key: "All", label: `All (${ISSUES.length})` },
                      { key: "Plot Hole", label: `Plot Holes (${plotHoleCount})` },
                      { key: "Arc Break", label: `Arc Breaks (${arcBreakCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setIssueFilter(tab.key)}
                      className={`-mb-px border-b-2 pb-2 transition-colors ${
                        issueFilter === tab.key
                          ? "border-gold-2 text-gold-1"
                          : "border-transparent text-ink/50 hover:text-ink"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  {filteredIssues.map((issue) => (
                    <div key={issue.id} className="text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-ink">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              issue.type === "Plot Hole"
                                ? "bg-red-400"
                                : "bg-amber-400"
                            }`}
                          />
                          {issue.type}
                        </span>
                        <span className="text-xs text-ink/50">{issue.tag}</span>
                      </div>
                      <p className="mt-1 text-ink/60">
                        {issue.description}{" "}
                        <button
                          onClick={() => console.log("view issue", issue.id)}
                          className="text-gold-2 hover:text-gold-1"
                        >
                          View
                        </button>
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mt-8 flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gold-3/40 text-gold-2">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <p className="mt-4 font-medium text-ink">No content yet</p>
                  <p className="mt-2 text-sm text-ink/60">
                    Your continuity notes, plot holes, and arc breaks will
                    appear here.
                  </p>
                </div>

                <div className="mt-6 flex gap-2 text-sm">
                  <span className="rounded-full bg-bg-0 px-3 py-1.5 text-ink">
                    All
                  </span>
                  <span className="px-3 py-1.5 text-ink/60">Plot Holes</span>
                  <span className="px-3 py-1.5 text-ink/60">Arc Breaks</span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between text-ink">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gold-2" />
                Writing Goals
              </div>
              <Settings className="h-4 w-4 text-ink/50" />
            </div>

            {hasDocument ? (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink/70">Daily Goal</span>
                  <span className="text-ink">
                    {WORDS_TODAY.toLocaleString()} / {DAILY_GOAL.toLocaleString()}{" "}
                    words
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bg-0">
                  <div
                    className="h-full rounded-full bg-gold-2"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="mt-8 flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-gold-3/40 text-gold-2">
                    <Flag className="h-6 w-6" />
                  </div>
                  <p className="mt-4 font-medium text-ink">No goals set yet</p>
                  <p className="mt-2 text-sm text-ink/60">
                    Set a daily word goal to stay on track.
                  </p>
                </div>

                <button
                  onClick={() => console.log("set goal")}
                  className="mt-6 w-full rounded-full border border-gold-2/50 py-2 text-sm text-gold-2 transition-colors hover:border-gold-1 hover:text-gold-1"
                >
                  Set Goal
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
