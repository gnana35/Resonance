"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  Bell,
  CheckCircle2,
  CloudUpload,
  FlaskConical,
  Folder,
  Music,
  Palette,
  PenTool,
  Settings,
  Image as ImageIcon,
} from "lucide-react";
import { useConsistency } from "@/context/ConsistencyContext";

const NAV_ITEMS = [
  { href: "/designer",                       label: "Designer's Space", icon: Palette,        exact: true  },
  { href: "/designer/moodboard",             label: "Moodboard",        icon: ImageIcon                    },
  { href: "/designer/sketchpad",             label: "Sketchpad",        icon: PenTool                      },
  { href: "/designer/assets",                label: "Assets",           icon: Folder                       },
  { href: "/designer/audio-music",           label: "Audio & Music",    icon: Music,          exact: true  },
  { href: "/designer/audio-music/analysis",  label: "Analysis",         icon: ActivitySquare               },
  { href: "/designer/approvals",             label: "Approvals",        icon: CheckCircle2                 },
  { href: "/designer/my-uploads",            label: "My Uploads",       icon: CloudUpload                  },
  { href: "/designer/research",              label: "Research",         icon: FlaskConical                 },
  { href: "/designer/notifications",         label: "Notifications",    icon: Bell,           badge: true  },
  { href: "/designer/settings",              label: "Settings",         icon: Settings                     },
];

export function DesignerSidebar() {
  const pathname = usePathname();
  const { pendingCount } = useConsistency();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-violet-3/30 px-4 py-6 md:w-72">
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
                  ? "border-violet-2 bg-violet-2/10 text-violet-1"
                  : "border-transparent text-ink/80 hover:border-violet-3/60 hover:bg-violet-2/5 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && pendingCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-2 px-1 text-[10px] font-bold text-bg-0">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
