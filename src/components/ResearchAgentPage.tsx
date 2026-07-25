"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  Globe,
  Heart,
  History,
  Loader2,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence, type Variants, type Transition } from "framer-motion";

// ─── types ────────────────────────────────────────────────────────────────────

type Role = "user" | "agent";
type MessageStatus = "typing" | "done";

type InconsistencyFlag = {
  element: string;
  issue: string;
  why: string;
  reference: string;
  severity: "Critical" | "Anachronism" | "Partial";
};

type ThemeDriftContributor = { label: string; delta: string; direction: "up" | "down" };

type EvolutionRow = {
  aspect: string;
  v1: string;
  v2: string;
  v3: string;
  impact: "Major Shift" | "Moderate Shift" | "Major Drift" | "Stable";
};

type AgentResult = {
  type: "inconsistencies" | "theme_drift" | "evolution" | "text";
  text?: string;
  flags?: InconsistencyFlag[];
  originalBrief?: string[];
  currentAnalysis?: string[];
  deviationScore?: number;
  contributors?: ThemeDriftContributor[];
  rows?: EvolutionRow[];
  overallAlignment?: number;
};

type Message = {
  id: string;
  role: Role;
  text: string;
  status: MessageStatus;
  result?: AgentResult;
};

type ScanMode = "full" | "inconsistencies" | "theme" | "evolution";

type ChatSession = {
  id: string;
  title: string;
  timeLabel: string;
  group: "Today" | "Yesterday" | "Earlier";
  messages: Message[];
};

// ─── mock agent responses ─────────────────────────────────────────────────────

const HISTORICAL_FLAGS: InconsistencyFlag[] = [
  {
    element: "Reading Glasses",
    issue: "Anachronism",
    why: "Reading glasses weren't invented until the late 13th century (around 1280s in Italy) and weren't common in England in 1290.",
    reference: "Chapter 2 (p. 45)",
    severity: "Anachronism",
  },
  {
    element: "Printing Press",
    issue: "Anachronism",
    why: "The printing press wasn't invented until ~1440 by Johannes Gutenberg.",
    reference: "Chapter 1 (p. 112)",
    severity: "Anachronism",
  },
  {
    element: "Magnetic Compass (Marine Use)",
    issue: "Partial Inaccuracy",
    why: "Marine compasses existed, but were not used in open-ocean navigation in Europe until the 14th century.",
    reference: "Chapter 3 (p. 67)",
    severity: "Partial",
  },
];

const THEME_CONTRIBUTORS: ThemeDriftContributor[] = [
  { label: "Increased themes of loss and mortality", delta: "+28%", direction: "up" },
  { label: "Reduced comedic relief and banter", delta: "+23%", direction: "up" },
  { label: "Heavier emotional intensity", delta: "+18%", direction: "up" },
];

const EVOLUTION_ROWS: EvolutionRow[] = [
  { aspect: "Plot Direction", v1: "Light-hearted romance with fun obstacles", v2: "Added family conflict and past trauma", v3: "High stakes, tragedy looming, comedy reduced", impact: "Major Shift" },
  { aspect: "Character Development", v1: "Protagonists meet → grow closer", v2: "More backstory and internal conflict", v3: "Protagonist arc now focused on grief and sacrifice", impact: "Major Shift" },
  { aspect: "Emotional Pacing", v1: "Upbeat with steady comedic beats", v2: "More dramatic dips, less comedy", v3: "Mostly heavy, few light moments", impact: "Major Shift" },
  { aspect: "Visual Direction", v1: "Bright, warm, vibrant palette", v2: "Some darker tones introduced", v3: "Dark, muted, stormy palette", impact: "Moderate Shift" },
  { aspect: "Theme Alignment", v1: "Romance / Comedy (100%)", v2: "Romance / Comedy (82%)", v3: "Romance / Comedy (59%)", impact: "Major Drift" },
];

const SEED_HISTORY: ChatSession[] = [
  {
    id: "hist-1",
    title: "Historical Accuracy Scan",
    timeLabel: "10:32 AM",
    group: "Today",
    messages: [],
  },
  {
    id: "hist-2",
    title: "Theme Analysis",
    timeLabel: "9:15 AM",
    group: "Today",
    messages: [],
  },
  {
    id: "hist-3",
    title: "Full Research Scan",
    timeLabel: "July 24",
    group: "Yesterday",
    messages: [],
  },
];

async function runAgentStream(
  query: string,
  mode: ScanMode,
  onChunk: (chunk: string) => void,
  onResult: (result: AgentResult) => void,
): Promise<void> {
  const responses: Record<ScanMode, { text: string; result: AgentResult }> = {
    inconsistencies: {
      text: "Scanning your manuscript for historical inconsistencies against the selected time period: England, 1290 AD…\n\nAnalysing 3 chapters. Cross-referencing against verified historical database…",
      result: { type: "inconsistencies", flags: HISTORICAL_FLAGS },
    },
    theme: {
      text: "Analysing theme alignment against your original brief (Romance/Comedy)…\n\nComparing narrative tone across v1.0 → v3.2. Calculating deviation score…",
      result: {
        type: "theme_drift",
        originalBrief: ["Romance", "Comedy"],
        currentAnalysis: ["Drama", "Tragedy", "Dark"],
        deviationScore: 41,
        contributors: THEME_CONTRIBUTORS,
      },
    },
    evolution: {
      text: "Comparing project versions: v1.0 (Original Brief) → v2.0 (May 2) → v3.2 (Current, May 20)…\n\nMapping key changes across plot, character, emotional pacing, and visual direction…",
      result: { type: "evolution", overallAlignment: 76, rows: EVOLUTION_ROWS },
    },
    full: {
      text: "Running full research scan…\n\nStep 1: Historical accuracy check\nStep 2: Theme drift analysis\nStep 3: Project evolution overview\nStep 4: Generating summary report…",
      result: {
        type: "text",
        text: "Full scan complete. Found 3 historical inconsistencies, 41% theme deviation from original brief, and significant story drift across 3 major aspects.",
      },
    },
  };

  const { text, result } = responses[mode] || responses.inconsistencies;
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    await new Promise((r) => setTimeout(r, 28 + Math.random() * 22));
    onChunk((i === 0 ? "" : " ") + words[i]);
  }
  await new Promise((r) => setTimeout(r, 400));
  onResult(result);
}

// ─── result renderers (unchanged) ────────────────────────────────────────────

function SeverityBadge({ s }: { s: InconsistencyFlag["severity"] }) {
  if (s === "Critical")
    return <span className="rounded-sm bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">Critical</span>;
  if (s === "Anachronism")
    return <span className="rounded-sm bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">Anachronism</span>;
  return <span className="rounded-sm bg-yellow-500/15 px-2 py-0.5 text-[10px] text-yellow-400">Partial Inaccuracy</span>;
}

function ImpactBadge({ impact }: { impact: EvolutionRow["impact"] }) {
  const color =
    impact === "Major Drift" ? "text-red-400" :
    impact === "Major Shift" ? "text-amber-400" :
    impact === "Moderate Shift" ? "text-yellow-400" : "text-emerald-400";
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      {impact !== "Stable" && <TrendingDown className="h-3 w-3" />}
      {impact}
    </span>
  );
}

function TagPill({ label, variant }: { label: string; variant: "original" | "current" }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${variant === "original" ? "bg-violet-2/20 text-violet-1" : "bg-red-500/15 text-red-300"}`}>
      {label}
    </span>
  );
}

function InconsistenciesPanel({ flags }: { flags: InconsistencyFlag[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-3 overflow-hidden rounded-xl border border-amber-500/30 bg-bg-0"
    >
      <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/5 px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <div className="flex-1">
          <span className="text-sm font-medium text-ink">Historical Inconsistencies Detected</span>
          <p className="text-xs text-ink/50">The following elements conflict with the selected time period: England, 1290 AD</p>
        </div>
        <span className="rounded-sm bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">Critical</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-violet-3/10 text-xs text-ink/40">
              <th className="px-4 py-2.5 text-left font-normal">Element</th>
              <th className="px-4 py-2.5 text-left font-normal">Issue</th>
              <th className="px-4 py-2.5 text-left font-normal">Why It&apos;s Inaccurate</th>
              <th className="px-4 py-2.5 text-left font-normal">Reference</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag, i) => (
              <tr key={i} className="border-b border-violet-3/10 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-violet-3/20" />
                    <span className="text-ink">{flag.element}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><SeverityBadge s={flag.severity} /></td>
                <td className="max-w-[180px] px-4 py-3 text-xs leading-relaxed text-ink/60">{flag.why}</td>
                <td className="px-4 py-3 text-xs text-ink/50">{flag.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-amber-500/20 px-4 py-2.5">
        <button className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300">
          View all historical flags (7) <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}

function ThemeDriftPanel({ originalBrief, currentAnalysis, deviationScore, contributors }: {
  originalBrief: string[];
  currentAnalysis: string[];
  deviationScore: number;
  contributors: ThemeDriftContributor[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mt-3 overflow-hidden rounded-xl border border-violet-3/30 bg-bg-0 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-violet-2" />
          <span className="text-sm font-medium text-ink">Theme Alignment: Romance/Comedy</span>
        </div>
        <span className="rounded-sm bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-400">Warning</span>
      </div>
      <p className="mt-1 text-xs text-ink/50">The story is drifting from the original tone and theme.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-ink/40">Original Brief</p>
          <div className="flex flex-wrap gap-1.5">
            {originalBrief.map((t) => <TagPill key={t} label={t} variant="original" />)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-ink/40">Current Analysis</p>
          <div className="flex flex-wrap gap-1.5">
            {currentAnalysis.map((t) => <TagPill key={t} label={t} variant="current" />)}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs text-ink/40">Deviation Score</p>
        <p className="mt-1 text-sm font-medium text-ink">{deviationScore}% away from original theme</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-1">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${deviationScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-red-400"
          />
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs text-ink/40">Top Contributors to Drift</p>
        {contributors.map((c, i) => (
          <div key={i} className="flex items-center justify-between py-1 text-xs">
            <span className="text-ink/70">• {c.label}</span>
            <span className={c.direction === "up" ? "text-red-400" : "text-emerald-400"}>{c.delta}</span>
          </div>
        ))}
      </div>
      <button className="mt-3 flex items-center gap-1.5 text-xs text-violet-2 hover:text-violet-1">
        View full theme analysis <ArrowRight className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

function EvolutionPanel({ rows, overallAlignment }: { rows: EvolutionRow[]; overallAlignment: number }) {
  const gaugeColor = overallAlignment >= 80 ? "#34d399" : overallAlignment >= 60 ? "#d9a84e" : "#f87171";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-3 overflow-hidden rounded-xl border border-violet-3/30 bg-bg-0"
    >
      <div className="flex flex-wrap items-center justify-between border-b border-violet-3/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-2" />
          <span className="text-sm font-medium text-ink">Project Evolution Overview</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full border-2"
            style={{ borderColor: gaugeColor, color: gaugeColor }}
          >
            <span className="text-[10px] font-bold">{overallAlignment}%</span>
          </div>
          <div>
            <p className="text-xs font-medium text-ink">{overallAlignment}% Aligned</p>
            <p className="text-[10px] text-ink/40">Overall</p>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-violet-3/10 text-ink/35">
              <th className="px-4 py-2.5 text-left font-normal">Aspect</th>
              <th className="px-4 py-2.5 text-left font-normal">v1.0 (Original Brief)</th>
              <th className="px-4 py-2.5 text-left font-normal">v2.0</th>
              <th className="px-4 py-2.5 text-left font-normal">v3.2 (Current)</th>
              <th className="px-4 py-2.5 text-left font-normal">Change Impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-violet-3/10 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{row.aspect}</td>
                <td className="px-4 py-3 text-ink/60">{row.v1}</td>
                <td className="px-4 py-3 text-ink/60">
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-ink/30" />{row.v2}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/60">
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-ink/30" />{row.v3}
                  </span>
                </td>
                <td className="px-4 py-3"><ImpactBadge impact={row.impact} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ResultRenderer({ result }: { result: AgentResult }) {
  switch (result.type) {
    case "inconsistencies":
      return <InconsistenciesPanel flags={result.flags!} />;
    case "theme_drift":
      return (
        <ThemeDriftPanel
          originalBrief={result.originalBrief!}
          currentAnalysis={result.currentAnalysis!}
          deviationScore={result.deviationScore!}
          contributors={result.contributors!}
        />
      );
    case "evolution":
      return <EvolutionPanel rows={result.rows!} overallAlignment={result.overallAlignment!} />;
    case "text":
      return <div className="mt-2 text-sm text-ink/70">{result.text}</div>;
    default:
      return null;
  }
}

// ─── research tools config ────────────────────────────────────────────────────

const RESEARCH_TOOLS: { icon: typeof Clock; label: string; prompt: string; mode: ScanMode }[] = [
  { icon: Clock,       label: "Check historical accuracy",    prompt: "Check my story for historical inconsistencies against the selected time period.", mode: "inconsistencies" },
  { icon: Heart,       label: "Analyze theme drift",          prompt: "Analyse how much my story has drifted from its original theme and tone.", mode: "theme" },
  { icon: TrendingUp,  label: "Project evolution overview",   prompt: "Show me how my project has evolved across versions.", mode: "evolution" },
  { icon: Globe,       label: "Full research scan",           prompt: "Run a full research scan covering accuracy, theme drift, and evolution.", mode: "full" },
];

// ─── animation variants ───────────────────────────────────────────────────────

const msgVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as Transition },
};

const sidebarVariant: Variants = {
  open:   { width: 260, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } as Transition },
  closed: { width: 0,   opacity: 0, transition: { duration: 0.25, ease: "easeIn" } as Transition },
};

// ─── intro message component ──────────────────────────────────────────────────

function IntroMessage({ accentColor }: { accentColor: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex flex-col items-center px-4 py-16 text-center"
    >
      {/* Avatar */}
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${accentColor === "gold" ? "bg-gold-2/20" : "bg-violet-2/20"} mb-5`}>
        <FlaskConical className={`h-7 w-7 ${accentColor === "gold" ? "text-gold-2" : "text-violet-2"}`} />
      </div>

      <h2 className={`font-display text-2xl tracking-wide ${accentColor === "gold" ? "text-gold-1" : "text-violet-1"}`}>
        Research Agent
      </h2>

      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink/65">
        Hello! I&apos;m your Research Agent.
      </p>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink/65">
        I help analyze your story for:
      </p>

      {/* Capabilities list */}
      <div className="mt-5 flex flex-col items-start gap-2.5 text-left">
        {[
          { icon: Clock,      label: "Historical accuracy",         sub: "Cross-references time periods & real-world events" },
          { icon: Heart,      label: "Theme consistency",           sub: "Tracks drift from your original creative brief" },
          { icon: TrendingUp, label: "Story evolution",             sub: "Maps how your narrative has changed across versions" },
          { icon: Globe,      label: "World-building conflicts",    sub: "Flags lore contradictions and setting inconsistencies" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${accentColor === "gold" ? "bg-gold-2/15" : "bg-violet-2/15"}`}>
              <Icon className={`h-3.5 w-3.5 ${accentColor === "gold" ? "text-gold-2" : "text-violet-2"}`} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{label}</p>
              <p className="text-xs text-ink/45">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <p className={`mt-8 text-sm font-medium ${accentColor === "gold" ? "text-gold-2" : "text-violet-2"}`}>
        What would you like me to research?
      </p>
    </motion.div>
  );
}

// ─── main export ──────────────────────────────────────────────────────────────

export function ResearchAgentPage({ accentClass = "violet" }: { accentClass?: "violet" | "gold" }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>(SEED_HISTORY);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isGold = accentClass === "gold";
  const accentText = isGold ? "text-gold-1" : "text-violet-1";
  const accentBtn = isGold
    ? "bg-gold-2 hover:bg-gold-1 text-bg-0"
    : "bg-violet-2 hover:opacity-90 text-bg-0";
  const accentBorder = isGold ? "border-gold-3/25" : "border-violet-3/25";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── chat actions ──────────────────────────────────────────────────────────

  function startNewChat() {
    const newId = `chat-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: "New Chat",
      timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      group: "Today",
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveChatId(newId);
    setMessages([]);
    setInput("");
    setIsRunning(false);
  }

  function openSession(id: string) {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    setActiveChatId(id);
    setMessages(session.messages);
    setInput("");
    setIsRunning(false);
  }

  async function sendMessage(text: string, mode: ScanMode) {
    if (!text.trim() || isRunning) return;

    // If no active chat, create one first
    let chatId = activeChatId;
    if (!chatId) {
      const newId = `chat-${Date.now()}`;
      const newSession: ChatSession = {
        id: newId,
        title: text.slice(0, 32) + (text.length > 32 ? "…" : ""),
        timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        group: "Today",
        messages: [],
      };
      setSessions((prev) => [newSession, ...prev]);
      chatId = newId;
      setActiveChatId(newId);
    }

    const userMsg: Message = { id: Date.now().toString(), role: "user", text, status: "done" };
    const agentMsgId = (Date.now() + 1).toString();
    const agentMsg: Message = { id: agentMsgId, role: "agent", text: "", status: "typing" };

    const nextMessages = [...messages, userMsg, agentMsg];
    setMessages(nextMessages);
    setInput("");
    setIsRunning(true);

    // Update session title from first user message
    setSessions((prev) =>
      prev.map((s) =>
        s.id === chatId && s.title === "New Chat"
          ? { ...s, title: text.slice(0, 32) + (text.length > 32 ? "…" : "") }
          : s,
      ),
    );

    await runAgentStream(
      text,
      mode,
      (chunk) => {
        setMessages((m) =>
          m.map((msg) => msg.id === agentMsgId ? { ...msg, text: msg.text + chunk } : msg),
        );
      },
      (result) => {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === agentMsgId ? { ...msg, status: "done", result } : msg,
          ),
        );
        setIsRunning(false);
      },
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input, "inconsistencies");
  }

  function handleTool(tool: (typeof RESEARCH_TOOLS)[number]) {
    if (!activeChatId) startNewChat();
    sendMessage(tool.prompt, tool.mode);
  }

  // ── group sessions for sidebar ────────────────────────────────────────────

  const todaySessions    = sessions.filter((s) => s.group === "Today");
  const yesterdaySessions = sessions.filter((s) => s.group === "Yesterday");
  const earlierSessions  = sessions.filter((s) => s.group === "Earlier");

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-73px)] overflow-hidden">

      {/* ── Collapsible Sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial="closed"
            animate="open"
            exit="closed"
            variants={sidebarVariant}
            className={`flex shrink-0 flex-col overflow-hidden border-r ${accentBorder} bg-bg-1`}
            style={{ minWidth: 0 }}
          >
            <div className="flex w-[260px] flex-col gap-0 overflow-y-auto pb-6">
              {/* Sidebar header */}
              <div className={`flex items-center justify-between border-b ${accentBorder} px-4 py-4`}>
                <div className="flex items-center gap-2">
                  <FlaskConical className={`h-4 w-4 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
                  <span className={`font-display text-sm tracking-wide ${accentText}`}>Research Agent</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  className="rounded-md p-1 text-ink/40 transition-colors hover:bg-ink/8 hover:text-ink"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              {/* New Chat button */}
              <div className="px-3 pt-4">
                <button
                  onClick={startNewChat}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${accentBtn}`}
                >
                  <MessageSquarePlus className="h-4 w-4 shrink-0" />
                  New Chat
                </button>
              </div>

              {/* Research Tools */}
              <div className="px-3 pt-5">
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-ink/35">
                  Research Tools
                </p>
                <div className="flex flex-col gap-0.5">
                  {RESEARCH_TOOLS.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.mode}
                        onClick={() => handleTool(tool)}
                        disabled={isRunning}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink/70 transition-colors hover:bg-ink/6 hover:text-ink disabled:opacity-40`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${isGold ? "bg-gold-2/12" : "bg-violet-2/12"}`}>
                          <Icon className={`h-3 w-3 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className={`text-xs ${isGold ? "text-gold-2" : "text-violet-2"}`}>✦</span>
                          {tool.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Chats */}
              <div className="px-3 pt-5">
                <p className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-ink/35">
                  <History className="h-3 w-3" />
                  Recent Chats
                </p>

                {todaySessions.length > 0 && (
                  <>
                    <p className="mb-1 mt-2 px-3 text-[10px] text-ink/30">Today</p>
                    {todaySessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openSession(s.id)}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                          activeChatId === s.id
                            ? isGold ? "bg-gold-2/10 text-gold-1" : "bg-violet-2/10 text-violet-1"
                            : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                        }`}
                      >
                        <MessageSquarePlus className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{s.title}</p>
                          <p className="text-[10px] text-ink/35">{s.timeLabel}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {yesterdaySessions.length > 0 && (
                  <>
                    <p className="mb-1 mt-3 px-3 text-[10px] text-ink/30">Yesterday</p>
                    {yesterdaySessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openSession(s.id)}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                          activeChatId === s.id
                            ? isGold ? "bg-gold-2/10 text-gold-1" : "bg-violet-2/10 text-violet-1"
                            : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                        }`}
                      >
                        <MessageSquarePlus className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{s.title}</p>
                          <p className="text-[10px] text-ink/35">{s.timeLabel}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {earlierSessions.length > 0 && (
                  <>
                    <p className="mb-1 mt-3 px-3 text-[10px] text-ink/30">Earlier</p>
                    {earlierSessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openSession(s.id)}
                        className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                          activeChatId === s.id
                            ? isGold ? "bg-gold-2/10 text-gold-1" : "bg-violet-2/10 text-violet-1"
                            : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                        }`}
                      >
                        <MessageSquarePlus className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{s.title}</p>
                          <p className="text-[10px] text-ink/35">{s.timeLabel}</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main Chat Area ── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Chat topbar */}
        <div className={`flex shrink-0 items-center gap-3 border-b ${accentBorder} px-4 py-3`}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="rounded-md p-1.5 text-ink/40 transition-colors hover:bg-ink/8 hover:text-ink"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <FlaskConical className={`h-4 w-4 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
            <span className={`font-display text-base tracking-wide ${accentText}`}>
              {activeChatId
                ? (sessions.find((s) => s.id === activeChatId)?.title ?? "Research Agent")
                : "Research Agent"}
            </span>
          </div>
        </div>

        {/* Messages or empty state */}
        <div className="flex-1 overflow-y-auto">
          {activeChatId === null ? (
            /* Empty state — no session selected */
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${isGold ? "bg-gold-2/15" : "bg-violet-2/15"} mb-4`}>
                <FlaskConical className={`h-6 w-6 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
              </div>
              <h2 className={`font-display text-xl ${accentText}`}>Research Agent</h2>
              <p className="mt-2 max-w-xs text-sm text-ink/50">
                Start a new conversation or select a previous research chat from the sidebar.
              </p>
              <button
                onClick={startNewChat}
                className={`mt-6 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${accentBtn}`}
              >
                <MessageSquarePlus className="h-4 w-4" />
                New Chat
              </button>
            </div>
          ) : messages.length === 0 ? (
            /* New chat — show intro */
            <IntroMessage accentColor={accentClass} />
          ) : (
            /* Active conversation */
            <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    variants={msgVariant}
                    initial="hidden"
                    animate="visible"
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    {/* Avatar */}
                    {msg.role === "agent" ? (
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isGold ? "bg-gold-2/20" : "bg-violet-2/20"}`}>
                        <Bot className={`h-4 w-4 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-2/15">
                        <span className="font-display text-xs text-gold-2">U</span>
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`max-w-[80%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                          msg.role === "user"
                            ? isGold ? "bg-gold-2/15 text-ink" : "bg-violet-2/15 text-ink"
                            : "bg-bg-1 text-ink/80"
                        }`}
                      >
                        {msg.text}
                        {msg.status === "typing" && !msg.text && (
                          <span className="flex items-center gap-1.5">
                            <Loader2 className={`h-3.5 w-3.5 animate-spin ${isGold ? "text-gold-2" : "text-violet-2"}`} />
                            <span className="text-ink/40">Thinking…</span>
                          </span>
                        )}
                      </div>
                      {msg.result && <ResultRenderer result={msg.result} />}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar — only shown when a chat is active */}
        {activeChatId !== null && (
          <div className={`shrink-0 border-t ${accentBorder} px-4 py-3`}>
            <form
              onSubmit={handleSubmit}
              className={`mx-auto flex max-w-3xl items-end gap-2 rounded-xl border ${isGold ? "border-gold-3/30 focus-within:border-gold-2/60" : "border-violet-3/30 focus-within:border-violet-2/60"} bg-bg-1 px-4 py-2.5 transition-colors`}
            >
              <textarea
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input, "inconsistencies");
                  }
                }}
                placeholder="Ask the research agent anything about your story…"
                disabled={isRunning}
                className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none disabled:opacity-50"
                style={{ minHeight: "24px", maxHeight: "120px" }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isRunning}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-35 ${accentBtn}`}
              >
                {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </form>
            <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-ink/25">
              Press Enter to send · Shift+Enter for new line
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
