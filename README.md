# Resonance

A shared creative workspace where writers and designers build the same story world — instead of syncing two separate ones by hand.

---

## 1. Problem Statement

A story is a moving target. A writer changes a character's past in Chapter 8 while their designer is still illustrating from Chapter 3, and the manuscript and the art quietly stop matching. Independent authors and small creative teams — working on illustrated books, comics, and narrative games — are hit hardest, since they lack the production pipelines and continuity staff bigger studios rely on to catch this. Left unmanaged, creators end up spending more time babysitting their story than building it.

## 2. Solution Description

Resonance is a shared workspace where writers and designers build the same story world instead of syncing two separate ones by hand. As a writer drafts a chapter, characters, locations, and relationships are automatically extracted into a live world graph — no manual documentation needed. Writers send a character straight to their designer with full context attached, and designers can pull in a built-in Research Agent for accurate reference. A consistency engine flags when a design contradicts the manuscript, so nothing slips through unnoticed — and once approved, the design becomes canon, folded back into the world itself.

### How it works

1. **Write** — the author writes a chapter as normal in Resonance's editor.
2. **World builds itself** — characters, locations, factions, events, and objects are extracted from the prose, along with their relationships, rendered as an interactive world graph.
3. **Characters evolve with the story** — a character's profile (background, relationships, arc) is derived from the manuscript and updates as the story progresses.
4. **Send to Designer** — the writer sends a character, with full manuscript context attached, directly to their designer.
5. **Designer works from the same source of truth** — the designer opens the request already knowing what's been established, and can pull in the Research Agent for historically- or contextually-accurate reference.
6. **Design comes back for review** — finished designs are saved to Assets and shared back to the writer as a notification.
7. **The loop closes** — the writer approves, rejects, or requests revisions, each with a comment thread attached to that design. On approval the artwork becomes the character's portrait; on a revision request the designer reworks and sends the updated design back through the same loop.

**Target audience:** Independent authors and small creative teams bringing stories to life visually — illustrated books, graphic novels, comics, and narrative games.

## 3. AI Approach and Architecture

Resonance is built around a single core primitive: **an entity extracted from one source, reconciled against entities extracted from another.** Character generation, world-building, and the consistency engine are all variations of that one pattern.

### Extraction

Chapter text goes to an LLM under a strict JSON schema — entity label, kind, aliases, summary, confidence, and a verbatim excerpt proving where it came from. Nothing is parsed out of free prose; if the model deviates from the schema the response is rejected rather than salvaged, so malformed output can never reach the graph.

Extraction runs **once per chapter**, and each chapter's text is hashed. Only chapters that actually changed are re-sent — editing chapter 5 of a 10-chapter manuscript costs one API call, not ten.

### Reconciliation

The hard problem isn't extracting "Lord Aldric Vane" — it's knowing that the "Vane" in chapter 6 is the same person. Each extracted entity is resolved against the existing graph in three passes:

1. **Exact match** on the normalised label — lowercased, titles and punctuation stripped
2. **Alias match** in either direction: the new label against known aliases, and the new entity's aliases against known labels
3. **Containment match** on normalised forms, so "Aldric" resolves to "Lord Aldric Vane"

A match merges aliases and evidence into the existing node; only a genuine miss inserts a new one. This is deterministic string resolution rather than vector similarity — auditable, no embedding infrastructure or per-call cost, and every merge traceable to a specific rule.

Every derived field carries **evidence**: the chapter and verbatim excerpt it came from, so a writer can always see *why* Resonance believes something. Fields the writer edits by hand are **locked** and never overwritten by later extraction passes.

### Consistency engine

Design metadata is reduced to facts the same way manuscript text is, then compared by subject and attribute. Mismatches are classified as **contradiction** (both sources assert different values), **addition** (the design introduces something absent from the text), or **omission**, and surfaced to the writer with both values side by side.

Approving a discrepancy is what makes it canon — the approval writes the design's value into the world graph, so the loop closes visibly rather than as a silent database update.

### Research Agent

A conversational, project-aware agent with Tavily web search, scoped to the current project so answers reflect the story being written. Designers use it for historical and contextual reference without leaving the workspace.

### Model routing

A provider shim exposes the two call shapes the app needs — structured JSON for extraction, token streaming for the Research Agent — behind one interface. `LLM_PROVIDER` selects **Groq** (Llama) or **Gemini** at runtime, no code change.

The providers aren't interchangeable, and the shim absorbs the difference: Gemini enforces a response schema natively, while Groq has no schema parameter, so the shim serialises the schema into the prompt and pins JSON output mode. Groq is the default because its free tier is roughly 50× more generous — which matters when extraction runs on every chapter save.

Rate limiting is treated as an expected condition, not an error. Groq's free tier caps **tokens per minute**, so the shim parses the provider's own retry delay and backs off rather than dropping a chapter — a dropped chapter would leave a permanent hole in the world graph. And if a dense chapter exhausts its completion budget mid-JSON, the request retries once at double the budget, so simple chapters stay cheap and only dense ones pay more.

### Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4
- **Graph:** React Flow (`@xyflow/react`) for the interactive world map
- **Persistence:** Supabase (Postgres + Storage)
- **LLM:** Groq (default) / Gemini via the provider shim; Tavily for web search

`localStorage` is the read path so the editor never waits on a network round-trip; writes mirror to Postgres in the background and **fail soft**, so losing connectivity never blocks writing.

### Data model

Eight `app_*` tables: projects, chapters, characters, world entities, world relationships, assets, notifications, preferences.

Every id column is **text, not uuid**. Ids are generated client-side so the editor can render immediately without waiting on the database — which means a uuid column would reject them outright. Each table promotes the few fields worth querying into real columns and keeps the full object in a `jsonb` payload, so rich nested types (evidence, arc points, locked fields, relationships) round-trip without a brittle column-per-field mapping.

## 4. Selected Challenge Theme

**Create with AI: The Future of Creative Industries.** Resonance helps writers and designers work smarter and unlock new creative possibilities, using AI to remove the manual coordination overhead that gets in the way of the actual creative work.

## 5. Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Required in `.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `GROQ_API_KEY` | Primary LLM — console.groq.com |
| `GOOGLE_API_KEY` | Gemini, if `LLM_PROVIDER=gemini` |
| `TAVILY_API_KEY` | Research Agent web search |

Server-side keys deliberately have **no** `NEXT_PUBLIC_` prefix — that would inline them into the browser bundle where anyone could read them.

Then, in Supabase:

1. Run `supabase/worldmap-schema.sql` in the SQL Editor to create the tables
2. Create a **public** Storage bucket named `assets`

To reset to a clean state:

```bash
npm run reset
```

That clears every table and prints the browser snippet for `localStorage` — both halves are needed, since `localStorage` is the read path.

## 6. How IBM Bob Was Used

IBM Bob was used as the primary development environment throughout the build — scaffolding the Next.js application structure, wiring up the Supabase, Groq/Gemini and Tavily integrations, and implementing the entity extraction and consistency-check pipelines. Bob's Agent Skills feature was used to enforce a consistent frontend design system (typography scale, 8px spacing grid, color tokens) across all UI components, and Bob's multi-model orchestration (routing between Claude, Granite, and Mistral) handled everything from architecture decisions to debugging build errors during development.
