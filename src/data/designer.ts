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
