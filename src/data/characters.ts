export type CharacterStat = {
  label: string;
  value: number;
};

export type CharacterRelationship = {
  characterId: string;
  relation: string;
  blurb: string;
};

export type Character = {
  id: string;
  name: string;
  role: string;
  description: string;
  traits: string[];
  age?: number;
  occupation?: string;
  origin?: string;
  affiliation?: string;
  status?: string;
  bio?: string;
  roleInStory?: string;
  stats?: CharacterStat[];
  keyTraits?: string[];
  quote?: string;
  arcSummary?: string;
  arcLabels?: [string, string];
  arcPoints?: number[];
  relationships?: CharacterRelationship[];
  notes?: string;
};

export const CHARACTERS: Character[] = [
  {
    id: "lira",
    name: "Lira",
    role: "Protagonist",
    description:
      "A resilient young woman haunted by a past she can't remember. Driven by a need to protect others.",
    traits: ["Brave", "Empathic", "Determined"],
    age: 21,
    occupation: "Relic Runner",
    origin: "Veyndor",
    affiliation: "None",
    status: "Alive",
    bio: "Lira is a resilient young woman haunted by fragments of a past she cannot remember. Driven by a deep empathy and a need to protect others, she steps into danger without hesitation. Her journey is one of self-discovery, as she unravels the truth of who she is and why her forgotten past holds the key to the world's fate.",
    roleInStory:
      "The emotional core of the story. Lira's choices drive the plot forward and shape the destinies of those around her.",
    stats: [
      { label: "Bravery", value: 8 },
      { label: "Empathy", value: 9 },
      { label: "Intelligence", value: 7 },
      { label: "Agility", value: 6 },
      { label: "Willpower", value: 9 },
    ],
    keyTraits: [
      "Protective of the vulnerable",
      "Struggles with trust",
      "Determined to uncover the truth",
      "Quick to act, slow to forgive",
    ],
    quote: "I don't remember where I come from. But I know where I'm going.",
    arcSummary:
      "Lira starts the story broken and uncertain. Through trials, loss, and trust, she embraces her identity and purpose.",
    arcLabels: ["Haunted", "Whole"],
    arcPoints: [2, 3, 3, 5, 6, 8, 9],
    relationships: [
      {
        characterId: "kael",
        relation: "Ally",
        blurb: "A wary trust forms as they rely on each other to survive.",
      },
      {
        characterId: "veyndor",
        relation: "Mentor",
        blurb: "Veyndor guides Lira toward the truth of her past.",
      },
      {
        characterId: "the-council",
        relation: "Adversary",
        blurb: "The Council views Lira's awakening memory as a threat.",
      },
    ],
    notes:
      "Consider revealing more of Lira's childhood in Chapter 5. Watch for continuity around her scar — see Continuity Editor flag in Chapter 2.",
  },
  {
    id: "kael",
    name: "Kael",
    role: "Deuteragonist",
    description:
      "A former guard with a cynical exterior. Struggles with guilt and finding purpose.",
    traits: ["Loyal", "Witty", "Haunted"],
    age: 26,
    occupation: "Former City Guard",
    origin: "Veyndor",
    affiliation: "None",
    status: "Alive",
    bio: "Kael left the City Guard after a failure he's never forgiven himself for. His cynicism hides a fierce loyalty to the few people he lets close, and his sharp wit is armor against a guilt he can't outrun.",
    roleInStory:
      "The skeptic who keeps the group grounded. Kael's arc tests whether guilt can become purpose.",
    stats: [
      { label: "Bravery", value: 7 },
      { label: "Empathy", value: 6 },
      { label: "Intelligence", value: 7 },
      { label: "Agility", value: 8 },
      { label: "Willpower", value: 7 },
    ],
    keyTraits: [
      "Deflects with humor",
      "Fiercely loyal once trust is earned",
      "Haunted by a past failure",
      "Uneasy around authority",
    ],
    quote: "You can't keep running.",
    arcSummary:
      "Kael begins closed off and self-punishing. Standing beside Lira gives him a reason to forgive himself.",
    arcLabels: ["Guarded", "Redeemed"],
    arcPoints: [3, 3, 4, 4, 6, 7, 8],
    relationships: [
      {
        characterId: "lira",
        relation: "Ally",
        blurb: "Kael becomes Lira's most steadfast protector.",
      },
      {
        characterId: "aric",
        relation: "Former Colleague",
        blurb: "They served in the City Guard together, on opposite sides now.",
      },
    ],
    notes: "Continuity flag: the east gate guard should recognize Kael from Chapter 1.",
  },
  {
    id: "the-council",
    name: "The Council",
    role: "Antagonist Force",
    description:
      "An ancient order that controls the flow of magic and information. Their motives are unclear.",
    traits: ["Powerful", "Secretive", "Cold"],
    age: undefined,
    occupation: "Ruling Order",
    origin: "Unknown",
    affiliation: "Itself",
    status: "Active",
    bio: "An ancient order that has quietly controlled the flow of magic and information for generations. Their motives are unclear, and their reach extends further than anyone in Veyndor suspects.",
    roleInStory:
      "The structural antagonist. The Council's hidden agenda shapes the world's rules and the obstacles the party must overcome.",
    stats: [
      { label: "Bravery", value: 5 },
      { label: "Empathy", value: 2 },
      { label: "Intelligence", value: 10 },
      { label: "Agility", value: 3 },
      { label: "Willpower", value: 10 },
    ],
    keyTraits: [
      "Speaks with one voice, many faces",
      "Values order above all else",
      "Withholds information as leverage",
      "Views individuals as expendable",
    ],
    quote: "Order was never meant to be understood. Only obeyed.",
    arcSummary:
      "The Council's true nature is revealed gradually, from distant threat to active architect of the story's central mystery.",
    arcLabels: ["Hidden", "Exposed"],
    arcPoints: [1, 1, 2, 2, 4, 5, 7],
    relationships: [
      {
        characterId: "lira",
        relation: "Adversary",
        blurb: "They see Lira's return as a danger to their order.",
      },
      {
        characterId: "veyndor",
        relation: "Former Member",
        blurb: "Veyndor broke from the Council long ago, for reasons unknown to Lira.",
      },
    ],
    notes: "Keep their true motive ambiguous until Chapter 8 reveal.",
  },
  {
    id: "veyndor",
    name: "Veyndor",
    role: "Ally",
    description:
      "A wise scholar and keeper of forgotten knowledge. Guides Lira on her journey through the ruins.",
    traits: ["Wise", "Patient", "Mysterious"],
    age: 58,
    occupation: "Scholar & Archivist",
    origin: "The Council (formerly)",
    affiliation: "Independent",
    status: "Alive",
    bio: "A wise scholar and keeper of forgotten knowledge, Veyndor left the Council decades ago and has spent his life since piecing together the truths they buried. He guides Lira through the ruins, though he rarely tells her everything he knows.",
    roleInStory:
      "The mentor figure. Veyndor supplies context and history, and his own hidden past becomes a subplot in its own right.",
    stats: [
      { label: "Bravery", value: 5 },
      { label: "Empathy", value: 7 },
      { label: "Intelligence", value: 9 },
      { label: "Agility", value: 3 },
      { label: "Willpower", value: 8 },
    ],
    keyTraits: [
      "Speaks in half-answers",
      "Patient to a fault",
      "Carries old regrets",
      "Trusts knowledge over instinct",
    ],
    quote: "Some doors are better left closed. I opened one anyway.",
    arcSummary:
      "Veyndor must decide whether to finally tell Lira the full truth of her past, and his role in it.",
    arcLabels: ["Withholding", "Honest"],
    arcPoints: [2, 2, 3, 3, 4, 6, 7],
    relationships: [
      {
        characterId: "lira",
        relation: "Mentee",
        blurb: "Veyndor sees in Lira the chance to make amends.",
      },
      {
        characterId: "the-council",
        relation: "Former Order",
        blurb: "He knows their methods better than anyone outside their ranks.",
      },
    ],
    notes: "Decide in outline whether Veyndor's Council history is revealed in Ch. 6 or held until the finale.",
  },
  {
    id: "aric",
    name: "Aric",
    role: "Supporting",
    description:
      "A young guard trying to hold onto his sense of honor in a corrupt system.",
    traits: ["Honorable", "Idealistic", "Torn"],
    age: 23,
    occupation: "City Guard",
    origin: "Veyndor",
    affiliation: "The Council",
    status: "Alive",
    bio: "A young guard trying to hold onto his sense of honor in a corrupt system. Aric believes in the ideals the Guard was founded on, even as he watches them erode around him.",
    roleInStory:
      "A foil to Kael — what he could have become had he stayed. Aric's loyalty is tested as the Council's true nature surfaces.",
    stats: [
      { label: "Bravery", value: 6 },
      { label: "Empathy", value: 6 },
      { label: "Intelligence", value: 5 },
      { label: "Agility", value: 6 },
      { label: "Willpower", value: 6 },
    ],
    keyTraits: [
      "Believes in the system, for now",
      "Uncomfortable with corruption",
      "Loyal to his oath",
      "Slow to question authority",
    ],
    quote: "I took an oath. It has to mean something.",
    arcSummary:
      "Aric's faith in the Guard cracks as he's forced to choose between his oath and his conscience.",
    arcLabels: ["Dutiful", "Defiant"],
    arcPoints: [3, 3, 3, 4, 4, 5, 7],
    relationships: [
      {
        characterId: "kael",
        relation: "Former Colleague",
        blurb: "Aric doesn't understand why Kael walked away — yet.",
      },
    ],
    notes: "",
  },
  {
    id: "shade",
    name: "Shade",
    role: "Supporting",
    description:
      "A street thief with quick hands and quicker wit. Joins the group for her own reasons.",
    traits: ["Cunning", "Independent", "Guarded"],
    age: 19,
    occupation: "Thief",
    origin: "Veyndor, the Lower Quarter",
    affiliation: "None",
    status: "Alive",
    bio: "A street thief with quick hands and quicker wit, Shade survives by trusting no one but herself. She joins Lira's group for reasons she keeps carefully to herself.",
    roleInStory:
      "The wildcard. Shade's own agenda creates tension within the group and a slow-burn arc toward genuine loyalty.",
    stats: [
      { label: "Bravery", value: 6 },
      { label: "Empathy", value: 4 },
      { label: "Intelligence", value: 7 },
      { label: "Agility", value: 9 },
      { label: "Willpower", value: 7 },
    ],
    keyTraits: [
      "Trusts actions over words",
      "Keeps an exit planned at all times",
      "Fiercely independent",
      "Softens slowly, on her own terms",
    ],
    quote: "I don't do this for free. I just haven't named my price yet.",
    arcSummary:
      "Shade's guarded independence gives way, in small moments, to something like belonging.",
    arcLabels: ["Alone", "Belonging"],
    arcPoints: [2, 2, 2, 3, 4, 5, 6],
    relationships: [
      {
        characterId: "lira",
        relation: "Uneasy Ally",
        blurb: "Shade respects Lira's resolve, even if she won't admit it.",
      },
    ],
    notes: "",
  },
];
