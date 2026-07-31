"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FlaskConical,
  Folder,
  Palette,
  Settings,
} from "lucide-react";
import { useConsistency } from "@/context/ConsistencyContext";
import { subscribeUnreadChat } from "@/lib/assets";
import { subscribeDesignRequests } from "@/lib/designRequests";

const NAV_ITEMS = [
  { href: "/designer",              label: "Designer's Space", icon: Palette,       exact: true },
  { href: "/designer/assets",       label: "Assets",           icon: Folder                    },
  { href: "/designer/research",     label: "Research",         icon: FlaskConical              },
  { href: "/designer/notifications",label: "Notifications",    icon: Bell,          badge: true },
// Unread chat replies count toward Notifications, not Assets: the writer's
// replies are notifications, and the notifications page is where they are read.
  { href: "/designer/settings",     label: "Settings",         icon: Settings                  },
];

export function DesignerSidebar() {
  const pathname = usePathname();
  const { pendingCount } = useConsistency();
  const [chatUnread, setChatUnread] = useState(0);

  const [requestUnread, setRequestUnread] = useState(0);

  useEffect(
    () => subscribeUnreadChat("designer", ({ count }) => setChatUnread(count)),
    [],
  );

  // Character design requests from the writer. These were missing from the
  // badge, so a new request arrived with no sidebar indication at all.
  useEffect(
    () =>
      subscribeDesignRequests((rows) =>
        setRequestUnread(rows.filter((r) => r.status === "open" && !r.read).length),
      ),
    [],
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-violet-3/30 px-4 py-6 md:w-72">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          // Notifications carries BOTH consistency items and unread chat replies.
          const count = item.badge ? pendingCount + chatUnread + requestUnread : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg border-l-2 px-4 py-2.5 transition-colors ${
                isActive
                  ? "border-violet-2 bg-violet-2/10 text-violet-1"
                  : "border-transparent text-ink/80 hover:border-violet-3/60 hover:bg-violet-2/5 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-2 px-1 text-[10px] font-bold text-bg-0">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
