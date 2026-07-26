/**
 * Story Fit — an advisory score for Draft characters.
 *
 * Derived from the same inputs the Story Impact tab already collects: the
 * character's tags, how their role is defined, how the writer describes the
 * impact they're meant to have, how they connect to the existing cast, and
 * where they're anchored in the world.
 *
 * This is deliberately deterministic and explainable — every point is
 * attributable to a factor the writer can see and act on. It is a prompt for
 * reflection, never a verdict.
 */

import type { CharacterRelationship } from "@/data/characters";

export type StoryFitFactor = {
  label: string;
  detail: string;
  earned: number;
  max: number;
};

export type StoryFitBand = "Low" | "Medium" | "High";

export type StoryFitResult = {
  score: number;
  band: StoryFitBand;
  summary: string;
  factors: StoryFitFactor[];
};

/** A result that has been generated and stored on the character. */
export type StoredStoryFit = StoryFitResult & { generatedAt: number };

export type StoryFitInput = {
  role?: string;
  traits?: string[];
  overview?: string;
  arcSummary?: string;
  origin?: string;
  affiliation?: string;
  relationships?: CharacterRelationship[];
};

const BAND_SUMMARY: Record<StoryFitBand, string> = {
  Low: "Still thin. Give them a clearer role and a reason to be in the story.",
  Medium: "Taking shape. A sharper intended impact would strengthen the case.",
  High: "Well defined — distinct, connected, and with a clear job to do.",
};

export function computeStoryFit(input: StoryFitInput): StoryFitResult {
  const traits = (input.traits ?? []).map((t) => t.trim()).filter(Boolean);
  const distinctTraits = new Set(traits.map((t) => t.toLowerCase())).size;
  const role = (input.role ?? "").trim();
  const overview = (input.overview ?? "").trim();
  const arcSummary = (input.arcSummary ?? "").trim();
  const relationships = input.relationships ?? [];
  const origin = (input.origin ?? "").trim();
  const affiliation = (input.affiliation ?? "").trim();

  const factors: StoryFitFactor[] = [];

  // Distinct tags — a character the writer can describe in a few sharp words
  // tends to read distinctly on the page.
  factors.push({
    label: "Distinct tags",
    detail:
      distinctTraits === 0
        ? "No tags yet"
        : `${distinctTraits} distinct tag${distinctTraits === 1 ? "" : "s"}`,
    earned: distinctTraits === 0 ? 0 : distinctTraits === 1 ? 0.75 : distinctTraits === 2 ? 1.4 : 2,
    max: 2,
  });

  // Defined role — "Supporting" is the fallback applied to a blank role, so it
  // reads as generic rather than chosen.
  const roleIsGeneric = role === "" || role.toLowerCase() === "supporting";
  factors.push({
    label: "Defined role",
    detail: role === "" ? "No role set" : roleIsGeneric ? `Generic role (${role})` : role,
    earned: role === "" ? 0 : roleIsGeneric ? 0.75 : 1.5,
    max: 1.5,
  });

  // Intended impact — the single strongest signal that this character is
  // earning their place rather than filling space.
  factors.push({
    label: "Intended impact",
    detail:
      arcSummary === ""
        ? "Not described yet"
        : arcSummary.length < 60
          ? "Briefly described"
          : "Clearly described",
    earned: arcSummary === "" ? 0 : arcSummary.length < 60 ? 1.25 : 2.5,
    max: 2.5,
  });

  factors.push({
    label: "Overview depth",
    detail:
      overview === ""
        ? "No overview yet"
        : overview.length < 80
          ? "Short overview"
          : "Detailed overview",
    earned: overview === "" ? 0 : overview.length < 80 ? 0.75 : 1.5,
    max: 1.5,
  });

  // Connections — a character with no ties to the existing cast is harder to
  // weave into scenes that already exist.
  factors.push({
    label: "Cast connections",
    detail:
      relationships.length === 0
        ? "Not linked to anyone yet"
        : `${relationships.length} relationship${relationships.length === 1 ? "" : "s"}`,
    earned: relationships.length === 0 ? 0 : relationships.length === 1 ? 0.9 : 1.5,
    max: 1.5,
  });

  const anchors = [origin, affiliation].filter(Boolean).length;
  factors.push({
    label: "World anchoring",
    detail:
      anchors === 0
        ? "No origin or affiliation"
        : anchors === 1
          ? "Partly anchored"
          : "Origin and affiliation set",
    earned: anchors * 0.5,
    max: 1,
  });

  const raw = factors.reduce((sum, f) => sum + f.earned, 0);
  const score = Math.round(Math.min(raw, 10) * 10) / 10;
  const band: StoryFitBand = score < 4 ? "Low" : score < 7 ? "Medium" : "High";

  return { score, band, summary: BAND_SUMMARY[band], factors };
}

/** How long the analysis "runs" for before its result is ready. */
const GENERATION_MS = 1400;

/**
 * Runs the analysis for a saved character. Deliberately asynchronous: Story
 * Impact is generated once the writer commits the character, not live while
 * they are still typing into the form.
 */
export function generateStoryFit(
  input: StoryFitInput,
): Promise<StoredStoryFit> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ ...computeStoryFit(input), generatedAt: Date.now() });
    }, GENERATION_MS);
  });
}
