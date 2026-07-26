"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Brain,
  Briefcase,
  ChevronLeft,
  CircleDot,
  Heart,
  MapPin,
  Pencil,
  Shield,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useCharacters } from "@/context/CharactersContext";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { StoryFitPending, StoryFitRating } from "@/components/StoryFitRating";
import { DraftBadge } from "@/components/DraftBadge";
import {
  CharacterMenu,
  type CharacterMenuAction,
  DeleteCharacterModal,
  DesignCharacterModal,
  EditCharacterModal,
} from "@/components/CharacterModals";

const TABS = ["Overview", "Role", "Relationships", "Arc", "Notes"] as const;
type Tab = (typeof TABS)[number];

const STAT_ICONS: Record<string, typeof Shield> = {
  Bravery: Shield,
  Empathy: Heart,
  Intelligence: Brain,
  Agility: Zap,
  Willpower: ShieldCheck,
};

export default function CharacterDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { characters, hydrated, updateCharacter } = useCharacters();
  const character = characters.find((c) => c.id === id);
  const isDraft = character?.isDraft === true;
  const router = useRouter();

  // `?tab=story-impact` deep-links from the "Story Impact ready" notification.
  // Read with the hook rather than `use(searchParams)`: the latter does not
  // occupy a stable hook slot once its promise resolves, which reorders the
  // hooks below it between renders.
  const requestedTab = useSearchParams().get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    requestedTab === "story-impact" ? "Arc" : "Overview",
  );
  const [notes, setNotes] = useState(character?.notes ?? "");

  // Modal state
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showDesign, setShowDesign] = useState(false);

  function handleMenuAction(action: CharacterMenuAction) {
    if (action === "edit") setShowEdit(true);
    else if (action === "delete") setShowDelete(true);
    else if (action === "design") setShowDesign(true);
    else if (action === "establish" && character) {
      // Promotes the draft: the badge and the draft-only Story Impact tab go
      // away, and the Arc tab takes over from here on.
      updateCharacter(character.id, { isDraft: false, storyFit: undefined });
      setActiveTab("Overview");
    }
  }

  // On a fresh page load the first render only has the seed characters, so a
  // recently created character would briefly look missing. Wait for the stored
  // list before deciding the id is unknown.
  if (!character && !hydrated) {
    return (
      <div className="px-6 py-8 md:px-10">
        <p className="text-ink/50">Loading character…</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="px-6 py-8 md:px-10">
        <Link
          href="/writer/characters"
          className="flex w-fit items-center gap-2 text-ink/70 transition-colors hover:text-gold-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Characters
        </Link>
        <div className="mt-16 flex flex-col items-center text-center">
          <h1 className="font-display text-2xl text-gold-1">
            Character not found
          </h1>
          <p className="mt-2 max-w-sm text-ink/60">
            We couldn&apos;t find a character with the id &quot;{id}&quot;.
          </p>
          <Link
            href="/writer/characters"
            className="mt-6 rounded-full bg-gold-2 px-6 py-2.5 font-medium text-bg-0 transition-colors hover:bg-gold-1"
          >
            Back to Characters
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex items-center justify-between">
        <Link
          href="/writer/characters"
          className="flex items-center gap-2 text-ink/70 transition-colors hover:text-gold-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Characters
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 rounded-full border border-gold-3/30 px-4 py-2 text-sm text-ink transition-colors hover:border-gold-2/60 hover:text-gold-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Character
          </button>
          <CharacterMenu isDraft={isDraft} onSelect={handleMenuAction} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <div>
          <CharacterAvatar
            name={character.name}
            avatarColor={character.avatarColor}
            className="aspect-[4/5] w-full rounded-2xl text-6xl"
          />

          <h1 className="mt-5 font-display text-3xl text-gold-1">
            {character.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ink/60">{character.role}</p>
            {isDraft && <DraftBadge />}
          </div>

          <dl className="mt-5 flex flex-col gap-3 text-sm">
            <MetaRow
              icon={Users}
              label="Age"
              value={
                character.age !== undefined && !Number.isNaN(character.age)
                  ? character.age
                  : "—"
              }
            />
            <MetaRow
              icon={Briefcase}
              label="Occupation"
              value={character.occupation ?? "—"}
            />
            <MetaRow
              icon={MapPin}
              label="Origin"
              value={character.origin ?? "—"}
            />
            <MetaRow
              icon={Users}
              label="Affiliation"
              value={character.affiliation ?? "—"}
            />
            <MetaRow
              icon={CircleDot}
              label="Status"
              value={character.status ?? "—"}
            />
          </dl>

          <p className="mt-6 text-sm text-ink/70">Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {character.traits.map((trait) => (
              <span
                key={trait}
                className="rounded-full bg-gold-2/10 px-3 py-1 text-xs text-ink/60"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex gap-6 border-b border-gold-3/20">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`-mb-px border-b-2 pb-3 text-sm transition-colors ${
                  activeTab === tab
                    ? "border-gold-2 text-gold-1"
                    : "border-transparent text-ink/50 hover:text-ink"
                }`}
              >
                {isDraft && tab === "Arc" ? "Story Impact" : tab}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {activeTab === "Overview" && (
              <div className="flex flex-col gap-8">
                <div>
                  <h2 className="font-display text-xl text-gold-1">
                    Overview
                  </h2>
                  <p className="mt-3 max-w-2xl text-ink/80">
                    {character.bio ?? character.description}
                  </p>
                </div>

                {character.keyTraits && (
                  <div>
                    <h3 className="font-display text-lg text-gold-1">
                      Key Traits
                    </h3>
                    <ul className="mt-3 flex flex-col gap-2 text-ink/75">
                      {character.keyTraits.map((trait) => (
                        <li key={trait} className="flex items-start gap-2">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold-2" />
                          {trait}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Role" && (
              <div className="flex flex-col gap-8">
                <div>
                  <h2 className="font-display text-xl text-gold-1">
                    Role in Story
                  </h2>
                  <p className="mt-3 max-w-2xl text-ink/80">
                    {character.roleInStory ?? "No role summary yet."}
                  </p>
                </div>

                {character.stats && (
                  <div>
                    <h3 className="font-display text-lg text-gold-1">
                      Core Stats
                    </h3>
                    <div className="mt-4 flex max-w-xl flex-col gap-4">
                      {character.stats.map((stat) => {
                        const Icon = STAT_ICONS[stat.label] ?? Shield;
                        return (
                          <div
                            key={stat.label}
                            className="flex items-center gap-3"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-gold-2" />
                            <span className="w-24 shrink-0 text-sm text-ink/70">
                              {stat.label}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-0">
                              <div
                                className="h-full rounded-full bg-gold-2"
                                style={{ width: `${stat.value * 10}%` }}
                              />
                            </div>
                            <span className="w-10 shrink-0 text-right text-sm text-ink/60">
                              {stat.value}/10
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "Relationships" && (
              <div className="flex flex-col gap-4">
                {character.relationships && character.relationships.length > 0 ? (
                  character.relationships.map((rel) => {
                    const other = characters.find(
                      (c) => c.id === rel.characterId,
                    );
                    if (!other) return null;
                    return (
                      <Link
                        key={rel.characterId}
                        href={`/writer/characters/${other.id}`}
                        className="flex items-center gap-4 rounded-xl border border-gold-3/25 bg-bg-1 p-4 transition-colors hover:border-gold-2/50"
                      >
                        <CharacterAvatar
                          name={other.name}
                          avatarColor={other.avatarColor}
                          className="h-12 w-12 shrink-0 rounded-lg text-lg"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-display text-base text-ink">
                              {other.name}
                            </p>
                            <span className="rounded-full bg-gold-2/10 px-2.5 py-0.5 text-xs text-ink/60">
                              {rel.relation}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-ink/60">
                            {rel.blurb}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-ink/60">No relationships recorded yet.</p>
                )}
              </div>
            )}

            {activeTab === "Arc" && isDraft && (
              <div className="flex max-w-xl flex-col gap-6">
                <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
                  <h3 className="font-display text-lg text-gold-1">
                    Story Impact
                  </h3>
                  <p className="mt-4 text-ink/75">
                    {character.arcSummary ??
                      "No story impact described yet. Add one in Edit Character to sharpen this read."}
                  </p>
                </div>

                {character.storyFit ? (
                  <StoryFitRating result={character.storyFit} />
                ) : (
                  <StoryFitPending message="Generating Story Impact analysis… you'll be notified when it's ready." />
                )}
              </div>
            )}

            {activeTab === "Arc" && !isDraft && (
              <div className="max-w-xl rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
                <h3 className="font-display text-lg text-gold-1">
                  Character Arc
                </h3>
                {character.arcPoints && character.arcLabels ? (
                  <>
                    <svg
                      viewBox="0 0 240 60"
                      className="mt-4 h-16 w-full text-gold-2"
                    >
                      <polyline
                        points={character.arcPoints
                          .map(
                            (v, i) =>
                              `${(i / (character.arcPoints!.length - 1)) * 240},${60 - v * 6}`,
                          )
                          .join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      {character.arcPoints.map((v, i) => (
                        <circle
                          key={i}
                          cx={(i / (character.arcPoints!.length - 1)) * 240}
                          cy={60 - v * 6}
                          r="3"
                          fill="currentColor"
                        />
                      ))}
                    </svg>
                    <div className="mt-1 flex justify-between text-xs text-ink/50">
                      <span>{character.arcLabels[0]}</span>
                      <span>{character.arcLabels[1]}</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-ink/60">No arc data yet.</p>
                )}
                <p className="mt-4 text-ink/75">
                  {character.arcSummary ?? "No arc summary yet."}
                </p>
              </div>
            )}

            {activeTab === "Notes" && (
              <div className="max-w-2xl">
                <h2 className="font-display text-xl text-gold-1">Notes</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Freeform notes about this character..."
                  rows={8}
                  className="mt-4 w-full resize-y rounded-xl border border-gold-3/25 bg-bg-1 p-4 text-ink/80 placeholder:text-ink/40 focus:border-gold-2/50 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <EditCharacterModal
          character={character}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showDelete && (
        <DeleteCharacterModal
          character={character}
          onClose={() => setShowDelete(false)}
          onDeleted={() => router.push("/writer/characters")}
        />
      )}
      {showDesign && (
        <DesignCharacterModal
          character={character}
          onClose={() => setShowDesign(false)}
        />
      )}
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gold-3/10 pb-2">
      <span className="flex items-center gap-2 text-ink/60">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
