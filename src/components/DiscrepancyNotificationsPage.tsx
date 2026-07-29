"use client";

/**
 * DiscrepancyNotificationsPage
 *
 * The shared consistency & notification UI for both the writer and designer.
 *
 * Writer role:  sees Pending / Approved / Rejected / All tabs, plus the
 *               side-by-side detail view and Approve / Reject buttons.
 * Designer role: sees the same cards and detail view, but no decision
 *                buttons. Sees the outcome once decided, and revision
 *                requests with the writer's note.
 *
 * This component reads from ConsistencyContext so all data is real.
 * No hardcoded examples.
 */

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GitBranch,
  Minus,
  PenTool,
  Plus,
  X,
  XCircle,
} from "lucide-react";
import { useConsistency } from "@/context/ConsistencyContext";
import type { Discrepancy } from "@/data/consistency";

/* ═════════════════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════════════════ */

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function humanAttribute(attr: string): string {
  return attr
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanSubject(subject: string): string {
  return subject
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function kindLabel(kind: Discrepancy["kind"]): string {
  if (kind === "contradiction") return "Contradiction";
  if (kind === "addition") return "Design Addition";
  return "Omission";
}

function kindColor(kind: Discrepancy["kind"]): string {
  if (kind === "contradiction") return "text-amber-400";
  if (kind === "addition") return "text-violet-2";
  return "text-sky-400";
}

function kindBg(kind: Discrepancy["kind"]): string {
  if (kind === "contradiction") return "bg-amber-500/10 border-amber-500/20";
  if (kind === "addition") return "bg-violet-2/10 border-violet-2/20";
  return "bg-sky-500/10 border-sky-500/20";
}

function statusBadge(status: Discrepancy["status"]) {
  switch (status) {
    case "pending":   return { label: "Pending",  bg: "bg-amber-500/15 text-amber-300",    icon: Clock };
    case "approved":  return { label: "Approved", bg: "bg-emerald-500/15 text-emerald-300", icon: CheckCircle2 };
    case "rejected":  return { label: "Rejected", bg: "bg-red-500/15 text-red-300",         icon: XCircle };
    case "stale":     return { label: "Stale",    bg: "bg-ink/10 text-ink/50",             icon: Minus };
  }
}

/* ═════════════════════════════════════════════════════════════════════════
   FILTER TABS
   ═════════════════════════════════════════════════════════════════════════ */

type FilterTab = "Pending" | "Approved" | "Rejected" | "All";

const TABS: FilterTab[] = ["Pending", "Approved", "Rejected", "All"];

function tabCount(discrepancies: Discrepancy[], tab: FilterTab): number {
  if (tab === "All") return discrepancies.filter((d) => d.status !== "stale").length;
  return discrepancies.filter((d) => d.status === tab.toLowerCase()).length;
}

/* ═════════════════════════════════════════════════════════════════════════
   DETAIL PANEL — side-by-side view
   ═════════════════════════════════════════════════════════════════════════ */

function DetailPanel({
  disc,
  role,
  onApprove,
  onReject,
  onClose,
  chapters,
}: {
  disc: Discrepancy;
  role: "writer" | "designer";
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
  onClose: () => void;
  chapters: Array<{ id: string; title: string }>;
}) {
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const badge = statusBadge(disc.status);
  const BadgeIcon = badge.icon;
  const chapterTitle = chapters.find((c) => c.id === disc.manuscriptRef)?.title ?? disc.manuscriptRef;

  function handleApprove() {
    if (confirming === "approve") {
      onApprove(disc.id, note);
      setConfirming(null);
    } else {
      setConfirming("approve");
    }
  }
  function handleReject() {
    if (confirming === "reject") {
      onReject(disc.id, note);
      setConfirming(null);
    } else {
      setConfirming("reject");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm p-4"
         onClick={onClose}>
      <div
        className="relative mx-auto w-full max-w-4xl rounded-2xl border border-violet-3/30 bg-bg-1 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-violet-3/20 px-6 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${kindBg(disc.kind)} ${kindColor(disc.kind)}`}>
                {kindLabel(disc.kind)}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.bg}`}>
                <BadgeIcon className="h-3 w-3" />
                {badge.label}
              </span>
            </div>
            <h2 className="mt-2 font-display text-xl text-ink">
              {humanSubject(disc.subject)} — {humanAttribute(disc.attribute)}
            </h2>
            <p className="mt-0.5 text-xs text-ink/50">
              Detected {timeAgo(disc.createdAt)}
              {disc.supersededDecisionId && (
                <span className="ml-2 text-amber-400/80">
                  · Re-raised — previous decision linked
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-ink/40 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Side-by-side content */}
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          {/* Manuscript side */}
          <div className="border-b border-violet-3/20 p-6 md:border-b-0 md:border-r">
            <div className="mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gold-2" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gold-2">Manuscript</span>
            </div>
            {disc.manuscriptValue ? (
              <>
                <div className="rounded-lg border border-gold-3/25 bg-bg-0 px-4 py-3">
                  <p className="text-sm text-ink">
                    <span className="text-ink/50 text-xs">{humanAttribute(disc.attribute)}: </span>
                    <span className="font-medium text-gold-1">{disc.manuscriptValue}</span>
                  </p>
                </div>
                {disc.manuscriptRef && (
                  <div className="mt-3">
                    <p className="text-[11px] text-ink/40 mb-1">From chapter:</p>
                    <Link
                      href={`/writer?chapter=${disc.manuscriptRef}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-gold-2/10 px-3 py-1.5 text-xs text-gold-2 hover:bg-gold-2/20 transition-colors"
                    >
                      <FileText className="h-3 w-3" />
                      {chapterTitle || disc.manuscriptRef}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-gold-3/25 bg-bg-0 px-4 py-3">
                <p className="text-xs text-ink/40 italic">Not established in manuscript</p>
              </div>
            )}
          </div>

          {/* Design side */}
          <div className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <PenTool className="h-4 w-4 text-violet-2" />
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-2">Design</span>
            </div>
            {disc.designValue ? (
              <>
                <div className="rounded-lg border border-violet-3/25 bg-bg-0 px-4 py-3">
                  <p className="text-sm text-ink">
                    <span className="text-ink/50 text-xs">{humanAttribute(disc.attribute)}: </span>
                    <span className="font-medium text-violet-1">{disc.designValue}</span>
                  </p>
                </div>
                {disc.designRef && (
                  <div className="mt-3">
                    <p className="text-[11px] text-ink/40 mb-1">From design:</p>
                    <Link
                      href={`/designer?design=${disc.designRef}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-violet-2/10 px-3 py-1.5 text-xs text-violet-2 hover:bg-violet-2/20 transition-colors"
                    >
                      <PenTool className="h-3 w-3" />
                      {disc.designRef}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-violet-3/25 bg-bg-0 px-4 py-3">
                <p className="text-xs text-ink/40 italic">Not depicted in design</p>
              </div>
            )}
          </div>
        </div>

        {/* What specifically differs */}
        <div className="border-t border-violet-3/20 px-6 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">What differs</p>
          <p className="text-sm text-ink/80">
            {disc.kind === "contradiction" && (
              <>The {humanAttribute(disc.attribute)} of {humanSubject(disc.subject)} is{" "}
                <span className="text-gold-1 font-medium">&quot;{disc.manuscriptValue}&quot;</span> in
                the manuscript but{" "}
                <span className="text-violet-1 font-medium">&quot;{disc.designValue}&quot;</span> in
                the design.</>
            )}
            {disc.kind === "addition" && (
              <>The design depicts {humanSubject(disc.subject)}&apos;s {humanAttribute(disc.attribute)} as{" "}
                <span className="text-violet-1 font-medium">&quot;{disc.designValue}&quot;</span>, but
                the manuscript does not yet establish this detail.</>
            )}
            {disc.kind === "omission" && (
              <>The manuscript establishes {humanSubject(disc.subject)}&apos;s {humanAttribute(disc.attribute)} as{" "}
                <span className="text-gold-1 font-medium">&quot;{disc.manuscriptValue}&quot;</span>, but
                the design does not reflect this.</>
            )}
          </p>
        </div>

        {/* Decision outcome (if decided) */}
        {disc.status !== "pending" && disc.status !== "stale" && (
          <div className="border-t border-violet-3/20 bg-bg-0/50 px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40 mb-2">Decision</p>
            <div className="flex items-start gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg}`}>
                <BadgeIcon className="h-3 w-3" />
                {badge.label}
              </span>
              <div className="text-sm text-ink/70">
                {disc.decidedBy && <span>By {disc.decidedBy}</span>}
                {disc.decidedAt && <span className="ml-2 text-ink/40">{timeAgo(disc.decidedAt)}</span>}
                {disc.decisionNote && (
                  <p className="mt-1 italic text-ink/60">&quot;{disc.decisionNote}&quot;</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Writer decision buttons */}
        {role === "writer" && disc.status === "pending" && (
          <div className="border-t border-violet-3/20 px-6 py-4">
            {confirming && (
              <div className="mb-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={confirming === "approve"
                    ? "Optional note for the designer…"
                    : "Note for the designer explaining why (optional)…"}
                  rows={2}
                  className="w-full rounded-lg border border-violet-3/30 bg-bg-0 px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-violet-2/50 resize-none"
                />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleApprove}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  confirming === "approve"
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {confirming === "approve" ? "Confirm — make this canon" : "Approve — make this canon"}
              </button>
              <button
                onClick={handleReject}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  confirming === "reject"
                    ? "bg-red-500 text-white hover:bg-red-400"
                    : "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
                }`}
              >
                <XCircle className="h-4 w-4" />
                {confirming === "reject" ? "Confirm — keep manuscript" : "Reject — keep the manuscript"}
              </button>
              {confirming && (
                <button
                  onClick={() => setConfirming(null)}
                  className="text-sm text-ink/40 hover:text-ink/70 px-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   DISCREPANCY CARD
   ═════════════════════════════════════════════════════════════════════════ */

function DiscrepancyCard({
  disc,
  role,
  onClick,
  onApprove,
  onReject,
  chapters,
}: {
  disc: Discrepancy;
  role: "writer" | "designer";
  onClick: () => void;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
  chapters: Array<{ id: string; title: string }>;
}) {
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const badge = statusBadge(disc.status);
  const BadgeIcon = badge.icon;
  const chapterTitle = chapters.find((c) => c.id === disc.manuscriptRef)?.title;

  function handleApprove(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirming === "approve") {
      onApprove(disc.id, note);
      setConfirming(null);
    } else {
      setConfirming("approve");
    }
  }
  function handleReject(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirming === "reject") {
      onReject(disc.id, note);
      setConfirming(null);
    } else {
      setConfirming("reject");
    }
  }

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-2xl border bg-bg-1 transition-colors hover:border-violet-3/40"
      style={{ borderColor: disc.status === "pending" ? "rgba(167,139,250,0.25)" : "rgba(138,106,47,0.20)" }}
      onClick={onClick}
    >
      {/* Top bar */}
      <div className="flex items-start gap-3 px-4 pt-4">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${kindBg(disc.kind)}`}>
          {disc.kind === "contradiction" && <AlertTriangle className={`h-3.5 w-3.5 ${kindColor(disc.kind)}`} />}
          {disc.kind === "addition"      && <Plus          className={`h-3.5 w-3.5 ${kindColor(disc.kind)}`} />}
          {disc.kind === "omission"      && <Minus         className={`h-3.5 w-3.5 ${kindColor(disc.kind)}`} />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${kindBg(disc.kind)} ${kindColor(disc.kind)}`}>
              {kindLabel(disc.kind)}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.bg}`}>
              <BadgeIcon className="h-2.5 w-2.5" />
              {badge.label}
            </span>
            {disc.supersededDecisionId && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <GitBranch className="h-2.5 w-2.5" />
                Re-opened
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-ink">
            {humanSubject(disc.subject)} · {humanAttribute(disc.attribute)}
          </p>
        </div>

        <span className="shrink-0 text-[10px] text-ink/35">{timeAgo(disc.createdAt)}</span>
      </div>

      {/* Comparison row */}
      <div className="mt-3 grid grid-cols-2 gap-2 px-4">
        <div className="rounded-lg border border-gold-3/20 bg-bg-0 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-2/70 mb-1">Manuscript</p>
          <p className="text-xs text-ink/80 truncate">
            {disc.manuscriptValue
              ? <span className="text-gold-1">{disc.manuscriptValue}</span>
              : <span className="italic text-ink/40">Not established</span>}
          </p>
          {disc.manuscriptRef && chapterTitle && (
            <p className="mt-1 text-[10px] text-ink/35 truncate">{chapterTitle}</p>
          )}
        </div>
        <div className="rounded-lg border border-violet-3/20 bg-bg-0 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-2/70 mb-1">Design</p>
          <p className="text-xs text-ink/80 truncate">
            {disc.designValue
              ? <span className="text-violet-1">{disc.designValue}</span>
              : <span className="italic text-ink/40">Not depicted</span>}
          </p>
          {disc.designRef && (
            <p className="mt-1 text-[10px] text-ink/35 truncate">{disc.designRef}</p>
          )}
        </div>
      </div>

      {/* What differs — plain language */}
      <p className="mt-2 px-4 text-xs leading-relaxed text-ink/55">
        {disc.kind === "contradiction" &&
          `The ${humanAttribute(disc.attribute)} differs: "${disc.manuscriptValue}" vs "${disc.designValue}"`}
        {disc.kind === "addition" &&
          `Design depicts ${humanSubject(disc.subject)}'s ${humanAttribute(disc.attribute)} as "${disc.designValue}" — not yet in manuscript`}
        {disc.kind === "omission" &&
          `Manuscript says ${humanSubject(disc.subject)}'s ${humanAttribute(disc.attribute)} is "${disc.manuscriptValue}" — design doesn't reflect this`}
      </p>

      {/* Decision outcome */}
      {disc.status !== "pending" && disc.status !== "stale" && (
        <div className="mx-4 mt-3 rounded-lg border border-violet-3/15 bg-bg-0 px-3 py-2">
          <div className="flex items-center gap-2">
            <BadgeIcon className={`h-3 w-3 ${badge.bg.includes("emerald") ? "text-emerald-400" : "text-red-400"}`} />
            <p className="text-xs text-ink/60">
              {disc.status === "approved" ? "Approved into canon" : "Rejected — manuscript stands"}
              {disc.decidedAt && ` · ${timeAgo(disc.decidedAt)}`}
            </p>
          </div>
          {disc.decisionNote && (
            <p className="mt-1 text-xs italic text-ink/50">&quot;{disc.decisionNote}&quot;</p>
          )}
        </div>
      )}

      {/* Inline confirmation for note */}
      {role === "writer" && disc.status === "pending" && confirming && (
        <div className="mx-4 mt-3" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={confirming === "approve"
              ? "Optional note for the designer…"
              : "Note explaining why (optional)…"}
            rows={2}
            className="w-full rounded-lg border border-violet-3/30 bg-bg-0 px-3 py-2 text-xs text-ink placeholder:text-ink/30 focus:outline-none focus:border-violet-2/50 resize-none"
          />
        </div>
      )}

      {/* Writer decision buttons */}
      {role === "writer" && disc.status === "pending" && (
        <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pt-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleApprove}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              confirming === "approve"
                ? "bg-emerald-500 text-white"
                : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            {confirming === "approve" ? "Confirm approve" : "Approve — make this canon"}
          </button>
          <button
            onClick={handleReject}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              confirming === "reject"
                ? "bg-red-500 text-white"
                : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
            }`}
          >
            <XCircle className="h-3 w-3" />
            {confirming === "reject" ? "Confirm reject" : "Reject — keep manuscript"}
          </button>
          {confirming && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirming(null); setNote(""); }}
              className="text-xs text-ink/40 hover:text-ink/70 px-1"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Designer revision request badge */}
      {role === "designer" && disc.status === "rejected" && (
        <div className="mx-4 mb-4 mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <p className="text-xs text-red-400/80 font-medium">Revision requested</p>
          {disc.decisionNote && (
            <p className="mt-1 text-xs text-ink/60 italic">&quot;{disc.decisionNote}&quot;</p>
          )}
          <div className="mt-2 flex gap-2">
            {disc.designRef && (
              <Link
                href={`/designer?design=${disc.designRef}`}
                className="inline-flex items-center gap-1 rounded-md bg-violet-2/10 px-2.5 py-1 text-[10px] text-violet-2 hover:bg-violet-2/20 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <PenTool className="h-2.5 w-2.5" />
                Open design
              </Link>
            )}
          </div>
        </div>
      )}

      {/* View detail prompt */}
      {disc.status === "pending" && !confirming && (
        <div className="flex items-center justify-end gap-1 px-4 pb-3 pt-1">
          <span className="text-[10px] text-ink/30 group-hover:text-ink/50 transition-colors">
            Click to view side-by-side
          </span>
          <ChevronRight className="h-3 w-3 text-ink/30 group-hover:text-ink/50 transition-colors" />
        </div>
      )}
      {disc.status !== "pending" && <div className="pb-3" />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═════════════════════════════════════════════════════════════════════════ */

export function DiscrepancyNotificationsPage({
  accentClass = "violet",
  role,
}: {
  accentClass?: "violet" | "gold";
  role: "writer" | "designer";
}) {
  const { discrepancies, approve, reject, hydrated } = useConsistency();
  const [filter, setFilter] = useState<FilterTab>("Pending");
  const [detailDisc, setDetailDisc] = useState<Discrepancy | null>(null);

  // Load chapter titles for display
  const chapters: Array<{ id: string; title: string }> = (() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("resonance:chapters");
      if (!raw) return [];
      const all = JSON.parse(raw) as Array<{ id: string; title: string; projectId: string }>;
      return all.map((c) => ({ id: c.id, title: c.title }));
    } catch { return []; }
  })();

  const visible = discrepancies.filter((d) => {
    if (filter === "All") return d.status !== "stale";
    return d.status === filter.toLowerCase();
  });

  const accentFg   = accentClass === "gold" ? "text-gold-2" : "text-violet-2";
  const tabActive  = accentClass === "gold" ? "bg-gold-2 text-bg-0" : "bg-violet-2 text-bg-0";

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24 text-ink/30 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 md:px-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`font-display text-4xl ${accentFg}`}>Notifications</h1>
        <p className="mt-2 text-sm text-ink/50">
          {role === "writer"
            ? "Differences detected between the manuscript and designs. Decide what becomes canon."
            : "Consistency checks between your designs and the manuscript. Pending items require the writer's decision."}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const count = tabCount(discrepancies, tab);
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm transition-colors ${
                filter === tab ? tabActive : "bg-bg-1 text-ink/70 hover:text-ink"
              }`}
            >
              {tab}
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                filter === tab ? "bg-bg-0/20" : "bg-violet-2/15 text-violet-2"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {visible.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
          <Bell className="h-12 w-12 text-ink/15 mb-4" />
          <p className="font-display text-xl text-ink/40">
            {filter === "Pending" ? "No pending differences" : `No ${filter.toLowerCase()} items`}
          </p>
          <p className="mt-2 text-sm text-ink/30">
            {filter === "Pending"
              ? "Save a chapter or design to check for inconsistencies."
              : "Items will appear here once decisions are made."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((disc) => (
            <DiscrepancyCard
              key={disc.id}
              disc={disc}
              role={role}
              onClick={() => setDetailDisc(disc)}
              onApprove={approve}
              onReject={reject}
              chapters={chapters}
            />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {detailDisc && (
        <DetailPanel
          disc={detailDisc}
          role={role}
          onApprove={(id, note) => { approve(id, note); setDetailDisc(null); }}
          onReject={(id, note) => { reject(id, note); setDetailDisc(null); }}
          onClose={() => setDetailDisc(null)}
          chapters={chapters}
        />
      )}
    </div>
  );
}

/* re-export Bell so the import in the empty state is clean */
function Bell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
