/**
 * consistencyEngine.ts
 *
 * Pure functions (no side effects, no React) for:
 *   1. extractManuscriptFacts  — derive facts from chapter text
 *   2. extractDesignFacts      — derive facts from a design + its layers
 *   3. compareAndDetect        — find discrepancies between manuscript and design facts
 *   4. fingerprint             — stable hash for (subject, attribute, mVal, dVal)
 *   5. toSlug                  — normalise entity names for matching
 *
 * Philosophy
 * ──────────
 * Extraction is intentionally coarse-grained: it looks for strong, explicit
 * textual or structural signals rather than trying to infer everything.
 * False positives (raising a discrepancy when things agree) are worse than
 * false negatives (missing a genuine disagreement).
 *
 * Subject normalisation is the main correctness lever: if two sides refer to
 * the same entity by slightly different names we must resolve them to the
 * same subject slug, otherwise we produce false conflicts.  The current
 * approach lower-cases, strips punctuation, collapses spaces, and aliases
 * common title words (e.g. "the" prefix).
 */

import type { ExtractedFact, Discrepancy, DiscrepancyKind, CanonFact } from "@/data/consistency";
import type { Layer, LayerData, Design } from "@/context/DesignerContext";

/* ═════════════════════════════════════════════════════════════════════════
   SUBJECT SLUG — normalise entity names so the same thing matched on both sides
   ═════════════════════════════════════════════════════════════════════════ */

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "in", "on", "at", "to", "for",
  "by", "with", "is", "are", "was", "were", "be", "been", "being",
]);

/**
 * Convert a display name to a stable slug for comparison.
 * "The Broken Tower" → "broken-tower"
 * "Lord Kael" → "kael" (given we strip titles)
 */
export function toSlug(label: string): string {
  const HONORIFICS = ["lord", "lady", "sir", "king", "queen", "prince", "princess",
    "duke", "duchess", "baron", "count", "countess", "captain", "general",
    "elder", "master", "mistress", "dr", "prof"];
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  // Remove leading stopwords and honorifics
  const filtered = words.filter((w) => !STOPWORDS.has(w) && !HONORIFICS.includes(w));
  // Fall back to original words (minus punctuation) if nothing remains
  const result = filtered.length > 0 ? filtered : words.filter(Boolean);
  return result.join("-");
}

/**
 * Two slugs match if one is a substring of the other (handles abbreviations),
 * or they are equal.
 */
export function subjectsMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  // One is a suffix/prefix of the other (e.g. "broken-tower" vs "tower")
  if (a.length >= 3 && b.includes(a)) return true;
  if (b.length >= 3 && a.includes(b)) return true;
  return false;
}

/* ═════════════════════════════════════════════════════════════════════════
   FINGERPRINT
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Produce a stable, deterministic fingerprint for a (subject, attribute,
 * manuscriptValue, designValue) tuple.  Used to suppress duplicate flags.
 */
export function fingerprint(
  subject: string,
  attribute: string,
  manuscriptValue: string,
  designValue: string,
): string {
  const s = [subject, attribute, manuscriptValue, designValue].join("\x00");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

/* ═════════════════════════════════════════════════════════════════════════
   MANUSCRIPT EXTRACTION
   ═════════════════════════════════════════════════════════════════════════ */

function htmlToText(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.innerText ?? div.textContent ?? "").trim();
}

// ── attribute pattern catalogue ────────────────────────────────────────────

type AttributePattern = {
  attribute: string;
  // patterns that precede the value in sentence context
  before?: RegExp;
  // patterns that follow subject and precede value
  verbPhrases?: RegExp[];
  // extract value from the match (default: first capture group)
  valueExtractor?: (m: RegExpMatchArray) => string;
};

const ATTRIBUTE_PATTERNS: AttributePattern[] = [
  // Eye colour
  {
    attribute: "eye-color",
    verbPhrases: [
      /(?:had?|has?|with?|whose?|their?)\s+(\w+(?:\s+\w+)?)\s+eyes?/i,
      /eyes?\s+(?:were?|are?|as?)\s+(\w+(?:\s+\w+)?)/i,
      /eyes?\s+(?:the\s+color\s+of\s+)?(\w+(?:\s+\w+)?)/i,
    ],
  },
  // Hair colour
  {
    attribute: "hair-color",
    verbPhrases: [
      /(?:had?|has?|with?|whose?|their?)\s+(\w+(?:\s+\w+)?)\s+hair/i,
      /hair\s+(?:were?|was?|are?|is?)\s+(\w+(?:\s+\w+)?)/i,
      /(\w+(?:-\w+)?)\s+hair(?:ed)?/i,
    ],
  },
  // Height / stature
  {
    attribute: "stature",
    verbPhrases: [
      /(?:was?|is?|were?|are?)\s+(tall|short|small|large|towering|imposing|slight|average|medium)[^.,:;]*/i,
      /(tall|short|small|large|towering|imposing|slight)\s+(?:man|woman|person|figure|warrior|knight|lord|lady)/i,
    ],
    valueExtractor: (m) => m[1].toLowerCase().trim(),
  },
  // Clothing / attire
  {
    attribute: "attire",
    verbPhrases: [
      /wore?\s+(?:a\s+|an\s+)?(\w+(?:\s+\w+){0,3})\s+(?:robe|cloak|armor|armour|gown|dress|coat|tunic|uniform|garb)/i,
      /dressed\s+in\s+(?:a\s+|an\s+)?(\w+(?:\s+\w+){0,3})/i,
    ],
  },
  // Weapon
  {
    attribute: "weapon",
    verbPhrases: [
      /carried?\s+(?:a\s+|an\s+)?(\w+(?:\s+\w+)?)\s+(?:sword|blade|axe|bow|spear|dagger|staff|mace|hammer|lance)/i,
      /(?:his?|her?|their?)\s+(?:signature\s+)?(?:weapon\s+(?:was?|is?|were?|are?)\s+)?(?:a\s+)?(\w+(?:\s+\w+)?)\s+(?:sword|blade|axe|bow|spear|dagger|staff|mace|hammer|lance)/i,
      /wielded?\s+(?:a\s+|an\s+)?(\w+(?:\s+\w+)?)\s+(?:sword|blade|axe|bow|spear|dagger|staff|mace|hammer|lance)/i,
    ],
  },
  // Location type
  {
    attribute: "location-type",
    verbPhrases: [
      /(?:was?|is?|were?|are?)\s+(?:a\s+|an\s+)?(\w+(?:\s+\w+)?)\s+(?:city|town|village|fortress|castle|tower|keep|forest|jungle|desert|mountain|swamp|marsh|lake|river|sea|ocean|island|kingdom|realm|empire|province|district)/i,
    ],
  },
  // Faction / allegiance
  {
    attribute: "allegiance",
    verbPhrases: [
      /(?:pledged?|swore?|served?|loyal\s+to|member\s+of|belonged?\s+to)\s+(?:the\s+)?([A-Z][a-zA-Z\s]{2,30})/,
      /(?:his?|her?|their?)\s+(?:house|clan|guild|order|faction)\s+(?:was?|is?)\s+(?:the\s+)?([A-Z][a-zA-Z\s]{2,20})/,
    ],
  },
  // Colour / hue of an object or place
  {
    attribute: "color",
    verbPhrases: [
      /(?:was?|is?|were?|are?)\s+(?:painted?|colored?|coloured?|tinged?|hued?|bathed?\s+in)\s+(\w+(?:\s+\w+)?)/i,
      /(?:glowed?|shimmered?|gleamed?)\s+(?:with\s+)?(?:a\s+|an\s+)?(\w+(?:\s+\w+)?)\s+(?:light|hue|glow|aura)?/i,
    ],
  },
];

/**
 * Given a noun / name and a block of text, extract attribute–value pairs.
 */
function extractAttributesForName(name: string, text: string): Array<{ attribute: string; value: string }> {
  const results: Array<{ attribute: string; value: string }> = [];
  // Build a context window around mentions of the name (±300 chars)
  const nameLower = name.toLowerCase();
  const textLower = text.toLowerCase();
  let idx = 0;
  const windows: string[] = [];
  while ((idx = textLower.indexOf(nameLower, idx)) !== -1) {
    windows.push(text.slice(Math.max(0, idx - 100), Math.min(text.length, idx + 300)));
    idx += nameLower.length;
    if (windows.length >= 8) break;
  }
  if (windows.length === 0) return results;

  const combined = windows.join(" ");

  for (const pat of ATTRIBUTE_PATTERNS) {
    for (const re of pat.verbPhrases ?? []) {
      const m = combined.match(re);
      if (m) {
        const rawValue = pat.valueExtractor ? pat.valueExtractor(m) : (m[1] ?? "").toLowerCase().trim();
        if (rawValue && rawValue.length > 1 && rawValue.length < 60) {
          results.push({ attribute: pat.attribute, value: rawValue });
          break; // one value per attribute
        }
      }
    }
  }

  return results;
}

// ── proper noun detection ──────────────────────────────────────────────────

const SKIP_WORDS = new Set([
  "I", "He", "She", "They", "We", "It", "His", "Her", "Their", "Its",
  "The", "A", "An", "This", "That", "These", "Those",
  "Chapter", "Part", "Book", "Section",
  "North", "South", "East", "West",
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]);

const NOUN_RE = /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,3})\b/g;

function extractProperNouns(text: string): string[] {
  const found = new Map<string, number>();
  let m: RegExpExecArray | null;
  NOUN_RE.lastIndex = 0;
  while ((m = NOUN_RE.exec(text)) !== null) {
    const noun = m[1].trim();
    if (SKIP_WORDS.has(noun.split(" ")[0])) continue;
    if (noun.length < 3 || noun.length > 40) continue;
    found.set(noun, (found.get(noun) ?? 0) + 1);
  }
  // Only return nouns that appear at least twice (reduces noise)
  return [...found.entries()]
    .filter(([, count]) => count >= 2)
    .map(([noun]) => noun);
}

/**
 * Extract facts from manuscript chapters for a given project.
 * Returns one ExtractedFact per (subject, attribute) pair found.
 */
export function extractManuscriptFacts(
  chapters: Array<{ id: string; title: string; content: string; projectId: string }>,
  projectId: string,
): ExtractedFact[] {
  const projectChapters = chapters.filter((c) => c.projectId === projectId);
  if (projectChapters.length === 0) return [];

  // Build full text (plain) per chapter for context
  const chapterTexts = projectChapters.map((c) => ({
    id: c.id,
    text: htmlToText(c.content),
  }));

  const fullText = chapterTexts.map((c) => c.text).join("\n\n");

  const nouns = extractProperNouns(fullText);

  const factMap = new Map<string, ExtractedFact>();

  for (const noun of nouns) {
    const slug = toSlug(noun);
    if (!slug) continue;

    // Find which chapter has the most mentions → use as sourceRef
    let bestChapter = projectChapters[0].id;
    let bestCount = 0;
    for (const ct of chapterTexts) {
      const count = (ct.text.match(new RegExp(noun.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) ?? []).length;
      if (count > bestCount) { bestCount = count; bestChapter = ct.id; }
    }

    const attrs = extractAttributesForName(noun, fullText);
    for (const { attribute, value } of attrs) {
      const key = `${slug}\x00${attribute}`;
      if (!factMap.has(key)) {
        factMap.set(key, {
          subject: slug,
          attribute,
          value,
          sourceRef: bestChapter,
        });
      }
    }
  }

  return [...factMap.values()];
}

/* ═════════════════════════════════════════════════════════════════════════
   DESIGN EXTRACTION
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Extract facts from a design's layer structure.
 * We look at layer names and text elements to infer what is depicted.
 */
export function extractDesignFacts(
  design: Design,
  layers: Layer[],
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const designId = design.id;

  // --- Title-based subject extraction ---
  // Design title often names the subject (e.g. "Kael Character Sheet", "The Broken Tower")
  const titleSubject = toSlug(design.title);
  const titleWords = design.title.toLowerCase();

  // Infer design type from title keywords
  const isCharacter = /character|portrait|figure|person|hero|villain|warrior|knight|mage|wizard|archer|rogue/i.test(design.title);
  const isLocation  = /tower|castle|city|town|village|fortress|forest|map|landscape|environment|building|structure|temple|palace/i.test(design.title);

  // --- Layer name analysis ---
  const designLayers = layers.filter((l) => l.designId === design.id && l.visible);

  for (const layer of designLayers) {
    const layerName = layer.name.toLowerCase();

    // Eye colour layer (e.g. "Eye Color - Amber", "Eyes: grey")
    const eyeMatch = layer.name.match(/eye[s\s:_-]+(?:color[s:_\s-]*)?([a-zA-Z]+)/i)
      ?? layer.name.match(/([a-zA-Z]+)\s+eye/i);
    if (eyeMatch) {
      const colorVal = eyeMatch[1].toLowerCase();
      if (colorVal && colorVal.length > 1) {
        facts.push({ subject: titleSubject, attribute: "eye-color", value: colorVal, sourceRef: designId });
      }
    }

    // Hair colour layer
    const hairMatch = layer.name.match(/hair[s\s:_-]+(?:color[s:_\s-]*)?([a-zA-Z]+)/i)
      ?? layer.name.match(/([a-zA-Z]+)\s+hair/i);
    if (hairMatch) {
      const colorVal = hairMatch[1].toLowerCase();
      if (colorVal && colorVal.length > 1) {
        facts.push({ subject: titleSubject, attribute: "hair-color", value: colorVal, sourceRef: designId });
      }
    }

    // Weapon layer
    const weaponTypes = ["sword", "blade", "axe", "bow", "spear", "dagger", "staff", "mace", "hammer", "lance", "shield"];
    for (const wt of weaponTypes) {
      if (layerName.includes(wt)) {
        const adjMatch = layer.name.match(/(\w+(?:\s+\w+)?)\s+(?:sword|blade|axe|bow|spear|dagger|staff|mace|hammer|lance|shield)/i);
        const val = adjMatch ? adjMatch[0].toLowerCase().trim() : wt;
        facts.push({ subject: titleSubject, attribute: "weapon", value: val, sourceRef: designId });
        break;
      }
    }

    // Clothing layer
    const clothingTypes = ["robe", "cloak", "armor", "armour", "gown", "dress", "coat", "tunic", "uniform"];
    for (const ct of clothingTypes) {
      if (layerName.includes(ct)) {
        const adjMatch = layer.name.match(/(\w+(?:\s+\w+)?)\s+(?:robe|cloak|armor|armour|gown|dress|coat|tunic|uniform)/i);
        const val = adjMatch ? adjMatch[0].toLowerCase().trim() : ct;
        facts.push({ subject: titleSubject, attribute: "attire", value: val, sourceRef: designId });
        break;
      }
    }

    // Colour-named layers for locations
    if (isLocation) {
      const colorNames = ["red", "blue", "green", "yellow", "orange", "purple", "violet",
        "gold", "silver", "white", "black", "grey", "gray", "brown", "teal", "cyan", "crimson",
        "azure", "amber", "jade", "ebony", "ivory", "scarlet", "emerald", "obsidian"];
      for (const color of colorNames) {
        if (layerName.includes(color)) {
          facts.push({ subject: titleSubject, attribute: "color", value: color, sourceRef: designId });
          break;
        }
      }
    }

    // Stature / scale layer (for characters)
    if (isCharacter) {
      const statureMatch = layer.name.match(/\b(tall|short|large|small|imposing|slight|towering|massive)\b/i);
      if (statureMatch) {
        facts.push({ subject: titleSubject, attribute: "stature", value: statureMatch[1].toLowerCase(), sourceRef: designId });
      }
    }

    // Text elements — scan for attribute–value hints
    for (const textEl of (layer.data?.texts ?? [])) {
      const txt = textEl.text.trim();
      if (!txt || txt.length > 120) continue;

      // "Eye Color: Amber" style annotations
      const colonMatch = txt.match(/^([\w\s]+):\s*(.+)$/);
      if (colonMatch) {
        const rawAttr = colonMatch[1].toLowerCase().trim().replace(/\s+/g, "-");
        const rawVal  = colonMatch[2].toLowerCase().trim();
        const RECOGNISED_ATTRS = ["eye-color", "hair-color", "weapon", "attire", "stature",
          "allegiance", "age", "color", "faction", "height", "occupation"];
        if (RECOGNISED_ATTRS.includes(rawAttr) && rawVal.length < 60) {
          facts.push({ subject: titleSubject, attribute: rawAttr, value: rawVal, sourceRef: designId });
        }
      }
    }
  }

  // De-duplicate: last value for same (subject, attribute) wins
  const map = new Map<string, ExtractedFact>();
  for (const f of facts) {
    map.set(`${f.subject}\x00${f.attribute}`, f);
  }

  return [...map.values()];
}

/* ═════════════════════════════════════════════════════════════════════════
   COMPARISON AND DETECTION
   ═════════════════════════════════════════════════════════════════════════ */

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalise a value for comparison — lower-case, trim, collapse whitespace.
 * This reduces false positives from trivial formatting differences.
 */
function normalise(v: string): string {
  return v.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Two values agree if they are identical after normalisation, or one is a
 * substring of the other (handles "amber eyes" vs "amber").
 */
function valuesAgree(a: string, b: string): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return true;
  if (na.length >= 3 && nb.includes(na)) return true;
  if (nb.length >= 3 && na.includes(nb)) return true;
  return false;
}

export type CompareInput = {
  projectId: string;
  manuscriptFacts: ExtractedFact[];
  designFacts: ExtractedFact[];
  /** Fingerprints that have already been decided — skip these */
  suppressedFingerprints: Set<string>;
  existingPending: Discrepancy[];
};

export type CompareOutput = {
  /** Newly created discrepancies to add */
  newDiscrepancies: Discrepancy[];
};

/**
 * Compare manuscript facts against design facts for the same project.
 * Produces discrepancies only when the two sides genuinely disagree.
 * Suppresses fingerprints that have already been decided.
 */
export function compareAndDetect(input: CompareInput): CompareOutput {
  const { projectId, manuscriptFacts, designFacts, suppressedFingerprints, existingPending } = input;
  const now = Date.now();
  const newDiscrepancies: Discrepancy[] = [];

  // Build lookup maps: subject(slug) → attribute → fact
  const mBySlug = new Map<string, Map<string, ExtractedFact>>();
  for (const f of manuscriptFacts) {
    // normalise: find any existing slug that matches
    let slug = f.subject;
    for (const existing of mBySlug.keys()) {
      if (subjectsMatch(existing, f.subject)) { slug = existing; break; }
    }
    if (!mBySlug.has(slug)) mBySlug.set(slug, new Map());
    mBySlug.get(slug)!.set(f.attribute, f);
  }

  const dBySlug = new Map<string, Map<string, ExtractedFact>>();
  for (const f of designFacts) {
    let slug = f.subject;
    for (const existing of dBySlug.keys()) {
      if (subjectsMatch(existing, f.subject)) { slug = existing; break; }
    }
    if (!dBySlug.has(slug)) dBySlug.set(slug, new Map());
    dBySlug.get(slug)!.set(f.attribute, f);
  }

  // Collect all (subject, attribute) pairs across both sides
  const allPairs = new Set<string>();
  for (const [slug, attrMap] of mBySlug) {
    for (const attr of attrMap.keys()) allPairs.add(`${slug}\x00${attr}`);
  }
  for (const [slug, attrMap] of dBySlug) {
    // Try to find matching manuscript subject
    let mSlug = slug;
    for (const ms of mBySlug.keys()) {
      if (subjectsMatch(ms, slug)) { mSlug = ms; break; }
    }
    for (const attr of attrMap.keys()) allPairs.add(`${mSlug}\x00${attr}`);
  }

  for (const pair of allPairs) {
    const [subject, attribute] = pair.split("\x00");

    // Resolve subject to manuscript slug (canonical)
    let mSlug = subject;
    for (const ms of mBySlug.keys()) {
      if (subjectsMatch(ms, subject)) { mSlug = ms; break; }
    }
    let dSlug = subject;
    for (const ds of dBySlug.keys()) {
      if (subjectsMatch(ds, subject)) { dSlug = ds; break; }
    }

    const mFact = mBySlug.get(mSlug)?.get(attribute);
    const dFact = dBySlug.get(dSlug)?.get(attribute);

    if (!mFact && !dFact) continue; // shouldn't happen

    const mVal = mFact?.value ?? "";
    const dVal = dFact?.value ?? "";
    const mRef = mFact?.sourceRef ?? "";
    const dRef = dFact?.sourceRef ?? "";

    // Both sides say the same thing → no discrepancy
    if (mFact && dFact && valuesAgree(mVal, dVal)) continue;

    let kind: DiscrepancyKind;
    if (mFact && dFact) {
      kind = "contradiction";
    } else if (dFact && !mFact) {
      kind = "addition";      // design depicts something the manuscript never establishes
    } else {
      kind = "omission";      // manuscript establishes something the design doesn't show
    }

    const fp = fingerprint(subject, attribute, mVal, dVal);

    // Skip suppressed fingerprints
    if (suppressedFingerprints.has(fp)) continue;

    // Skip if this exact pending discrepancy already exists
    if (existingPending.some((d) => d.fingerprint === fp && d.status === "pending")) continue;

    const disc: Discrepancy = {
      id: uid(),
      projectId,
      kind,
      subject,
      attribute,
      manuscriptValue: mVal,
      manuscriptRef: mRef,
      designValue: dVal,
      designRef: dRef,
      fingerprint: fp,
      status: "pending",
      decidedBy: null,
      decidedAt: null,
      decisionNote: null,
      supersededDecisionId: null,
      createdAt: now,
      updatedAt: now,
    };

    newDiscrepancies.push(disc);
  }

  return { newDiscrepancies };
}

/* ═════════════════════════════════════════════════════════════════════════
   WORLD UPDATE HELPER
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * When a writer approves a discrepancy, we produce a new CanonFact that
 * supersedes the old one (if any).
 */
export function buildApprovedFact(
  disc: Discrepancy,
  existingFacts: CanonFact[],
): { newFact: CanonFact; supersededId: string | null } {
  // Find the fact this supersedes (any fact for same subject+attribute)
  const existing = existingFacts.find(
    (f) => f.projectId === disc.projectId &&
           f.subject === disc.subject &&
           f.attribute === disc.attribute &&
           f.supersededFactId === null,
  );
  const newFact: CanonFact = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: disc.projectId,
    subject: disc.subject,
    attribute: disc.attribute,
    value: disc.designValue,
    origin: "design",
    sourceRef: disc.designRef,
    establishedAt: Date.now(),
    supersededFactId: existing?.id ?? null,
  };
  // Mark the old fact as superseded (returned for the caller to update)
  if (existing) {
    existing.supersededFactId = newFact.id;
  }
  return { newFact, supersededId: existing?.id ?? null };
}

/**
 * When a writer rejects a discrepancy, the manuscript fact stands.
 * If there is no current manuscript fact, create one from the manuscript value.
 */
export function buildRejectedFact(
  disc: Discrepancy,
  existingFacts: CanonFact[],
): CanonFact | null {
  if (!disc.manuscriptValue) return null; // no value to canonise
  const existing = existingFacts.find(
    (f) => f.projectId === disc.projectId &&
           f.subject === disc.subject &&
           f.attribute === disc.attribute &&
           f.origin === "manuscript",
  );
  if (existing) return null; // already there
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: disc.projectId,
    subject: disc.subject,
    attribute: disc.attribute,
    value: disc.manuscriptValue,
    origin: "manuscript",
    sourceRef: disc.manuscriptRef,
    establishedAt: Date.now(),
    supersededFactId: null,
  };
}

/**
 * Build the set of fingerprints that should be suppressed (already decided).
 * Includes approved and rejected discrepancies but NOT stale ones.
 */
export function buildSuppressedFingerprints(discrepancies: Discrepancy[]): Set<string> {
  const s = new Set<string>();
  for (const d of discrepancies) {
    if (d.status === "approved" || d.status === "rejected") {
      s.add(d.fingerprint);
    }
  }
  return s;
}
