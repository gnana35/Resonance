# Starter prompt for Claude Code

Build a Next.js 16 app (App Router, Tailwind, Framer Motion) called Resonance.

Follow the design tokens and motion rules in our frontend-design skill exactly.

## Critical instruction — read this before touching any image

The PNG files in /public/assets/ are STORYBOARD REFERENCE ONLY. They are
mockups made in Canva, not app assets. Do not use any of them as a
background-image, a full-bleed <img>, or any kind of visual layer in the
final app. Never render a storyboard PNG directly on screen.

Instead, for each one: look at it, then rebuild what you see as real HTML/CSS
components — actual <div> panels, actual Tailwind-styled buttons, actual text
rendered as text (not baked into a picture), actual icons from a library like
lucide-react. The sidebar is a real <nav> with real links. The word count is
a real number pulled from state, not pixels in a screenshot. If a screen shows
a chart, build it with a real charting library (e.g. Recharts) rendering mock
data, not a picture of a chart.

Once a route is built correctly in code, its storyboard reference image is no
longer needed for that route and can be treated as done — the storyboard PNGs
exist only to tell you what to build, not to become part of what ships.

For the space/galaxy artwork specifically (hero background, character
illustrations) — those ARE meant to be used as real image assets in the final
app, since they're actual artwork, not UI mockups. The distinction:
/public/assets/shared/hero.png and any character art are real assets.
Everything under /public/assets/writer/ and /public/assets/designer/ is a UI
mockup to be rebuilt in code, not displayed.

## Shared / onboarding
- "/" — full-bleed hero using the real hero artwork as background. Rebuild the
  nav bar (The studio, Creative lenses, Enter workspace) and headline text as
  actual HTML, positioned to match /public/assets/shared/hero.png. "Enter
  workspace" opens a login modal (rebuild the layout from
  /public/assets/shared/hero-login.png as real form elements — email/password
  fields, Google/Discord buttons — no real auth needed yet, just working UI
  state).
- "/onboarding" — rebuild the two-column Writer vs. Game Designer layout from
  /public/assets/shared/persona-select.png as real components. Between hero and
  this screen, use a simple Framer Motion crossfade (400-600ms) between the
  hero and the persona-select screen — no zoom/portal effect.

## Writer's Space (route prefix /writer)
Rebuild a persistent left sidebar as a real <nav>, shared across all /writer/*
routes: Writer's Space, Characters, World, Notes, Outliner, Stats, Settings —
active/hover states per the design skill.

Use each image below only as a reference for what to build, then discard it
from the render:
- "/writer" — reference: space-empty.png (no project yet) and
  space-document.png (active document state). Build this as a genuinely
  functional distraction-free text editor — real contenteditable or a rich
  text component, not styled text over an image.
- "/writer/characters" — reference: characters-list.png. Real card grid.
- "/writer/characters/[id]" — reference: characters-detail.png. Real tabs
  (Overview, Role, Relationships, Arc, Notes) that actually switch content.
- "/writer/world" — reference: world.png. If time allows, an actual node-graph
  component (e.g. react-flow); otherwise a static rebuilt layout is fine for v1.
- "/writer/notes" — reference: notes.png. Real note cards, real search/filter.
- "/writer/outliner" — reference: outliner.png. Real collapsible tree, actually
  expand/collapse-able.
- "/writer/stats" — reference: stats.png. Real charts (Recharts) with mock data.
- "/writer/settings" — reference: settings.png. Real form controls.

## Designer's Space (route prefix /designer)
Same approach — real persistent sidebar: Designer's Space, Moodboard,
Sketchpad, AI Muse, Assets, Audio & Music, Approvals, My Uploads, Settings.

- "/designer" — reference: space-overview.png
- "/designer/moodboard" — reference: moodboard.png. Real image grid (can use
  placeholder images), real "Add More" tile.
- "/designer/sketchpad" — reference: sketchpad.png. An actual HTML canvas the
  user can draw on is the goal here, not a picture of a sketch.
- "/designer/ai-muse" — reference: ai-muse.png
- "/designer/assets" — reference: assets.png. Real filterable/searchable grid.
- "/designer/audio-music" — reference: audio-music.png. Real audio player UI
  (playback doesn't need real audio files yet, just working controls).
- "/designer/approvals" — reference: approvals.png. Pending/Approved/Rejected
  tabs must actually filter a real list.
- "/designer/my-uploads" — reference: my-uploads.png
- "/designer/settings" — reference: settings.png

## Build order
Go one route at a time, show me each before moving on:
1. "/" and the login modal
2. "/onboarding" with the crossfade transition
3. "/writer" (both states) — most complex, take your time
4. The rest of /writer/*
5. "/designer" home
6. The rest of /designer/*

After each one, I will check that it's real code — if a route just displays
one of the reference PNGs as a background image instead of rebuilt components,
that's a failure state and needs to be redone properly.
