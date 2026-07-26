"use client";

import { Sparkles } from "lucide-react";
import type { StoredStoryFit } from "@/lib/storyFit";

const BAND_PILL: Record<string, string> = {
  Low: "bg-ink/10 text-ink/60",
  Medium: "bg-gold-2/15 text-gold-2",
  High: "bg-gold-2/25 text-gold-1",
};

function formatGeneratedAt(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Advisory "Story Fit" read-out for Draft characters only. Renders a result
 * that was generated when the character was saved — callers gate on
 * `character.isDraft` and pass `character.storyFit`.
 */
export function StoryFitRating({ result }: { result: StoredStoryFit }) {
  const { score, band, summary, factors, generatedAt } = result;

  return (
    <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-2" />
          <h3 className="font-display text-lg text-gold-1">Story Fit</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${BAND_PILL[band]}`}
        >
          {band}
        </span>
      </div>

      <p className="mt-4 font-display text-3xl text-gold-1">
        {score.toFixed(1)}
        <span className="ml-1 text-base text-ink/40">/ 10</span>
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-0">
        <div
          className="h-full rounded-full bg-gold-2 transition-[width] duration-300"
          style={{ width: `${score * 10}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-ink/60">{summary}</p>

      <p className="mt-6 text-xs font-medium uppercase tracking-wider text-ink/40">
        What&apos;s feeding this
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {factors.map((factor) => (
          <div key={factor.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-sm text-ink/70">
              {factor.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-0">
              <div
                className="h-full rounded-full bg-gold-2/70"
                style={{ width: `${(factor.earned / factor.max) * 100}%` }}
              />
            </div>
            <span className="w-40 shrink-0 text-right text-xs text-ink/50">
              {factor.detail}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-1 border-t border-gold-3/15 pt-4">
        <p className="text-xs text-ink/40">
          AI Suggestion — advisory only, not a final decision. You know your
          story better than the score does.
        </p>
        <p className="text-xs text-ink/30">
          Generated {formatGeneratedAt(generatedAt)}
        </p>
      </div>
    </div>
  );
}

/** Shown on a draft whose analysis has not been generated yet. */
export function StoryFitPending({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gold-3/30 bg-bg-1 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold-2/50" />
        <h3 className="font-display text-lg text-ink/50">Story Fit</h3>
      </div>
      <p className="mt-3 text-sm text-ink/50">{message}</p>
    </div>
  );
}
