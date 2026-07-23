"use client";

import { useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Globe,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence, type Variants, type Transition } from "framer-motion";
import { NOTIFICATIONS, type NotificationItem, type NotificationType } from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

// ─── helpers ─────────────────────────────────────────────────────────────────

function TypePill({ type }: { type: NotificationType }) {
  const base = "rounded-md px-2.5 py-0.5 text-xs font-medium";
  if (type === "AI Notice")
    return <span className={`${base} bg-violet-2/20 text-violet-1`}>AI Notice</span>;
  if (type === "AI Update")
    return <span className={`${base} bg-gold-2/15 text-gold-2`}>AI Update</span>;
  if (type === "Approval")
    return <span className={`${base} bg-emerald-500/15 text-emerald-400`}>Approval</span>;
  return <span className={`${base} bg-ink/10 text-ink/60`}>Reminder</span>;
}

function CategoryPill({ cat }: { cat: string }) {
  return (
    <span className="rounded-md border border-violet-3/30 bg-violet-3/15 px-2.5 py-0.5 text-xs text-violet-1">
      {cat}
    </span>
  );
}

function NotifIcon({ type }: { type: NotificationType }) {
  const base = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full";
  if (type === "AI Notice")
    return (
      <span className={`${base} bg-violet-2/20`}>
        <Sparkles className="h-4 w-4 text-violet-2" />
      </span>
    );
  if (type === "AI Update")
    return (
      <span className={`${base} bg-gold-2/15`}>
        <Globe className="h-4 w-4 text-gold-2" />
      </span>
    );
  if (type === "Approval")
    return (
      <span className={`${base} bg-emerald-500/15`}>
        <Check className="h-4 w-4 text-emerald-400" />
      </span>
    );
  return (
    <span className={`${base} bg-ink/10`}>
      <Bell className="h-4 w-4 text-ink/50" />
    </span>
  );
}

// ─── animation variants ───────────────────────────────────────────────────────

const listVariant: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const rowVariant: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" } as Transition },
};

const panelVariant: Variants = {
  hidden: { opacity: 0, x: 18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.38, ease: "easeOut" } as Transition },
};

// ─── featured hero notification ───────────────────────────────────────────────

function FeaturedNotification({ notif }: { notif: NotificationItem }) {
  return (
    <motion.div
      variants={rowVariant}
      className="overflow-hidden rounded-2xl border border-violet-3/30 bg-bg-1"
    >
      {/* header row */}
      <div className="flex items-start gap-3 px-5 pt-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-2/20">
          <Sparkles className="h-4 w-4 text-violet-2" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-ink">{notif.title}</p>
            <TypePill type={notif.type} />
          </div>
          <p className="mt-0.5 text-xs text-ink/45">
            {notif.timeAgo}
            {notif.detectedIn && (
              <>
                {" · "}Chapter 4 – The Silver &amp; the Gold{" · "}Artwork by Aravinda
              </>
            )}
          </p>
        </div>
      </div>

      <p className="mt-3 px-5 text-sm text-ink/70">{notif.summary}</p>

      {/* two-column detected detail + artwork */}
      <div className="mt-4 grid grid-cols-1 gap-4 px-5 md:grid-cols-2">
        {/* left — AI detected detail */}
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-violet-2/70 uppercase">
            AI Detected Detail
          </p>
          <div className="rounded-xl border border-violet-3/25 bg-bg-0 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-3/20">
                <BookOpen className="h-4 w-4 text-ink/50" />
              </div>
              <div>
                <p className="font-medium text-ink">{notif.artifactLabel}</p>
                <p className="text-xs text-ink/50">Type: {notif.artifactType}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink/55">
              The artwork shows a castle with a partially collapsed tower.
            </p>
          </div>
        </div>

        {/* right — artwork preview */}
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-wider text-violet-2/70 uppercase">
            Artwork Preview
          </p>
          <PlaceholderImage
            seed={notif.artworkSeed ?? "castle"}
            className="h-40 w-full rounded-xl object-cover"
          />
        </div>
      </div>

      {/* CTA row */}
      <div className="mt-4 flex items-center gap-3 rounded-b-2xl border-t border-violet-3/20 bg-violet-2/5 px-5 py-4">
        <Sparkles className="h-4 w-4 shrink-0 text-violet-2" />
        <p className="flex-1 text-sm text-ink/70">
          Would you like to add this detail to your world?{" "}
          <span className="text-ink/50">
            Adding it will update your World Bible and keep everything consistent.
          </span>
        </p>
      </div>
      <div className="flex flex-wrap gap-3 px-5 pb-5 pt-3">
        <button
          onClick={() => console.log("add to world")}
          className="flex items-center gap-2 rounded-lg bg-violet-2 px-4 py-2 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          {notif.addToWorldLabel}
        </button>
        <button
          onClick={() => console.log("add as note")}
          className="rounded-lg border border-violet-3/30 bg-bg-1 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
        >
          Add as Note Only
        </button>
        <button
          onClick={() => console.log("ignore")}
          className="rounded-lg border border-violet-3/30 bg-bg-1 px-4 py-2 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
        >
          Ignore for Now
        </button>
      </div>
    </motion.div>
  );
}

// ─── compact notification row ─────────────────────────────────────────────────

function NotifRow({
  notif,
  isActive,
  onClick,
}: {
  notif: NotificationItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={rowVariant}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        isActive
          ? "border-violet-2/40 bg-violet-2/10"
          : "border-violet-3/20 bg-bg-1 hover:border-violet-3/40 hover:bg-violet-2/5"
      }`}
    >
      <NotifIcon type={notif.type} />
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${notif.read ? "text-ink/70" : "font-medium text-ink"}`}>
          {notif.title}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink/45">{notif.summary}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-xs text-ink/40">{notif.timeAgo}</span>
        {notif.statusDot && (
          <span
            className={`h-2 w-2 rounded-full ${
              notif.statusDot === "warning" ? "bg-yellow-400" : "bg-emerald-400"
            }`}
          />
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink/30" />
    </motion.button>
  );
}

// ─── right detail panel ───────────────────────────────────────────────────────

function DetailPanel({ notif }: { notif: NotificationItem }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={notif.id}
        variants={panelVariant}
        initial="hidden"
        animate="visible"
        exit="hidden"
        className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-2/70">
          Notification Details
        </p>

        <div className="mt-4 flex flex-col gap-4 border-t border-violet-3/15 pt-4">
          {/* Type */}
          <div>
            <p className="mb-1.5 text-xs text-ink/45">Type</p>
            <TypePill type={notif.type} />
          </div>

          {/* Category */}
          <div>
            <p className="mb-1.5 text-xs text-ink/45">Category</p>
            <CategoryPill cat={notif.category} />
          </div>

          {notif.detectedIn && (
            <div>
              <p className="mb-1 text-xs text-ink/45">Detected In</p>
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-ink/40" />
                <span className="text-sm text-ink">{notif.detectedIn}</span>
              </div>
            </div>
          )}

          {notif.detectedDetail && (
            <div>
              <p className="mb-1.5 text-xs text-ink/45">Detected Detail</p>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-violet-3/20 px-2.5 py-1 text-sm text-ink">
                  {notif.detectedDetail.label}
                </span>
                <span className="rounded-md border border-violet-3/30 px-2.5 py-1 text-xs text-ink/70">
                  {notif.detectedDetail.tag}
                </span>
              </div>
            </div>
          )}

          {notif.firstSeen && (
            <div>
              <p className="mb-1 text-xs text-ink/45">First Seen</p>
              <p className="text-sm text-ink">{notif.firstSeen}</p>
            </div>
          )}

          {notif.detectedInFiles && (
            <div>
              <p className="mb-1 text-xs text-ink/45">Detected In</p>
              {notif.detectedInFiles.split("\n").map((line) => (
                <p key={line} className="text-sm text-ink/80 leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          )}

          {notif.whyItMatters && (
            <div>
              <p className="mb-1 text-xs text-ink/45">Why this matters</p>
              <p className="text-xs leading-relaxed text-ink/65">{notif.whyItMatters}</p>
            </div>
          )}

          {/* View in World Bible CTA */}
          <button
            onClick={() => console.log("view in world bible")}
            className="mt-2 flex w-full items-center justify-between rounded-xl border border-gold-3/30 bg-gold-2/5 px-4 py-3 transition-colors hover:border-gold-2/50"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-gold-2" />
              <span className="text-sm text-gold-2">View in World Bible</span>
            </div>
            <ArrowRight className="h-4 w-4 text-gold-2/60" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── main page component ──────────────────────────────────────────────────────

export function NotificationsPage({ accentClass = "violet" }: { accentClass?: "violet" | "gold" }) {
  const featured = NOTIFICATIONS.find((n) => n.featured);
  const compact = NOTIFICATIONS.filter((n) => !n.featured);

  const [activeId, setActiveId] = useState<string>(featured?.id ?? compact[0]?.id ?? "");
  const activeNotif = NOTIFICATIONS.find((n) => n.id === activeId) ?? NOTIFICATIONS[0];

  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  const titleColor = accentClass === "gold" ? "text-gold-1" : "text-violet-1";
  const badgeColor = accentClass === "gold" ? "bg-gold-2" : "bg-violet-2";

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
            <Bell className="h-5 w-5 text-violet-2" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-display text-2xl tracking-wide ${titleColor}`}>
                NOTIFICATIONS
              </h1>
              {unreadCount > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full ${badgeColor} px-1.5 text-[10px] font-bold text-bg-0`}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink/55">
              AI keeps an eye on the details so you don&apos;t have to.
            </p>
          </div>
        </div>

        <button
          onClick={() => console.log("mark all as read")}
          className="flex items-center gap-1.5 text-sm text-violet-2 transition-colors hover:text-violet-1"
        >
          <Check className="h-3.5 w-3.5" />
          Mark all as read
        </button>
      </motion.div>

      {/* ── two-column layout ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        {/* LEFT — notification list */}
        <motion.div
          variants={listVariant}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3"
        >
          {/* featured notification */}
          {featured && (
            <FeaturedNotification notif={featured} />
          )}

          {/* compact rows */}
          {compact.map((notif) => (
            <NotifRow
              key={notif.id}
              notif={notif}
              isActive={notif.id === activeId}
              onClick={() => setActiveId(notif.id)}
            />
          ))}
        </motion.div>

        {/* RIGHT — detail panel */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
        >
          <DetailPanel notif={activeNotif} />
        </motion.div>
      </div>
    </div>
  );
}
