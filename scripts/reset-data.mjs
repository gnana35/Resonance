#!/usr/bin/env node
/**
 * Reset all app data so the next run behaves like a brand-new user.
 *
 *   npm run reset
 *
 * Clears every app_* table in Supabase, then prints the browser snippet for
 * localStorage — which this script CANNOT do, because localStorage lives in
 * your browser, not in Node. Both halves are required: clearing only Supabase
 * leaves the UI fully populated, since localStorage is the app's read path.
 *
 * Tables that do not exist are skipped rather than treated as failures.
 */

import fs from "node:fs";

const ENV_FILE = ".env.local";

if (!fs.existsSync(ENV_FILE)) {
  console.error(`✗ ${ENV_FILE} not found. Run this from the project root.`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(ENV_FILE, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY missing from .env.local");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// Child rows first so foreign keys never block a delete.
const TABLES = [
  "app_notifications",
  "app_asset_comments",
  "app_assets",
  "app_world_relationships",
  "app_world_entities",
  "app_characters",
  "app_chapters",
  "app_preferences",
  "app_projects",
  "graph_edges",
  "graph_nodes",
  "design_validations",
];

/** app_preferences is keyed by persona, not id. */
const keyFor = (t) => (t === "app_preferences" ? "persona" : "id");

console.log(`\nResetting ${URL}\n`);

let cleared = 0;
let skipped = 0;

for (const table of TABLES) {
  const key = keyFor(table);

  const del = await fetch(`${URL}/rest/v1/${table}?${key}=not.is.null`, {
    method: "DELETE",
    headers,
  });

  // 404 = table does not exist in this project. Not an error.
  if (del.status === 404) {
    console.log(`  ${table.padEnd(26)} skipped (no such table)`);
    skipped++;
    continue;
  }

  const check = await fetch(`${URL}/rest/v1/${table}?select=${key}`, {
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
  });
  const remaining = (check.headers.get("content-range") ?? "").split("/")[1] ?? "?";

  if (remaining === "0") {
    console.log(`  ${table.padEnd(26)} cleared`);
    cleared++;
  } else {
    console.log(`  ${table.padEnd(26)} ⚠ ${remaining} row(s) remain`);
  }
}

console.log(`\n✓ Supabase: ${cleared} table(s) cleared, ${skipped} skipped.\n`);
console.log("Now clear the browser — localStorage is the app's read path, so");
console.log("skipping this leaves the UI fully populated.\n");
console.log("  1. Open the app, press F12 → Console");
console.log("  2. If pasting is blocked, type:  allow pasting");
console.log("  3. Paste:\n");
console.log('     Object.keys(localStorage).filter(k=>k.startsWith("resonance:")).forEach(k=>localStorage.removeItem(k));location.reload()\n');
