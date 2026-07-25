"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  FileText,
  FlaskConical,
  Globe,
  PenLine,
  Plus,
  Settings,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/writer",                  label: "Writer's Space", icon: PenLine,       exact: true },
  { href: "/writer/characters",       label: "Characters",     icon: User                       },
  { href: "/writer/world",            label: "World",          icon: Globe                      },
  { href: "/writer/notes",            label: "Notes",          icon: FileText                   },
  { href: "/writer/research",         label: "Research",       icon: FlaskConical               },
  { href: "/writer/notifications",    label: "Notifications",  icon: Bell,          badge: true },
  { href: "/writer/settings",         label: "Settings",       icon: Settings                   },
];

export function WriterSidebar() {
  const pathname = usePathname();

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
              {item.badge && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-2 px-1 text-[10px] font-bold text-bg-0">
                  3
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 flex flex-col gap-4">
        <button
          onClick={() => console.log("new project")}
          className="flex items-center justify-center gap-2 rounded-full border border-gold-2/50 py-2.5 text-sm text-gold-2 transition-colors hover:border-gold-1 hover:text-gold-1"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>
    </aside>
  );
}
