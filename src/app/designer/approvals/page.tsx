"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Map as MapIcon,
  Mountain,
  Package,
  PenTool,
  RotateCcw,
  Search,
  ShieldCheck,
  Sword,
  User,
  XCircle,
} from "lucide-react";
import {
  RECENT_ACTIVITY,
  SUBMISSIONS,
  type SubmissionStatus,
  type SubmissionType,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

const STATUS_TABS = [
  "All Submissions",
  "Pending",
  "Approved",
  "Rejected",
  "Needs Changes",
  "Draft",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

const STATUS_STYLES: Record<
  SubmissionStatus,
  { badge: string; icon: typeof Clock }
> = {
  Pending: { badge: "bg-amber-500/15 text-amber-300", icon: Clock },
  Approved: { badge: "bg-emerald-500/15 text-emerald-300", icon: CheckCircle2 },
  Rejected: { badge: "bg-red-500/15 text-red-300", icon: XCircle },
  "Needs Changes": {
    badge: "bg-violet-500/15 text-violet-300",
    icon: RotateCcw,
  },
  Draft: { badge: "bg-ink/10 text-ink/60", icon: Circle },
};

const TYPE_ICONS: Record<SubmissionType, typeof PenTool> = {
  "Concept Art": PenTool,
  Weapon: Sword,
  Character: User,
  Map: MapIcon,
  Prop: Package,
  Environment: Mountain,
};

const FILTERS = [
  { label: "Type", value: "All Types" },
  { label: "Status", value: "All Statuses" },
  { label: "Submitted By", value: "All Members" },
  { label: "Date Range", value: "All Time" },
];

const ACTIVITY_STYLES: Record<string, { verb: string; color: string; icon: typeof CheckCircle2 }> = {
  approved: { verb: "approved", color: "text-emerald-400", icon: CheckCircle2 },
  rejected: { verb: "rejected", color: "text-red-400", icon: XCircle },
  "requested changes": {
    verb: "requested changes on",
    color: "text-violet-300",
    icon: RotateCcw,
  },
};

export default function Approvals() {
  const [tab, setTab] = useState<StatusTab>("All Submissions");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const base: Record<StatusTab, number> = {
      "All Submissions": SUBMISSIONS.length,
      Pending: 0,
      Approved: 0,
      Rejected: 0,
      "Needs Changes": 0,
      Draft: 0,
    };
    for (const s of SUBMISSIONS) base[s.status] += 1;
    return base;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SUBMISSIONS.filter((s) => {
      const matchesTab = tab === "All Submissions" || s.status === tab;
      const matchesQuery =
        q.length === 0 || s.title.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [tab, query]);

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-1 h-5 w-5 text-violet-2" />
        <div>
          <h1 className="font-display text-2xl text-violet-1">Approvals</h1>
          <p className="mt-1 text-ink/70">
            Review and approve creative submissions. Communicate feedback
            clearly and keep the project moving.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab === t
                ? "bg-violet-2 text-bg-0"
                : "bg-bg-1 text-ink/70 hover:text-ink"
            }`}
          >
            {t}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                tab === t ? "bg-bg-0/20" : "bg-violet-2/15 text-violet-2"
              }`}
            >
              {counts[t]}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search submissions..."
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink/40 focus:outline-none"
          />
        </div>
        <button
          onClick={() => console.log("open filter")}
          className="flex items-center gap-2 rounded-lg border border-violet-3/25 px-4 py-2.5 text-sm text-ink hover:border-violet-2/50"
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {filtered.length === 0 ? (
            <p className="mt-8 text-center text-sm text-ink/50">
              No submissions match this view.
            </p>
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
                  <PlaceholderImage
                    seed={submission.id}
                    className="h-20 w-28 shrink-0 rounded-lg"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-ink">{submission.title}</p>
                    <p className="mt-1 text-sm text-ink/50">
                      {submission.description}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-2/10 px-2.5 py-1 text-xs text-violet-2">
                      <TypeIcon className="h-3 w-3" />
                      {submission.type}
                    </span>
                  </div>

                  <div className="shrink-0 text-sm text-ink/60 sm:w-36">
                    {submission.submittedBy}
                  </div>

                  <div className="shrink-0 text-sm text-ink/60 sm:w-36">
                    {submission.date}
                  </div>

                  <div className="shrink-0 sm:w-44">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${statusStyle.badge}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {submission.status}
                    </span>
                    <p className="mt-1 text-xs text-ink/40">
                      {submission.notes}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Approval Workflow</p>
            <p className="mt-1 text-sm text-ink/50">
              Track the progress of submissions through the review pipeline.
            </p>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Submitted</span>
                <span className="text-ink">{SUBMISSIONS.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Pending Review</span>
                <span className="text-amber-300">{counts.Pending}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/70">Needs Changes</span>
                <span className="text-violet-300">
                  {counts["Needs Changes"]}
                </span>
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
            <div className="mt-3 flex flex-col gap-3">
              {FILTERS.map((filter) => (
                <div key={filter.label}>
                  <p className="text-sm text-ink/60">{filter.label}</p>
                  <button
                    onClick={() => console.log("open filter", filter.label)}
                    className="mt-1.5 w-full rounded-md border border-violet-3/30 px-3 py-2 text-left text-sm text-ink hover:border-violet-2/50"
                  >
                    {filter.value}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Recent Activity</p>
            <div className="mt-3 flex flex-col gap-4">
              {RECENT_ACTIVITY.map((event) => {
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
                        <span className="text-ink/80">
                          {event.submissionTitle}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink/40">
                        {event.timeAgo}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
