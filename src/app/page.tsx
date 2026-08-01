"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Sparkle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { LoginModal } from "@/components/LoginModal";

export default function Home() {
  const [loginOpen, setLoginOpen] = useState(false);
  // Firebase restores the session ASYNCHRONOUSLY. Reading auth.currentUser
  // synchronously returns null for the first moment after any page load, so an
  // already-signed-in user was shown the login modal again — which is what made
  // switching between Writer and Designer look like it required a re-login.
  // Track the real state instead, and treat "still checking" as not-yet-known.
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u);
    setAuthReady(true);
  }), []);

  function handleBeginResonance() {
    // Don't prompt before Firebase has reported in, or we'd ask a signed-in
    // user to log in again.
    if (!authReady) return;
    if (user) router.push("/onboarding");
    else setLoginOpen(true);
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <Image
        src="/assets/shared/hero.png"
        alt=""
        fill
        preload
        className="object-cover"
      />

      <div className="relative z-10 flex min-h-screen flex-col px-6 py-8 md:px-16 md:py-10">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-2/60 font-display text-sm text-gold-1">
              R
            </div>
            <span className="font-display text-lg tracking-[0.3em] text-gold-1">
              RESONANCE
            </span>
          </div>

          <div className="hidden items-center gap-10 md:flex">
            <button
              onClick={() => setLoginOpen(true)}
              className="rounded-full border border-gold-2/60 px-6 py-2 text-gold-2 transition-colors hover:border-gold-1 hover:text-gold-1"
            >
              Enter workspace
            </button>
          </div>

          <button
            onClick={() => setLoginOpen(true)}
            className="rounded-full border border-gold-2/60 px-5 py-2 text-sm text-gold-2 transition-colors hover:border-gold-1 hover:text-gold-1 md:hidden"
          >
            Enter workspace
          </button>
        </nav>

        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="mb-6 flex items-center gap-2 text-sm font-bold tracking-[0.2em] text-white">
            <Sparkle className="h-4 w-4" />
            THE VIRTUAL CREATIVE STUDIO
          </div>

          <h1 className="max-w-4xl font-display text-5xl leading-[1.1] text-gold-1 sm:text-6xl md:text-7xl">
            Where stories and{" "}
            <span className="italic text-gold-2">worlds</span> align.
          </h1>

          <p className="mt-8 max-w-2xl text-lg text-ink/85 md:text-xl">
            A living creative universe for writers, game designers, and
            worldbuilders to imagine, shape, and bring every connection to
            life.
          </p>

          <div className="mt-10 flex justify-center">
            <button
              onClick={handleBeginResonance}
              className="flex items-center gap-2 rounded-full bg-gold-2 px-8 py-4 font-medium text-bg-0 transition-colors hover:bg-gold-1"
            >
              Begin your resonance
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
