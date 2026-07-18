"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  MUSE_CATEGORIES,
  MUSE_CREDITS,
  MUSE_PROMPT_EXAMPLES,
  MUSE_SUGGESTIONS,
  OUTFIT_PROMPT_EXAMPLES,
  type MuseCategory,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

const MAX_PROMPT_LENGTH = 500;

export default function AiMuse() {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<MuseCategory>("Themes");

  const suggestions = MUSE_SUGGESTIONS[category];

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-1 h-5 w-5 text-violet-2" />
          <div>
            <h1 className="font-display text-2xl text-violet-1">AI Muse</h1>
            <p className="mt-1 text-ink/70">
              Your creative co-pilot. Suggests themes, generates outfit
              prompts, and more.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-ink">Find Inspiration</p>
            <p className="text-sm text-ink/50">
              Tell the Muse your idea or feeling.
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-gold-3/30 px-3 py-1.5 text-sm text-gold-2">
            <Sparkles className="h-3.5 w-3.5" />
            {MUSE_CREDITS.toLocaleString()} Muse Credits
          </span>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
          placeholder="Describe the vibe, theme, or character you're imagining..."
          rows={3}
          className="mt-4 w-full resize-none rounded-xl border border-violet-3/25 bg-bg-0 p-4 text-ink placeholder:text-ink/40 focus:border-violet-2/50 focus:outline-none"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink/50">Examples:</span>
          {MUSE_PROMPT_EXAMPLES.map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              className="rounded-full border border-violet-3/25 px-3 py-1 text-sm text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-end gap-4">
          <span className="text-sm text-ink/40">
            {prompt.length} / {MAX_PROMPT_LENGTH}
          </span>
          <button
            onClick={() => console.log("inspire me", prompt)}
            className="flex items-center gap-2 rounded-full bg-violet-2 px-5 py-2.5 text-sm font-medium text-bg-0 transition-colors hover:bg-violet-1"
          >
            Inspire Me
            <Sparkles className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {MUSE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              category === cat
                ? "border border-violet-2 text-violet-1"
                : "border border-transparent bg-bg-1 text-ink/70 hover:text-ink"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-ink">Muse Suggestions</p>
        <p className="text-sm text-ink/50">
          Ideas generated for your current vibe.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {suggestions.map((card) => (
            <div
              key={card.id}
              className="overflow-hidden rounded-xl border border-violet-3/25 bg-bg-1"
            >
              <PlaceholderImage seed={card.id} className="h-32 w-full" />
              <div className="p-4">
                <p className="text-ink">{card.title}</p>
                <p className="mt-1.5 text-sm text-ink/60">
                  {card.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-violet-2/10 px-2.5 py-0.5 text-xs text-violet-2"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-ink">Outfit Prompt Examples</p>
        <p className="text-sm text-ink/50">
          Generated outfit ideas for your characters.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OUTFIT_PROMPT_EXAMPLES.map((card) => (
            <div
              key={card.id}
              className="overflow-hidden rounded-xl border border-violet-3/25 bg-bg-1"
            >
              <PlaceholderImage seed={card.id} className="h-32 w-full" />
              <div className="p-4">
                <p className="text-ink">{card.title}</p>
                <p className="mt-1.5 text-sm text-ink/60">
                  {card.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-violet-2/10 px-2.5 py-0.5 text-xs text-violet-2"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
