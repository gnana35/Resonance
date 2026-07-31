"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";

export function TopNav() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Subscribe to auth state once on mount
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut(auth);
    router.push("/");
  }

  return (
    <nav className="flex items-center justify-between border-b border-gold-3/20 px-6 py-4 md:px-10">
      {/* Goes to the persona chooser, not the marketing hero — a signed-in user
          clicking the logo wants to switch between Writer and Designer. */}
      <Link href="/onboarding" className="flex items-center gap-3">
        <Image
          src="/assets/shared/logo.png"
          alt="Resonance"
          width={36}
          height={36}
          className="h-9 w-9 rounded-full object-cover"
          priority
        />
        <span className="font-display text-lg tracking-[0.3em] text-gold-1">
          RESONANCE
        </span>
      </Link>

      <div className="flex items-center gap-10">
        {/* Avatar / account button */}
        <div className="relative" ref={menuRef}>
          <button
            aria-label="Account"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-3/50 text-ink transition-colors hover:border-gold-2/70 hover:text-gold-1 overflow-hidden"
          >
            {user?.photoURL ? (
              <Image
                src={user.photoURL}
                alt={user.displayName ?? "Profile photo"}
                width={36}
                height={36}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gold-3/40 bg-bg-1 py-2 shadow-lg">
              {user ? (
                <>
                  {/* User info header */}
                  <div className="flex items-center gap-3 border-b border-gold-3/20 px-4 pb-3 pt-1">
                    {user.photoURL ? (
                      <Image
                        src={user.photoURL}
                        alt={user.displayName ?? "Profile photo"}
                        width={40}
                        height={40}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-3/50 text-ink">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      {user.displayName && (
                        <p className="truncate text-sm font-medium text-ink">
                          {user.displayName}
                        </p>
                      )}
                      {user.email && (
                        <p className="truncate text-xs text-ink/50">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sign out */}
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2.5 text-left text-sm text-ink/80 transition-colors hover:bg-gold-3/10 hover:text-gold-1"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                /* Signed-out state — show sign-in prompt */
                <div className="px-4 py-2.5">
                  <p className="text-sm text-ink/60">Not signed in</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
