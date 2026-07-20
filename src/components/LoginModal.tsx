"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, X } from "lucide-react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#5865F2" aria-hidden="true">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.93-1.53.07.07 0 0 0-.08.04c-.21.38-.45.87-.62 1.26a18.3 18.3 0 0 0-5.48 0 12.6 12.6 0 0 0-.63-1.26.08.08 0 0 0-.08-.04c-1.71.29-3.36.8-4.93 1.53a.07.07 0 0 0-.03.03C.53 8.7-.32 12.9.1 17.05a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.28a.08.08 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.08.08 0 0 1 .08.01c.12.1.24.19.37.28a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.11c.36.7.78 1.37 1.23 2a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6.02-3.03.08.08 0 0 0 .03-.06c.5-4.81-.84-8.98-3.55-12.65a.06.06 0 0 0-.03-.03ZM8.02 14.6c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.17 1.1 2.15 2.42 0 1.34-.95 2.42-2.15 2.42Zm7.96 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.17 1.1 2.15 2.42 0 1.34-.94 2.42-2.15 2.42Z" />
    </svg>
  );
}

export function LoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  function proceedToOnboarding() {
    onClose();
    router.push("/onboarding");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("login attempt", { email, rememberMe });
    proceedToOnboarding();
  }

  async function handleGoogleSignIn() {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
      router.push("/onboarding");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Google sign-in failed.";
      setGoogleError(message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-bg-0/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l border-gold-3/40 bg-bg-1 px-10 py-12"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-6 top-6 text-ink transition-colors hover:text-gold-1"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mt-6 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold-2/60 font-display text-2xl text-gold-1">
                R
              </div>
              <h2 className="mt-6 font-display text-3xl text-gold-1">
                Welcome back, Creative.
              </h2>
              <p className="mt-3 max-w-xs text-ink/80">
                Log in to your workspace and continue your resonance.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm text-ink/90"
                >
                  Email address
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-gold-3/40 bg-bg-0 px-4 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-ink/60" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-transparent text-ink placeholder:text-ink/40 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm text-ink/90"
                >
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-lg border border-gold-3/40 bg-bg-0 px-4 py-3">
                  <Lock className="h-4 w-4 shrink-0 text-ink/60" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-transparent text-ink placeholder:text-ink/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="shrink-0 text-ink/60 transition-colors hover:text-gold-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-ink/80">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gold-3/60 bg-bg-0 accent-gold-2"
                  />
                  Remember me
                </label>
                <a href="#" className="text-gold-2 hover:text-gold-1">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="mt-2 flex items-center justify-center gap-2 rounded-full bg-gold-2 py-3 font-medium text-bg-0 transition-colors hover:bg-gold-1"
              >
                Log in
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="my-8 flex items-center gap-4 text-xs text-ink/50">
              <div className="h-px flex-1 bg-gold-3/30" />
              OR
              <div className="h-px flex-1 bg-gold-3/30" />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="flex items-center justify-center gap-3 rounded-full border border-gold-3/40 py-3 text-ink transition-colors hover:border-gold-2/70 disabled:opacity-50"
              >
                <GoogleIcon />
                {googleLoading ? "Signing in…" : "Continue with Google"}
              </button>
              {googleError && (
                <p className="text-center text-xs text-red-400">{googleError}</p>
              )}
              <button
                type="button"
                onClick={proceedToOnboarding}
                className="flex items-center justify-center gap-3 rounded-full border border-gold-3/40 py-3 text-ink transition-colors hover:border-gold-2/70"
              >
                <DiscordIcon />
                Continue with Discord
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-ink/70">
              Don&apos;t have an account?{" "}
              <a href="#" className="text-gold-2 hover:text-gold-1">
                Sign up
              </a>
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
