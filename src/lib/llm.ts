/**
 * llm.ts — provider shim for the app's two LLM call shapes.
 *
 *   generateJSON()  single-shot, structured JSON  (entity extraction)
 *   streamChat()    streamed conversation         (research agent)
 *
 * Pick the provider with LLM_PROVIDER in .env.local:
 *
 *   LLM_PROVIDER=groq     GROQ_API_KEY=...     ~1000 req/day free  ← dev default
 *   LLM_PROVIDER=gemini   GOOGLE_API_KEY=...   20 req/day free
 *
 * With no LLM_PROVIDER set, whichever key is present wins, preferring Groq.
 * That way development runs on the generous quota and the demo can flip to
 * Gemini by changing one line — no code edits, no redeploy.
 *
 * SERVER ONLY. Neither key has a NEXT_PUBLIC_ prefix, so neither reaches the
 * browser bundle. Import this from route handlers, never from a component.
 */

import { GoogleGenerativeAI, type Content } from "@google/generative-ai";

export type LLMProvider = "groq" | "gemini";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Groq's default. Override with GROQ_MODEL. */
const GROQ_DEFAULT_MODEL   = "llama-3.3-70b-versatile";
/** Gemini's default. gemini-2.5-flash is refused for new API keys. */
const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";

/* ─── provider selection ─────────────────────────────────────────────────── */

export function activeProvider(): LLMProvider {
  const explicit = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (explicit === "groq" || explicit === "gemini") return explicit;
  // No explicit choice: prefer whichever key exists, Groq first.
  if (process.env.GROQ_API_KEY?.trim())   return "groq";
  return "gemini";
}

function keyFor(provider: LLMProvider): string | null {
  const key =
    provider === "groq"
      ? process.env.GROQ_API_KEY?.trim()
      : process.env.GOOGLE_API_KEY?.trim();
  return key || null;
}

function modelFor(provider: LLMProvider): string {
  return provider === "groq"
    ? process.env.GROQ_MODEL?.trim()   || GROQ_DEFAULT_MODEL
    : process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
}

/** Thrown when no usable API key is configured. Routes should 503 on this. */
export class LLMConfigError extends Error {}

function requireKey(provider: LLMProvider): string {
  const key = keyFor(provider);
  if (!key) {
    const varName = provider === "groq" ? "GROQ_API_KEY" : "GOOGLE_API_KEY";
    throw new LLMConfigError(
      `${varName} is not set. Add it to .env.local (no NEXT_PUBLIC_ prefix) and restart the dev server.`,
    );
  }
  return key;
}

/* ─── shared types ───────────────────────────────────────────────────────── */

export type ChatTurn = { role: "user" | "assistant"; content: string };

type GroqChoice  = { message?: { content?: string } };
type GroqPayload = { choices?: GroqChoice[]; error?: { message?: string } };

/* ─── generateJSON ───────────────────────────────────────────────────────── */

/**
 * Ask for a single JSON document. Returns the raw string — the caller parses,
 * so existing validation and 422 handling stays where it is.
 *
 * `schema` is a Gemini responseSchema. Groq has no schema parameter, so for
 * Groq the schema is serialised into the prompt instead. Both providers are
 * pinned to JSON output mode.
 */
export async function generateJSON(opts: {
  system:       string;
  user:         string;
  schema?:      unknown;
  temperature?: number;
  maxTokens?:   number;
}): Promise<string> {
  const provider    = activeProvider();
  const apiKey      = requireKey(provider);
  const temperature = opts.temperature ?? 0.1;
  const maxTokens   = opts.maxTokens   ?? 4096;

  if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelFor("gemini"),
      generationConfig: {
        temperature,
        maxOutputTokens:  maxTokens,
        responseMimeType: "application/json",
        // The SDK's type here is a structural schema; the caller supplies one
        // built for Gemini, so pass it through.
        ...(opts.schema ? { responseSchema: opts.schema as never } : {}),
      },
    });
    const result = await model.generateContent([
      { text: opts.system },
      { text: opts.user },
    ]);
    return result.response.text();
  }

  // Groq: OpenAI-compatible. json_object mode requires the word "JSON" to
  // appear in the prompt, and has no schema parameter — so describe the shape.
  const schemaHint = opts.schema
    ? `\n\nReturn JSON matching exactly this schema. No prose, no markdown fences:\n${JSON.stringify(opts.schema)}`
    : "\n\nReturn a single valid JSON object. No prose, no markdown fences.";

  const res = await fetch(GROQ_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:           modelFor("groq"),
      temperature,
      max_tokens:      maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system + schemaHint },
        { role: "user",   content: opts.user },
      ],
    }),
  });

  const payload = (await res.json()) as GroqPayload;
  if (!res.ok) {
    throw new Error(
      `Groq request failed (${res.status}): ${payload.error?.message ?? res.statusText}`,
    );
  }
  return payload.choices?.[0]?.message?.content ?? "";
}

/* ─── streamChat ─────────────────────────────────────────────────────────── */

/**
 * Stream a reply token-by-token. Yields text fragments as they arrive.
 */
export async function* streamChat(opts: {
  system:       string;
  history:      ChatTurn[];
  message:      string;
  temperature?: number;
  maxTokens?:   number;
}): AsyncGenerator<string, void, unknown> {
  const provider    = activeProvider();
  const apiKey      = requireKey(provider);
  const temperature = opts.temperature ?? 0.4;
  const maxTokens   = opts.maxTokens   ?? 1200;

  if (provider === "gemini") {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model:             modelFor("gemini"),
      systemInstruction: opts.system,
      generationConfig:  { temperature, maxOutputTokens: maxTokens },
    });

    // Gemini uses "user" and "model"; map "assistant" → "model".
    const contents: Content[] = [
      ...opts.history.map((m) => ({
        role:  m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: opts.message }] },
    ];

    const result = await model.generateContentStream({ contents });
    for await (const chunk of result.stream) {
      const t = chunk.text();
      if (t) yield t;
    }
    return;
  }

  // Groq: OpenAI-style SSE.
  const res = await fetch(GROQ_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:      modelFor("groq"),
      temperature,
      max_tokens: maxTokens,
      stream:     true,
      messages: [
        { role: "system", content: opts.system },
        ...opts.history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: opts.message },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Groq stream failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are newline-delimited; keep the trailing partial line.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;

      try {
        const json = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const text = json.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {
        // Ignore keep-alive and any partial frame that slipped through.
      }
    }
  }
}
