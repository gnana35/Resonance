export type WordsOverTimePoint = { date: string; words: number };

export const WORDS_OVER_TIME: WordsOverTimePoint[] = [
  { date: "May 10", words: 750 },
  { date: "May 11", words: 1150 },
  { date: "May 12", words: 1550 },
  { date: "May 13", words: 1750 },
  { date: "May 14", words: 2100 },
  { date: "May 15", words: 2350 },
  { date: "May 16", words: 2734 },
];

export type WordsByType = { type: string; value: number; color: string };

export const WORDS_BY_TYPE: WordsByType[] = [
  { type: "Dialogue", value: 1120, color: "#a78bfa" },
  { type: "Description", value: 766, color: "#38bdf8" },
  { type: "Action", value: 465, color: "#34d399" },
  { type: "Internal Thought", value: 383, color: "#d9a84e" },
];

export type WritingByDay = { day: string; words: number };

export const WRITING_BY_DAY: WritingByDay[] = [
  { day: "Mon", words: 450 },
  { day: "Tue", words: 560 },
  { day: "Wed", words: 710 },
  { day: "Thu", words: 520 },
  { day: "Fri", words: 180 },
  { day: "Sat", words: 120 },
  { day: "Sun", words: 350 },
];

export type StoryHealthMetric = { label: string; value: number; color: string };

export const STORY_HEALTH: StoryHealthMetric[] = [
  { label: "Plot Consistency", value: 92, color: "#34d399" },
  { label: "Character Arcs", value: 86, color: "#a78bfa" },
  { label: "Pacing", value: 74, color: "#38bdf8" },
  { label: "Worldbuilding", value: 89, color: "#34d399" },
  { label: "Dialogue Balance", value: 81, color: "#d9a84e" },
];

export type Achievement = {
  id: string;
  title: string;
  description: string;
  unlockedDate?: string;
  progress?: { current: number; target: number };
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-steps",
    title: "First Steps",
    description: "Write your first 1,000 words",
    unlockedDate: "May 9, 2025",
  },
  {
    id: "week-warrior",
    title: "Week Warrior",
    description: "Write 7 days in a row",
    unlockedDate: "May 16, 2025",
  },
  {
    id: "story-architect",
    title: "Story Architect",
    description: "Create 10 outline items",
    unlockedDate: "May 12, 2025",
  },
  {
    id: "deep-diver",
    title: "Deep Diver",
    description: "Write for 5 hours in a day",
    progress: { current: 3, target: 5 },
  },
];

export const WEEK_STREAK = [
  { label: "M", done: true },
  { label: "T", done: true },
  { label: "W", done: true },
  { label: "T", done: true },
  { label: "F", done: true },
  { label: "S", done: true },
  { label: "S", done: false },
];
