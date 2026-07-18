export type Character = {
  id: string;
  name: string;
  role: string;
  description: string;
  traits: string[];
};

export const CHARACTERS: Character[] = [
  {
    id: "lira",
    name: "Lira",
    role: "Protagonist",
    description:
      "A resilient young woman haunted by a past she can't remember. Driven by a need to protect others.",
    traits: ["Brave", "Empathic", "Determined"],
  },
  {
    id: "kael",
    name: "Kael",
    role: "Deuteragonist",
    description:
      "A former guard with a cynical exterior. Struggles with guilt and finding purpose.",
    traits: ["Loyal", "Witty", "Haunted"],
  },
  {
    id: "the-council",
    name: "The Council",
    role: "Antagonist Force",
    description:
      "An ancient order that controls the flow of magic and information. Their motives are unclear.",
    traits: ["Powerful", "Secretive", "Cold"],
  },
  {
    id: "veyndor",
    name: "Veyndor",
    role: "Ally",
    description:
      "A wise scholar and keeper of forgotten knowledge. Guides Lira on her journey through the ruins.",
    traits: ["Wise", "Patient", "Mysterious"],
  },
  {
    id: "aric",
    name: "Aric",
    role: "Supporting",
    description:
      "A young guard trying to hold onto his sense of honor in a corrupt system.",
    traits: ["Honorable", "Idealistic", "Torn"],
  },
  {
    id: "shade",
    name: "Shade",
    role: "Supporting",
    description:
      "A street thief with quick hands and quicker wit. Joins the group for her own reasons.",
    traits: ["Cunning", "Independent", "Guarded"],
  },
];
