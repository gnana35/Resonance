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

export const MUSE_CREDITS = 1250;

export const MUSE_PROMPT_EXAMPLES = [
  "A fallen kingdom in the north",
  "Rogue mage with a storm power",
  "Light vs. shadow",
  "Steampunk desert city",
];

export type MuseCategory =
  | "Themes"
  | "Outfit Prompts"
  | "Character Concepts"
  | "Worldbuilding Ideas"
  | "Visual Styles"
  | "Names & Lore";

export const MUSE_CATEGORIES: MuseCategory[] = [
  "Themes",
  "Outfit Prompts",
  "Character Concepts",
  "Worldbuilding Ideas",
  "Visual Styles",
  "Names & Lore",
];

export type MuseCard = {
  id: string;
  title: string;
  description: string;
  tags: string[];
};

export const MUSE_SUGGESTIONS: Record<MuseCategory, MuseCard[]> = {
  Themes: [
    {
      id: "fallen-empire",
      title: "Fallen Empire",
      description: "A once-glorious empire now in ruins, haunted by its past.",
      tags: ["Epic", "Melancholic", "Gothic"],
    },
    {
      id: "aether-storm",
      title: "Aether Storm",
      description: "Magic collides with nature in a world torn by storms.",
      tags: ["Energetic", "Magic", "Chaotic"],
    },
    {
      id: "shrouded-realms",
      title: "Shrouded Realms",
      description: "Hidden lands beyond the mist, untouched for centuries.",
      tags: ["Mysterious", "Ancient", "Calm"],
    },
    {
      id: "clockwork-dawn",
      title: "Clockwork Dawn",
      description: "A world of gears, steam, and endless innovation.",
      tags: ["Steampunk", "Inventive", "Intricate"],
    },
  ],
  "Outfit Prompts": [
    {
      id: "battle-worn-cloak",
      title: "Battle-Worn Cloak",
      description: "Patched and weathered, marked by every journey survived.",
      tags: ["Rugged", "Practical", "Weathered"],
    },
    {
      id: "ceremonial-armor",
      title: "Ceremonial Armor",
      description: "Ornate plating reserved for the highest of rites.",
      tags: ["Regal", "Ornate", "Heavy"],
    },
    {
      id: "shadow-assassin-garb",
      title: "Shadow Assassin Garb",
      description: "Light, silent, built for a life unseen.",
      tags: ["Stealthy", "Dark", "Agile"],
    },
    {
      id: "royal-regalia",
      title: "Royal Regalia",
      description: "Layered silks and gold, a statement before a word is said.",
      tags: ["Noble", "Opulent", "Formal"],
    },
  ],
  "Character Concepts": [
    {
      id: "last-archivist",
      title: "The Last Archivist",
      description: "Keeper of a library no one remembers exists.",
      tags: ["Wise", "Isolated", "Guarded"],
    },
    {
      id: "storm-touched-wanderer",
      title: "Storm-Touched Wanderer",
      description: "Marked by lightning, cursed or chosen depending who's asked.",
      tags: ["Restless", "Powerful", "Haunted"],
    },
    {
      id: "exiled-knight",
      title: "Exiled Knight",
      description: "Stripped of title, still bound by an oath no one honors.",
      tags: ["Honorable", "Bitter", "Loyal"],
    },
    {
      id: "whispering-oracle",
      title: "Whispering Oracle",
      description: "Sees fragments of futures she can never fully explain.",
      tags: ["Cryptic", "Calm", "Feared"],
    },
  ],
  "Worldbuilding Ideas": [
    {
      id: "sunken-library",
      title: "The Sunken Library",
      description: "An archive flooded a century ago, still fiercely guarded.",
      tags: ["Mysterious", "Ancient", "Forbidden"],
    },
    {
      id: "floating-trade-city",
      title: "Floating Trade City",
      description: "A market that never touches ground, tethered by old magic.",
      tags: ["Vibrant", "Chaotic", "Inventive"],
    },
    {
      id: "ashen-wastes",
      title: "The Ashen Wastes",
      description: "Once a forest, now a graveyard of grey and silence.",
      tags: ["Desolate", "Somber", "Vast"],
    },
    {
      id: "twin-moon-prophecy",
      title: "Twin Moon Prophecy",
      description: "An eclipse every generation, and a legend that follows it.",
      tags: ["Epic", "Mythical", "Cyclical"],
    },
  ],
  "Visual Styles": [
    {
      id: "gothic-realism",
      title: "Gothic Realism",
      description: "Heavy shadow, muted palettes, and unflinching detail.",
      tags: ["Dark", "Detailed", "Moody"],
    },
    {
      id: "painterly-fantasy",
      title: "Painterly Fantasy",
      description: "Soft brushwork and warm light, like a storybook come alive.",
      tags: ["Warm", "Soft", "Whimsical"],
    },
    {
      id: "ink-parchment",
      title: "Ink & Parchment",
      description: "Sketchbook linework on aged, textured paper.",
      tags: ["Rustic", "Minimal", "Handmade"],
    },
    {
      id: "neon-ruins",
      title: "Neon Ruins",
      description: "Ancient stone lit by something that shouldn't exist yet.",
      tags: ["Contrast", "Bold", "Strange"],
    },
  ],
  "Names & Lore": [
    {
      id: "whispering-blade",
      title: "The Whispering Blade",
      description: "A weapon said to speak the name of its next wielder.",
      tags: ["Legendary", "Ominous", "Ancient"],
    },
    {
      id: "order-hollow-crown",
      title: "Order of the Hollow Crown",
      description: "Sworn to a throne that has sat empty for a hundred years.",
      tags: ["Secretive", "Loyal", "Fading"],
    },
    {
      id: "aether-accord",
      title: "The Aether Accord",
      description: "A treaty between factions that trust each other least.",
      tags: ["Political", "Fragile", "Tense"],
    },
    {
      id: "children-fracture",
      title: "Children of the Fracture",
      description: "Those born the night the sky split, marked ever since.",
      tags: ["Mythical", "Marked", "Feared"],
    },
  ],
};

export type OutfitPromptExample = {
  id: string;
  title: string;
  description: string;
  tags: string[];
};

export const OUTFIT_PROMPT_EXAMPLES: OutfitPromptExample[] = [
  {
    id: "wanderer",
    title: "Wanderer",
    description: "Practical and layered for long journeys.",
    tags: ["Rugged", "Neutral", "Travel-worn"],
  },
  {
    id: "stormcaller",
    title: "Stormcaller",
    description: "Channel the power of the tempest.",
    tags: ["Mystic", "Flowing", "Arcane"],
  },
  {
    id: "aether-guard",
    title: "Aether Guard",
    description: "Elite guardians of the Aether Citadel.",
    tags: ["Noble", "Armored", "Regal"],
  },
  {
    id: "shadowstalker",
    title: "Shadowstalker",
    description: "Move unseen. Strike without warning.",
    tags: ["Stealthy", "Dark", "Agile"],
  },
];

export type AssetStat = { label: string; value: number; delta: string };

export const ASSET_STATS: AssetStat[] = [
  { label: "Total Assets", value: 1248, delta: "+ 32 this week" },
  { label: "Images", value: 842, delta: "+ 18 this week" },
  { label: "Documents", value: 156, delta: "+ 6 this week" },
  { label: "Audio", value: 89, delta: "+ 2 this week" },
  { label: "Videos", value: 42, delta: "+ 6 this week" },
  { label: "Other", value: 119, delta: "+ 0 this week" },
];

export const ASSET_CATEGORIES = [
  "All Assets",
  "Characters",
  "Weapons",
  "Environments",
  "Props",
  "Textures",
  "Maps",
  "Concept Art",
  "Audio",
  "UI Elements",
  "Other",
] as const;

export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export type RecentAsset = {
  id: string;
  filename: string;
  fileType: string;
  timeAgo: string;
  category: AssetCategory;
};

export const RECENT_ASSETS: RecentAsset[] = [
  {
    id: "character-wanderer-v3",
    filename: "character_wanderer_v3.png",
    fileType: "PNG",
    timeAgo: "2h ago",
    category: "Characters",
  },
  {
    id: "aether-blade-concepts",
    filename: "aether_blade_concepts.png",
    fileType: "PNG",
    timeAgo: "5h ago",
    category: "Weapons",
  },
  {
    id: "castle-northreach",
    filename: "castle_northreach.jpg",
    fileType: "JPG",
    timeAgo: "Yesterday",
    category: "Environments",
  },
  {
    id: "rock-cliff-texture",
    filename: "rock_cliff_texture.png",
    fileType: "PNG",
    timeAgo: "Yesterday",
    category: "Textures",
  },
  {
    id: "world-map-draft-v2",
    filename: "world_map_draft_v2.psd",
    fileType: "PSD",
    timeAgo: "2 days ago",
    category: "Maps",
  },
  {
    id: "mana-potion-prop",
    filename: "mana_potion_prop.png",
    fileType: "PNG",
    timeAgo: "2 days ago",
    category: "Props",
  },
];

export type AssetFolder = { id: string; name: string; count: number };

export const ASSET_FOLDERS: AssetFolder[] = [
  { id: "characters", name: "Characters", count: 248 },
  { id: "weapons", name: "Weapons", count: 132 },
  { id: "environments", name: "Environments", count: 312 },
  { id: "props", name: "Props", count: 186 },
  { id: "textures", name: "Textures", count: 249 },
  { id: "maps", name: "Maps", count: 48 },
  { id: "concept-art", name: "Concept Art", count: 73 },
];

export type RecentFile = {
  id: string;
  filename: string;
  path: string;
  type: string;
  size: string;
  dateAdded: string;
  addedBy: string;
  category: AssetCategory;
};

export const RECENT_FILES: RecentFile[] = [
  {
    id: "ancient-ruins-environment",
    filename: "ancient_ruins_environment.jpg",
    path: "/Environments/Ancient Ruins/",
    type: "JPG",
    size: "5.6 MB",
    dateAdded: "May 16, 2025",
    addedBy: "Luna Designer",
    category: "Environments",
  },
  {
    id: "knight-sentinel-concept-v2",
    filename: "knight_sentinel_concept_v2.png",
    path: "/Characters/Knights/",
    type: "PNG",
    size: "3.2 MB",
    dateAdded: "May 15, 2025",
    addedBy: "Luna Designer",
    category: "Characters",
  },
  {
    id: "iron-shield-prop",
    filename: "iron_shield_prop.png",
    path: "/Props/Armor & Gear/",
    type: "PNG",
    size: "2.1 MB",
    dateAdded: "May 14, 2025",
    addedBy: "Luna Designer",
    category: "Props",
  },
  {
    id: "dark-fantasy-ambience",
    filename: "dark_fantasy_ambience.mp3",
    path: "/Audio/Ambience/",
    type: "MP3",
    size: "8.7 MB",
    dateAdded: "May 14, 2025",
    addedBy: "Luna Designer",
    category: "Audio",
  },
];

export type Collection = { id: string; name: string; count: number };

export const COLLECTIONS: Collection[] = [
  { id: "core-game-assets", name: "Core Game Assets", count: 342 },
  { id: "chapter-1", name: "Chapter 1 - Aetherfall", count: 128 },
  { id: "enemies-factions", name: "Enemies - Factions", count: 96 },
  { id: "ui-icons", name: "UI / Icons", count: 64 },
  { id: "reference-inspo", name: "Reference & Inspo", count: 58 },
];

export const AUDIO_FILTERS = [
  "All",
  "Music",
  "SFX",
  "Ambience",
  "Vocals",
  "Stingers",
  "Loops",
] as const;

export type AudioFilter = (typeof AUDIO_FILTERS)[number];
export type AudioTrackType = Exclude<AudioFilter, "All">;

export type AudioTrack = {
  id: string;
  title: string;
  artist: string;
  type: AudioTrackType;
  mood: string[];
  bpmKey: string | null;
  duration: string;
  dateAdded: string;
};

export const AUDIO_TRACKS: AudioTrack[] = [
  {
    id: "aetherfall-main-theme",
    title: "Aetherfall – Main Theme",
    artist: "Luna Designer",
    type: "Music",
    mood: ["Epic", "Heroic"],
    bpmKey: "128 BPM · Cmin",
    duration: "02:45",
    dateAdded: "May 16, 2025",
  },
  {
    id: "whispers-in-the-ruins",
    title: "Whispers in the Ruins",
    artist: "Luna Designer",
    type: "Music",
    mood: ["Mysterious", "Dark"],
    bpmKey: "90 BPM · Dm",
    duration: "01:58",
    dateAdded: "May 15, 2025",
  },
  {
    id: "forest-of-echoes",
    title: "Forest of Echoes",
    artist: "Luna Designer",
    type: "Music",
    mood: ["Ambient", "Peaceful"],
    bpmKey: "72 BPM · Gmaj",
    duration: "03:12",
    dateAdded: "May 15, 2025",
  },
  {
    id: "clockwork-city-ambience",
    title: "Clockwork City Ambience",
    artist: "Luna Designer",
    type: "Ambience",
    mood: ["Industrial", "Steampunk"],
    bpmKey: null,
    duration: "04:30",
    dateAdded: "May 14, 2025",
  },
  {
    id: "battle-stinger-impact",
    title: "Battle Stinger – Impact",
    artist: "Luna Designer",
    type: "Stingers",
    mood: ["Intense", "Short"],
    bpmKey: null,
    duration: "00:03",
    dateAdded: "May 14, 2025",
  },
  {
    id: "magic-spell-cast-arcane",
    title: "Magic Spell Cast – Arcane",
    artist: "Luna Designer",
    type: "SFX",
    mood: ["Magical", "Mystical"],
    bpmKey: null,
    duration: "00:02",
    dateAdded: "May 14, 2025",
  },
];

export const RECENTLY_PLAYED_IDS = [
  "aetherfall-main-theme",
  "whispers-in-the-ruins",
  "forest-of-echoes",
  "battle-stinger-impact",
];

export type Playlist = { id: string; name: string; trackCount: number };

export const PLAYLISTS: Playlist[] = [
  { id: "echoes-of-aether", name: "Project: Echoes of Aether", trackCount: 24 },
  { id: "boss-battles", name: "Boss Battles", trackCount: 12 },
  { id: "exploration-travel", name: "Exploration & Travel", trackCount: 18 },
  { id: "ui-menus", name: "UI & Menus", trackCount: 9 },
];

export type MusicTheme = {
  id: string;
  title: string;
  tags: string[];
  trackCount: number;
};

export const MUSIC_THEME_CARDS: MusicTheme[] = [
  { id: "epic-fantasy", title: "Epic Fantasy", tags: ["Orchestral", "Heroic"], trackCount: 24 },
  { id: "dark-mysterious", title: "Dark & Mysterious", tags: ["Cinematic", "Tense"], trackCount: 18 },
  {
    id: "ambient-exploration",
    title: "Ambient Exploration",
    tags: ["Ambient", "Atmospheric"],
    trackCount: 22,
  },
  { id: "steampunk", title: "Steampunk", tags: ["Industrial", "Adventure"], trackCount: 16 },
  { id: "peaceful-calm", title: "Peaceful & Calm", tags: ["Ambient", "Piano"], trackCount: 14 },
];

export type QuickTool = { id: string; title: string; description: string };

export const AUDIO_QUICK_TOOLS: QuickTool[] = [
  { id: "ai-music-generator", title: "AI Music Generator", description: "Generate custom music" },
  { id: "stinger-generator", title: "Stinger Generator", description: "Create transition stingers" },
  { id: "loop-builder", title: "Loop Builder", description: "Build seamless loops" },
  { id: "bpm-finder", title: "BPM Finder", description: "Detect tempo & key" },
];
