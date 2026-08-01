"use client";

/**
 * ApprovalsPanel
 *
 * The designer's review dashboard. Every row here is a REAL asset the designer
 * created in the Sketchpad — its status is driven by what actually happened:
 *
 *   Draft         → saved but not yet shared with the writer
 *   Pending       → shared, awaiting the writer's decision
 *   Approved      → the writer accepted it
 *   Needs Changes → the writer requested changes (see the Discussion thread)
 *   Rejected      → the writer rejected it
 *
 * Recent Activity is built from the real design-feedback conversation, so it
 * reflects the writer's actual approvals, rejections and change requests.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronDown,
  PenTool,
  RotateCcw,
  Search,
  User,
  XCircle,
} from "lucide-react";
import {
  subscribeAssets,
  subscribeAssetChat,
  formatAssetDate,
  type AssetRecord,
  type DesignFeedbackMsg,
} from "@/lib/assets";
import { PlaceholderImage } from "@/components/PlaceholderImage";

/* ─── local types ────────────────────────────────────────────────────────── */

type SubmissionStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Needs Changes"
  | "Draft";

type SubmissionType = "Concept Art" | "Character";

type Submission = {
  id: string;
  title: string;
  description: string;
  type: SubmissionType;
  previewUrl: string | null;
  status: SubmissionStatus;
  submittedAt: number;
  notes: string;
};

/* ─── constants ──────────────────────────────────────────────────────────── */

const STATUS_TABS = [
  "All Submissions",
  "Pending",
  "Approved",
  "Rejected",
  "Needs Changes",
  "Draft",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_STYLES: Record<SubmissionStatus, { badge: string; icon: typeof Clock }> = {
  Pending: { badge: "bg-amber-500/15 text-amber-300", icon: Clock },
  Approved: { badge: "bg-emerald-500/15 text-emerald-300", icon: CheckCircle2 },
  Rejected: { badge: "bg-red-500/15 text-red-300", icon: XCircle },
  "Needs Changes": { badge: "bg-violet-500/15 text-violet-300", icon: RotateCcw },
  Draft: { badge: "bg-ink/10 text-ink/60", icon: Circle },
};

const TYPE_ICONS: Record<SubmissionType, typeof PenTool> = {
  "Concept Art": PenTool,
  Character: User,
};

const ALL_TYPES: Array<"All Types" | SubmissionType> = ["All Types", "Concept Art", "Character"];

const ALL_DATE_RANGES = ["All Time", "Last 7 Days", "Last 30 Days", "Last 90 Days"] as const;
type DateRange = (typeof ALL_DATE_RANGES)[number];

const ACTIVITY_STYLES: Record<string, { verb: string; color: string; icon: typeof CheckCircle2 }> = {
  approved: { verb: "approved", color: "text-emerald-400", icon: CheckCircle2 },
  rejected: { verb: "rejected", color: "text-red-400", icon: XCircle },
  "requested changes": { verb: "requested changes on", color: "text-violet-300", icon: RotateCcw },
};

/* ─── derivations ────────────────────────────────────────────────────────── */

function deriveStatus(a: AssetRecord): SubmissionStatus {
  if (a.shareStatus !== "shared") return "Draft";
  switch (a.validationStatus) {
    case "approved":       return "Approved";
    case "rejected":       return "Rejected";
    case "needs_revision": return "Needs Changes";
    default:               return "Pending";
  }
}

function deriveNotes(a: AssetRecord, status: SubmissionStatus): string {
  switch (status) {
    case "Draft":         return "Not shared yet";
    case "Pending":       return "Waiting for the writer's review";
    case "Approved":      return "Approved by the writer";
    case "Rejected":      return "Rejected — see discussion";
    case "Needs Changes": return "Changes requested — see discussion";
  }
}

/* ─── FilterDropdown ─────────────────────────────────────────────────────── */

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div ref={ref} className="relative">
      <p className="text-sm text-ink/60">{label}</p>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 flex w-full items-center justify-between rounded-md border border-violet-3/30 px-3 py-2 text-left text-sm text-ink hover:border-violet-2/50"
      >
        {value}
        <ChevronDown className={`h-3.5 w-3.5 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-violet-3/30 bg-bg-0 py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-violet-2/10 ${
                value === opt ? "text-violet-1" : "text-ink/80"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── ApprovalsPanel ─────────────────────────────────────────────────────── */

export function ApprovalsPanel() {
  const [tab, setTab] = useState<StatusTab>("All Submissions");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All Types" | SubmissionType>("All Types");
  const [dateFilter, setDateFilter] = useState<DateRange>("All Time");

  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [feedback, setFeedback] = useState<DesignFeedbackMsg[]>([]);

  useEffect(() => subscribeAssets((rows) => setAssets(rows)), []);
  useEffect(() => subscribeAssetChat((rows) => setFeedback(rows)), []);

  // Only designs the designer created are "submissions".
  const submissions: Submission[] = useMemo(
    () =>
      assets
        .filter((a) => a.source === "created")
        .map((a) => {
          const status = deriveStatus(a);
          return {
            id: a.id,
            title: a.name,
            description: a.description ?? "No description added.",
            type: (a.characterId ? "Character" : "Concept Art") as SubmissionType,
            previewUrl: a.previewUrl,
            status,
            submittedAt: a.updatedAt,
            notes: deriveNotes(a, status),
          };
        })
        .sort((x, y) => y.submittedAt - x.submittedAt),
    [assets],
  );

  const counts = useMemo(() => {
    const base: Record<StatusTab, number> = {
      "All Submissions": submissions.length,
      Pending: 0, Approved: 0, Rejected: 0, "Needs Changes": 0, Draft: 0,
    };
    for (const s of submissions) base[s.status] += 1;
    return base;
  }, [submissions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dayLimit =
      dateFilter === "Last 7 Days" ? 7
      : dateFilter === "Last 30 Days" ? 30
      : dateFilter === "Last 90 Days" ? 90
      : Infinity;
    return submissions.filter((s) => {
      const matchesTab = tab === "All Submissions" || s.status === tab;
      const matchesQuery = q.length === 0 || s.title.toLowerCase().includes(q);
      const matchesType = typeFilter === "All Types" || s.type === typeFilter;
      const matchesDate = daysSince(s.submittedAt) <= dayLimit;
      return matchesTab && matchesQuery && matchesType && matchesDate;
    });
  }, [submissions, tab, query, typeFilter, dateFilter]);

  // Recent activity from the real conversation — the writer's decisions.
  const recentActivity = useMemo(
    () =>
      feedback
        .filter((m) => m.kind === "approve" || m.kind === "reject" || m.kind === "revision")
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6)
        .map((m) => ({
          id: m.id,
          actor: m.from === "writer" ? "Writer" : "Designer",
          action:
            m.kind === "approve" ? "approved"
            : m.kind === "reject" ? "rejected"
            : "requested changes",
          submissionTitle: m.assetName,
          timeAgo: relTime(m.createdAt),
        })),
    [feedback],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab === t ? "bg-violet-2 text-bg-0" : "bg-bg-1 text-ink/70 hover:text-ink"
            }`}
          >
            {t}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t ? "bg-bg-0/20" : "bg-violet-2/15 text-violet-2"}`}>
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + clear */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search submissions..."
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
          />
        </div>
        {(typeFilter !== "All Types" || dateFilter !== "All Time") && (
          <button
            onClick={() => { setTypeFilter("All Types"); setDateFilter("All Time"); }}
            className="flex items-center gap-2 rounded-lg border border-violet-3/25 px-4 py-2.5 text-sm text-violet-2 hover:border-violet-2/50"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main grid: list + sidebar */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {submissions.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-violet-3/25 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-3/30 bg-bg-1">
                <PenTool className="h-5 w-5 text-violet-3/60" />
              </div>
              <div>
                <p className="text-ink/70">No submissions yet</p>
                <p className="mt-1 max-w-xs text-sm text-ink/40">
                  Save a design in the Sketchpad and share it with the writer to start tracking approvals here.
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <p className="mt-8 text-center text-sm text-ink/50">No submissions match this view.</p>
          ) : (
            filtered.map((submission) => {
              const TypeIcon = TYPE_ICONS[submission.type];
              const statusStyle = STATUS_STYLES[submission.status];
              const StatusIcon = statusStyle.icon;
              return (
                <div
                  key={submission.id}
                  className="flex flex-col gap-4 rounded-xl border border-violet-3/25 bg-bg-1 p-4 sm:flex-row sm:items-center"
                >
                  {submission.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={submission.previewUrl}
                      alt={submission.title}
                      className="h-20 w-28 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <PlaceholderImage seed={submission.id} className="h-20 w-28 shrink-0 rounded-lg" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-ink">{submission.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink/50">{submission.description}</p>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-2/10 px-2.5 py-1 text-xs text-violet-2">
                      <TypeIcon className="h-3 w-3" />
                      {submission.type}
                    </span>
                  </div>
                  <div className="shrink-0 text-sm text-ink/60 sm:w-36">
                    {formatAssetDate(submission.submittedAt)}
                  </div>
                  <div className="shrink-0 sm:w-44">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${statusStyle.badge}`}>
                      <StatusIcon className="h-3 w-3" />
                      {submission.status}
                    </span>
                    <p className="mt-1 text-xs text-ink/40">{submission.notes}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Approval Workflow</p>
            <p className="mt-1 text-sm text-ink/50">
              Track the progress of your designs through the writer&rsquo;s review.
            </p>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Submitted</span>
                <span className="text-ink">{submissions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Pending Review</span>
                <span className="text-amber-300">{counts.Pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Needs Changes</span>
                <span className="text-violet-300">{counts["Needs Changes"]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Approved</span>
                <span className="text-emerald-300">{counts.Approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Rejected</span>
                <span className="text-red-300">{counts.Rejected}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Filters</p>
            <div className="mt-3 flex flex-col gap-4">
              <FilterDropdown
                label="Type"
                options={ALL_TYPES}
                value={typeFilter}
                onChange={(v) => setTypeFilter(v as typeof typeFilter)}
              />
              <FilterDropdown
                label="Date Range"
                options={[...ALL_DATE_RANGES]}
                value={dateFilter}
                onChange={(v) => setDateFilter(v as DateRange)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Recent Activity</p>
            {recentActivity.length === 0 ? (
              <p className="mt-3 text-sm text-ink/40">
                No activity yet. The writer&rsquo;s approvals and change requests will show up here.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {recentActivity.map((event) => {
                  const style = ACTIVITY_STYLES[event.action];
                  const Icon = style.icon;
                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-2/15 text-violet-1">
                        <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                      </div>
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="text-ink">
                          <span className="text-violet-1">{event.actor}</span>{" "}
                          {style.verb}{" "}
                          <span className="text-ink/80">{event.submissionTitle}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-ink/40">{event.timeAgo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

function daysSince(ts: number): number {
  return (Date.now() - ts) / 86400000;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}
