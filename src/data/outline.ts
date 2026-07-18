export type Scene = {
  id: string;
  title: string;
};

export type Chapter = {
  id: string;
  title: string;
  summary: string;
  scenes: Scene[];
};

export type OutlineItem = {
  id: string;
  kind: "prologue" | "part";
  title: string;
  summary?: string;
  scenes?: Scene[];
  chapters?: Chapter[];
};

function scenes(count: number, prefix: string): Scene[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-scene-${i + 1}`,
    title: `Scene ${i + 1}`,
  }));
}

export const OUTLINE: OutlineItem[] = [
  {
    id: "prologue",
    kind: "prologue",
    title: "Prologue – Whispers in the Wind",
    summary: "A hooded figure receives a vision. The truth of Aether is hinted.",
    scenes: scenes(1, "prologue"),
  },
  {
    id: "part-1",
    kind: "part",
    title: "Part I – Shadows Stir",
    chapters: [
      {
        id: "ch-1",
        title: "Chapter 1 – The First Whisper",
        summary: "Lira is introduced in Veyndor. She hears a voice in her dreams.",
        scenes: scenes(3, "ch-1"),
      },
      {
        id: "ch-2",
        title: "Chapter 2 – Fractures",
        summary:
          "Kael returns home. The city faces unrest and strange disappearances.",
        scenes: scenes(4, "ch-2"),
      },
      {
        id: "ch-3",
        title: "Chapter 3 – The Council's Gaze",
        summary:
          "The Council debates a growing threat. Lira crosses paths with Kael.",
        scenes: scenes(5, "ch-3"),
      },
      {
        id: "ch-4",
        title: "Chapter 4 – Bonds and Secrets",
        summary:
          "Alliances form. Secrets are revealed. The Shrouded move in the dark.",
        scenes: scenes(4, "ch-4"),
      },
    ],
  },
  {
    id: "part-2",
    kind: "part",
    title: "Part II – The Rising Storm",
    chapters: [
      {
        id: "ch-5",
        title: "Chapter 5 – The Iron Ward",
        summary: "The order mobilizes. Training, tension, and a looming mission.",
        scenes: scenes(4, "ch-5"),
      },
      {
        id: "ch-6",
        title: "Chapter 6 – Beyond the Veil",
        summary: "Lira journeys beyond the city and discovers the Fracture.",
        scenes: scenes(5, "ch-6"),
      },
      {
        id: "ch-7",
        title: "Chapter 7 – Echoes Collide",
        summary: "The truth of the Aether Core emerges. Betrayals come to light.",
        scenes: scenes(6, "ch-7"),
      },
    ],
  },
  {
    id: "part-3",
    kind: "part",
    title: "Part III – Echoes of Aether",
    chapters: [
      {
        id: "ch-8",
        title: "Chapter 8 – Choice",
        summary: "Lira must choose between power, love, and fate itself.",
        scenes: scenes(5, "ch-8"),
      },
      {
        id: "ch-9",
        title: "Chapter 9 – A New Balance",
        summary: "The final confrontation. A new dawn for Veyndor.",
        scenes: scenes(4, "ch-9"),
      },
    ],
  },
];
