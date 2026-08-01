/**
 * POST /api/extract-entities
 *
 * One-call-per-chapter structured entity extraction using Gemini.
 *
 * Request body:
 *   {
 *     chapterId:    string
 *     chapterTitle: string
 *     text:         string          – plain text of the chapter
 *     knownEntities: Array<{        – entities already in this project
 *       label:   string
 *       kind:    string
 *       aliases: string[]
 *     }>
 *   }
 *
 * Response (200):
 *   {
 *     entities: ExtractedEntity[]
 *     relationships: ExtractedRelationship[]
 *   }
 *
 * The model is asked for strict JSON — responseMimeType "application/json"
 * with a responseSchema forces Gemini to emit a parseable object, not prose.
 * No post-processing of free text; if the model deviates we return 422.
 *
 * Error responses: 400 (bad input), 422 (model returned unparseable JSON),
 * 500 (API key missing / network failure), 503 (API quota / overload).
 */

import type { NextRequest } from "next/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { generateJSON, LLMConfigError, activeProvider } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ─── Public extraction types (shared with callers) ────────────────────────── */

export type EntityKind =
  | "character"
  | "organization"
  | "location"
  | "object"
  | "event"
  | "story-arc";

export type ExtractedEntity = {
  label:      string;
  kind:       EntityKind;
  aliases:    string[];
  summary:    string;
  confidence: number;   // 0–1
  excerpt:    string;
  // Character-specific structured fields (only present when kind === "character")
  role?:        string;   // protagonist, antagonist, mentor, etc.
  occupation?:  string;   // what they do / their title
  origin?:      string;   // where they are from
  affiliation?: string;   // group, faction, or house they belong to
  status?:      string;   // alive, dead, missing, etc.
  traits?:      string[]; // personality traits mentioned in text
};

export type RelationshipType =
  | "located-in"
  | "member-of"
  | "travels-to"
  | "controls"
  | "occurred-at"
  | "owns"
  | "ally"
  | "rival"
  | "family"
  | "knows";

export type ExtractedRelationship = {
  sourceLabel:  string;
  targetLabel:  string;
  relationship: RelationshipType;
  confidence:   number;
  excerpt:      string;
};

export type ExtractionResult = {
  entities:      ExtractedEntity[];
  relationships: ExtractedRelationship[];
};

/* ─── Gemini response schema ────────────────────────────────────────────────── */

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  required: ["entities", "relationships"],
  properties: {
    entities: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["label", "kind", "aliases", "summary", "confidence", "excerpt"],
        properties: {
          label:      { type: SchemaType.STRING },
          kind: {
            type: SchemaType.STRING,
            format: "enum" as const,
            enum: ["character", "organization", "location", "object", "event", "story-arc"],
          },
          aliases:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          summary:    { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER },
          excerpt:    { type: SchemaType.STRING },
          // Optional character fields
          role:        { type: SchemaType.STRING },
          occupation:  { type: SchemaType.STRING },
          origin:      { type: SchemaType.STRING },
          affiliation: { type: SchemaType.STRING },
          status:      { type: SchemaType.STRING },
          traits:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
      },
    },
    relationships: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        required: ["sourceLabel", "targetLabel", "relationship", "confidence", "excerpt"],
        properties: {
          sourceLabel:  { type: SchemaType.STRING },
          targetLabel:  { type: SchemaType.STRING },
          relationship: {
            type: SchemaType.STRING,
            format: "enum" as const,
            enum: [
              "located-in", "member-of", "travels-to", "controls",
              "occurred-at", "owns", "ally", "rival", "family", "knows",
            ],
          },
          confidence: { type: SchemaType.NUMBER },
          excerpt:    { type: SchemaType.STRING },
        },
      },
    },
  },
};

/* ─── System prompt ────────────────────────────────────────────────────────── */

function buildPrompt(
  chapterTitle: string,
  knownEntities: Array<{ label: string; kind: string; aliases: string[] }>,
): string {
  const knownSummary =
    knownEntities.length > 0
      ? knownEntities
          .map((e) => {
            const a = e.aliases.length > 0 ? ` (also: ${e.aliases.join(", ")})` : "";
            return `  • ${e.label}${a} [${e.kind}]`;
          })
          .join("\n")
      : "  (none yet)";

  return `You are a precise story-world analyst extracting structured entities and relationships
from a fiction chapter. Return ONLY the JSON object — no prose, no markdown, no explanation.

CHAPTER: "${chapterTitle}"

ALREADY-KNOWN ENTITIES IN THIS PROJECT (match against these rather than inventing duplicates):
${knownSummary}

═══════════ EXTRACTION RULES ═══════════

ENTITIES
────────
1. Extract ONLY things the text establishes as existing — people, places, groups,
   objects, events, or story arcs that the narrative presents as real within the story.

2. NEVER extract a word merely because it is capitalised. Sentence-initial words
   are never entities on their own. The word must denote a named thing.

3. Use the FULL name exactly as the text gives it. If the text introduces
   "Lord Aldric Vane", the label is "Lord Aldric Vane". Put shorter forms ("Aldric",
   "Lord Vane", "Vane") in aliases — not as separate entities.

4. A person referred to by given name, family name, AND title in the same chapter
   is ONE entity with the others as aliases.

5. Every entity MUST have a kind:
   - character    → a person or named sentient being
   - organization → a faction, guild, army, order, family house, council
   - location     → a place: city, room, region, building, landmark
   - object       → a named item: weapon, relic, artefact, vehicle
   - event        → a named occurrence: battle, treaty, disaster, ceremony
   - story-arc    → a named plot thread or prophecy
   If something genuinely fits none of these, OMIT it.

6. Do NOT emit "Other" as a kind. If you cannot classify something, omit it.

7. If a known entity from the list above appears in the text, use its exact label
   from the list — do not create a new entry for it.

8. Confidence 0.9–1.0 = text names it directly; 0.6–0.89 = named but brief;
   below 0.6 = mentioned very obliquely. Only return entities with confidence ≥ 0.5.

9. Attach an excerpt (verbatim passage ≤ 80 chars) that directly establishes
   this entity. The excerpt must appear in the chapter text.

CHARACTER FIELDS (for character-kind entities only)
────────────────────────────────────────────────────
10. For each character entity, extract these fields when the text establishes them.
    Omit any field the text does not support — do NOT guess or infer:
    - role        → narrative function: Protagonist, Antagonist, Mentor, Ally,
                    Rival, Villain, or a named role the text assigns them
    - occupation  → job, title, or function in the world (e.g. "blacksmith", "captain")
    - origin      → place, kingdom, city, or background they come from
    - affiliation → faction, guild, house, army, or group they belong to
    - status      → Alive, Dead, Missing, Imprisoned (only if text explicitly states it)
    - traits      → personality traits the text explicitly shows (max 5 short phrases)

RELATIONSHIPS
─────────────
11. Extract relationships IN THE SAME PASS. Do not return entities without
    relationships when the text clearly shows how they connect.

12. Both sourceLabel and targetLabel MUST match a label in the entities array
    above (either from known entities or from entities you just extracted).

13. Allowed relationship types and when to use them:
    - located-in    → entity A is situated inside / part of entity B
    - member-of     → person or group belongs to an organization
    - travels-to    → character moves toward / arrives at a location
    - controls      → entity A commands, rules, or governs entity B
    - occurred-at   → an event took place at a location
    - owns          → character or group possesses an object
    - ally          → two entities cooperate or are loyal to each other
    - rival         → two entities oppose, compete with, or are hostile to each other
    - family        → two characters are related by blood or formal kinship
    - knows         → two characters are acquainted (use when no stronger type fits)

14. Attach a supporting excerpt (≤ 80 chars) to each relationship.

15. Only return what you can point to in the text. Return nothing invented.

Return JSON only.`;
}

/* ─── Request handler ───────────────────────────────────────────────────────── */

export async function POST(req: NextRequest): Promise<Response> {
  // Provider + key are resolved inside src/lib/llm.ts. A missing key throws
  // LLMConfigError, handled below.

  let body: {
    chapterId:     string;
    chapterTitle:  string;
    text:          string;
    knownEntities: Array<{ label: string; kind: string; aliases: string[] }>;
  };

  try {
    body = await req.json() as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { chapterId, chapterTitle, text, knownEntities = [] } = body;

  if (!chapterId || !chapterTitle || !text?.trim()) {
    return Response.json(
      { error: "chapterId, chapterTitle, and text are required" },
      { status: 400 },
    );
  }

  // Truncate very long chapters — Gemini flash context window is 1M tokens,
  // but we cap at ~24k chars (~6k tokens) to keep latency reasonable per chapter.
  // Groq's free tier caps TOKENS per minute (6000), not just requests. At
  // ~4 chars/token a 24k-char chapter is ~6000 tokens on its own — one chapter
  // would consume the entire minute. 8k chars (~2000 tokens) leaves room for
  // the system prompt and known-entity list, so ~2 chapters fit per minute.
  // Override with EXTRACT_TEXT_LIMIT if you move to a higher tier.
  const LIMIT = Number(process.env.EXTRACT_TEXT_LIMIT ?? 8_000);
  const cappedText = text.length > LIMIT ? text.slice(0, LIMIT) + "\n[truncated]" : text;

  const systemPrompt = buildPrompt(chapterTitle, knownEntities);

  try {
    // Groq counts the REQUESTED completion budget against tokens-per-minute, so
    // a 4096 reservation was ~70% of every call while the chapter text was under
    // 10%. Start small and only pay more when a chapter actually needs it.
    const baseTokens = Number(process.env.EXTRACT_MAX_TOKENS ?? 1500);

    /**
     * A dense chapter can exhaust the budget mid-object, and Groq rejects the
     * truncated result with 400 "Failed to generate JSON". That is a SIZE
     * problem, not a prompt problem — so retry once with double the budget
     * rather than raising it for every chapter and re-creating the TPM issue.
     */
    async function extract(maxTokens: number): Promise<string> {
      return generateJSON({
        system:      systemPrompt,
        user:        `\n\nCHAPTER TEXT:\n\n${cappedText}`,
        schema:      RESPONSE_SCHEMA,
        temperature: 0.1,        // near-deterministic for extraction
        maxTokens,
      });
    }

    let raw: string;
    try {
      raw = await extract(baseTokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const truncated = /failed to generate json|json_validate_failed/i.test(msg);
      if (!truncated) throw err;
      console.warn(
        `[extract-entities] "${chapterTitle}" exceeded ${baseTokens} tokens — retrying at ${baseTokens * 2}`,
      );
      raw = await extract(baseTokens * 2);
    }

    let parsed: ExtractionResult;
    try {
      parsed = JSON.parse(raw) as ExtractionResult;
    } catch {
      return Response.json(
        { error: "Model returned non-JSON output", raw: raw.slice(0, 500) },
        { status: 422 },
      );
    }

    // Sanitise: ensure arrays exist
    parsed.entities      = Array.isArray(parsed.entities)      ? parsed.entities      : [];
    parsed.relationships = Array.isArray(parsed.relationships) ? parsed.relationships : [];

    return Response.json(parsed satisfies ExtractionResult, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof LLMConfigError) {
      return Response.json({ error: err.message }, { status: 500 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    // Surface quota / rate-limit as 503
    const status =
      msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate_limit")
        ? 503
        : 500;
    return Response.json({ error: msg, provider: activeProvider() }, { status });
  }
}
