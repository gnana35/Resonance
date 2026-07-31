/**
 * POST /api/research/chat
 *
 * Conversational research assistant for the writer persona.
 *
 * Request body: { threadId?: string; projectId: string; message: string }
 *
 * Behaviour:
 *  - Creates a new research_thread on the first message and auto-titles it.
 *  - Loads prior messages in the thread for conversational continuity.
 *  - Assembles real project context from Supabase (characters, world entities,
 *    outline chapters) — falls back to src/data/ mock data where tables do not
 *    yet exist, each fallback clearly TODO-marked.
 *  - Builds a system prompt that makes the LLM context-aware and instructs it
 *    to flag uncertainty rather than invent historical detail.
 *  - Streams the LLM response as NDJSON frames (event: "delta" / "done" /
 *    "error") using the Google Gemini generateContentStream API.
 *    Falls back to a non-streaming JSON response when GOOGLE_API_KEY is absent,
 *    explaining the gap.
 *  - Persists both the user message and the assistant reply to Supabase.
 *
 * The GOOGLE_API_KEY is read exclusively from process.env — never exposed to
 * the client bundle.  No NEXT_PUBLIC_ prefix is used.
 */

import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { streamChat } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Supabase (server-side — uses service-role key when available, else anon) ─

function getSupabase() {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();

  if (!url || !key) return null;

  // Strip a trailing /rest/v1/ that is sometimes pasted in by mistake.
  const cleanUrl = url.replace(/\/rest\/v1\/?$/, "");
  return createClient(cleanUrl, key);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DbThread = {
  id: string;
  project_id: string;
  persona: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type DbMessage = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: unknown[];
  created_at: string;
};

type ProjectContext = {
  projectName: string;
  setting?: string;
  characters: { name: string; role: string; bio?: string }[];
  worldEntities: { label: string; kind: string; description?: string }[];
  chapters: { title: string; summary?: string }[];
};

// ─── Project context assembly (Supabase first, src/data fallback) ─────────────

async function assembleProjectContext(projectId: string): Promise<ProjectContext> {
  const sb = getSupabase();

  // ── Characters ──────────────────────────────────────────────────────────────
  let characters: ProjectContext["characters"] = [];

  if (sb) {
    const { data: charRows, error: charErr } = await sb
      .from("characters")
      .select("name, role, bio")
      .eq("project_id", projectId)
      .limit(20);

    if (!charErr && charRows && charRows.length > 0) {
      characters = charRows.map((c: { name: string; role: string; bio?: string }) => ({
        name: c.name,
        role: c.role,
        bio: c.bio ?? undefined,
      }));
    } else {
      // TODO: replace with real Supabase read once the `characters` table is populated
      characters = [];
    }
  }

  // ── World entities ──────────────────────────────────────────────────────────
  let worldEntities: ProjectContext["worldEntities"] = [];

  if (sb) {
    const { data: worldRows, error: worldErr } = await sb
      .from("world_entities")
      .select("label, kind, description")
      .eq("project_id", projectId)
      .limit(30);

    if (!worldErr && worldRows && worldRows.length > 0) {
      worldEntities = worldRows.map(
        (e: { label: string; kind: string; description?: string }) => ({
          label: e.label,
          kind: e.kind,
          description: e.description ?? undefined,
        })
      );
    } else {
      // TODO: replace with real Supabase read once the `world_entities` table is populated
      worldEntities = [];
    }
  }

  // ── Outline / chapters ──────────────────────────────────────────────────────
  let chapters: ProjectContext["chapters"] = [];

  if (sb) {
    const { data: chapterRows, error: chapterErr } = await sb
      .from("chapters")
      .select("title, summary")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (!chapterErr && chapterRows && chapterRows.length > 0) {
      chapters = chapterRows.map((c: { title: string; summary?: string }) => ({
        title: c.title,
        summary: c.summary ?? undefined,
      }));
    } else {
      // TODO: replace with real Supabase read once the `chapters` table is populated
      // Falling back to the hardcoded outline in src/data/outline.ts
      const { OUTLINE } = await import("@/data/outline");
      for (const item of OUTLINE) {
        if (item.chapters) {
          for (const ch of item.chapters) {
            chapters.push({ title: ch.title, summary: ch.summary });
          }
        }
      }
    }
  } else {
    // No DB at all — fall back to src/data/outline.ts
    // TODO: replace with Supabase once connection is confirmed
    const { OUTLINE } = await import("@/data/outline");
    for (const item of OUTLINE) {
      if (item.chapters) {
        for (const ch of item.chapters) {
          chapters.push({ title: ch.title, summary: ch.summary });
        }
      }
    }
  }

  // ── Project name ────────────────────────────────────────────────────────────
  let projectName = "your project";
  let setting: string | undefined;

  if (sb) {
    const { data: projRow } = await sb
      .from("projects")
      .select("name, description")
      .eq("id", projectId)
      .maybeSingle();

    if (projRow) {
      projectName = projRow.name ?? "your project";
      setting = projRow.description?.slice(0, 120) ?? undefined;
    }
    // TODO: fall back to localStorage project data once projects table is confirmed
  }

  // Derive setting from world entities if we have locations
  if (!setting && worldEntities.length > 0) {
    const locations = worldEntities.filter((e) => e.kind === "location").slice(0, 3);
    if (locations.length > 0) setting = locations.map((l) => l.label).join(", ");
  }

  return { projectName, setting, characters, worldEntities, chapters };
}

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(ctx: ProjectContext): string {
  const charLines =
    ctx.characters.length > 0
      ? ctx.characters
          .slice(0, 10)
          .map((c) => `  • ${c.name} (${c.role})${c.bio ? ": " + c.bio.slice(0, 80) : ""}`)
          .join("\n")
      : "  (none loaded)";

  const worldLines =
    ctx.worldEntities.length > 0
      ? ctx.worldEntities
          .slice(0, 10)
          .map((e) => `  • ${e.label} [${e.kind}]${e.description ? ": " + e.description.slice(0, 60) : ""}`)
          .join("\n")
      : "  (none loaded)";

  const chapterLines =
    ctx.chapters.length > 0
      ? ctx.chapters
          .slice(0, 12)
          .map((c) => `  • ${c.title}${c.summary ? " — " + c.summary.slice(0, 80) : ""}`)
          .join("\n")
      : "  (none loaded)";

  return `You are a story-aware research assistant helping a writer named "writer" with their project "${ctx.projectName}".${ctx.setting ? ` The story is set in or around: ${ctx.setting}.` : ""}

Your role is to answer research questions that help the writer write more accurately, vividly, and confidently. You support questions about:
- Historical facts and accuracy
- Character inspiration (real-world figures, archetypes, naming conventions)
- World-building ideas (real-world analogues, cultural references, geography, systems)
- Cultural references and period detail
- Timeline consistency and chronology
- Plot research (political events, social structures, technology, medicine, etc.)
- General writing craft and storytelling

CRITICAL RULE — UNCERTAINTY:
Never invent historical facts, dates, names, or sources. If you are not certain of a detail, say so explicitly. Use phrases like "I'm not certain, but…" or "You should verify this, but…". A writer acting on a confident fabrication is the main failure mode. It is always better to say "I don't know — you should check a primary source" than to invent plausible-sounding detail.

PROJECT CONTEXT (use this to tailor your answers):

Characters:
${charLines}

World entities:
${worldLines}

Chapter outline:
${chapterLines}

RESPONSE FORMAT:
- Be conversational but precise. This is a chat, not a formal report.
- Use Markdown for structure when it helps (headers, bullet lists, bold terms).
- When you cite specific facts, indicate how confident you are and whether the writer should verify independently.
- Keep responses focused. Do not pad.
- If the question is ambiguous, ask a clarifying question rather than guessing.`;
}

// ─── NDJSON stream helpers ─────────────────────────────────────────────────────

function frame(event: string, data: unknown): string {
  return JSON.stringify({ event, data }) + "\n";
}

// ─── Thread helpers ────────────────────────────────────────────────────────────

async function getOrCreateThread(
  sb: ReturnType<typeof getSupabase>,
  threadId: string | undefined,
  projectId: string,
  firstMessage: string,
): Promise<{ id: string; isNew: boolean }> {
  if (!sb) {
    // No DB — return a client-generated id (will not persist)
    return { id: threadId ?? `local-${Date.now()}`, isNew: !threadId };
  }

  if (threadId) {
    // Verify the thread exists and belongs to this project
    const { data } = await sb
      .from("research_threads")
      .select("id")
      .eq("id", threadId)
      .eq("project_id", projectId)
      .maybeSingle();
    if (data) return { id: threadId, isNew: false };
  }

  // Create a new thread; auto-title from the first message (max 60 chars)
  const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "…" : "");
  const { data: newThread, error } = await sb
    .from("research_threads")
    .insert({ project_id: projectId, persona: "writer", title })
    .select("id")
    .single();

  if (error || !newThread) {
    throw new Error(`Failed to create research thread: ${error?.message ?? "unknown"}`);
  }

  return { id: newThread.id, isNew: true };
}

async function loadPriorMessages(
  sb: ReturnType<typeof getSupabase>,
  threadId: string,
  limit = 20,
): Promise<DbMessage[]> {
  if (!sb) return [];
  const { data, error } = await sb
    .from("research_messages")
    .select("id, thread_id, role, content, citations, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as DbMessage[];
}

async function persistMessage(
  sb: ReturnType<typeof getSupabase>,
  threadId: string,
  role: "user" | "assistant",
  content: string,
): Promise<string | null> {
  if (!sb) return null;
  const { data, error } = await sb
    .from("research_messages")
    .insert({ thread_id: threadId, role, content })
    .select("id")
    .single();
  if (error) return null;
  return data?.id ?? null;
}

// ─── Gemini streaming ─────────────────────────────────────────────────────────

type ChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Delegates to the provider shim in src/lib/llm.ts so this route follows
 * LLM_PROVIDER (groq | gemini) like the extraction route does.
 * Name kept for the existing call sites.
 */
async function* streamGemini(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  _apiKey: string,
): AsyncGenerator<string, void, unknown> {
  yield* streamChat({
    system:      systemPrompt,
    history,
    message:     userMessage,
    temperature: 0.4,
    maxTokens:   1200,
  });
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  const body = await req.json() as {
    threadId?: string;
    projectId: string;
    message: string;
  };

  const { threadId: incomingThreadId, projectId: rawProjectId, message } = body;

  if (!rawProjectId || !message?.trim()) {
    return Response.json({ error: "projectId and message are required" }, { status: 400 });
  }

  // ── Resolve a valid UUID for project_id ──────────────────────────────────────
  // The client stores project IDs as timestamp strings (e.g. "1785340565872-nkfmis")
  // generated by uid() in writer/page.tsx.  Postgres rejects these because
  // research_threads.project_id is typed uuid.
  // Until the app has a real project-creation + Supabase-sync flow, we substitute
  // the configured DEFAULT_PROJECT_ID when the incoming value isn't a UUID.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const defaultProjectId = process.env.DEFAULT_PROJECT_ID?.trim() ?? "";
  const projectId = UUID_RE.test(rawProjectId)
    ? rawProjectId
    : defaultProjectId || null;

  if (!projectId) {
    return Response.json(
      {
        error:
          "The active project ID is not a valid UUID. " +
          "Add DEFAULT_PROJECT_ID=<your-supabase-project-uuid> to .env.local " +
          "and restart the dev server.",
      },
      { status: 400 }
    );
  }

  const sb = getSupabase();
  const apiKey = process.env.GOOGLE_API_KEY?.trim() ?? "";

  const encoder = new TextEncoder();

  // ── No LLM key: return a plain explanation ───────────────────────────────────
  if (!apiKey) {
    return Response.json(
      {
        error:
          "GOOGLE_API_KEY is not configured. " +
          "Add it to .env.local (server-side only — no NEXT_PUBLIC_ prefix) and restart the dev server. " +
          "The conversational research agent requires this key. " +
          "The Brave-search-backed pipeline at /api/research/stream still works independently.",
        threadId: incomingThreadId ?? null,
        text: null,
      },
      { status: 503 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      function push(s: string) {
        controller.enqueue(encoder.encode(s));
      }

      let threadId: string | null = null;
      let fullReply = "";

      try {
        // ── 1. Resolve / create thread ─────────────────────────────────────────
        const thread = await getOrCreateThread(sb, incomingThreadId, projectId, message);
        threadId = thread.id;

        // Signal the client: thread id (so it can update its URL / state)
        push(frame("thread", { threadId, isNew: thread.isNew }));

        // ── 2. Persist user message ───────────────────────────────────────────
        await persistMessage(sb, threadId, "user", message);

        // ── 3. Load prior messages for context ────────────────────────────────
        const prior = await loadPriorMessages(sb, threadId, 20);
        const historyMessages: ChatMessage[] = prior
          .filter((m) => m.role !== "system")
          // exclude the message we just inserted (last item)
          .slice(0, -1)
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        // ── 4. Build project context + system prompt ──────────────────────────
        const ctx = await assembleProjectContext(projectId);
        const systemPrompt = buildSystemPrompt(ctx);

        // ── 5. Stream the LLM response ────────────────────────────────────────
        push(frame("status", { label: "Thinking…" }));

        for await (const delta of streamGemini(systemPrompt, historyMessages, message, apiKey)) {
          fullReply += delta;
          push(frame("delta", { text: delta }));
        }

        push(frame("done", { threadId }));

        // ── 6. Persist assistant reply ────────────────────────────────────────
        if (fullReply) {
          await persistMessage(sb, threadId, "assistant", fullReply);
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        push(frame("error", { message: msg, threadId }));
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

// ─── GET /api/research/chat?projectId=…&persona=writer ───────────────────────
// Returns the list of threads for a project so the UI can hydrate on mount.

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const persona = searchParams.get("persona") ?? "writer";

  if (!projectId) {
    return Response.json({ error: "projectId is required" }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) {
    return Response.json({ threads: [] });
  }

  const { data, error } = await sb
    .from("research_threads")
    .select("id, project_id, persona, title, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("persona", persona)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ threads: (data ?? []) as DbThread[] });
}
