"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ChevronLeft,
  CircleDot,
  ExternalLink,
  Lock,
  LockOpen,
  MapPin,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { useCharacters } from "@/context/CharactersContext";
import { CharacterAvatar } from "@/components/CharacterAvatar";
import { DraftBadge } from "@/components/DraftBadge";
import {
  DeleteCharacterModal,
  EditCharacterModal,
  NewCharacterModal,
} from "@/components/CharacterModals";
import type { ArcPoint, Character, Evidence, LockableField } from "@/data/characters";

const TABS = ["Overview", "Role", "Relationships", "Arc", "Notes"] as const;
type Tab = (typeof TABS)[number];

/* ── Helpers ───────────────────────────────────────────────────────────── */

function getProjectChapters(projectId: string) {
  try {
    const raw = localStorage.getItem("resonance:chapters");
    if (!raw) return [];
    const all = JSON.parse(raw) as Array<{
      id: string; projectId: string; title: string; content: string; order: number;
    }>;
    return all
      .filter((c) => c.projectId === projectId)
      .sort((a, b) => a.order - b.order);
  } catch { return []; }
}

/* ── Evidence link ─────────────────────────────────────────────────────── */

function EvidenceLink({
  evidence,
  onOpen,
}: {
  evidence: Evidence;
  onOpen?: (chapterId: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen?.(evidence.chapterId)}
      title={`From "${evidence.chapterTitle}": ${evidence.excerpt}`}
      className="ml-1.5 inline-flex items-center gap-0.5 rounded text-xs text-gold-2/60 hover:text-gold-2"
    >
      <ExternalLink className="h-3 w-3" />
      <span className="underline underline-offset-2">{evidence.chapterTitle}</span>
    </button>
  );
}

/* ── Lock toggle ───────────────────────────────────────────────────────── */

function LockToggle({
  field,
  characterId,
  isLocked,
}: {
  field: LockableField;
  characterId: string;
  isLocked: boolean;
}) {
  const { lockField, unlockField } = useCharacters();
  return (
    <button
      onClick={() => isLocked ? unlockField(characterId, field) : lockField(characterId, field)}
      title={isLocked ? "Unlock — allow derivation to update this field" : "Lock — protect from derivation"}
      className={`ml-1.5 inline-flex items-center rounded p-0.5 text-xs transition-colors ${
        isLocked ? "text-gold-2 hover:text-ink" : "text-ink/20 hover:text-gold-2/60"
      }`}
    >
      {isLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
    </button>
  );
}

/* ── Derived field label ────────────────────────────────────────────────── */

function FieldHeader({
  label,
  field,
  characterId,
  isLocked,
  evidence,
  onOpenEvidence,
}: {
  label: string;
  field: LockableField;
  characterId: string;
  isLocked: boolean;
  evidence?: Evidence;
  onOpenEvidence?: (chapterId: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <h3 className="font-display text-lg text-gold-1">{label}</h3>
      <LockToggle field={field} characterId={characterId} isLocked={isLocked} />
      {evidence && !isLocked && (
        <EvidenceLink evidence={evidence} onOpen={onOpenEvidence} />
      )}
    </div>
  );
}

/* ── Fit evaluation panel ───────────────────────────────────────────────── */

function FitEvaluationPanel({
  character,
  onReEvaluate,
}: {
  character: Character;
  onReEvaluate: () => void;
}) {
  const eval_ = character.fitEvaluation;

  if (!eval_) {
    return (
      <div className="rounded-2xl border border-dashed border-gold-3/30 bg-bg-1 p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold-2/50" />
          <h3 className="font-display text-lg text-ink/50">Fit Evaluation</h3>
        </div>
        <p className="mt-3 text-sm text-ink/50">
          No evaluation yet. Run one to see how this character fits the story.
        </p>
        <button
          onClick={onReEvaluate}
          className="mt-4 flex items-center gap-2 rounded-full bg-gold-2/15 px-4 py-2 text-sm text-gold-1 hover:bg-gold-2/25"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Evaluate Fit
        </button>
      </div>
    );
  }

  const scoreColor = eval_.verdict.score >= 7
    ? "text-emerald-400"
    : eval_.verdict.score >= 4
    ? "text-gold-2"
    : "text-red-400/80";

  return (
    <div className="flex flex-col gap-4">
      {/* Stale banner */}
      {eval_.isStale && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-300">
            The manuscript has changed since this evaluation was run.
          </p>
          <button
            onClick={onReEvaluate}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20"
          >
            <RefreshCw className="h-3 w-3" />
            Re-evaluate
          </button>
        </div>
      )}

      {/* Verdict card */}
      <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-2" />
            <h3 className="font-display text-lg text-gold-1">Does this character fit?</h3>
          </div>
          <span className={`font-display text-2xl ${scoreColor}`}>
            {eval_.verdict.score}
            <span className="ml-0.5 text-sm text-ink/30">/10</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-0">
          <div
            className={`h-full rounded-full transition-all ${eval_.verdict.score >= 7 ? "bg-emerald-500" : eval_.verdict.score >= 4 ? "bg-gold-2" : "bg-red-400/60"}`}
            style={{ width: `${eval_.verdict.score * 10}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-ink/80">{eval_.verdict.verdict}</p>
        <p className="mt-3 text-xs text-ink/30">
          Evaluated {new Date(eval_.generatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
          {!eval_.isStale && " · Current"}
        </p>
      </div>

      {/* Why they fit */}
      {eval_.whyFit.length > 0 && (
        <FitSection title="Why they fit" items={eval_.whyFit} accent="emerald" />
      )}

      {/* Problems */}
      {eval_.problems.length > 0 && (
        <FitSection title="Where the problems are" items={eval_.problems} accent="amber" />
      )}

      {/* Suggestions */}
      {eval_.suggestions.length > 0 && (
        <FitSection title="What could make them fit better" items={eval_.suggestions} accent="gold" />
      )}

      {!eval_.isStale && (
        <div className="flex justify-end">
          <button
            onClick={onReEvaluate}
            className="flex items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70"
          >
            <RefreshCw className="h-3 w-3" />
            Re-evaluate
          </button>
        </div>
      )}
    </div>
  );
}

function FitSection({
  title,
  items,
  accent,
}: {
  title: string;
  items: { text: string; sourceId?: string; sourceTitle?: string; sourceKind?: "chapter" | "character" }[];
  accent: "emerald" | "amber" | "gold";
}) {
  const dotColor = accent === "emerald" ? "bg-emerald-500/70" : accent === "amber" ? "bg-amber-400/70" : "bg-gold-2/70";
  return (
    <div className="rounded-xl border border-gold-3/20 bg-bg-1 p-4">
      <h4 className="text-xs font-medium uppercase tracking-wider text-ink/40">{title}</h4>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-ink/75">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
            <span>
              {item.text}
              {item.sourceTitle && item.sourceKind === "character" && (
                <Link
                  href={`/writer/characters/${item.sourceId}`}
                  className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-gold-2/60 underline underline-offset-2 hover:text-gold-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  {item.sourceTitle}
                </Link>
              )}
              {item.sourceTitle && item.sourceKind === "chapter" && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded text-xs text-gold-2/60">
                  <ExternalLink className="h-3 w-3" />
                  {item.sourceTitle}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Arc chart ─────────────────────────────────────────────────────────── */

function ArcChart({
  arcPoints,
  character,
}: {
  arcPoints: ArcPoint[];
  character: Character;
}) {
  const { updateCharacter } = useCharacters();
  const [hovered, setHovered] = useState<number | null>(null);

  const nonZero = arcPoints.filter((p) => p.value > 0);
  if (nonZero.length === 0) {
    return (
      <p className="text-sm text-ink/50">
        {character.name} has not appeared in any chapters yet. Write them into a
        chapter and refresh to build the arc.
      </p>
    );
  }

  const W = 400;
  const H = 80;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full min-w-[320px] max-w-lg text-gold-2"
        style={{ overflow: "visible" }}
      >
        <polyline
          points={arcPoints
            .map((p, i) =>
              `${(i / Math.max(arcPoints.length - 1, 1)) * W},${H - (p.value / 10) * H}`,
            )
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        {arcPoints.map((pt, i) => {
          const cx = (i / Math.max(arcPoints.length - 1, 1)) * W;
          const cy = H - (pt.value / 10) * H;
          return (
            <g key={pt.chapterId}>
              <circle
                cx={cx}
                cy={cy}
                r={hovered === i ? 5 : 3}
                fill={pt.locked ? "#f7e7b8" : "currentColor"}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {hovered === i && (
                <foreignObject x={Math.min(cx - 80, W - 160)} y={cy - 55} width="160" height="50">
                  <div className="rounded-lg border border-gold-3/30 bg-bg-0 px-2 py-1.5 text-xs text-ink/80 shadow-lg">
                    <p className="font-medium text-gold-1">{pt.chapterTitle}</p>
                    {pt.evidence && <p className="mt-0.5 text-ink/50 line-clamp-2">{pt.evidence}</p>}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {/* x-axis labels */}
      <div className="mt-1 flex justify-between text-xs text-ink/40">
        {arcPoints.length > 0 && <span>{arcPoints[0].chapterTitle}</span>}
        {arcPoints.length > 1 && <span>{arcPoints[arcPoints.length - 1].chapterTitle}</span>}
      </div>

      {/* arc labels */}
      {character.arcLabels && (
        <div className="mt-2 flex justify-between text-xs text-ink/50">
          <span>{character.arcLabels[0]}</span>
          <span>{character.arcLabels[1]}</span>
        </div>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */

export default function CharacterDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    characters,
    allCharacters,
    hydrated,
    updateCharacter,
    lockField,
    evaluateDraft,
    promoteToEstablished,
    declinePromotion,
    onOpenChapterEvidence,
  } = useCharacters();

  const character = characters.find((c) => c.id === id)
    ?? allCharacters.find((c) => c.id === id);
  const isDraft = character?.isDraft === true;
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [notes, setNotes] = useState(character?.notes ?? "");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);

  function handleEvaluateDraft() {
    if (!character) return;
    const chapters = getProjectChapters(character.projectId);
    evaluateDraft(character.id, chapters);
  }

  // Save notes on blur
  function handleNotesSave() {
    if (!character) return;
    updateCharacter(character.id, { notes });
    lockField(character.id, "arcSummary"); // notes are always writer-owned
  }

  if (!character && !hydrated) {
    return (
      <div className="px-6 py-8 md:px-10">
        <p className="text-ink/50">Loading…</p>
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
          <h1 className="font-display text-2xl text-gold-1">Character not found</h1>
          <p className="mt-2 text-ink/60">No character with id &quot;{id}&quot;.</p>
          <Link
            href="/writer/characters"
            className="mt-6 rounded-full bg-gold-2 px-6 py-2.5 font-medium text-bg-0 hover:bg-gold-1"
          >
            Back to Characters
          </Link>
        </div>
      </div>
    );
  }

  const locks = character.lockedFields ?? {};
  const evidence = character.evidence ?? {};

  return (
    <div className="px-6 py-8 md:px-10">
      {/* ── Promotion banner ── */}
      {character.promotionPending && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-gold-2/30 bg-gold-2/5 px-4 py-3">
          <p className="text-sm text-ink/80">
            <span className="font-medium text-gold-1">{character.name}</span> has appeared
            in your manuscript. Promote them to Established?
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => declinePromotion(character.id)}
              className="rounded-full border border-gold-3/30 px-3 py-1.5 text-xs text-ink/60 hover:text-ink"
            >
              Keep Draft
            </button>
            <button
              onClick={() => promoteToEstablished(character.id)}
              className="rounded-full bg-gold-2/20 px-3 py-1.5 text-xs font-medium text-gold-1 hover:bg-gold-2/30"
            >
              Promote
            </button>
          </div>
        </div>
      )}

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
            Edit
          </button>
          <button
            onClick={() => setShowDelete(true)}
            aria-label="Delete character"
            className="text-ink/30 transition-colors hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        {/* ── Sidebar ── */}
        <div>
          <CharacterAvatar
            name={character.name}
            avatarColor={character.avatarColor}
            className="aspect-[4/5] w-full rounded-2xl text-6xl"
          />
          <h1 className="mt-5 font-display text-3xl text-gold-1">{character.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-ink/60">{character.role}</p>
            {isDraft && <DraftBadge />}
          </div>

          <dl className="mt-5 flex flex-col gap-3 text-sm">
            <MetaRow icon={Users}     label="Age"         value={character.age !== undefined ? character.age : "—"} />
            <MetaRow icon={Briefcase} label="Occupation"  value={character.occupation ?? "—"} />
            <MetaRow icon={MapPin}    label="Origin"      value={character.origin ?? "—"} />
            <MetaRow icon={Users}     label="Affiliation" value={character.affiliation ?? "—"} />
            <MetaRow icon={CircleDot} label="Status"      value={character.status ?? "—"} />
          </dl>

          {character.traits.length > 0 && (
            <>
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
            </>
          )}
        </div>

        {/* ── Main content ── */}
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
                {isDraft && tab === "Arc" ? "Fit Evaluation" : tab}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {/* ── Overview ── */}
            {activeTab === "Overview" && (
              <div className="flex flex-col gap-8">
                <div>
                  <FieldHeader
                    label="Overview"
                    field="bio"
                    characterId={character.id}
                    isLocked={!!locks.bio}
                    evidence={evidence.bio}
                    onOpenEvidence={onOpenChapterEvidence}
                  />
                  <p className="mt-3 max-w-2xl text-ink/80">
                    {(character.bio ?? character.description) || "No overview yet."}
                  </p>
                </div>

                {character.keyTraits && character.keyTraits.length > 0 && (
                  <div>
                    <FieldHeader
                      label="Key Traits"
                      field="keyTraits"
                      characterId={character.id}
                      isLocked={!!locks.keyTraits}
                      evidence={evidence.keyTraits}
                      onOpenEvidence={onOpenChapterEvidence}
                    />
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

            {/* ── Role ── */}
            {activeTab === "Role" && (
              <div className="flex flex-col gap-8">
                <div>
                  <FieldHeader
                    label="Role in Story"
                    field="roleInStory"
                    characterId={character.id}
                    isLocked={!!locks.roleInStory}
                    evidence={evidence.roleInStory}
                    onOpenEvidence={onOpenChapterEvidence}
                  />
                  <p className="mt-3 max-w-2xl text-ink/80">
                    {character.roleInStory ?? "No role summary yet."}
                  </p>
                </div>
              </div>
            )}

            {/* ── Relationships ── */}
            {activeTab === "Relationships" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-gold-1">Relationships</h2>
                  <button
                    onClick={() => setShowAddChar(true)}
                    className="flex items-center gap-1.5 rounded-full border border-gold-3/30 px-3 py-1.5 text-xs text-ink/60 hover:border-gold-2/50 hover:text-ink"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit relationships
                  </button>
                </div>
                {character.relationships && character.relationships.length > 0 ? (
                  character.relationships.map((rel) => {
                    const other = allCharacters.find((c) => c.id === rel.characterId);
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
                            <p className="font-display text-base text-ink">{other.name}</p>
                            <span className="rounded-full bg-gold-2/10 px-2.5 py-0.5 text-xs text-ink/60">
                              {rel.relation}
                            </span>
                            {rel.proposed && (
                              <span className="rounded-full bg-violet-3/30 px-2 py-0.5 text-xs text-violet-2">
                                Proposed
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-ink/60">{rel.blurb}</p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="text-ink/60">No relationships yet.</p>
                )}
              </div>
            )}

            {/* ── Arc (established) ── */}
            {activeTab === "Arc" && !isDraft && (
              <div className="max-w-xl flex flex-col gap-6">
                <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
                  <FieldHeader
                    label="Character Arc"
                    field="arcSummary"
                    characterId={character.id}
                    isLocked={!!locks.arcSummary}
                    evidence={evidence.arcSummary}
                    onOpenEvidence={onOpenChapterEvidence}
                  />

                  {character.arcPoints && character.arcPoints.length > 0 ? (
                    <div className="mt-4">
                      <ArcChart arcPoints={character.arcPoints} character={character} />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-ink/50">
                      No arc data yet. Refresh the character scan after writing some chapters.
                    </p>
                  )}

                  <p className="mt-4 text-ink/75">
                    {character.arcSummary ?? "No arc summary yet."}
                  </p>
                </div>

                {/* Prior fit evaluation (kept after promotion as history) */}
                {character.fitEvaluation && (
                  <div className="rounded-xl border border-gold-3/15 bg-bg-0/40 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-ink/30">
                      Fit Evaluation History
                    </p>
                    <p className="mt-2 text-xs text-ink/50">
                      Score: {character.fitEvaluation.verdict.score}/10 ·{" "}
                      {character.fitEvaluation.verdict.verdict}
                    </p>
                    <p className="text-xs text-ink/30">
                      Evaluated {new Date(character.fitEvaluation.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Arc (draft) → Fit Evaluation ── */}
            {activeTab === "Arc" && isDraft && (
              <div className="max-w-xl">
                <FitEvaluationPanel
                  character={character}
                  onReEvaluate={handleEvaluateDraft}
                />
              </div>
            )}

            {/* ── Notes ── */}
            {activeTab === "Notes" && (
              <div className="max-w-2xl">
                <h2 className="font-display text-xl text-gold-1">Notes</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesSave}
                  placeholder="Freeform notes about this character…"
                  rows={8}
                  className="mt-4 w-full resize-y rounded-xl border border-gold-3/25 bg-bg-1 p-4 text-ink/80 placeholder:text-ink/40 focus:border-gold-2/50 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
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
      {showAddChar && (
        <NewCharacterModal onClose={() => setShowAddChar(false)} />
      )}
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
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
