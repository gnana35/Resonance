/*
 * src/components/NotificationsPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared notifications UI for /writer/notifications and /designer/notifications.
 *
 * Delivery channels:
 *   • In-app  — fully implemented; persisted to notification_preferences.
 *   • Desktop — Browser Notification API (requires explicit user permission).
 *               Fires only while a browser tab is open. Implemented below.
 *   • Mobile  — Real mobile push requires a service worker + Web Push API +
 *               VAPID keys + (on iOS) the site must be installed to the home
 *               screen. This is a multi-day effort outside hackathon scope.
 *               The toggle is persisted to the DB; actual delivery is a TODO.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  BookOpen,
  Check,
  FlaskConical,
  GitBranch,
  Monitor,
  Palette,
  Pencil,
  Send,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, type Variants, type Transition } from "framer-motion";
import {
  type Notification,
  type NotificationPreferences,
  type RequestRevisionInput,
  createNotification,
  listNotifications,
  markRead,
  markUnread,
  acceptDesign,
  requestRevision,
  getPreferences,
  updatePreferences,
  subscribeNotifications,
} from "@/lib/notifications";

// ─── local UI types ───────────────────────────────────────────────────────────

type NotifFilter = "All" | "Designer" | "Writer" | "System" | "Unread";

// Designer → Writer notification types that require an action decision.
const DESIGNER_TO_WRITER_TYPES = new Set([
  "character-design-complete",
  "scene-art-complete",
  "asset-shared",
  "artwork-updated",
]);

// ─── agent icon + colour config ───────────────────────────────────────────────

type AgentConfig = {
  icon:   React.ReactNode;
  label:  string;
  dot:    string;
  border: string;
  bg:     string;
};

function senderConfig(
  sender: "writer" | "designer" | "system",
  type:   string,
): AgentConfig {
  if (type === "ai-validation-alert") {
    return {
      icon:   <AlertTriangle className="h-4 w-4 text-red-400" />,
      label:  "AI Validation",
      dot:    "bg-red-400",
      border: "border-red-500/30",
      bg:     "bg-red-500/12",
    };
  }
  if (sender === "designer") {
    return {
      icon:   <Palette className="h-4 w-4 text-violet-2" />,
      label:  "Designer",
      dot:    "bg-violet-2",
      border: "border-violet-3/30",
      bg:     "bg-violet-2/12",
    };
  }
  if (sender === "writer") {
    return {
      icon:   <Pencil className="h-4 w-4 text-gold-2" />,
      label:  "Writer",
      dot:    "bg-gold-2",
      border: "border-gold-3/30",
      bg:     "bg-gold-2/12",
    };
  }
  // system
  return {
    icon:   <FlaskConical className="h-4 w-4 text-emerald-400" />,
    label:  "System",
    dot:    "bg-emerald-400",
    border: "border-emerald-500/25",
    bg:     "bg-emerald-500/10",
  };
}

function filterMatch(notif: Notification, filter: NotifFilter): boolean {
  if (filter === "All")      return true;
  if (filter === "Unread")   return notif.status === "unread";
  if (filter === "Designer") return notif.sender === "designer";
  if (filter === "Writer")   return notif.sender === "writer";
  if (filter === "System")   return notif.sender === "system";
  return true;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ─── animation variants ───────────────────────────────────────────────────────

const cardVariant: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as Transition },
  exit:    { opacity: 0, scale: 0.97, transition: { duration: 0.2 } as Transition },
};

const listVariant: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.055 } },
};

// ─── toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  on,
  onToggle,
  label,
  disabled,
}: {
  on:       boolean;
  onToggle: () => void;
  label:    string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      disabled={disabled}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${on ? "bg-violet-2" : "bg-ink/20"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── radio option ─────────────────────────────────────────────────────────────

function RadioOpt<T extends string>({
  value,
  current,
  onSelect,
  label,
}: {
  value:    T;
  current:  T;
  onSelect: (v: T) => void;
  label:    string;
}) {
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
      <span
        className={`h-3 w-3 shrink-0 rounded-full border-2 transition-colors ${
          active ? "border-violet-2 bg-violet-2" : "border-ink/30"
        }`}
      />
      {label}
    </button>
  );
}

// ─── checkbox row ─────────────────────────────────────────────────────────────

function CheckRow({
  checked,
  onToggle,
  label,
}: {
  checked:  boolean;
  onToggle: () => void;
  label:    string;
}) {
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

function SettingCard({
  title,
  subtitle,
  children,
}: {
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
}) {
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

// Map UI event keys to DB event keys.
const EVENT_KEYS: Array<{ key: string; label: string }> = [
  { key: "research-complete",              label: "Research scan finishes"       },
  { key: "image-generation-complete",      label: "Image generation completes"   },
  { key: "historical-validation-complete", label: "Historical validation done"   },
  { key: "asset-shared",                   label: "Asset shared"                 },
  { key: "revision-requested",             label: "Revision requested"           },
  { key: "design-accepted",                label: "Design accepted"              },
  { key: "design-rejected",                label: "Design rejected"              },
];

/**
 * Request browser Notification permission.
 *
 * LIMIT: The browser Notification API only fires while a tab is open.
 * It also requires an explicit user permission grant. Users who deny
 * the prompt cannot be re-prompted without clearing site data.
 */
async function requestDesktopPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied")  return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendDesktopNotification(title: string, body: string): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/favicon.ico" });
}

function NotificationSettings({
  persona,
}: {
  persona: "writer" | "designer";
}) {
  // UI-only style / target state — not yet backed by schema columns (no
  // style/target columns in notification_preferences). Kept as local state
  // so the visual stays intact; can be added to the schema later.
  const [target, setTarget]       = useState<NotifTarget>("Both");
  const [style,  setStyle]        = useState<NotifStyle>("Immediately");

  // DB-backed state
  const [prefs,       setPrefs]       = useState<NotificationPreferences | null>(null);
  const [saving,      setSaving]      = useState(false);
  const [desktopDenied, setDesktopDenied] = useState(
    // Initialise from the browser permission state — read once on mount,
    // not inside an effect, so there is no synchronous-setState-in-effect.
    () => typeof window !== "undefined" && "Notification" in window
      ? Notification.permission === "denied"
      : false,
  );

  useEffect(() => {
    getPreferences(persona).then((p) => {
      if (p) setPrefs(p);
    }).catch(console.error);
  }, [persona]);

  async function patch(
    update: Partial<Omit<NotificationPreferences, "id" | "persona" | "updatedAt">>,
  ) {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updatePreferences(persona, update);
      setPrefs(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDesktopToggle() {
    if (!prefs) return;
    if (!prefs.desktop) {
      // Enabling: request permission first.
      const granted = await requestDesktopPermission();
      if (!granted) {
        setDesktopDenied(true);
        return;
      }
    }
    await patch({ desktop: !prefs.desktop });
  }

  function handleMobileToggle() {
    if (!prefs) return;
    // TODO: Real mobile push requires a service worker + Web Push API + VAPID keys.
    //       On iOS the site must also be installed to the home screen before
    //       push permissions are available. This toggle is persisted to the DB
    //       but no push delivery is wired up yet.
    void patch({ mobile: !prefs.mobile });
  }

  function handleEventToggle(key: string) {
    if (!prefs) return;
    const events = { ...prefs.events, [key]: !prefs.events[key] };
    void patch({ events });
  }

  const desktopOn = prefs?.desktop ?? false;
  const mobileOn  = prefs?.mobile  ?? false;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h2 className="font-display text-lg tracking-wide text-violet-1">
          Notification Settings
        </h2>
        <p className="mt-0.5 text-xs text-ink/45">
          Choose how Resonance keeps you updated.
        </p>
      </div>

      {/* Desktop Notifications */}
      <SettingCard
        title="Desktop Notifications"
        subtitle="Receive updates while working."
      >
        {/*
         * LIMIT: The browser Notification API fires only while a tab is open.
         * Users who deny the permission prompt cannot be re-asked without
         * clearing site permissions manually.
         */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Monitor className="h-4 w-4 text-ink/50" />
            <span className="text-sm text-ink/80">Desktop alerts</span>
          </div>
          <Toggle
            on={desktopOn}
            onToggle={handleDesktopToggle}
            label="Toggle desktop alerts"
            disabled={desktopDenied}
          />
        </div>
        {desktopDenied && (
          <p className="mt-2 text-[11px] text-red-400/80">
            Browser permission denied. Clear site permissions to re-enable.
          </p>
        )}
        {desktopOn && !desktopDenied && (
          <div className="mt-3 rounded-lg border border-violet-3/20 bg-bg-0 px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check className="h-3 w-3" strokeWidth={3} />
              Desktop alerts enabled
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-ink/45">
              Fires while this tab is open · permission granted
            </p>
          </div>
        )}
      </SettingCard>

      {/* Mobile Notifications */}
      <SettingCard
        title="Mobile Notifications"
        subtitle="Get updates when you're away."
      >
        {/*
         * TODO (mobile push): Wire up a service worker + Web Push API + VAPID keys.
         * On iOS the site must be added to the home screen first.
         * The toggle persists to notification_preferences.mobile but no push
         * delivery is implemented yet.
         */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-4 w-4 text-ink/50" />
            <span className="text-sm text-ink/80">Push notifications</span>
          </div>
          <Toggle
            on={mobileOn}
            onToggle={handleMobileToggle}
            label="Toggle mobile alerts"
          />
        </div>
        {mobileOn && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-ink/45">Send notifications to:</p>
            {(["Phone", "Desktop", "Both"] as NotifTarget[]).map((opt) => (
              <RadioOpt
                key={opt}
                value={opt}
                current={target}
                onSelect={setTarget}
                label={opt}
              />
            ))}
            <p className="mt-1 text-[10px] text-ink/30">
              ⚠ Mobile push delivery coming soon — preference saved.
            </p>
          </div>
        )}
      </SettingCard>

      {/* Event toggles */}
      <SettingCard title="Notify me when:" subtitle="Per-event controls">
        <div className="flex flex-col gap-3">
          {EVENT_KEYS.map(({ key, label }) => (
            <CheckRow
              key={key}
              checked={prefs?.events[key] ?? true}
              onToggle={() => handleEventToggle(key)}
              label={label}
            />
          ))}
        </div>
      </SettingCard>

      {/* Notification Style (UI-only, not yet in schema) */}
      <SettingCard
        title="Notification Style"
        subtitle="When do you want to be notified?"
      >
        <div className="flex flex-col gap-2">
          {(["Immediately", "Daily Summary", "Only Important"] as NotifStyle[]).map(
            (opt) => (
              <RadioOpt
                key={opt}
                value={opt}
                current={style}
                onSelect={setStyle}
                label={opt}
              />
            ),
          )}
        </div>
      </SettingCard>
    </div>
  );
}

// ─── Revision Request Form ────────────────────────────────────────────────────

function RevisionForm({
  onSubmit,
  onCancel,
  busy,
}: {
  onSubmit: (input: RequestRevisionInput) => void;
  onCancel: () => void;
  busy:     boolean;
}) {
  const [note,         setNote]         = useState("");
  const [refs,         setRefs]         = useState("");
  const [expectations, setExpectations] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    onSubmit({
      note:         note.trim(),
      references:   refs.trim() ? refs.split("\n").map((r) => r.trim()).filter(Boolean) : [],
      expectations: expectations.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2.5 rounded-xl border border-violet-3/25 bg-bg-0 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
        Request Revisions
      </p>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-ink/50">Note *</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          required
          placeholder="Describe what needs to change…"
          className="w-full resize-none rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2 text-xs text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-ink/50">Reference links (one per line)</label>
        <textarea
          value={refs}
          onChange={(e) => setRefs(e.target.value)}
          rows={2}
          placeholder="https://example.com/reference"
          className="w-full resize-none rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2 text-xs text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-ink/50">Updated expectations</label>
        <textarea
          value={expectations}
          onChange={(e) => setExpectations(e.target.value)}
          rows={2}
          placeholder="Style, tone, technical requirements…"
          className="w-full resize-none rounded-lg border border-violet-3/25 bg-bg-1 px-3 py-2 text-xs text-ink placeholder:text-ink/30 focus:border-violet-2/50 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={busy || !note.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-violet-2 px-3 py-1.5 text-xs font-medium text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send className="h-3 w-3" />
          {busy ? "Sending…" : "Send to Designer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-violet-3/30 px-3 py-1.5 text-xs text-ink/60 transition-colors hover:border-violet-3/50 hover:text-ink/80"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── RIGHT: single notification card ─────────────────────────────────────────

function NotifCard({
  notif,
  recipient,
  parentNotif,
  onAccept,
  onRevisionSubmit,
  onMarkRead,
  onMarkUnread,
  onSendRequirements,
  onMarkDesignComplete,
}: {
  notif:                  Notification;
  recipient:              "writer" | "designer";
  parentNotif?:           Notification;
  onAccept:               (id: string) => void;
  onRevisionSubmit:       (id: string, input: RequestRevisionInput) => Promise<void>;
  onMarkRead:             (id: string) => void;
  onMarkUnread:           (id: string) => void;
  onSendRequirements:     (notif: Notification) => void;
  onMarkDesignComplete?:  (id: string) => void;
}) {
  const cfg         = senderConfig(notif.sender, notif.type);
  const isUnread    = notif.status === "unread";
  const isRead      = notif.status === "read";
  const isAccepted  = notif.status === "accepted";
  const isRevReq    = notif.status === "revision-requested";
  const isAlert     = notif.type === "ai-validation-alert";

  // Writer sees Accept / Revise actions on designer→writer notifications.
  const canAct =
    recipient === "writer" &&
    DESIGNER_TO_WRITER_TYPES.has(notif.type) &&
    (isUnread || isRead);

  // Revision-request notifications shown to the designer carry payload detail.
  const isRevisionRequest = notif.type === "revision-request" && recipient === "designer";

  // Designer can mark a character-request or worldbuilding-request complete.
  const canMarkComplete =
    recipient === "designer" &&
    (notif.type === "character-request" || notif.type === "worldbuilding-request") &&
    (isUnread || isRead);

  const [showRevForm, setShowRevForm] = useState(false);
  const [revBusy,     setRevBusy]     = useState(false);

  async function handleRevisionSubmit(input: RequestRevisionInput) {
    setRevBusy(true);
    try {
      await onRevisionSubmit(notif.id, input);
      setShowRevForm(false);
    } finally {
      setRevBusy(false);
    }
  }

  const payload = notif.payload as {
    note?:            string;
    references?:      string[];
    expectations?:    string;
    originalTitle?:   string;
    validationNote?:  string;
    // character-request fields
    characterName?:   string;
    role?:            string;
    description?:     string;
    bio?:             string;
    keyTraits?:       string[];
    age?:             number | string;
    occupation?:      string;
    origin?:          string;
    affiliation?:     string;
    arcSummary?:      string;
    brief?:           string;
    // asset-shared / worldbuilding-request fields
    assetName?:       string;
    previewUrl?:      string;
    entityKind?:      string;
    entityLabel?:     string;
    entityDescription?: string;
    diff?:            Record<string, { before: unknown; after: unknown }>;
  };

  const isCharacterRequest    = notif.type === "character-request";
  const isWorldbuildingRequest = notif.type === "worldbuilding-request";
  const isAssetShared          = notif.type === "asset-shared" || notif.type === "artwork-updated";
  const isCharDesignComplete   = notif.type === "character-design-complete";
  const isCharUpdated          = notif.type === "character-updated";

  return (
    <motion.div
      layout
      variants={cardVariant}
      className={`overflow-hidden rounded-2xl border bg-bg-1 transition-colors ${
        isAlert
          ? "border-red-500/40 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]"
          : isUnread
          ? "border-violet-2/25"
          : "border-violet-3/20"
      }`}
    >
      {/* card header */}
      <div className="flex items-start gap-3 px-4 pt-4">
        {/* sender avatar */}
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}
        >
          {cfg.icon}
        </span>

        <div className="min-w-0 flex-1">
          {/* badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* severity / type badges */}
            {isAlert && (
              <span className="flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                AI Alert
              </span>
            )}
            {notif.severity === "warning" && !isAlert && (
              <span className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Warning
              </span>
            )}
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium text-ink/60 ${cfg.border} bg-bg-0`}
            >
              {cfg.label}
            </span>

            {/* status badges */}
            {isAccepted && (
              <span className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <Check className="h-3 w-3" strokeWidth={3} />
                Accepted
              </span>
            )}
            {isRevReq && (
              <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400/80">
                <Pencil className="h-3 w-3" />
                Revision requested
              </span>
            )}
            {isUnread && !isAlert && (
              <span className="flex items-center gap-1 text-[10px] text-violet-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-2" />
                Unread
              </span>
            )}
            {isRead && (
              <span className="text-[10px] text-ink/30">Read</span>
            )}

            {/* thread indicator */}
            {notif.parentId && (
              <span className="flex items-center gap-1 text-[10px] text-ink/35">
                <GitBranch className="h-3 w-3" />
                Threaded
              </span>
            )}
          </div>

          {/* title */}
          <p
            className={`mt-1 text-sm ${isUnread ? "font-medium text-ink" : "text-ink/70"}`}
          >
            {notif.title}
          </p>
        </div>

        {/* time + read toggle */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-[10px] text-ink/35">{timeAgo(notif.createdAt)}</span>
          {(isUnread || isRead) && !isAccepted && !isRevReq && (
            <button
              onClick={() =>
                isUnread ? onMarkRead(notif.id) : onMarkUnread(notif.id)
              }
              className="text-[10px] text-ink/35 transition-colors hover:text-violet-2"
            >
              {isUnread ? "Mark read" : "Mark unread"}
            </button>
          )}
        </div>
      </div>

      {/* description */}
      <p className="mt-2 px-4 text-xs leading-relaxed text-ink/55">
        {notif.message}
      </p>

      {/* AI validation detail */}
      {isAlert && payload.validationNote && (
        <div className="mx-4 mt-3 rounded-lg border border-red-500/25 bg-red-500/8 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-400/70">
            Validation Failure
          </p>
          <p className="mt-1 text-xs text-ink/70">{payload.validationNote}</p>
        </div>
      )}

      {/* Parent thread context (designer sees original notification details) */}
      {isRevisionRequest && parentNotif && (
        <div className="mx-4 mt-3 rounded-lg border border-violet-3/20 bg-bg-0 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink/35">
            <BookOpen className="h-3 w-3" />
            Original: {parentNotif.title}
          </p>
        </div>
      )}

      {/* Revision payload detail (designer sees writer's note) */}
      {isRevisionRequest && (
        <div className="mx-4 mt-3 rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2.5 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">
            Revision Detail
          </p>
          {payload.note && (
            <div>
              <p className="text-[10px] text-ink/40">Note</p>
              <p className="mt-0.5 text-xs text-ink/75">{payload.note}</p>
            </div>
          )}
          {Array.isArray(payload.references) && payload.references.length > 0 && (
            <div>
              <p className="text-[10px] text-ink/40">References</p>
              <ul className="mt-0.5 flex flex-col gap-0.5">
                {payload.references.map((ref, i) => (
                  <li key={i} className="text-xs text-violet-2 underline underline-offset-2 break-all">
                    <a href={ref} target="_blank" rel="noopener noreferrer">
                      {ref}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {payload.expectations && (
            <div>
              <p className="text-[10px] text-ink/40">Updated expectations</p>
              <p className="mt-0.5 text-xs text-ink/75">{payload.expectations}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Character-request brief (designer sees writer's full brief) ────── */}
      {isCharacterRequest && (
        <div className="mx-4 mt-3 rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2.5 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">
            Character Brief
          </p>
          {payload.role && (
            <div>
              <p className="text-[10px] text-ink/40">Role</p>
              <p className="mt-0.5 text-xs text-ink/75">{payload.role}</p>
            </div>
          )}
          {(payload.bio ?? payload.description) && (
            <div>
              <p className="text-[10px] text-ink/40">Description</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink/75">
                {payload.bio ?? payload.description}
              </p>
            </div>
          )}
          {Array.isArray(payload.keyTraits) && payload.keyTraits.length > 0 && (
            <div>
              <p className="text-[10px] text-ink/40">Traits</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {payload.keyTraits.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-violet-2/10 px-2 py-0.5 text-[10px] text-ink/60"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(payload.occupation || payload.origin || payload.affiliation) && (
            <div className="flex flex-wrap gap-3">
              {payload.occupation && (
                <span className="text-[10px] text-ink/50">
                  <span className="text-ink/35">Occupation: </span>{payload.occupation}
                </span>
              )}
              {payload.origin && (
                <span className="text-[10px] text-ink/50">
                  <span className="text-ink/35">Origin: </span>{payload.origin}
                </span>
              )}
              {payload.affiliation && (
                <span className="text-[10px] text-ink/50">
                  <span className="text-ink/35">Affiliation: </span>{payload.affiliation}
                </span>
              )}
            </div>
          )}
          {payload.arcSummary && (
            <div>
              <p className="text-[10px] text-ink/40">Arc</p>
              <p className="mt-0.5 text-xs text-ink/75">{payload.arcSummary}</p>
            </div>
          )}
          {payload.brief && (
            <div className="border-t border-violet-3/15 pt-2">
              <p className="text-[10px] text-ink/40">Writer&apos;s instructions</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink/80">{payload.brief}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Worldbuilding-request brief ─────────────────────────────────────── */}
      {isWorldbuildingRequest && (payload.entityLabel ?? payload.entityKind ?? payload.entityDescription) && (
        <div className="mx-4 mt-3 rounded-lg border border-violet-3/25 bg-bg-0 px-3 py-2.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">
            World Entity
          </p>
          {payload.entityKind && (
            <p className="text-[10px] capitalize text-ink/50">{payload.entityKind}</p>
          )}
          {payload.entityLabel && (
            <p className="text-xs font-medium text-ink/80">{payload.entityLabel}</p>
          )}
          {payload.entityDescription && (
            <p className="mt-0.5 text-xs leading-relaxed text-ink/70">{payload.entityDescription}</p>
          )}
          {payload.brief && (
            <div className="border-t border-violet-3/15 pt-1.5">
              <p className="text-[10px] text-ink/40">Design notes</p>
              <p className="mt-0.5 text-xs text-ink/75">{payload.brief}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Asset-shared / artwork-updated preview ──────────────────────────── */}
      {isAssetShared && payload.previewUrl && (
        <div className="mx-4 mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={payload.previewUrl}
            alt={payload.assetName ?? "Asset preview"}
            className="w-full max-h-48 rounded-lg object-cover border border-violet-3/20"
          />
        </div>
      )}

      {/* ── Character-design-complete marker ───────────────────────────────── */}
      {isCharDesignComplete && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2">
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={3} />
          <p className="text-xs text-emerald-300">Character design marked complete by designer</p>
        </div>
      )}

      {/* ── character-updated diff ──────────────────────────────────────────── */}
      {isCharUpdated && payload.diff && Object.keys(payload.diff).length > 0 && (
        <div className="mx-4 mt-3 rounded-lg border border-gold-3/20 bg-bg-0 px-3 py-2.5 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/35">
            What changed
          </p>
          {Object.entries(payload.diff).map(([field, change]) => (
            <div key={field}>
              <p className="text-[10px] capitalize text-ink/40">{field.replace(/([A-Z])/g, " $1").trim()}</p>
              <div className="flex flex-wrap items-start gap-2 mt-0.5">
                {change.before !== undefined && (
                  <span className="text-[10px] line-through text-red-400/60">
                    {String(change.before).slice(0, 60)}
                  </span>
                )}
                <span className="text-[10px] text-emerald-400/80">
                  {String(change.after).slice(0, 60)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Writer action buttons — Accept / Request Revisions */}
      {canAct && !showRevForm && (
        <div className="flex items-center gap-2 px-4 pb-4 pt-3">
          <button
            onClick={() => onAccept(notif.id)}
            className="flex items-center gap-1.5 rounded-lg bg-violet-2 px-3.5 py-1.5 text-xs font-medium text-bg-0 transition-opacity hover:opacity-90"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            Keep Changes
          </button>
          <button
            onClick={() => setShowRevForm(true)}
            className="flex items-center gap-1.5 rounded-lg border border-violet-3/30 bg-bg-1 px-3.5 py-1.5 text-xs text-ink/60 transition-colors hover:border-amber-400/40 hover:text-amber-400"
          >
            <Pencil className="h-3 w-3" />
            Request Revisions
          </button>
        </div>
      )}

      {/* AI alert action — send requirements */}
      {isAlert && recipient === "writer" && (
        <div className="flex items-center gap-2 px-4 pb-4 pt-3">
          <button
            onClick={() => onSendRequirements(notif)}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/80 px-3.5 py-1.5 text-xs font-medium text-bg-0 transition-opacity hover:opacity-90"
          >
            <Send className="h-3 w-3" />
            Send Updated Requirements
          </button>
        </div>
      )}

      {/* Revision form inline */}
      {showRevForm && (
        <div className="px-4 pb-4">
          <RevisionForm
            onSubmit={handleRevisionSubmit}
            onCancel={() => setShowRevForm(false)}
            busy={revBusy}
          />
        </div>
      )}

      {/* Designer action — Mark Design Complete */}
      {canMarkComplete && onMarkDesignComplete && (
        <div className="flex items-center gap-2 px-4 pb-4 pt-3">
          <button
            onClick={() => onMarkDesignComplete(notif.id)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/80 px-3.5 py-1.5 text-xs font-medium text-bg-0 transition-opacity hover:opacity-90"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            Mark Design Complete
          </button>
        </div>
      )}

      {/* bottom padding when no buttons */}
      {!canAct && !isAlert && !showRevForm && !canMarkComplete && <div className="pb-4" />}
    </motion.div>
  );
}

// ─── RIGHT: Notifications Feed ────────────────────────────────────────────────

function NotificationFeed({
  accentClass,
  recipient,
}: {
  accentClass: "violet" | "gold";
  recipient:   "writer" | "designer";
}) {
  const [feed,      setFeed]      = useState<Notification[]>([]);
  const [filter,    setFilter]    = useState<NotifFilter>("All");
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const badgeColor = accentClass === "gold" ? "bg-gold-2" : "bg-violet-2";

  // ─── Load + Realtime ─────────────────────────────────────────────────────

  const loadFeed = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await listNotifications(recipient);
      setFeed(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setLoadError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [recipient]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFeed();

    const unsub = subscribeNotifications(recipient, (incoming) => {
      // Trigger desktop notification if preference is on.
      // (We read the DOM-level permission; no need to fetch prefs here.)
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        sendDesktopNotification(incoming.title, incoming.message);
      }

      setFeed((prev) => {
        const idx = prev.findIndex((n) => n.id === incoming.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = incoming;
          return next;
        }
        // New notification — prepend.
        return [incoming, ...prev];
      });
    });

    return unsub;
  }, [recipient, loadFeed]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  async function handleAccept(id: string) {
    try {
      await acceptDesign(id);
      setFeed((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "accepted" } : n)),
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleRevision(id: string, input: RequestRevisionInput) {
    try {
      const newNotif = await requestRevision(id, input);
      setFeed((prev) => [
        newNotif,
        ...prev.map((n) =>
          n.id === id ? { ...n, status: "revision-requested" as const } : n,
        ),
      ]);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await markRead(id);
      setFeed((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n)),
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMarkUnread(id: string) {
    try {
      await markUnread(id);
      setFeed((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "unread" } : n)),
      );
    } catch (e) {
      console.error(e);
    }
  }

  async function handleMarkDesignComplete(id: string) {
    // Find the notification to get its characterId / characterName for the new notif.
    const original = feed.find((n) => n.id === id);
    try {
      // Mark the request as accepted.
      await acceptDesign(id);
      setFeed((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "accepted" as const } : n)),
      );
      // Create a "character-design-complete" notification for the writer.
      const newNotif = await createNotification({
        recipient:   "writer",
        sender:      "designer",
        type:        "character-design-complete",
        title:       original?.payload?.characterName
          ? `Design complete: ${String(original.payload.characterName)}`
          : original?.payload?.entityLabel
          ? `Design complete: ${String(original.payload.entityLabel)}`
          : "Design marked complete",
        message:     "The designer has marked this request as complete.",
        severity:    "success",
        characterId: original?.characterId ?? undefined,
        projectId:   original?.projectId   ?? undefined,
        parentId:    id,
        payload:     {
          characterName:  original?.payload?.characterName,
          entityLabel:    original?.payload?.entityLabel,
          originalTitle:  original?.title,
        },
      });
      setFeed((prev) => [newNotif, ...prev]);
    } catch (e) {
      console.error(e);
    }
  }

  function handleSendRequirements(notif: Notification) {
    // Pre-fill a revision form against the ai-validation-alert.
    // The ai-validation-alert always has recipient='writer' so the resulting
    // revision-request will go to the designer.
    // We open the inline revision form by setting the alert card's showRevForm
    // — handled via a separate state key here to avoid prop drilling.
    setRevisionTarget(notif.id);
  }

  const [revisionTarget, setRevisionTarget] = useState<string | null>(null);

  async function handleRequirementsSubmit(id: string, input: RequestRevisionInput) {
    try {
      const newNotif = await requestRevision(id, input);
      setFeed((prev) => [
        newNotif,
        ...prev.map((n) =>
          n.id === id ? { ...n, status: "revision-requested" as const } : n,
        ),
      ]);
      setRevisionTarget(null);
    } catch (e) {
      console.error(e);
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────

  const unreadCount = feed.filter((n) => n.status === "unread").length;
  const visible     = feed.filter((n) => filterMatch(n, filter));
  // Derive a lookup map from feed state for threading parent notifications in render.
  const parentMap   = useMemo(() => new Map(feed.map((n) => [n.id, n])), [feed]);

  const FILTERS: NotifFilter[] = ["All", "Unread", "Designer", "Writer", "System"];

  // ─── Render ───────────────────────────────────────────────────────────────

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
              <h2 className="font-display text-lg tracking-wide text-violet-1">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span
                  className={`flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full ${badgeColor} px-1 text-[10px] font-bold text-bg-0`}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs text-ink/40">
              Live updates from your collaborators and AI agents.
            </p>
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
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-2/30 border-t-violet-2" />
          <p className="mt-3 text-sm text-ink/40">Loading notifications…</p>
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-5 py-4 text-sm">
            <p className="font-medium text-red-400">Could not load notifications</p>
            <p className="mt-1 text-xs text-ink/50">{loadError}</p>
            <button
              onClick={() => void loadFeed()}
              className="mt-3 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BellOff className="h-8 w-8 text-ink/20" />
          <p className="mt-3 text-sm text-ink/40">
            No notifications in this category.
          </p>
        </div>
      ) : (
        <motion.div
          variants={listVariant}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3 overflow-y-auto pb-4 pr-1"
        >
          <AnimatePresence initial={false}>
            {visible.map((notif) => {
              const isAiAlert = notif.type === "ai-validation-alert";
              const showAiRevForm = isAiAlert && revisionTarget === notif.id;

              return (
                <div key={notif.id}>
                  <NotifCard
                    notif={notif}
                    recipient={recipient}
                    parentNotif={
                      notif.parentId
                        ? parentMap.get(notif.parentId)
                        : undefined
                    }
                    onAccept={handleAccept}
                    onRevisionSubmit={handleRevision}
                    onMarkRead={handleMarkRead}
                    onMarkUnread={handleMarkUnread}
                    onSendRequirements={handleSendRequirements}
                    onMarkDesignComplete={handleMarkDesignComplete}
                  />
                  {/* Requirements form for AI alerts — separate from card actions */}
                  {showAiRevForm && (
                    <div className="mt-2 px-1">
                      <RevisionForm
                        onSubmit={(input) =>
                          handleRequirementsSubmit(notif.id, input)
                        }
                        onCancel={() => setRevisionTarget(null)}
                        busy={false}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export function NotificationsPage({
  accentClass = "violet",
  recipient,
}: {
  accentClass?: "violet" | "gold";
  recipient:    "writer" | "designer";
}) {
  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden">
      {/* ── LEFT: Settings panel ── */}
      <motion.aside
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-violet-3/20 px-5 py-7 xl:flex"
      >
        <NotificationSettings persona={recipient} />
      </motion.aside>

      {/* ── RIGHT: Feed ── */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-7 md:px-8"
      >
        {/* Mobile settings accordion (shown below xl) */}
        <MobileSettingsDrawer persona={recipient} />

        <NotificationFeed accentClass={accentClass} recipient={recipient} />
      </motion.main>
    </div>
  );
}

// ─── mobile settings accordion ───────────────────────────────────────────────

function MobileSettingsDrawer({ persona }: { persona: "writer" | "designer" }) {
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
        <span
          className={`text-xs text-ink/35 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
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
              <NotificationSettings persona={persona} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
