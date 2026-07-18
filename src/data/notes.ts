export type NoteType =
  | "Idea"
  | "Dialogue"
  | "Lore"
  | "Research"
  | "Plot"
  | "Reference"
  | "Quote";

export type Note = {
  id: string;
  title: string;
  type: NoteType;
  content: string;
  date: string;
  pinned?: boolean;
  thumbnail?: "armor" | "architecture";
};

export const NOTES: Note[] = [
  {
    id: "opening-image",
    title: "Opening Image",
    type: "Idea",
    content:
      "A lone figure standing on the cliffs above Veyndor as the twin moons rise. The wind carries whispers of a forgotten era.",
    date: "May 16, 2025 · 10:42 AM",
    pinned: true,
  },
  {
    id: "you-shouldnt-be-here",
    title: "“You shouldn't be here”",
    type: "Dialogue",
    content:
      '"You shouldn\'t be here," the voice said.\n\n"I\'m always where I\'m needed."',
    date: "May 15, 2025 · 9:18 PM",
  },
  {
    id: "the-aether",
    title: "The Aether",
    type: "Lore",
    content:
      "Aether is the source of all magic. It flows through every living thing but is most concentrated in ancient relics and ley lines.",
    date: "May 15, 2025 · 4:33 PM",
    pinned: true,
  },
  {
    id: "medieval-armor-reference",
    title: "Medieval Armor Reference",
    type: "Research",
    content: "Reference sketches for the Iron Ward's plate armor silhouette.",
    date: "May 14, 2025 · 2:21 PM",
    thumbnail: "armor",
  },
  {
    id: "chapter-3-key-event",
    title: "Chapter 3 – Key Event",
    type: "Plot",
    content:
      "Kael discovers the truth about The Council's true purpose. This is the turning point that forces him to make a choice between loyalty and justice.",
    date: "May 14, 2025 · 11:07 AM",
    pinned: true,
  },
  {
    id: "magic-system-concept",
    title: "Magic System Concept",
    type: "Idea",
    content:
      'Magic requires intent, focus, and a connection to an Aetheric source. Overuse causes "Fracture" – a break in mind and body.',
    date: "May 14, 2025 · 8:56 AM",
    pinned: true,
  },
  {
    id: "architecture-inspiration",
    title: "Architecture Inspiration",
    type: "Reference",
    content: "Spire and bridge silhouettes for Veyndor's skyline.",
    date: "May 13, 2025 · 3:12 PM",
    thumbnail: "architecture",
  },
  {
    id: "we-shape-our-stories",
    title: "“We shape our stories…”",
    type: "Quote",
    content: '"We shape our stories, and then our stories shape us." — Unknown',
    date: "May 12, 2025 · 7:45 PM",
    pinned: true,
  },
  {
    id: "character-voice-lira",
    title: "Character Voice – Lira",
    type: "Reference",
    content:
      "Lira speaks with quiet confidence. She chooses her words carefully and rarely shows vulnerability unless absolutely necessary.",
    date: "May 12, 2025 · 6:28 PM",
  },
];
