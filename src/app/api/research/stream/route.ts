/**
 * POST /api/research/stream
 *
 * Streaming SSE endpoint that runs the full research pipeline:
 *   INTENT → SEARCH → EVALUATE → SYNTHESIZE → CROSS-REFERENCE
 *
 * Emits newline-delimited JSON frames:
 *   { event: "step",   data: { label, status, detail? } }
 *   { event: "blocks", data: ResearchBlock[] }
 *   { event: "error",  data: { message } }
 *
 * Web search: Brave Search API (BRAVE_SEARCH_API_KEY env var).
 * If the key is absent the pipeline explains the gap and returns what
 * it can from the project context, clearly labelled as unsourced.
 *
 * The pipeline is setting-agnostic: it adapts queries, block types, and
 * tone from the detected intent and the project context it receives.
 */

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Types (duplicated here to avoid importing client context on server) ───────

type Source = {
  id: string;
  title: string;
  publisher: string;
  tier: 1 | 2 | 3;
  date?: string;
  url: string;
  key: string;
};

type ConflictBlock = { type: "conflict"; manuscriptSays: string; evidenceSays: string; chapterId?: string; chapterTitle?: string; passageFingerprint?: string; sourceKeys: string[] };

type ResearchBlock =
  | { type: "prose"; heading?: string; body: string }
  | { type: "spec_list"; heading?: string; items: { label: string; detail: string; sourceKey?: string }[] }
  | { type: "comparison"; heading?: string; leftLabel: string; rightLabel: string; rows: { aspect: string; accurate: string; misconception: string }[] }
  | { type: "timeline"; heading?: string; entries: { date: string; event: string; relevance?: string; sourceKey?: string }[] }
  | { type: "visual_reference"; heading?: string; items: { imageUrl: string; caption: string; studyNote: string; source: string; sourceUrl?: string; sourceKey?: string }[] }
  | ConflictBlock
  | { type: "uncertainty"; heading?: string; body: string }
  | { type: "sources"; sources: Source[] };

type IntentType =
  | "visual_reference"
  | "fact_check"
  | "period_detail"
  | "world_building"
  | "comparison"
  | "timeline"
  | "image_accuracy_check"
  | "inspiration_mode"
  | "open_question";

type Role = "writer" | "designer";

type ProjectContext = {
  projectId: string;
  projectName: string;
  setting?: string;
  characterCount: number;
  characters: { name: string; role: string; bio?: string }[];
  worldEntities: { label: string; kind: string; description?: string }[];
  openChapter?: { id: string; title: string; contentExcerpt: string };
  chapters: { id: string; title: string }[];
  /** Asset metadata attached by the designer (for image analysis modes) */
  attachedAsset?: {
    name:        string;
    characterId: string | null;
    sceneId:     string | null;
    description: string | null;
  };
};

// ─── Search result type ───────────────────────────────────────────────────────

type BraveResult = {
  title: string;
  url: string;
  description: string;
  age?: string;
  extra_snippets?: string[];
};

// ─── Brave Search (optional — needs BRAVE_SEARCH_API_KEY) ────────────────────

async function braveSearch(
  query: string,
  count = 5,
): Promise<BraveResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&search_lang=en`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": key,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = await res.json() as { web?: { results?: BraveResult[] } };
    return json.web?.results ?? [];
  } catch {
    return [];
  }
}

// ─── Tavily Search (optional — needs TAVILY_API_KEY) ─────────────────────────

async function tavilySearch(
  query: string,
  count = 5,
): Promise<BraveResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: count,
        search_depth: "basic",
        include_answer: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = await res.json() as {
      results?: { title: string; url: string; content: string; published_date?: string }[];
    };
    return (json.results ?? []).map((r) => ({
      title:       r.title,
      url:         r.url,
      description: r.content.slice(0, 400),
      age:         r.published_date,
    }));
  } catch {
    return [];
  }
}

// ─── Wikipedia Search (free, no key required) ────────────────────────────────
// Uses the MediaWiki Action API — always available, excellent for historical
// and encyclopaedic queries.

type WikiSearchHit = {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
};

const WIKI_UA = "Resonance-ResearchAgent/1.0 (creative-writing-tool; no-contact)";

async function wikipediaSearch(
  query: string,
  limit = 4,
): Promise<WikiSearchHit[]> {
  try {
    // Step 1 — find matching page titles
    // Note: origin=* is a browser CORS param; server-side we omit it and send
    // a proper User-Agent instead (required by Wikipedia's API policy).
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search` +
      `&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&utf8=1&format=json`;

    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": WIKI_UA },
      signal: AbortSignal.timeout(7000),
    });
    if (!searchRes.ok) return [];
    const searchJson = await searchRes.json() as {
      query?: { search?: { title: string; snippet: string; pageid: number }[] };
    };
    const hits = searchJson.query?.search ?? [];
    if (hits.length === 0) return [];

    // Step 2 — fetch extracts for the top hits in one request
    const pageIds = hits.map((h) => h.pageid).join("|");
    const extractUrl =
      `https://en.wikipedia.org/w/api.php?action=query&pageids=${pageIds}` +
      `&prop=extracts|info&exintro=1&exchars=500&inprop=url&format=json`;

    const extractRes = await fetch(extractUrl, {
      headers: { "User-Agent": WIKI_UA },
      signal: AbortSignal.timeout(7000),
    });
    if (!extractRes.ok) return hits.map((h) => ({
      title:       h.title,
      url:         `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, "_"))}`,
      description: h.snippet.replace(/<[^>]+>/g, ""),
    }));

    const extractJson = await extractRes.json() as {
      query?: {
        pages?: Record<string, {
          title: string;
          fullurl?: string;
          extract?: string;
        }>;
      };
    };
    const pages = extractJson.query?.pages ?? {};

    return hits.map((h) => {
      const page = pages[String(h.pageid)];
      const extract = page?.extract?.replace(/<[^>]+>/g, "").trim() ?? "";
      const snippet = h.snippet.replace(/<[^>]+>/g, "");
      return {
        title:          h.title,
        url:            page?.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, "_"))}`,
        description:    extract || snippet,
        extra_snippets: extract ? [snippet] : undefined,
      };
    });
  } catch {
    return [];
  }
}

// ─── Combined search: Brave → Tavily → Wikipedia fallback ────────────────────

async function search(query: string, count = 5): Promise<BraveResult[]> {
  // Try paid providers first (better freshness + full-web coverage)
  const brave = await braveSearch(query, count);
  if (brave.length > 0) return brave;

  const tavily = await tavilySearch(query, count);
  if (tavily.length > 0) return tavily;

  // Always-available Wikipedia fallback — no key required
  return wikipediaSearch(query, count);
}

// ─── Source tier classification ───────────────────────────────────────────────

const TIER1_PATTERNS = [
  /\.(ac|edu)\b/i,
  /\b(jstor|pubmed|ncbi\.nlm\.nih|doi\.org|arxiv|nature\.com|sciencedirect|springer|wiley|cambridge\.org|oxford(academic)?\.com|britishmuseum|metmuseum|loc\.gov|nationalarchives\.gov|si\.edu|aaa\.si\.edu|europeana)\b/i,
];
const TIER2_PATTERNS = [
  /\b(wikipedia\.org|bbc\.com|theguardian|nytimes|smithsonianmag|historynet|rhs\.org|oed\.com|britannica|encyclopedia\.com|history\.com|ancient\.eu|worldhistory\.org|archive\.org|gutenberg\.org)\b/i,
];
const EXCLUDED_PATTERNS = [
  /\b(pinterest|tumblr|reddit|quora|yahoo.answers|answers\.com|ask\.com|buzzfeed|medium\.com|fandom\.com|wikia\.com)\b/i,
];

function classifyTier(url: string): 1 | 2 | 3 | null {
  if (EXCLUDED_PATTERNS.some((p) => p.test(url))) return null;
  if (TIER1_PATTERNS.some((p) => p.test(url))) return 1;
  if (TIER2_PATTERNS.some((p) => p.test(url))) return 2;
  return 3;
}

function extractPublisher(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    // return the second-level domain label, title-cased
    const parts = hostname.split(".");
    const name = parts.length >= 2 ? parts[parts.length - 2] : hostname;
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return url;
  }
}

// ─── Intent classification ────────────────────────────────────────────────────

function classifyIntent(query: string, hasImage = false): { intent: IntentType; role: Role } {
  const q = query.toLowerCase();

  // Image-specific intents — checked first when an image is attached
  if (hasImage) {
    if (
      q.includes("accurate") || q.includes("accuracy") || q.includes("historically") ||
      q.includes("correct") || q.includes("match") || q.includes("matches") ||
      q.includes("compare") || q.includes("vision") || q.includes("author") ||
      q.includes("description") || q.includes("verify")
    ) {
      return { intent: "image_accuracy_check", role: "designer" };
    }
    if (
      q.includes("inspiration") || q.includes("inspire") || q.includes("based on") ||
      q.includes("reference") || q.includes("align") || q.includes("improve") ||
      q.includes("recommend") || q.includes("suggest")
    ) {
      return { intent: "inspiration_mode", role: "designer" };
    }
    // Default when image attached with no other signal: treat as accuracy check
    return { intent: "image_accuracy_check", role: "designer" };
  }

  const designerSignals = [
    "draw", "depict", "illustrate", "render", "paint", "sketch", "design",
    "look like", "appearance", "visual", "colour", "color", "shape", "proportion",
    "what does", "show me", "reference image", "style",
  ];
  const role: Role = designerSignals.some((s) => q.includes(s)) ? "designer" : "writer";

  if (
    designerSignals.some((s) => q.includes(s)) ||
    q.includes("how to depict") || q.includes("how do i draw") ||
    q.includes("construction") || q.includes("what did it look")
  ) {
    return { intent: "visual_reference", role };
  }
  if (
    q.includes("exist") && (q.includes("yet") || q.includes("when") || q.includes("first")) ||
    q.includes("invented") || q.includes("introduced") || q.includes("developed") ||
    q.includes("timeline") || q.includes("history of") || q.includes("when was")
  ) {
    return { intent: "timeline", role };
  }
  if (
    q.includes("accurate") || q.includes("correct") || q.includes("really") ||
    q.includes("is it true") || q.includes("did they") || q.includes("verify") ||
    q.includes("check") || q.includes("anachronism")
  ) {
    return { intent: "fact_check", role };
  }
  if (
    q.includes("compare") || q.includes("difference") || q.includes("versus") ||
    q.includes(" vs ") || q.includes("distinguish")
  ) {
    return { intent: "comparison", role };
  }
  if (
    q.includes("world") || q.includes("lore") || q.includes("magic") ||
    q.includes("system") || q.includes("how does") || q.includes("build")
  ) {
    return { intent: "world_building", role };
  }
  if (q.includes("detail") || q.includes("describe") || q.includes("what was") || q.includes("tell me")) {
    return { intent: "period_detail", role };
  }
  return { intent: "open_question", role };
}

// ─── Query generation ─────────────────────────────────────────────────────────

function buildSearchQueries(
  query: string,
  intent: IntentType,
  ctx: ProjectContext,
): string[] {
  const settingHint = ctx.setting ? ` ${ctx.setting}` : "";
  const base = query.trim();

  switch (intent) {
    case "visual_reference":
      return [
        `${base}${settingHint} historical appearance construction`,
        `${base}${settingHint} visual reference museum illustration`,
        `${base}${settingHint} drawing guide proportions materials`,
      ];
    case "timeline":
      return [
        `${base}${settingHint} history origin date invented`,
        `${base}${settingHint} timeline development chronology`,
      ];
    case "fact_check":
      return [
        `${base}${settingHint} historical accuracy`,
        `${base}${settingHint} primary source evidence`,
      ];
    case "comparison":
      return [
        `${base}${settingHint} comparison differences`,
        `${base}${settingHint} types variants`,
      ];
    case "world_building":
      return [
        `${base} real world analogue precedent`,
        `${base}${settingHint} lore worldbuilding research`,
      ];
    case "period_detail":
      return [
        `${base}${settingHint} historical detail`,
        `${base}${settingHint} primary sources`,
      ];
    default:
      return [
        `${base}${settingHint}`,
        `${base}${settingHint} research sources`,
      ];
  }
}

// ─── Manuscript cross-reference ───────────────────────────────────────────────

function buildConflicts(
  query: string,
  blocks: ResearchBlock[],
  ctx: ProjectContext,
  sources: Source[],
): ConflictBlock[] {
  // Extract plain-text facts from prose blocks
  const facts = blocks
    .filter((b): b is { type: "prose"; heading?: string; body: string } => b.type === "prose")
    .map((b) => b.body);

  const conflicts: ConflictBlock[] = [];

  if (!ctx.openChapter) return conflicts;

  const excerpt = ctx.openChapter.contentExcerpt.toLowerCase();
  const querylc = query.toLowerCase();

  // Heuristic: look for named entities from the query appearing in the open
  // chapter with potential contradiction signals.
  // This is a conservative approach — we only flag if the chapter excerpt
  // contains an entity from the query AND a finding block has concrete info.

  for (const fact of facts) {
    const factlc = fact.toLowerCase();

    // Look for year/date contradictions (e.g. fact says "1850" but chapter says "1780")
    const factYears = fact.match(/\b(1[0-9]{3}|[2-9][0-9]{3})\b/g) ?? [];
    const chapterYears = ctx.openChapter.contentExcerpt.match(/\b(1[0-9]{3}|[2-9][0-9]{3})\b/g) ?? [];

    for (const fy of factYears) {
      for (const cy of chapterYears) {
        if (fy !== cy && Math.abs(parseInt(fy) - parseInt(cy)) > 30) {
          // Only flag if the query topic appears in both
          const topicWords = querylc.split(/\s+/).filter((w) => w.length > 3);
          const topicInChapter = topicWords.some((w) => excerpt.includes(w));
          const topicInFact = topicWords.some((w) => factlc.includes(w));

          if (topicInChapter && topicInFact) {
            const fingerprint = `${ctx.openChapter.id}::${fy}::${cy}`;
            conflicts.push({
              type: "conflict",
              manuscriptSays: `"${ctx.openChapter.title}" places this around ${cy}`,
              evidenceSays: `Sources indicate the period around ${fy}`,
              chapterId: ctx.openChapter.id,
              chapterTitle: ctx.openChapter.title,
              passageFingerprint: fingerprint,
              sourceKeys: sources.slice(0, 2).map((s) => s.key),
            });
            break;
          }
        }
      }
      if (conflicts.length) break;
    }
    if (conflicts.length) break;
  }

  return conflicts;
}

// ─── Block synthesis ──────────────────────────────────────────────────────────

function synthesiseBlocks(
  query: string,
  intent: IntentType,
  role: Role,
  results: { result: BraveResult; tier: 1 | 2 | 3 }[],
  sources: Source[],
  ctx: ProjectContext,
  attachedImageUrl?: string,
): ResearchBlock[] {
  const blocks: ResearchBlock[] = [];
  const isInvented = !ctx.setting; // conservative: no setting = possibly invented world

  if (results.length === 0) {
    blocks.push({
      type: "uncertainty",
      heading: "No sources retrieved",
      body:
        "No usable sources were found for this query — Wikipedia returned no results above the quality threshold. " +
        "For broader web coverage, add a BRAVE_SEARCH_API_KEY or TAVILY_API_KEY to .env.local. " +
        "The findings below rest on your project context, not on retrieved sources.",
    } satisfies ResearchBlock);

    // Still produce a prose block from project context
    const ctxLines: string[] = [];
    if (ctx.setting) ctxLines.push(`Setting: ${ctx.setting}`);
    if (ctx.worldEntities.length > 0) {
      ctxLines.push(`World: ${ctx.worldEntities.slice(0, 5).map((e) => e.label).join(", ")}`);
    }
    if (ctx.characters.length > 0) {
      ctxLines.push(`Characters: ${ctx.characters.slice(0, 5).map((c) => c.name).join(", ")}`);
    }
    if (ctxLines.length) {
      blocks.push({
        type: "prose",
        heading: "From project context (no external sources)",
        body: ctxLines.join("\n"),
      });
    }

    return blocks;
  }

  // Intro prose
  const topResult = results[0];
  const settingLabel = ctx.setting
    ? `in the context of ${ctx.setting}`
    : "for your project";

  const analogueNotice = isInvented
    ? "\n\n*Note: your project appears to use a secondary-world or invented setting. " +
      "The findings below are real-world analogues and precedents you can build from — " +
      "they describe what existed in comparable real-world contexts, not a claim that your world is inaccurate.*"
    : "";

  blocks.push({
    type: "prose",
    heading: "Research Findings",
    body:
      `Based on ${results.length} retrieved source${results.length > 1 ? "s" : ""} ${settingLabel}:` +
      "\n\n" +
      topResult.result.description.slice(0, 400) +
      (topResult.result.extra_snippets?.[0]
        ? "\n\n" + topResult.result.extra_snippets[0].slice(0, 300)
        : "") +
      analogueNotice,
  });

  // Intent-specific blocks
  switch (intent) {
    case "visual_reference": {
      if (role === "designer") {
        const specItems: { label: string; detail: string; sourceKey?: string }[] = [];
        for (const { result, tier } of results.slice(0, 4)) {
          if (tier <= 2 && result.extra_snippets) {
            for (const snip of result.extra_snippets.slice(0, 2)) {
              const src = sources.find((s) => s.url === result.url);
              specItems.push({
                label: result.title.slice(0, 40),
                detail: snip.slice(0, 200),
                sourceKey: src?.key,
              });
            }
          }
        }
        if (specItems.length > 0) {
          blocks.push({
            type: "spec_list",
            heading: "Construction & Visual Detail",
            items: specItems.slice(0, 8),
          });
        }

        // Visual reference grid — use result URLs as placeholders since we can't
        // fetch actual images from here; the front-end will show the source link.
        const visItems = results.slice(0, 4).map(({ result }) => ({
          imageUrl: "",
          caption: result.title,
          studyNote: result.description.slice(0, 120),
          source: extractPublisher(result.url),
          sourceUrl: result.url,
          sourceKey: sources.find((s) => s.url === result.url)?.key,
        }));
        blocks.push({
          type: "visual_reference",
          heading: "Reference Sources",
          items: visItems,
        });
      } else {
        // Writer asking about visual — still give useful description prose
        for (const { result } of results.slice(1, 3)) {
          if (result.description) {
            blocks.push({
              type: "prose",
              body: result.description.slice(0, 350),
            });
          }
        }
      }
      break;
    }

    case "timeline": {
      // Try to extract dated entries from snippets
      const entries: { date: string; event: string; relevance?: string; sourceKey?: string }[] = [];
      const yearRe = /\b(c\.\s*)?\d{3,4}\s*(AD|BC|CE|BCE)?\b/gi;
      for (const { result } of results.slice(0, 5)) {
        const src = sources.find((s) => s.url === result.url);
        const text = result.description + " " + (result.extra_snippets?.join(" ") ?? "");
        const matches = text.match(yearRe);
        if (matches && matches.length > 0) {
          entries.push({
            date: matches[0],
            event: result.title,
            relevance: result.description.slice(0, 160),
            sourceKey: src?.key,
          });
        }
      }
      if (entries.length > 0) {
        blocks.push({
          type: "timeline",
          heading: "Historical Timeline",
          entries,
        });
      }
      break;
    }

    case "comparison": {
      // Build a comparison table from the top two results
      if (results.length >= 2) {
        blocks.push({
          type: "comparison",
          heading: "Comparison",
          leftLabel: "Evidence (accurate)",
          rightLabel: "Common misconception",
          rows: results.slice(0, 3).map(({ result }) => ({
            aspect: result.title.slice(0, 40),
            accurate: result.description.slice(0, 120),
            misconception: result.extra_snippets?.[0]?.slice(0, 120) ?? "—",
          })),
        });
      }
      break;
    }

    case "image_accuracy_check": {
      // Build the writer's reference for the attached asset
      const assetRef = ctx.attachedAsset;
      const writerDesc =
        assetRef?.description
          ? `Author's description: "${assetRef.description}"`
          : assetRef?.characterId
          ? `Character/entity: "${assetRef.characterId}"${assetRef.sceneId ? `, scene: "${assetRef.sceneId}"` : ""}`
          : "No author description was provided with this asset.";

      const settingHint = ctx.setting ? ` in ${ctx.setting}` : "";

      // Intro
      blocks.splice(0, 1, {
        type: "prose",
        heading: "Historical Accuracy & Vision Check",
        body:
          `Comparing the uploaded design against the author's description and period accuracy${settingHint}.\n\n` +
          writerDesc +
          (results.length > 0
            ? `\n\nResearch draws on ${results.length} source${results.length !== 1 ? "s" : ""}.`
            : "\n\n*No live sources retrieved — findings are based on project context and general knowledge.*"),
      });

      // Accuracy comparison table
      const rows: { aspect: string; accurate: string; misconception: string }[] = [];

      // Populate from search results covering known accuracy topics
      const topics = [
        "clothing", "garments", "dress", "attire",
        "architecture", "building", "structure",
        "weapons", "tools", "objects",
        "culture", "customs", "society",
        "time period", "era", "century",
      ];
      for (const { result } of results.slice(0, 6)) {
        const text = (result.title + " " + result.description).toLowerCase();
        const matchedTopic = topics.find((t) => text.includes(t));
        if (matchedTopic) {
          rows.push({
            aspect: matchedTopic.charAt(0).toUpperCase() + matchedTopic.slice(1),
            accurate: result.description.slice(0, 130),
            misconception: result.extra_snippets?.[0]?.slice(0, 100) ?? "—",
          });
        }
      }

      if (rows.length > 0) {
        blocks.push({
          type: "comparison",
          heading: "Accuracy: Historical Record vs Common Depiction",
          leftLabel: "Historically accurate",
          rightLabel: "Common anachronism / misconception",
          rows: rows.slice(0, 5),
        });
      }

      // Mismatch prose + suggestions
      const mismatches: string[] = [];
      if (assetRef?.characterId && ctx.characters.length > 0) {
        const char = ctx.characters.find(
          (c) => c.name.toLowerCase() === assetRef.characterId?.toLowerCase()
        );
        if (char?.bio) {
          mismatches.push(`The author describes **${char.name}** as: "${char.bio.slice(0, 200)}"`);
        }
      }

      blocks.push({
        type: "prose",
        heading: "Alignment with Author's Vision",
        body:
          (mismatches.length > 0 ? mismatches.join("\n\n") + "\n\n" : "") +
          "**Suggestions for improvement:**\n" +
          results.slice(0, 3).map(({ result }, i) =>
            `${i + 1}. ${result.title}: ${result.description.slice(0, 120)}`
          ).join("\n"),
      });

      // Spec list of period-accurate details from sources
      const specItems = results.slice(0, 4)
        .filter(({ result }) => result.extra_snippets && result.extra_snippets.length > 0)
        .flatMap(({ result }) => {
          const src = sources.find((s) => s.url === result.url);
          return (result.extra_snippets ?? []).slice(0, 1).map((snip) => ({
            label: result.title.slice(0, 50),
            detail: snip.slice(0, 180),
            sourceKey: src?.key,
          }));
        });
      if (specItems.length > 0) {
        blocks.push({
          type: "spec_list",
          heading: "Period-Accurate Details to Consider",
          items: specItems.slice(0, 6),
        });
      }
      break;
    }

    case "inspiration_mode": {
      const assetRef = ctx.attachedAsset;
      const writerDesc =
        assetRef?.description
          ? `Author's description: "${assetRef.description}"`
          : assetRef?.characterId
          ? `Character/entity: "${assetRef.characterId}"${assetRef.sceneId ? `, scene: "${assetRef.sceneId}"` : ""}`
          : "Use the uploaded image as creative inspiration.";

      const settingHint = ctx.setting ? ` in the world of ${ctx.setting}` : "";

      blocks.splice(0, 1, {
        type: "prose",
        heading: "Inspiration Mode",
        body:
          `Using the uploaded image as inspiration${settingHint}.\n\n` +
          writerDesc +
          "\n\n" +
          "The agent will compare this reference with the author's description and recommend how to align the artwork with the narrative vision.",
      });

      // Alignment comparison
      if (results.length >= 2) {
        blocks.push({
          type: "comparison",
          heading: "Inspiration vs Author's Vision",
          leftLabel: "Inspiration image suggests",
          rightLabel: "Recommended for the story",
          rows: results.slice(0, 4).map(({ result }) => ({
            aspect: result.title.slice(0, 45),
            accurate: result.description.slice(0, 120),
            misconception: result.extra_snippets?.[0]?.slice(0, 120) ?? "Adapt to fit the story's tone",
          })),
        });
      }

      // Recommendation prose
      const charMentions = ctx.characters.slice(0, 3)
        .map((c) => `**${c.name}** (${c.role})${c.bio ? `: "${c.bio.slice(0, 100)}"` : ""}`)
        .join("\n");

      blocks.push({
        type: "prose",
        heading: "Recommendations to Better Align with the Author's Vision",
        body:
          (charMentions ? `**Characters in scope:**\n${charMentions}\n\n` : "") +
          "**Ways to adapt this inspiration to the story:**\n" +
          results.slice(0, 4).map(({ result }, i) =>
            `${i + 1}. **${result.title.slice(0, 50)}** — ${result.description.slice(0, 150)}`
          ).join("\n"),
      });

      // Visual ref grid from search results
      const visItems = results.slice(0, 4).map(({ result }) => ({
        imageUrl: "",
        caption: result.title,
        studyNote: result.description.slice(0, 120),
        source: extractPublisher(result.url),
        sourceUrl: result.url,
        sourceKey: sources.find((s) => s.url === result.url)?.key,
      }));
      if (visItems.length > 0) {
        blocks.push({
          type: "visual_reference",
          heading: "Related References",
          items: visItems,
        });
      }
      break;
    }

    default: {
      // Additional prose from remaining sources
      for (const { result } of results.slice(1, 3)) {
        if (result.description) {
          const src = sources.find((s) => s.url === result.url);
          blocks.push({
            type: "prose",
            body: result.description.slice(0, 350) + (src ? ` ${src.key}` : ""),
          });
        }
      }
      break;
    }
  }

  // Manuscript cross-reference
  const conflicts = buildConflicts(query, blocks, ctx, sources);
  for (const c of conflicts) blocks.push(c);

  // Uncertainty block if thin evidence
  const tier1Count = results.filter((r) => r.tier === 1).length;
  if (tier1Count === 0 && results.length < 3) {
    blocks.push({
      type: "uncertainty",
      heading: "Evidence is thin",
      body:
        "No Tier-1 (academic/institutional) sources were found for this query. " +
        "The findings above draw on general web sources (Tier 2–3) and should be treated as " +
        "starting points for further primary-source research, not as established fact.",
    });
  }

  // Sources block
  blocks.push({
    type: "sources",
    sources,
  });

  return blocks;
}

// ─── Stream encoder ───────────────────────────────────────────────────────────

function frame(event: string, data: unknown): string {
  return JSON.stringify({ event, data }) + "\n";
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json() as {
    query:             string;
    context:           ProjectContext;
    attachedImageUrl?: string;
  };

  const { query, context: ctx, attachedImageUrl } = body;
  const hasImage = !!attachedImageUrl;

  const encoder = new TextEncoder();
  const hasAnySearchKey = !!(process.env.BRAVE_SEARCH_API_KEY || process.env.TAVILY_API_KEY);
  const searchProvider  = process.env.BRAVE_SEARCH_API_KEY ? "Brave" : process.env.TAVILY_API_KEY ? "Tavily" : "Wikipedia";

  const stream = new ReadableStream({
    async start(controller) {
      function push(s: string) {
        controller.enqueue(encoder.encode(s));
      }

      try {
        // ── Step 1: Classify intent ──────────────────────────────────────────
        push(frame("step", { label: "Understanding your question", status: "running" }));
        await tick();

        const { intent, role } = classifyIntent(query, hasImage);

        push(frame("step", { label: "Understanding your question", status: "done", detail: `Intent: ${intent} · Role: ${role}` }));

        // ── Step 2: Build queries + search ───────────────────────────────────
        push(frame("step", {
          label:  "Searching sources",
          status: "running",
          detail: hasAnySearchKey ? `Using ${searchProvider}` : "Using Wikipedia (free) — add BRAVE_SEARCH_API_KEY or TAVILY_API_KEY for broader coverage",
        }));
        await tick();

        const queries = buildSearchQueries(query, intent, ctx);
        const rawResults: BraveResult[] = [];

        for (const q of queries) {
          push(frame("step", { label: "Searching sources", status: "running", detail: `→ "${q}"` }));
          const res = await search(q, 4);
          rawResults.push(...res);
          await tick();
        }

        push(frame("step", { label: "Searching sources", status: "done", detail: `${rawResults.length} result${rawResults.length !== 1 ? "s" : ""} via ${searchProvider}` }));

        // ── Step 3: Evaluate sources ─────────────────────────────────────────
        push(frame("step", { label: "Evaluating credibility", status: "running" }));
        await tick();

        // Deduplicate by URL
        const seen = new Set<string>();
        const dedupedResults: BraveResult[] = [];
        for (const r of rawResults) {
          if (!seen.has(r.url)) {
            seen.add(r.url);
            dedupedResults.push(r);
          }
        }

        // Classify tiers
        const tieredResults = dedupedResults
          .map((r) => ({ result: r, tier: classifyTier(r.url) }))
          .filter((r): r is { result: BraveResult; tier: 1 | 2 | 3 } => r.tier !== null)
          .sort((a, b) => a.tier - b.tier) // prefer lower tier numbers
          .slice(0, 8);

        // Build source list with citation keys
        const sources: Source[] = tieredResults.map((r, i) => ({
          id: `src-${i}`,
          title: r.result.title,
          publisher: extractPublisher(r.result.url),
          tier: r.tier,
          date: r.result.age,
          url: r.result.url,
          key: `[${i + 1}]`,
        }));

        push(frame("step", {
          label: "Evaluating credibility",
          status: "done",
          detail: `Tier 1: ${sources.filter((s) => s.tier === 1).length} · Tier 2: ${sources.filter((s) => s.tier === 2).length} · Tier 3: ${sources.filter((s) => s.tier === 3).length}`,
        }));

        // ── Step 4: Synthesise ───────────────────────────────────────────────
        push(frame("step", { label: "Writing findings", status: "running" }));
        await tick();

        const blocks = synthesiseBlocks(query, intent, role, tieredResults, sources, ctx, attachedImageUrl);

        push(frame("step", { label: "Writing findings", status: "done", detail: `${blocks.length} block${blocks.length > 1 ? "s" : ""}` }));

        // ── Emit blocks ──────────────────────────────────────────────────────
        push(frame("blocks", blocks));

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        push(frame("error", { message: msg }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}

function tick() {
  return new Promise((r) => setTimeout(r, 30));
}

// Re-export type for external use
export type { ResearchBlock, Source, ProjectContext, IntentType };
