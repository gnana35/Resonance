"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Flame,
  FileText,
  Globe,
  List,
  PenLine,
  Plus,
  Settings,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/writer", label: "Writer's Space", icon: PenLine },
  { href: "/writer/characters", label: "Characters", icon: User },
  { href: "/writer/world", label: "World", icon: Globe },
  { href: "/writer/notes", label: "Notes", icon: FileText },
  { href: "/writer/outliner", label: "Outliner", icon: List },
  { href: "/writer/stats", label: "Stats", icon: BarChart3 },
  { href: "/writer/settings", label: "Settings", icon: Settings },
];

const WEEK = [
  { label: "M", done: true },
  { label: "T", done: true },
  { label: "W", done: true },
  { label: "Th", done: true },
  { label: "F", done: true },
  { label: "Sa", done: true },
  { label: "Su", done: true },
];

export function WriterSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-gold-3/20 px-4 py-6 md:w-72">
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/writer"
              ? pathname === "/writer"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border-l-2 px-4 py-2.5 transition-colors ${
                isActive
                  ? "border-gold-2 bg-gold-2/10 text-gold-1"
                  : "border-transparent text-ink/80 hover:border-gold-3/50 hover:bg-gold-2/5 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 flex flex-col gap-4">
        <div className="rounded-xl border border-gold-3/25 bg-bg-1 p-4">
          <p className="text-sm text-ink/70">Writing Streak</p>
          <div className="mt-2 flex items-center gap-2">
            <Flame className="h-5 w-5 text-gold-2" />
            <span className="font-display text-xl text-gold-1">7 days</span>
          </div>
          <div className="mt-4 flex justify-between">
            {WEEK.map((day, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1.5 text-xs text-ink/50"
              >
                <span>{day.label}</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    day.done ? "bg-gold-2" : "border border-ink/40"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

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
