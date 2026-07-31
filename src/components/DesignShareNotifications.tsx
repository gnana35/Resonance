"use client";

/**
 * DesignShareNotifications
 *
 * Shows design-share notifications sent from the designer to the writer.
 * Each card shows the asset thumbnail, name, character/scene context,
 * description, and a timestamp.
 *
 * Writers can mark notifications as read. The validation status itself is
 * set through the Assets page (Approved / Needs Revision), which is surfaced
 * back to the designer's Assets library.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ImageIcon,
  PenTool,
} from "lucide-react";
import {
  markNotifRead,
  subscribeDesignShareNotifs,
  type DesignShareNotif,
} from "@/lib/assets";

function timeAgo(d: Date | number): string {
  const diff = Date.now() - (d instanceof Date ? d.getTime() : d);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function NotifCard({
  notif,
  onRead,
}: {
  notif: DesignShareNotif;
  onRead: (id: string) => void;
}) {
  return (
    <div
      className={`group flex gap-4 rounded-xl border p-4 transition-colors ${
        notif.read
          ? "border-violet-3/15 bg-bg-1/60"
          : "border-gold-2/25 bg-gold-2/5 hover:border-gold-2/40"
      }`}
    >
      {/* Thumbnail */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-violet-3/20 bg-bg-0">
        {notif.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={notif.previewUrl}
            alt={notif.assetName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-violet-3/40" />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-ink">
              New design ready for review
            </p>
            <p className="mt-0.5 text-sm text-ink/70 font-display">
              {notif.assetName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!notif.read && (
              <span className="h-2 w-2 rounded-full bg-gold-2" />
            )}
            <span className="whitespace-nowrap text-xs text-ink/35">
              {timeAgo(new Date(notif.createdAt))}
            </span>
          </div>
        </div>

        {(notif.characterId || notif.sceneId) && (
          <p className="mt-1 text-xs text-ink/45">
            {[notif.characterId, notif.sceneId].filter(Boolean).join(" · ")}
          </p>
        )}

        {notif.description && (
          <p className="mt-1 line-clamp-2 text-xs text-ink/55">
            {notif.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <Link
            href="/designer/assets"
            className="text-xs text-gold-2 transition-colors hover:text-gold-1 underline underline-offset-2"
          >
            View in Assets
          </Link>
          {!notif.read && (
            <button
              onClick={() => onRead(notif.id)}
              className="flex items-center gap-1 text-xs text-ink/40 transition-colors hover:text-ink"
            >
              <CheckCircle2 className="h-3 w-3" />
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DesignShareNotifications() {
  const [notifs,    setNotifs]    = useState<DesignShareNotif[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAll,   setShowAll]   = useState(false);

  useEffect(() => {
    const unsub = subscribeDesignShareNotifs(
      (n) => setNotifs(n),
      (err) => setLoadError(err.message),
    );
    return unsub;
  }, []);

  function handleMarkRead(id: string) {
    markNotifRead(id).catch(console.error);
  }

  const unreadCount = notifs.filter((n) => !n.read).length;
  const visible     = showAll ? notifs : notifs.slice(0, 5);

  if (loadError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        Could not load design notifications: {loadError}
      </div>
    );
  }

  if (notifs.length === 0) return null;

  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PenTool className="h-4 w-4 text-gold-2" />
          <h2 className="font-display text-sm tracking-widest text-ink/50 uppercase">
            Design Reviews
          </h2>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-2/20 px-1.5 text-[10px] font-medium text-gold-2">
              {unreadCount}
            </span>
          )}
        </div>
        {notifs.length > 5 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs text-ink/40 transition-colors hover:text-ink"
          >
            {showAll ? "Show less" : `Show all ${notifs.length}`}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {visible.map((n) => (
          <NotifCard key={n.id} notif={n} onRead={handleMarkRead} />
        ))}
      </div>
    </section>
  );
}
