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
};

// ─── Brave Search ─────────────────────────────────────────────────────────────

type BraveResult = {
  title: string;
  url: string;
  description: string;
  age?: string;
  extra_snippets?: string[];
};

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

// ─── Source tier classification ───────────────────────────────────────────────

const TIER1_PATTERNS = [
  /\.(ac|edu)\b/i,
  /\b(jstor|pubmed|ncbi\.nlm\.nih|doi\.org|arxiv|nature\.com|sciencedirect|springer|wiley|cambridge\.org|oxford(academic)?\.com|britishmuseum|metmuseum|loc\.gov|nationalarchives\.gov|si\.edu|aaa\.si\.edu|europeana)\b/i,
];
const TIER2_PATTERNS = [
  /\b(bbc\.com|theguardian|nytimes|smithsonianmag|historynet|rhs\.org|oed\.com|britannica|encyclopedia\.com|history\.com|ancient\.eu|worldhistory\.org|archive\.org|gutenberg\.org)\b/i,
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

function classifyIntent(query: string): { intent: IntentType; role: Role } {
  const q = query.toLowerCase();

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
): ResearchBlock[] {
  const blocks: ResearchBlock[] = [];
  const isInvented = !ctx.setting; // conservative: no setting = possibly invented world

  if (results.length === 0) {
    blocks.push({
      type: "uncertainty",
      heading: "No sources retrieved",
      body:
        "No usable web sources were returned for this query. " +
        "This may be because no search API key is configured (add BRAVE_SEARCH_API_KEY to .env.local), " +
        "or the search returned no results above quality threshold. " +
        "The findings below rest on the project context you provided, not on retrieved sources.",
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
    query: string;
    context: ProjectContext;
    attachedImageUrl?: string;
  };

  const { query, context: ctx } = body;

  const encoder = new TextEncoder();
  const hasBraveKey = !!process.env.BRAVE_SEARCH_API_KEY;

  const stream = new ReadableStream({
    async start(controller) {
      function push(s: string) {
        controller.enqueue(encoder.encode(s));
      }

      try {
        // ── Step 1: Classify intent ──────────────────────────────────────────
        push(frame("step", { label: "Understanding your question", status: "running" }));
        await tick();

        const { intent, role } = classifyIntent(query);

        push(frame("step", { label: "Understanding your question", status: "done", detail: `Intent: ${intent} · Role: ${role}` }));

        // ── Step 2: Build queries + search ───────────────────────────────────
        push(frame("step", { label: "Searching sources", status: hasBraveKey ? "running" : "error", detail: hasBraveKey ? "" : "No BRAVE_SEARCH_API_KEY — add it to .env.local for live results" }));
        await tick();

        const queries = buildSearchQueries(query, intent, ctx);
        const rawResults: BraveResult[] = [];

        if (hasBraveKey) {
          for (const q of queries) {
            push(frame("step", { label: "Searching sources", status: "running", detail: `→ "${q}"` }));
            const res = await braveSearch(q, 4);
            rawResults.push(...res);
            await tick();
          }
        }

        push(frame("step", { label: "Searching sources", status: "done", detail: `${rawResults.length} results` }));

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

        const blocks = synthesiseBlocks(query, intent, role, tieredResults, sources, ctx);

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
