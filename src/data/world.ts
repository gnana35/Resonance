export type WorldEntityType = "faction" | "location" | "event" | "object";

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
    type: "faction",
    kind: "Order",
    subtitle: "Elite protectors of Veyndor's peace.",
    detail:
      "A disciplined order sworn to defend Veyndor from threats within and without. Their ranks recruit from the Silvergrove's wardens.",
  },
  {
    id: "the-shrouded",
    label: "The Shrouded",
    type: "faction",
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
      "The source of the world's magic, and the object every faction seeks to control. Its true nature is still unknown.",
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
