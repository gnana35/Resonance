"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  FlaskConical,
  Globe,
  PenLine,
  Settings,
  User,
} from "lucide-react";
import { useConsistency } from "@/context/ConsistencyContext";
import { subscribeUnreadChat } from "@/lib/assets";

const NAV_ITEMS = [
  { href: "/writer",                  label: "Writer's Space", icon: PenLine,       exact: true },
  { href: "/writer/characters",       label: "Characters",     icon: User                       },
  { href: "/writer/world",            label: "World",          icon: Globe                      },
  { href: "/writer/notes",            label: "Notes",          icon: FileText                   },
  { href: "/writer/research",         label: "Research",       icon: FlaskConical               },
  { href: "/writer/notifications",    label: "Notifications",  icon: Bell,          badge: true },
  { href: "/writer/settings",         label: "Settings",       icon: Settings                   },
];

function WriterSidebarInner() {
  const pathname = usePathname();
  const { pendingCount } = useConsistency();
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(
    () => subscribeUnreadChat("writer", ({ count }) => setChatUnread(count)),
    [],
  );

  const notifCount = pendingCount + chatUnread;

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-gold-3/20 px-4 py-6 md:w-72">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg border-l-2 px-4 py-2.5 transition-colors ${
                isActive
                  ? "border-gold-2 bg-gold-2/10 text-gold-1"
                  : "border-transparent text-ink/80 hover:border-gold-3/50 hover:bg-gold-2/5 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && notifCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-2 px-1 text-[10px] font-bold text-bg-0">
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/**
 * WriterSidebar — wraps the inner component in an error boundary so the
 * sidebar still renders even if ConsistencyContext is not yet available
 * (e.g. on pages outside the CharactersLayout wrapper).
 */
export function WriterSidebar() {
  return <WriterSidebarInner />;
}
