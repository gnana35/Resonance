"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Grid2X2,
  LayoutList,
  MessageSquare,
  Plus,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, type Variants, type Transition } from "framer-motion";
import {
  ANALYSIS_CHAPTERS,
  RECENTLY_UPDATED_ISSUES,
  type AnalysisChapter,
  type AnalysisIssue,
  type IssueSeverity,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

// ─── helpers ─────────────────────────────────────────────────────────────────

function countBySeverity(chapters: AnalysisChapter[], s: IssueSeverity) {
  return chapters.flatMap((c) => c.issues).filter((i) => i.severity === s).length;
}

function SeverityPill({ s }: { s: IssueSeverity }) {
  if (s === "Critical")
    return (
      <span className="rounded-md border border-red-500/40 bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
        Critical
      </span>
    );
  if (s === "Warning")
    return (
      <span className="rounded-md border border-yellow-500/40 bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
        Warning
      </span>
    );
  return (
    <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
      Resolved
    </span>
  );
}

function SeverityDot({ s }: { s: IssueSeverity }) {
  const color =
    s === "Critical" ? "bg-red-400" : s === "Warning" ? "bg-yellow-400" : "bg-emerald-400";
  return <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

function issueIcon(issue: AnalysisIssue) {
  if (issue.imageId)
    return <PlaceholderImage seed={issue.imageId} className="h-8 w-8 rounded-md object-cover" />;
  if (issue.title.toLowerCase().includes("dialogue") || issue.title.toLowerCase().includes("mismatch"))
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-3/20">
        <MessageSquare className="h-4 w-4 text-ink/50" />
      </div>
    );
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-3/20">
      <AlertCircle className="h-4 w-4 text-ink/40" />
    </div>
  );
}

// ─── animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay: i * 0.07, ease: "easeOut" } as Transition,
  }),
};

const expandVariants: Variants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.32, ease: "easeOut" } as Transition,
  },
};

// ─── chapter accordion row ────────────────────────────────────────────────────

function ChapterRow({
  chapter,
  index,
  onIssueClick,
}: {
  chapter: AnalysisChapter;
  index: number;
  onIssueClick: (issueId: string) => void;
}) {
  const [open, setOpen] = useState(chapter.expanded ?? false);

  const critCount = chapter.issues.filter((i) => i.severity === "Critical").length;
  const warnCount = chapter.issues.filter((i) => i.severity === "Warning").length;
  const issueLabel = `${chapter.issues.length} ${chapter.issues.length === 1 ? "Issue" : "Issues"}`;
  const accentColor =
    critCount > 0 ? "text-red-400" : warnCount > 0 ? "text-yellow-400" : "text-emerald-400";

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="overflow-hidden rounded-xl border border-violet-3/20 bg-bg-1"
    >
      {/* accordion header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-violet-2/5"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-ink/40 transition-transform duration-300 ${open ? "rotate-90" : ""}`}
        />
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-2" />
        <span className="flex-1 text-ink">
          Chapter {chapter.number} · {chapter.title}
        </span>
        <span className={`text-sm font-medium ${accentColor}`}>{issueLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink/30 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* issue list */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            variants={expandVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden"
          >
            <div className="border-t border-violet-3/15">
              {chapter.issues.map((issue, iIdx) => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: iIdx * 0.06, duration: 0.28, ease: "easeOut" }}
                  className={`flex items-start gap-4 px-5 py-3.5 transition-colors hover:bg-violet-2/5 ${
                    iIdx < chapter.issues.length - 1 ? "border-b border-violet-3/10" : ""
                  }`}
                >
                  <SeverityDot s={issue.severity} />
                  {/* icon / thumbnail */}
                  <div className="shrink-0">{issueIcon(issue)}</div>

                  {/* text */}
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onIssueClick(issue.id)}
                      className="text-left text-sm text-ink transition-colors hover:text-violet-1"
                    >
                      {issue.title}
                    </button>
                    <p className="mt-0.5 text-xs text-ink/50">{issue.description}</p>
                  </div>

                  <SeverityPill s={issue.severity} />
                  <button
                    onClick={() => onIssueClick(issue.id)}
                    aria-label={`View ${issue.title}`}
                    className="shrink-0 text-ink/30 transition-colors hover:text-violet-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function Analysis() {
  const router = useRouter();

  const allIssues = ANALYSIS_CHAPTERS.flatMap((c) => c.issues);
  const totalIssues = allIssues.length;
  const criticalCount = countBySeverity(ANALYSIS_CHAPTERS, "Critical");
  const warningCount = countBySeverity(ANALYSIS_CHAPTERS, "Warning");
  const resolvedCount = countBySeverity(ANALYSIS_CHAPTERS, "Resolved");

  function handleIssueClick(issueId: string) {
    if (issueId === "visual-inconsistency") {
      router.push("/designer/audio-music/analysis/visual-consistency");
    } else {
      console.log("view issue", issueId);
    }
  }

  return (
    <div className="px-6 py-8 md:px-10">
      {/* ── header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-2/15">
            <Sparkles className="h-5 w-5 text-violet-2" />
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-wide text-violet-1">ANALYSIS</h1>
            <p className="mt-1 text-sm text-ink/60">
              AI scans your story and artwork to catch inconsistencies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-violet-3/30 bg-bg-1 px-3 py-2 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink">
            View: All Issues
            <ChevronDown className="h-3.5 w-3.5 text-ink/40" />
          </button>
          <button className="rounded-lg border border-violet-3/30 bg-bg-1 p-2 text-ink/60 transition-colors hover:text-ink">
            <LayoutList className="h-4 w-4" />
          </button>
          <button className="rounded-lg border border-violet-3/30 bg-bg-1 p-2 text-ink/60 transition-colors hover:text-ink">
            <Grid2X2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => console.log("add new")}
            className="flex items-center gap-1.5 rounded-lg bg-gold-2 px-4 py-2 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New
          </button>
        </div>
      </motion.div>

      {/* ── two-column layout ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_264px]">
        {/* LEFT */}
        <div className="flex flex-col gap-4">

          {/* stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, delay: 0.08, ease: "easeOut" }}
            className="grid grid-cols-2 gap-3 rounded-xl border border-violet-3/20 bg-bg-1 p-4 sm:grid-cols-4"
          >
            {[
              { label: "Total Issues", value: totalIssues, sub: "Across all chapters", icon: <AlertCircle className="h-5 w-5 text-ink/40" /> },
              { label: "Critical", value: criticalCount, sub: "Needs immediate attention", icon: <AlertCircle className="h-5 w-5 text-red-400" /> },
              { label: "Warnings", value: warningCount, sub: "Review recommended", icon: <AlertTriangle className="h-5 w-5 text-yellow-400" /> },
              { label: "Resolved", value: resolvedCount, sub: "Marked as resolved", icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" /> },
            ].map((stat) => (
              <div key={stat.label} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0">{stat.icon}</span>
                <div>
                  <p className="text-xs text-ink/50">{stat.label}</p>
                  <p className="font-display text-2xl text-ink">{stat.value}</p>
                  <p className="text-xs text-ink/40">{stat.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* chapter accordions */}
          <div className="flex flex-col gap-3">
            {ANALYSIS_CHAPTERS.map((chapter, i) => (
              <ChapterRow
                key={chapter.id}
                chapter={chapter}
                index={i + 1}
                onIssueClick={handleIssueClick}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — overview panel */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
          className="flex flex-col gap-4"
        >
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-2" />
              <p className="text-sm text-ink">Analysis Overview</p>
            </div>

            <p className="mt-4 text-xs text-ink/50">Total Issues</p>
            <p className="mt-0.5 font-display text-4xl text-ink">{totalIssues}</p>
            <p className="mt-0.5 text-xs text-ink/40">Across all chapters</p>

            <div className="mt-5 border-t border-violet-3/15 pt-4">
              <p className="mb-3 text-xs text-ink/50">By Severity</p>
              {[
                { label: "Critical",  count: criticalCount, dot: "bg-red-400" },
                { label: "Warnings",  count: warningCount,  dot: "bg-yellow-400" },
                { label: "Resolved",  count: resolvedCount, dot: "bg-emerald-400" },
              ].map((row) => (
                <div key={row.label} className="mb-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                  <span className="flex-1 text-sm text-ink/80">{row.label}</span>
                  <span className="text-sm text-ink/60">{row.count}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-violet-3/15 pt-4">
              <p className="mb-3 text-xs text-ink/50">Recently Updated</p>
              <div className="flex flex-col gap-3">
                {RECENTLY_UPDATED_ISSUES.map((entry, i) => (
                  <motion.div
                    key={entry.issueId}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.3, ease: "easeOut" }}
                    className="flex items-start gap-2.5"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-3/20">
                      {entry.imageId
                        ? <PlaceholderImage seed={entry.imageId} className="h-7 w-7 rounded-md" />
                        : <MessageSquare className="h-3.5 w-3.5 text-ink/40" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{entry.issueTitle}</p>
                      <p className="text-xs text-ink/40">{entry.chapterTitle}</p>
                    </div>
                    <span className="shrink-0 text-xs text-ink/40">{entry.timeAgo}</span>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => console.log("view all issues")}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-3/25 py-2 text-sm text-ink/60 transition-colors hover:border-violet-2/50 hover:text-ink"
              >
                View All Issues
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
