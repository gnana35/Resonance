import Link from "next/link";
import { User } from "lucide-react";

export function TopNav() {
  return (
    <nav className="flex items-center justify-between border-b border-gold-3/20 px-6 py-4 md:px-10">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-2/60 font-display text-sm text-gold-1">
          R
        </div>
        <span className="font-display text-lg tracking-[0.3em] text-gold-1">
          RESONANCE
        </span>
      </Link>

      <div className="flex items-center gap-10">
        <a
          href="#"
          className="hidden text-ink transition-colors hover:text-gold-1 md:inline"
        >
          The studio
        </a>
        <a
          href="#"
          className="hidden text-ink transition-colors hover:text-gold-1 md:inline"
        >
          Creative lenses
        </a>
        <button
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-3/50 text-ink transition-colors hover:border-gold-2/70 hover:text-gold-1"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
