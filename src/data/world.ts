export type WorldEntityType = "Affiliation" | "location" | "event" | "object";

// ─── Locations Map ───────────────────────────────────────────────────────────

export type MapLocationType =
  | "city"
  | "forest"
  | "wasteland"
  | "ruin"
  | "landmark"
  | "mountain"
  | "river"
  | "castle";

export type MapLocationStatus = "confirmed" | "inferred";

export type MapLocation = {
  id: string;
  label: string;
  type: MapLocationType;
  status: MapLocationStatus;
  x: number; // percent of map canvas width  (0–100)
  y: number; // percent of map canvas height (0–100)
  description: string;
  detail: string;
  characters: string[];   // character ids
  events: string[];
  firstAppearance: string; // e.g. "Chapter 2"
  inferenceNote?: string;  // shown when status === "inferred"
  // enriched detail fields
  region?: string;
  population?: string;
  alignment?: string;
};

export type MapRoute = {
  id: string;
  from: string;  // MapLocation id
  to: string;
  label: string;
  status: MapLocationStatus;
  path?: [number, number][]; // optional waypoints as [x%, y%] pairs
};

export type MapInferenceSuggestion = {
  id: string;
  summary: string;           // short title
  detail: string;            // full description shown in review panel
  locationId: string;        // which location it concerns
  chapter: string;
  status: "pending" | "approved" | "dismissed";
};

export const MAP_LOCATIONS: MapLocation[] = [
  {
    id: "veyndor",
    label: "Veyndor",
    type: "city",
    status: "confirmed",
    x: 42,
    y: 52,
    description: "The great walled city at the heart of the story.",
    detail:
      "A grand city built on ancient foundations, where magic and ambition intertwine. Many seek power within its walls—few leave unchanged.",
    characters: ["lira", "kael", "aric"],
    events: ["The Fracture", "Kael's desertion from the Guard", "Lira's awakening"],
    firstAppearance: "Chapter 1",
    region: "Central Realm",
    population: "~ 45,000",
    alignment: "Iron Ward",
  },
  {
    id: "silvergrove",
    label: "The Silvergrove",
    type: "forest",
    status: "confirmed",
    x: 18,
    y: 34,
    description: "Ancient forest on Veyndor's northwest border.",
    detail:
      "An ancient forest said to hide the key to the Aether Core deep within its roots. The Iron Ward recruits its wardens from here.",
    characters: ["kael"],
    events: ["Iron Ward recruitment"],
    firstAppearance: "Chapter 3",
    region: "Northwest Wilds",
    alignment: "Neutral",
  },
  {
    id: "echoing-wastes",
    label: "The Echoing Wastes",
    type: "wasteland",
    status: "confirmed",
    x: 72,
    y: 68,
    description: "Scarred and unstable lands east of Veyndor.",
    detail:
      "A scarred, unstable land beyond Veyndor's borders. Few return from it unchanged, and fewer still by choice. The Shrouded operate in its shadows.",
    characters: [],
    events: ["The Fracture"],
    firstAppearance: "Chapter 4",
    region: "Eastern Expanse",
    population: "Uninhabited",
    alignment: "The Shrouded",
  },
  {
    id: "iron-mountains",
    label: "Iron Mountains",
    type: "mountain",
    status: "confirmed",
    x: 62,
    y: 28,
    description: "The great mountain range northeast of Veyndor.",
    detail:
      "A vast and brutal range that marks the northeastern border of the known world. Travelers who attempt the pass rarely speak of what they found.",
    characters: [],
    events: [],
    firstAppearance: "Chapter 5",
    region: "Northern Border",
    alignment: "Unclaimed",
  },
  {
    id: "ashen-river",
    label: "Ashen River",
    type: "river",
    status: "confirmed",
    x: 30,
    y: 55,
    description: "Wide river crossed north of Veyndor's gate.",
    detail:
      "Lira crossed the Ashen River heading north through Veyndor's northern gate. The river marks the city's outer boundary on that side.",
    characters: ["lira"],
    events: ["Lira's northern crossing (Ch. 7)"],
    firstAppearance: "Chapter 2",
    region: "Central Realm",
    alignment: "Neutral",
  },
  {
    id: "ruins-of-elyria",
    label: "Ruins of Elyria",
    type: "ruin",
    status: "inferred",
    x: 80,
    y: 22,
    description: "Ancient ruins beyond the Iron Mountains.",
    detail:
      "Said to lie beyond the Iron Mountains to the east. Their exact position is inferred from Lira's eastward journey in Chapter 7.",
    characters: ["lira"],
    events: [],
    firstAppearance: "Chapter 7",
    region: "Beyond the Pass",
    alignment: "Unknown",
    inferenceNote:
      "The story places Elyria beyond the Iron Mountains. Resonance estimated its position east of the range.",
  },
  {
    id: "lower-quarter",
    label: "Lower Quarter",
    type: "landmark",
    status: "confirmed",
    x: 38,
    y: 60,
    description: "Veyndor's impoverished southern district.",
    detail:
      "Shade's home territory. A maze of narrow streets and forgotten alleys beneath Veyndor's grand spires.",
    characters: ["shade"],
    events: [],
    firstAppearance: "Chapter 2",
    region: "Veyndor (South)",
    alignment: "None",
  },
  {
    id: "council-citadel",
    label: "Council Citadel",
    type: "castle",
    status: "inferred",
    x: 48,
    y: 44,
    description: "Seat of power of the ruling Council.",
    detail:
      "The Council's seat of power, said to loom at Veyndor's heart. Its exact location within the city walls is not confirmed by the text.",
    characters: ["the-council"],
    events: ["The Fracture", "Council decree announcement (Ch. 2)"],
    firstAppearance: "Chapter 3",
    region: "Veyndor (Centre)",
    population: "~ 300 (Council & staff)",
    alignment: "The Council",
    inferenceNote:
      "The text confirms the Council rules Veyndor but does not specify where the Citadel stands. Resonance placed it at the city's center.",
  },
];

export const MAP_ROUTES: MapRoute[] = [
  {
    id: "route-veyndor-silvergrove",
    from: "veyndor",
    to: "silvergrove",
    label: "Northwestern road",
    status: "confirmed",
  },
  {
    id: "route-veyndor-wastes",
    from: "veyndor",
    to: "echoing-wastes",
    label: "Eastern passage",
    status: "confirmed",
  },
  {
    id: "route-veyndor-ashen",
    from: "veyndor",
    to: "ashen-river",
    label: "Northern gate road",
    status: "confirmed",
  },
  {
    id: "route-ashen-mountains",
    from: "ashen-river",
    to: "iron-mountains",
    label: "Lira's crossing (Ch. 7)",
    status: "confirmed",
  },
  {
    id: "route-mountains-elyria",
    from: "iron-mountains",
    to: "ruins-of-elyria",
    label: "Pass to Elyria",
    status: "inferred",
  },
];

export const MAP_INFERENCE_SUGGESTIONS: MapInferenceSuggestion[] = [
  {
    id: "inf-elyria",
    summary: "Place Ruins of Elyria east of the Iron Mountains",
    detail:
      '"…beyond them stood the ruins of Elyria." — Chapter 7. The text establishes Elyria lies east of the Iron Mountains but does not specify the exact distance or terrain.',
    locationId: "ruins-of-elyria",
    chapter: "Chapter 7",
    status: "pending",
  },
  {
    id: "inf-citadel",
    summary: "Add the Council Citadel inside Veyndor",
    detail:
      '"The Council\'s reach extends further than anyone in Veyndor suspects." — Chapter 3. Their seat of power is implied to be within the city but the text gives no coordinates.',
    locationId: "council-citadel",
    chapter: "Chapter 3",
    status: "pending",
  },
];

export type WorldEntity = {
  id: string;
  label: string;
  type: WorldEntityType;
  kind: string;
  subtitle: string;
  detail: string;
};

export const WORLD_ENTITIES: WorldEntity[] = [
  {
    id: "veyndor-city",
    label: "Veyndor",
    type: "location",
    kind: "City",
    subtitle: "City of wonder and secrets.",
    detail:
      "A grand city built on ancient foundations, where magic and ambition intertwine. Many seek power within its walls—few leave unchanged.",
  },
  {
    id: "the-iron-ward",
    label: "The Iron Ward",
    type: "Affiliation",
    kind: "Order",
    subtitle: "Elite protectors of Veyndor's peace.",
    detail:
      "A disciplined order sworn to defend Veyndor from threats within and without. Their ranks recruit from the Silvergrove's wardens.",
  },
  {
    id: "the-shrouded",
    label: "The Shrouded",
    type: "Affiliation",
    kind: "Order",
    subtitle: "Rebels who seek to expose the truth.",
    detail:
      "A clandestine movement convinced the Council's order is built on lies. They operate from the shadows of the Echoing Wastes.",
  },
  {
    id: "the-fracture",
    label: "The Fracture",
    type: "event",
    kind: "Cataclysm",
    subtitle: "A cataclysm that changed the balance.",
    detail:
      "The event that reshaped Veyndor's fate. Its cause remains disputed—some believe it revealed truths the Council would rather bury.",
  },
  {
    id: "the-silvergrove",
    label: "The Silvergrove",
    type: "location",
    kind: "Forest",
    subtitle: "Ancient forest, keeper of old magic.",
    detail:
      "An ancient forest at Veyndor's border, said to hide the key to the Aether Core deep within its roots.",
  },
  {
    id: "aether-core",
    label: "Aether Core",
    type: "object",
    kind: "Relic",
    subtitle: "Source of immense power and conflict.",
    detail:
      "The source of the world's magic, and the object every Affiliation seeks to control. Its true nature is still unknown.",
  },
  {
    id: "the-echoing-wastes",
    label: "The Echoing Wastes",
    type: "location",
    kind: "Wasteland",
    subtitle: "Lands beyond the veil.",
    detail:
      "A scarred, unstable land beyond Veyndor's borders. Few return from it unchanged, and fewer still by choice.",
  },
];

export type RelationshipKind =
  | "allied"
  | "opposed"
  | "family"
  | "mentor"
  | "manipulates"
  | "other";

export type WorldEdge = {
  source: string;
  target: string;
  label: string;
  kind: RelationshipKind;
};

export const WORLD_EDGES: WorldEdge[] = [
  { source: "the-council", target: "kael", label: "Once trained by", kind: "mentor" },
  {
    source: "the-council",
    target: "lira",
    label: "Manipulates through visions",
    kind: "manipulates",
  },
  {
    source: "the-council",
    target: "veyndor-city",
    label: "Controls from afar",
    kind: "manipulates",
  },
  {
    source: "kael",
    target: "veyndor-city",
    label: "Protects the innocent in",
    kind: "allied",
  },
  {
    source: "kael",
    target: "the-iron-ward",
    label: "Former member of",
    kind: "other",
  },
  { source: "lira", target: "veyndor-city", label: "Fights to save", kind: "allied" },
  { source: "lira", target: "the-shrouded", label: "Opposes", kind: "opposed" },
  {
    source: "veyndor-city",
    target: "the-iron-ward",
    label: "Sworn to defend",
    kind: "allied",
  },
  {
    source: "veyndor-city",
    target: "the-shrouded",
    label: "Threatens the stability of",
    kind: "opposed",
  },
  {
    source: "veyndor-city",
    target: "the-fracture",
    label: "Was born from",
    kind: "other",
  },
  {
    source: "the-iron-ward",
    target: "the-silvergrove",
    label: "Recruits from",
    kind: "other",
  },
  {
    source: "the-iron-ward",
    target: "the-fracture",
    label: "Fought to contain",
    kind: "opposed",
  },
  {
    source: "the-shrouded",
    target: "the-fracture",
    label: "Believes it revealed the truth",
    kind: "other",
  },
  {
    source: "the-shrouded",
    target: "the-echoing-wastes",
    label: "Operates from the shadows in",
    kind: "other",
  },
  {
    source: "the-fracture",
    target: "aether-core",
    label: "At the heart of",
    kind: "other",
  },
  {
    source: "the-silvergrove",
    target: "aether-core",
    label: "Hides the key to",
    kind: "other",
  },
  {
    source: "aether-core",
    target: "the-echoing-wastes",
    label: "Seeks to control",
    kind: "manipulates",
  },
];
