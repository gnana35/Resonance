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
    image: "/assets/shared/persona-writer.png",
    accent: "gold" as const,
  },
  {
    key: "designer",
    href: "/designer",
    title: "Game Designer",
    description:
      "Design gameplay, shape systems, and build immersive experiences.",
    icon: Gamepad2,
    image: "/assets/shared/persona-designer.png",
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

        <div className="mt-8 grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            const isGold = persona.accent === "gold";
            return (
              <button
                key={persona.key}
                onClick={() => router.push(persona.href)}
                className="group relative flex flex-col items-center pb-10 pt-0 text-center transition-opacity hover:opacity-90"
              >
                {/* full-card image */}
                <img
                  src={persona.image}
                  alt={persona.title}
                  className="relative h-88 w-full object-contain object-center drop-shadow-[0_0_40px_rgba(217,168,78,0.15)]"
                />

                {/* small icon badge */}
                <div
                  className={`relative mb-4 flex h-10 w-10 items-center justify-center rounded-full border ${
                    isGold
                      ? "border-gold-2/60 bg-bg-0/60 text-gold-2"
                      : "border-violet-400/50 bg-bg-0/60 text-violet-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
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
