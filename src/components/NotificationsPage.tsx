"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  BookOpen,
  Check,
  FileText,
  FlaskConical,
  Monitor,
  Palette,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { motion, AnimatePresence, type Variants, type Transition } from "framer-motion";

// ─── notification data types ──────────────────────────────────────────────────

type AgentSource = "Research Agent" | "Designer Agent" | "Notes Agent" | "World Bible";
type NotifStatus = "unread" | "read" | "kept" | "rejected";
type NotifPriority = "missed" | "normal";
type NotifFilter = "All" | "Research" | "Designer" | "Notes" | "Updates";

type FeedNotif = {
  id: string;
  source: AgentSource;
  title: string;
  description: string;
  timeAgo: string;
  status: NotifStatus;
  priority: NotifPriority;
  /** If present, user must keep or reject this change */
  changeDetail?: string;
};

// ─── seed feed data ───────────────────────────────────────────────────────────

const INITIAL_FEED: FeedNotif[] = [
  {
    id: "f1",
    source: "Designer Agent",
    title: "Artwork Difference Detected",
    description: "Chapter 4 castle artwork has changed compared to the previous version. A new tower structure was found.",
    timeAgo: "2 hours ago",
    status: "unread",
    priority: "missed",
    changeDetail: "Broken Tower detected in Chapter 4 artwork — not yet in World Bible.",
  },
  {
    id: "f2",
    source: "Research Agent",
    title: "Historical Accuracy Scan Complete",
    description: "Research Agent finished scanning Chapter 1–3 for historical inconsistencies.",
    timeAgo: "10 minutes ago",
    status: "unread",
    priority: "normal",
  },
  {
    id: "f3",
    source: "Notes Agent",
    title: "New World Detail Extracted",
    description: "A new location — \"The Salt Marshes\" — was mentioned in your notes and hasn't been added to the World Bible.",
    timeAgo: "1 hour ago",
    status: "unread",
    priority: "normal",
    changeDetail: "The Salt Marshes — new location found in Chapter 2 notes.",
  },
  {
    id: "f4",
    source: "Designer Agent",
    title: "Theme Drift Warning",
    description: "41% drift from your original creative brief detected across the last 3 design updates.",
    timeAgo: "3 hours ago",
    status: "read",
    priority: "normal",
  },
  {
    id: "f5",
    source: "World Bible",
    title: "World Bible Synced",
    description: "12 new details were automatically added from your latest approval session.",
    timeAgo: "Yesterday",
    status: "read",
    priority: "normal",
  },
  {
    id: "f6",
    source: "Research Agent",
    title: "Character Conflict Detected",
    description: "Kael's eye colour in Chapter 7 differs from the character sheet. May need correction.",
    timeAgo: "2 days ago",
    status: "read",
    priority: "normal",
    changeDetail: "Eye colour inconsistency: 'grey' in Chapter 7 vs 'amber' on character sheet.",
  },
  {
    id: "f7",
    source: "Notes Agent",
    title: "Story Health Report Ready",
    description: "Your weekly story health summary has been generated. 3 issues found.",
    timeAgo: "4 days ago",
    status: "read",
    priority: "normal",
  },
];

// ─── agent icon + colour config ───────────────────────────────────────────────

type AgentConfig = { icon: React.ReactNode; label: string; dot: string; border: string; bg: string };

function agentConfig(source: AgentSource): AgentConfig {
  switch (source) {
    case "Research Agent":
      return {
        icon: <FlaskConical className="h-4 w-4 text-gold-2" />,
        label: "Research Agent",
        dot: "bg-gold-2",
        border: "border-gold-3/30",
        bg: "bg-gold-2/12",
      };
    case "Designer Agent":
      return {
        icon: <Palette className="h-4 w-4 text-violet-2" />,
        label: "Designer Agent",
        dot: "bg-violet-2",
        border: "border-violet-3/30",
        bg: "bg-violet-2/12",
      };
    case "Notes Agent":
      return {
        icon: <FileText className="h-4 w-4 text-emerald-400" />,
        label: "Notes Agent",
        dot: "bg-emerald-400",
        border: "border-emerald-500/25",
        bg: "bg-emerald-500/10",
      };
    case "World Bible":
      return {
        icon: <BookOpen className="h-4 w-4 text-sky-400" />,
        label: "World Bible",
        dot: "bg-sky-400",
        border: "border-sky-500/25",
        bg: "bg-sky-500/10",
      };
  }
}

function filterMatch(notif: FeedNotif, filter: NotifFilter): boolean {
  if (filter === "All") return true;
  if (filter === "Research") return notif.source === "Research Agent";
  if (filter === "Designer") return notif.source === "Designer Agent";
  if (filter === "Notes") return notif.source === "Notes Agent";
  if (filter === "Updates") return notif.source === "World Bible";
  return true;
}

// ─── animation variants ───────────────────────────────────────────────────────

const cardVariant: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as Transition },
  exit:   { opacity: 0, scale: 0.97, transition: { duration: 0.2 } as Transition },
};

const listVariant: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055 } },
};

// ─── toggle switch ────────────────────────────────────────────────────────────

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-violet-2" : "bg-ink/20"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? "translate-x-4" : "translate-x-0.5"}`}
      />
    </button>
  );
}

// ─── radio option ─────────────────────────────────────────────────────────────

function RadioOpt<T extends string>({ value, current, onSelect, label }: { value: T; current: T; onSelect: (v: T) => void; label: string }) {
  const active = value === current;
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        active
          ? "border-violet-2/50 bg-violet-2/10 text-ink"
          : "border-violet-3/20 bg-bg-0 text-ink/60 hover:border-violet-3/40 hover:text-ink/80"
      }`}
    >
      <span className={`h-3 w-3 shrink-0 rounded-full border-2 transition-colors ${active ? "border-violet-2 bg-violet-2" : "border-ink/30"}`} />
      {label}
    </button>
  );
}

// ─── checkbox row ─────────────────────────────────────────────────────────────

function CheckRow({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button onClick={onToggle} className="flex items-center gap-2.5 text-left">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          checked ? "border-violet-2 bg-violet-2" : "border-ink/30 bg-bg-0"
        }`}
      >
        {checked && <Check className="h-2.5 w-2.5 text-bg-0" strokeWidth={3} />}
      </span>
      <span className="text-sm text-ink/70">{label}</span>
    </button>
  );
}

// ─── section card wrapper ─────────────────────────────────────────────────────

function SettingCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
      <p className="text-sm font-medium text-ink">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-ink/45">{subtitle}</p>}
      <div className="mt-4 border-t border-violet-3/15 pt-4">{children}</div>
    </div>
  );
}

// ─── LEFT: Notification Settings ─────────────────────────────────────────────

type NotifTarget = "Phone" | "Desktop" | "Both";
type NotifStyle  = "Immediately" | "Daily Summary" | "Only Important";

function NotificationSettings() {
  const [desktopOn, setDesktopOn] = useState(true);
  const [phoneOn,   setPhoneOn]   = useState(true);
  const [target,    setTarget]    = useState<NotifTarget>("Both");
  const [style,     setStyle]     = useState<NotifStyle>("Immediately");

  const [tasks, setTasks] = useState({
    research:  true,
    designer:  true,
    worldBible: true,
    notes:     true,
  });

  function toggleTask(key: keyof typeof tasks) {
    setTasks((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="font-display text-lg tracking-wide text-violet-1">Notification Settings</h2>
        <p className="mt-0.5 text-xs text-ink/45">Choose how Resonance keeps you updated.</p>
      </div>

      {/* Desktop Notifications */}
      <SettingCard title="Desktop Notifications" subtitle="Receive updates while working.">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Monitor className="h-4 w-4 text-ink/50" />
            <span className="text-sm text-ink/80">Desktop alerts</span>
          </div>
          <Toggle on={desktopOn} onToggle={() => setDesktopOn((v) => !v)} label="Toggle desktop alerts" />
        </div>
        {desktopOn && (
          <div className="mt-3 rounded-lg border border-violet-3/20 bg-bg-0 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check className="h-3 w-3" strokeWidth={3} />
              Desktop alerts enabled
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink/45">
              You will receive:<br />
              · Research completed · Artwork changes<br />
              · World Bible updates
            </p>
          </div>
        )}
      </SettingCard>

      {/* Mobile Notifications */}
      <SettingCard title="Mobile Notifications" subtitle="Get updates when you're away.">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-4 w-4 text-ink/50" />
            <span className="text-sm text-ink/80">Push notifications</span>
          </div>
          <Toggle on={phoneOn} onToggle={() => setPhoneOn((v) => !v)} label="Toggle mobile alerts" />
        </div>
        {phoneOn && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-ink/45">Send notifications to:</p>
            {(["Phone", "Desktop", "Both"] as NotifTarget[]).map((opt) => (
              <RadioOpt key={opt} value={opt} current={target} onSelect={setTarget} label={opt} />
            ))}
          </div>
        )}
      </SettingCard>

      {/* AI Task Completion */}
      <SettingCard title="AI Task Completion" subtitle="Notify me when:">
        <div className="flex flex-col gap-3">
          <CheckRow checked={tasks.research}   onToggle={() => toggleTask("research")}   label="Research scan finishes" />
          <CheckRow checked={tasks.designer}   onToggle={() => toggleTask("designer")}   label="Designer analysis finishes" />
          <CheckRow checked={tasks.worldBible} onToggle={() => toggleTask("worldBible")} label="World Bible update finishes" />
          <CheckRow checked={tasks.notes}      onToggle={() => toggleTask("notes")}      label="Notes processing finishes" />
        </div>
      </SettingCard>

      {/* Notification Style */}
      <SettingCard title="Notification Style" subtitle="When do you want to be notified?">
        <div className="flex flex-col gap-2">
          {(["Immediately", "Daily Summary", "Only Important"] as NotifStyle[]).map((opt) => (
            <RadioOpt key={opt} value={opt} current={style} onSelect={setStyle} label={opt} />
          ))}
        </div>
      </SettingCard>
    </div>
  );
}

// ─── RIGHT: single notification card ─────────────────────────────────────────

function NotifCard({
  notif,
  onKeep,
  onReject,
  onMarkRead,
}: {
  notif: FeedNotif;
  onKeep: (id: string) => void;
  onReject: (id: string) => void;
  onMarkRead: (id: string) => void;
}) {
  const cfg = agentConfig(notif.source);
  const isMissed   = notif.priority === "missed";
  const hasAction  = !!notif.changeDetail && (notif.status === "unread" || notif.status === "read");
  const isKept     = notif.status === "kept";
  const isRejected = notif.status === "rejected";
  const isUnread   = notif.status === "unread";

  return (
    <motion.div
      layout
      variants={cardVariant}
      className={`overflow-hidden rounded-2xl border bg-bg-1 transition-colors ${
        isMissed && isUnread
          ? "border-red-500/40 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]"
          : isUnread
          ? "border-violet-2/25"
          : "border-violet-3/20"
      }`}
    >
      {/* card header */}
      <div className="flex items-start gap-3 px-4 pt-4">
        {/* source avatar */}
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
          {cfg.icon}
        </span>

        <div className="min-w-0 flex-1">
          {/* priority + source label */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isMissed && isUnread && (
              <span className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                Missed
              </span>
            )}
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-medium text-ink/60 ${cfg.border} bg-bg-0`}>
              {cfg.label}
            </span>
            {/* status badge */}
            {isKept && (
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <Check className="h-3 w-3" strokeWidth={3} />
                Added to World Bible
              </span>
            )}
            {isRejected && (
              <span className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400/70">
                <X className="h-3 w-3" />
                Ignored
              </span>
            )}
            {isUnread && !isMissed && (
              <span className="flex items-center gap-1 text-[10px] text-violet-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-2" />
                Unread
              </span>
            )}
            {notif.status === "read" && (
              <span className="text-[10px] text-ink/30">Read</span>
            )}
          </div>

          {/* title */}
          <p className={`mt-1 text-sm ${isUnread ? "font-medium text-ink" : "text-ink/70"}`}>
            {notif.title}
          </p>
        </div>

        {/* time + read toggle */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[10px] text-ink/35">{notif.timeAgo}</span>
          {(isUnread || notif.status === "read") && !isKept && !isRejected && (
            <button
              onClick={() => onMarkRead(notif.id)}
              className="text-[10px] text-ink/35 transition-colors hover:text-violet-2"
            >
              {isUnread ? "Mark read" : "Mark unread"}
            </button>
          )}
        </div>
      </div>

      {/* description */}
      <p className="mt-2 px-4 text-xs leading-relaxed text-ink/55">{notif.description}</p>

      {/* change detail box */}
      {notif.changeDetail && (
        <div className={`mx-4 mt-3 rounded-lg border px-3 py-2.5 ${cfg.border} bg-bg-0`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">Detected Change</p>
          <p className="mt-1 text-xs text-ink/70">{notif.changeDetail}</p>
        </div>
      )}

      {/* action buttons */}
      {hasAction && !isKept && !isRejected && (
        <div className="flex items-center gap-2 px-4 pb-4 pt-3">
          <button
            onClick={() => onKeep(notif.id)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-2 px-3.5 py-1.5 text-xs font-medium text-bg-0 transition-opacity hover:opacity-90"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            Keep Change
          </button>
          <button
            onClick={() => onReject(notif.id)}
            className="flex items-center gap-1.5 rounded-lg border border-violet-3/30 bg-bg-1 px-3.5 py-1.5 text-xs text-ink/60 transition-colors hover:border-red-500/40 hover:text-red-400"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
        </div>
      )}

      {/* kept / rejected resolved state — no buttons, just padding */}
      {(isKept || isRejected) && <div className="pb-4" />}

      {/* bottom padding when no buttons */}
      {!hasAction && !isKept && !isRejected && <div className="pb-4" />}
    </motion.div>
  );
}

// ─── RIGHT: Notifications Feed ────────────────────────────────────────────────

function NotificationFeed({ accentClass }: { accentClass: "violet" | "gold" }) {
  const [feed, setFeed] = useState<FeedNotif[]>(INITIAL_FEED);
  const [filter, setFilter] = useState<NotifFilter>("All");

  const badgeColor = accentClass === "gold" ? "bg-gold-2" : "bg-violet-2";

  function keepChange(id: string) {
    setFeed((prev) => prev.map((n) => n.id === id ? { ...n, status: "kept" } : n));
  }
  function rejectChange(id: string) {
    setFeed((prev) => prev.map((n) => n.id === id ? { ...n, status: "rejected" } : n));
  }
  function toggleRead(id: string) {
    setFeed((prev) =>
      prev.map((n) => n.id === id
        ? { ...n, status: n.status === "unread" ? "read" : n.status === "read" ? "unread" : n.status }
        : n,
      ),
    );
  }

  const unreadCount = feed.filter((n) => n.status === "unread").length;
  const visible = feed.filter((n) => filterMatch(n, filter));

  const FILTERS: NotifFilter[] = ["All", "Research", "Designer", "Notes", "Updates"];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* feed header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-2/15">
            <Bell className="h-4 w-4 text-violet-2" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg tracking-wide text-violet-1">Notifications</h2>
              {unreadCount > 0 && (
                <span className={`flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full ${badgeColor} px-1 text-[10px] font-bold text-bg-0`}>
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs text-ink/40">AI keeps an eye on the details so you don&apos;t have to.</p>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === f
                ? "border-violet-2/50 bg-violet-2/15 text-violet-1"
                : "border-violet-3/20 bg-bg-1 text-ink/55 hover:border-violet-3/40 hover:text-ink/80"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* cards */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BellOff className="h-8 w-8 text-ink/20" />
          <p className="mt-3 text-sm text-ink/40">No notifications in this category.</p>
        </div>
      ) : (
        <motion.div
          variants={listVariant}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3 overflow-y-auto pb-4 pr-1"
        >
          <AnimatePresence initial={false}>
            {visible.map((notif) => (
              <NotifCard
                key={notif.id}
                notif={notif}
                onKeep={keepChange}
                onReject={rejectChange}
                onMarkRead={toggleRead}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export function NotificationsPage({ accentClass = "violet" }: { accentClass?: "violet" | "gold" }) {
  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden">
      {/* ── LEFT: Settings panel ── */}
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-violet-3/20 px-5 py-7 xl:flex"
      >
        <NotificationSettings />
      </motion.aside>

      {/* ── RIGHT: Feed ── */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-7 md:px-8"
      >
        {/* Mobile settings accordion (shown below xl) */}
        <MobileSettingsDrawer />

        <NotificationFeed accentClass={accentClass} />
      </motion.main>
    </div>
  );
}

// ─── mobile settings accordion ───────────────────────────────────────────────

function MobileSettingsDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5 xl:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-violet-3/25 bg-bg-1 px-4 py-3 text-sm text-ink/70 transition-colors hover:border-violet-3/40"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-violet-2" />
          Notification Settings
        </div>
        <span className={`text-xs text-ink/35 transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <NotificationSettings />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
