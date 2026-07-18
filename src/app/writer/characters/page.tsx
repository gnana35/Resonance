"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, List, MoreVertical, Plus, User } from "lucide-react";
import { CHARACTERS } from "@/data/characters";
import { CharacterAvatar } from "@/components/CharacterAvatar";

export default function CharactersList() {
  const [view, setView] = useState<"grid" | "list">("grid");

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <User className="mt-1 h-5 w-5 text-ink/70" />
          <div>
            <h1 className="font-display text-2xl text-gold-1">Characters</h1>
            <p className="mt-1 text-ink/70">
              The people who shape your story.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-gold-3/25 p-1">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`rounded-md p-1.5 ${
                view === "grid"
                  ? "bg-gold-2/15 text-gold-1"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={`rounded-md p-1.5 ${
                view === "list"
                  ? "bg-gold-2/15 text-gold-1"
                  : "text-ink/50 hover:text-ink"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => console.log("new character")}
            className="flex items-center gap-2 rounded-full bg-gold-2 px-5 py-2.5 font-medium text-bg-0 transition-colors hover:bg-gold-1"
          >
            <Plus className="h-4 w-4" />
            New Character
          </button>
        </div>
      </div>

      <div
        className={
          view === "grid"
            ? "mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
            : "mt-8 flex flex-col gap-4"
        }
      >
        {CHARACTERS.map((character) =>
          view === "grid" ? (
            <Link
              key={character.id}
              href={`/writer/characters/${character.id}`}
              className="group relative rounded-2xl border border-gold-3/25 bg-bg-1 p-5 transition-colors hover:border-gold-2/50"
            >
              <button
                onClick={(e) => {
                  e.preventDefault();
                  console.log("character menu", character.id);
                }}
                aria-label="More options"
                className="absolute right-4 top-4 text-ink/40 hover:text-ink"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-4">
                <CharacterAvatar
                  name={character.name}
                  className="h-16 w-16 shrink-0 rounded-xl text-2xl"
                />
                <div>
                  <p className="font-display text-lg text-ink group-hover:text-gold-1">
                    {character.name}
                  </p>
                  <p className="text-sm text-ink/50">{character.role}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-ink/70">
                {character.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {character.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full bg-gold-2/10 px-3 py-1 text-xs text-gold-2"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </Link>
          ) : (
            <Link
              key={character.id}
              href={`/writer/characters/${character.id}`}
              className="group flex items-center gap-4 rounded-xl border border-gold-3/25 bg-bg-1 p-4 transition-colors hover:border-gold-2/50"
            >
              <CharacterAvatar
                name={character.name}
                className="h-12 w-12 shrink-0 rounded-lg text-lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-display text-base text-ink group-hover:text-gold-1">
                    {character.name}
                  </p>
                  <p className="text-sm text-ink/50">{character.role}</p>
                </div>
                <p className="mt-1 truncate text-sm text-ink/60">
                  {character.description}
                </p>
              </div>
              <div className="hidden shrink-0 gap-2 sm:flex">
                {character.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full bg-gold-2/10 px-3 py-1 text-xs text-gold-2"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
