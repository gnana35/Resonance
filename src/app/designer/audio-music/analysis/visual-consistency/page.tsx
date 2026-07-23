"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  Grid2X2,
  LayoutList,
  Plus,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { motion, type Variants, type Transition } from "framer-motion";
import {
  VISUAL_ISSUES,
  VISUAL_CONSISTENCY_SCORE,
  VISUAL_CONSISTENCY_SCAN_DATE,
  VISUAL_CONSISTENCY_SCAN_BY,
  VISUAL_CONSISTENCY_DELTA,
  VISUAL_COMPARED_AGAINST,
  VISUAL_SCANNING_AGAINST,
  type IssueSeverity,
  type VisualIssue,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

// ─── helpers ─────────────────────────────────────────────────────────────────

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
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

function ScoreGauge({ score }: { score: number }) {
  const r = 52;
  const cx = 64;
  const cy = 64;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75;
  const filled = arcLength * (score / 100);
  const gap = arcLength - filled;

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-[135deg]">
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#1e1b35" strokeWidth="10"
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeLinecap="round"
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#a78bfa" strokeWidth="10"
          strokeDasharray={`${filled} ${gap + (circumference - arcLength)}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-3xl text-ink">{score}%</span>
        <span className="text-xs text-violet-2">Very Good</span>
      </div>
    </div>
  );
}

const FILTERS = ["All Issues", "Critical", "Warnings", "Resolved"] as const;
type Filter = (typeof FILTERS)[number];

// ─── animation variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay: i * 0.07, ease: "easeOut" } as Transition,
  }),
};

const rowVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, delay: i * 0.055, ease: "easeOut" } as Transition,
  }),
};

// ─── compact issue row (list in the main panel) ───────────────────────────────

function IssueRow({
  issue,
  index,
  isActive,
  onClick,
}: {
  issue: VisualIssue;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.tr
      custom={index}
      variants={rowVariant}
      initial="hidden"
      animate="visible"
      onClick={onClick}
      className={`group cursor-pointer border-b border-violet-3/10 transition-colors last:border-0 ${
        isActive ? "bg-violet-2/10" : "hover:bg-violet-2/5"
      }`}
    >
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <SeverityDot s={issue.severity} />
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-3/20">
            <PlaceholderImage seed={issue.id + "-icon"} className="h-8 w-8 rounded-lg" />
          </div>
          <div>
            <p className={`text-sm ${isActive ? "text-violet-1" : "text-ink"}`}>{issue.title}</p>
            <p className="text-xs text-ink/45">{issue.category}</p>
          </div>
        </div>
      </td>
      <td className="max-w-[140px] px-4 py-3.5 hidden lg:table-cell">
        <p className="text-xs leading-relaxed text-ink/60">{issue.description}</p>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          {issue.colorDrift ? (
            <div className="flex items-center gap-1.5">
              <span className="h-6 w-8 rounded-sm border border-violet-3/20" style={{ background: issue.colorDrift.refHex }} />
              <ArrowRight className="h-3 w-3 text-ink/30" />
              <span className="h-6 w-8 rounded-sm border border-violet-3/20" style={{ background: issue.colorDrift.newHex }} />
              <span className="text-xs text-ink/50">{issue.colorDrift.diff}</span>
            </div>
          ) : issue.scaleDrift ? (
            <div className="flex items-center gap-2 text-xs text-ink/60">
              <span>{issue.scaleDrift.prev}</span>
              <ArrowRight className="h-3 w-3 text-ink/30" />
              <span>{issue.scaleDrift.current}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <PlaceholderImage seed={issue.approvedSeed} className="h-8 w-12 rounded object-cover" />
              <ArrowRight className="h-3 w-3 text-ink/30" />
              <PlaceholderImage seed={issue.newSeed} className="h-8 w-12 rounded object-cover" />
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5">
        <SeverityPill s={issue.severity} />
      </td>
      <td className="px-3 py-3.5">
        <ArrowRight className="h-4 w-4 text-ink/30 transition-colors group-hover:text-violet-2" />
      </td>
    </motion.tr>
  );
}

// ─── detail panel ────────────────────────────────────────────────────────────

function IssueDetailPanel({ issue }: { issue: VisualIssue }) {
  return (
    <motion.div
      key={issue.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5"
    >
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-3/20">
            <PlaceholderImage seed={issue.id + "-icon"} className="h-9 w-9 rounded-lg" />
          </div>
          <div>
            <p className="font-medium text-ink">{issue.title}</p>
            <p className="text-xs text-ink/50">{issue.category}</p>
          </div>
        </div>
        <SeverityPill s={issue.severity} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink/60">{issue.description}</p>

      {/* images */}
      <div className="mt-5">
        {issue.colorDrift ? (
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[10px] text-ink/40">{issue.approvedLabel}</p>
              <span
                className="h-12 w-20 rounded-lg border border-violet-3/20"
                style={{ background: issue.colorDrift.refHex }}
              />
              <p className="text-xs font-medium text-ink">{issue.colorDrift.refName}</p>
              <p className="text-[10px] text-ink/40">{issue.colorDrift.refHex}</p>
            </div>
            <div className="mt-6 flex flex-col items-center">
              <ArrowRight className="h-4 w-4 text-ink/30" />
              <p className="mt-1 text-xs text-ink/50">Difference</p>
              <p className="text-sm font-bold text-ink">{issue.colorDrift.diff}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[10px] text-ink/40">{issue.newLabel}</p>
              <span
                className="h-12 w-20 rounded-lg border border-violet-3/20"
                style={{ background: issue.colorDrift.newHex }}
              />
              <p className="text-xs font-medium text-ink">{issue.colorDrift.newName}</p>
              <p className="text-[10px] text-ink/40">{issue.colorDrift.newHex}</p>
            </div>
          </div>
        ) : issue.scaleDrift ? (
          <div className="flex items-end gap-5">
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[10px] text-ink/40">{issue.approvedLabel}</p>
              <PlaceholderImage seed={issue.approvedSeed} className="h-24 w-14 rounded-lg object-cover" />
              <p className="text-xs font-bold text-ink">{issue.scaleDrift.prev}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[10px] text-ink/40">{issue.newLabel}</p>
              <PlaceholderImage seed={issue.newSeed} className="h-16 w-14 rounded-lg object-cover" />
              <p className="text-xs font-bold text-ink">{issue.scaleDrift.current}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="text-[10px] text-ink/40">{issue.approvedLabel}</p>
              <PlaceholderImage seed={issue.approvedSeed} className="h-28 w-full rounded-lg object-cover" />
            </div>
            <ArrowRight className="mt-10 h-4 w-4 shrink-0 text-ink/30" />
            <div className="flex flex-1 flex-col gap-1.5">
              <p className="text-[10px] text-ink/40">{issue.newLabel}</p>
              <PlaceholderImage seed={issue.newSeed} className="h-28 w-full rounded-lg object-cover" />
            </div>
          </div>
        )}
      </div>

      {/* AI Recommendation */}
      {issue.aiRecommendation && (
        <div className="mt-5 rounded-xl border border-violet-3/25 bg-violet-2/5 p-3.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-2" />
            <p className="text-xs font-medium text-violet-2">AI Recommendation</p>
          </div>
          <p className="text-xs leading-relaxed text-ink/65">{issue.aiRecommendation}</p>
        </div>
      )}

      {/* actions */}
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => console.log("mark resolved", issue.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Mark Resolved
        </button>
        <button
          onClick={() => console.log("flag for review", issue.id)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-violet-3/30 bg-bg-0 py-2 text-xs font-medium text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          Flag for Review
        </button>
      </div>
    </motion.div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function VisualConsistency() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("All Issues");
  const [activeId, setActiveId] = useState<string>("hair-length");

  const criticalCount = VISUAL_ISSUES.filter((i) => i.severity === "Critical").length;
  const warningCount = VISUAL_ISSUES.filter((i) => i.severity === "Warning").length;
  const resolvedCount = VISUAL_ISSUES.filter((i) => i.severity === "Resolved").length;
  const totalCount = VISUAL_ISSUES.length;

  const filteredIssues =
    filter === "All Issues"
      ? VISUAL_ISSUES
      : filter === "Critical"
        ? VISUAL_ISSUES.filter((i) => i.severity === "Critical")
        : filter === "Warnings"
          ? VISUAL_ISSUES.filter((i) => i.severity === "Warning")
          : VISUAL_ISSUES.filter((i) => i.severity === "Resolved");

  const activeIssue = VISUAL_ISSUES.find((i) => i.id === activeId) ?? VISUAL_ISSUES[0];

  // use useState at component level
  const [showDetail, setShowDetail] = useState(true);

  return (
    <div className="px-6 py-8 md:px-10">
      {/* ── header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          {/* back button */}
          <button
            onClick={() => router.back()}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-3/30 bg-bg-1 text-ink/60 transition-colors hover:border-violet-2/50 hover:text-ink"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-2/15">
              <Shield className="h-5 w-5 text-violet-2" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-widest text-violet-2/80 uppercase">
                Analysis
              </p>
              <h1 className="font-display text-2xl tracking-wide text-ink">Visual Consistency</h1>
              <p className="mt-0.5 max-w-sm text-sm text-ink/55">
                AI compares your new artwork against previously approved artwork to ensure visual
                consistency across your project.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-violet-3/30 bg-bg-1 px-3 py-2 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink">
            View: {filter}
            <ChevronDown className="h-3.5 w-3.5 text-ink/40" />
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-bg-1 border border-violet-3/30 p-2 text-ink/60 transition-colors hover:text-ink">
            <LayoutList className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-1.5 rounded-lg bg-bg-1 border border-violet-3/30 p-2 text-ink/60 transition-colors hover:text-ink">
            <Grid2X2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => console.log("add new")}
            className="flex items-center gap-1.5 rounded-lg bg-violet-2 px-4 py-2 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New
          </button>
        </div>
      </motion.div>

      {/* ── three-column layout (issues list | detail | right panel) ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px_256px]">

        {/* ── MAIN: scanning banner + issues table ── */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* scanning banner */}
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" animate="visible"
            className="rounded-xl border border-violet-3/25 bg-bg-1 px-5 py-4"
          >
            <div className="flex flex-wrap items-center gap-6">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-violet-2/30">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#a78bfa" strokeWidth="4"
                    strokeDasharray="80 100" strokeLinecap="round" />
                </svg>
                <span className="text-[10px] font-bold text-violet-2">78%</span>
              </div>
              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <p className="text-sm font-medium text-ink">Scanning Artwork…</p>
                <p className="text-xs text-ink/50">Scanning Character: Kael</p>
                <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-bg-0">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "78%" }}
                    transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    className="h-full rounded-full bg-violet-2"
                  />
                </div>
              </div>
              <div className="shrink-0">
                <p className="mb-1.5 text-xs text-ink/40">Comparing against:</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  {VISUAL_SCANNING_AGAINST.map((item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                      <span className="text-xs text-ink/70">{item}</span>
                    </div>
                  ))}
                  <span className="text-xs text-ink/40">… and 8 more</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* issues table */}
          <motion.div
            custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="overflow-hidden rounded-xl border border-violet-3/20 bg-bg-1"
          >
            <div className="flex items-center justify-between border-b border-violet-3/15 px-4 py-3">
              <p className="text-sm font-medium text-ink">
                Issues Found{" "}
                <span className="ml-1 rounded-full bg-violet-2/15 px-2 py-0.5 text-xs text-violet-2">
                  {totalCount}
                </span>
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-ink/40">Sort by: Severity</span>
                <ChevronDown className="h-3.5 w-3.5 text-ink/30" />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto border-b border-violet-3/10 px-4 py-2.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 rounded-full px-3.5 py-1 text-xs transition-colors ${
                    filter === f ? "bg-violet-2 text-bg-0" : "bg-bg-0 text-ink/60 hover:text-ink"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {filteredIssues.map((issue, i) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      index={i}
                      isActive={issue.id === activeId}
                      onClick={() => { setActiveId(issue.id); setShowDetail(true); }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* ── DETAIL PANEL ── */}
        <div className="flex flex-col gap-4">
          {showDetail && activeIssue && (
            <IssueDetailPanel issue={activeIssue} />
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
          className="flex flex-col gap-4"
        >
          {/* score */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-sm text-ink">Visual Consistency Score</p>
            <div className="mt-4 flex justify-center">
              <ScoreGauge score={VISUAL_CONSISTENCY_SCORE} />
            </div>
            <p className="mt-3 text-center text-xs text-emerald-400">
              ▲ {VISUAL_CONSISTENCY_DELTA}
            </p>
          </div>

          {/* issues overview */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="mb-3 text-sm text-ink">Issues Overview</p>
            <div className="flex flex-col gap-2">
              {[
                { label: "Critical", count: criticalCount, dot: "bg-red-400" },
                { label: "Warnings", count: warningCount, dot: "bg-yellow-400" },
                { label: "Resolved", count: resolvedCount, dot: "bg-emerald-400" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${row.dot}`} />
                  <span className="flex-1 text-sm text-ink/80">{row.label}</span>
                  <span className="text-sm text-ink/60">{row.count}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-violet-3/15 pt-2">
                <span className="text-sm text-ink/80">Total</span>
                <span className="text-sm text-ink/60">{totalCount}</span>
              </div>
            </div>
          </div>

          {/* compared against */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="mb-3 text-sm text-ink">Compared Against</p>
            <div className="flex flex-col gap-2">
              {VISUAL_COMPARED_AGAINST.map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-ink/40" />
                  <span className="text-sm text-ink/70">{item}</span>
                </div>
              ))}
              <p className="mt-1 text-xs text-ink/40">… and 8 more</p>
            </div>
          </div>

          {/* last scan */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="mb-3 text-sm text-ink">Last Scan</p>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/40" />
                <span className="text-sm text-ink/70">{VISUAL_CONSISTENCY_SCAN_DATE}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 shrink-0 text-ink/40" />
                <span className="text-sm text-ink/70">By {VISUAL_CONSISTENCY_SCAN_BY}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
