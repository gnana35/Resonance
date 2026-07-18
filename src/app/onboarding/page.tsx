"use client";

import { useRouter } from "next/navigation";
import { Gamepad2, PenTool } from "lucide-react";
import { TopNav } from "@/components/TopNav";

const PERSONAS = [
  {
    key: "writer",
    href: "/writer",
    title: "Writer",
    description: "Craft stories, build worlds, and bring characters to life.",
    icon: PenTool,
    accent: "gold" as const,
  },
  {
    key: "designer",
    href: "/designer",
    title: "Game Designer",
    description:
      "Design gameplay, shape systems, and build immersive experiences.",
    icon: Gamepad2,
    accent: "violet" as const,
  },
];

export default function Onboarding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-bg-0">
      <TopNav />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-16 pt-16 text-center md:pt-20">
        <div className="mb-4 flex items-center gap-3 text-xs tracking-[0.25em] text-gold-2">
          <span className="h-px w-8 bg-gold-3/50" />
          CHOOSE YOUR PERSONA
          <span className="h-px w-8 bg-gold-3/50" />
        </div>

        <h1 className="font-display text-4xl text-gold-1 sm:text-5xl">
          What brings you here today?
        </h1>

        <p className="mt-4 text-lg text-ink/80">
          Select your creative path. You can always explore both later.
        </p>

        <div className="mt-14 grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            const isGold = persona.accent === "gold";
            return (
              <button
                key={persona.key}
                onClick={() => router.push(persona.href)}
                className={`group relative flex flex-col items-center overflow-hidden rounded-2xl border bg-bg-1 px-8 py-14 text-center transition-colors ${
                  isGold
                    ? "border-gold-3/40 hover:border-gold-2/70"
                    : "border-violet-400/25 hover:border-violet-400/60"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 opacity-60 ${
                    isGold
                      ? "bg-[radial-gradient(circle_at_50%_35%,rgba(217,168,78,0.16),transparent_60%)]"
                      : "bg-[radial-gradient(circle_at_50%_35%,rgba(139,127,240,0.18),transparent_60%)]"
                  }`}
                />

                <div
                  className={`relative mb-8 flex h-32 w-32 items-center justify-center rounded-full border ${
                    isGold
                      ? "border-gold-3/40 text-gold-2"
                      : "border-violet-400/30 text-violet-300"
                  }`}
                >
                  <Icon className="h-12 w-12 opacity-70" />
                </div>

                <div
                  className={`relative mb-5 flex h-12 w-12 items-center justify-center rounded-full border ${
                    isGold
                      ? "border-gold-2/60 text-gold-2"
                      : "border-violet-400/50 text-violet-300"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <h2
                  className={`relative font-display text-2xl ${
                    isGold ? "text-gold-1" : "text-ink"
                  }`}
                >
                  {persona.title}
                </h2>
                <p className="relative mt-3 max-w-xs text-ink/70">
                  {persona.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
