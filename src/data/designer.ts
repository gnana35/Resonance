export const MOOD_TAGS = ["Dark Fantasy", "Epic", "Mysterious"];

export type ColorSwatch = { id: string; color: string };

export const MOOD_SWATCHES: ColorSwatch[] = [
  { id: "obsidian", color: "#1a1a2e" },
  { id: "royal-violet", color: "#6b21a8" },
  { id: "slate-blue", color: "#2d3f56" },
  { id: "muted-violet", color: "#4b4869" },
  { id: "pale-stone", color: "#d8d3c9" },
];

export const DESIGN_PROGRESS = { completed: 24, total: 33 };

export type MuseSuggestion = {
  id: string;
  title: string;
  tags: string[];
};

export const MUSIC_THEMES: MuseSuggestion[] = [
  { id: "ethereal-battle", title: "Ethereal Battle", tags: ["Epic", "Orchestral"] },
  { id: "mystic-forest", title: "Mystic Forest", tags: ["Ambient", "Mysterious"] },
  { id: "ancient-kingdom", title: "Ancient Kingdom", tags: ["Cinematic", "Epic"] },
];

export const OUTFIT_PROMPTS: MuseSuggestion[] = [
  {
    id: "shrouded-wanderer",
    title: "Shrouded Wanderer",
    tags: ["Cloak", "Dark Fantasy"],
  },
  { id: "iron-ward-plate", title: "Iron Ward Plate", tags: ["Armor", "Heroic"] },
  {
    id: "aether-ceremonial-robe",
    title: "Aether Ceremonial Robe",
    tags: ["Ornate", "Mystic"],
  },
];

export type SubmissionStatus = "Pending" | "Approved" | "Rejected";

export type Submission = {
  id: string;
  title: string;
  kind: "character" | "weapon";
  submittedBy: string;
  timeAgo: string;
  status: SubmissionStatus;
};

export const SUBMISSIONS: Submission[] = [
  {
    id: "kael-outfit",
    title: "Character: Kael Outfit",
    kind: "character",
    submittedBy: "Luna",
    timeAgo: "2h ago",
    status: "Pending",
  },
  {
    id: "aether-blade",
    title: "Weapon: Aether Blade",
    kind: "weapon",
    submittedBy: "Luna",
    timeAgo: "5h ago",
    status: "Pending",
  },
];

export const APPROVAL_COUNTS = { pending: 2, approved: 5, rejected: 1 };

export const CORE_VIBE_IMAGES = [
  "moonlit-castle",
  "hooded-figure-street",
  "candlelit-hall",
  "violet-forest",
  "warrior-in-mist",
  "dark-treeline",
];

export type PaletteColor = { hex: string };

export const COLOR_PALETTE: PaletteColor[] = [
  { hex: "#6B4DFF" },
  { hex: "#3D4C6B" },
  { hex: "#232633" },
  { hex: "#7A7F8C" },
  { hex: "#E6E3DB" },
];

export const MOODBOARD_KEYWORDS = [
  "Dark Fantasy",
  "Mysterious",
  "Epic",
  "Ancient",
  "Gothic",
  "Magic",
  "Melancholic",
  "Heroic",
  "Ethereal",
  "Mythical",
];

export type MoodReference = MuseSuggestion;

export const MOOD_REFERENCES: MoodReference[] = [
  { id: "ethereal-battle", title: "Ethereal Battle", tags: ["Epic", "Orchestral"] },
  { id: "mystic-forest", title: "Mystic Forest", tags: ["Ambient", "Mysterious"] },
  { id: "ancient-kingdom", title: "Ancient Kingdom", tags: ["Cinematic", "Epic"] },
  { id: "forgotten-ruins", title: "Forgotten Ruins", tags: ["Dark", "Haunting"] },
  { id: "twilight-oath", title: "Twilight Oath", tags: ["Emotional", "Epic"] },
];

export type TextureReference = { id: string; label: string };

export const TEXTURE_REFERENCES: TextureReference[] = [
  { id: "weathered-stone", label: "Weathered Stone" },
  { id: "dark-metal", label: "Dark Metal" },
  { id: "worn-leather", label: "Worn Leather" },
  { id: "arcane-glyphs", label: "Arcane Glyphs" },
  { id: "cracked-earth", label: "Cracked Earth" },
  { id: "tattered-fabric", label: "Tattered Fabric" },
];

export const AI_INSPIRATION_IMAGES = [
  "generated-warrior-front",
  "generated-warrior-back",
  "generated-warrior-side",
  "generated-blades",
  "generated-landscape",
];

export type VibeBreakdownMetric = { label: string; value: number };

export const VIBE_BREAKDOWN: VibeBreakdownMetric[] = [
  { label: "Dark / Light", value: 82 },
  { label: "Epic / Intimate", value: 74 },
  { label: "Warm / Cool", value: 23 },
  { label: "Modern / Ancient", value: 92 },
  { label: "Chaos / Order", value: 48 },
];
