"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  ChevronDown,
  Clock,
  FlaskConical,
  Globe,
  Heart,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion, type Variants, type Transition } from "framer-motion";

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

// Module scope: ids are minted from event handlers, never during render.
let messageIdCounter = 0;
function nextMessageId() {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

async function runAgentStream(
  query: string,
  mode: ScanMode,
  onChunk: (chunk: string) => void,
  onResult: (result: AgentResult) => void,
): Promise<void> {
  // Simulate streaming text then structured result
  const responses: Record<ScanMode, { text: string; result: AgentResult }> = {
    inconsistencies: {
      text: "Scanning your manuscript for historical inconsistencies against the selected time period: England, 1290 AD…\n\nAnalysing 3 chapters. Cross-referencing against verified historical database…",
      result: {
        type: "inconsistencies",
        flags: HISTORICAL_FLAGS,
      },
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
      result: {
        type: "evolution",
        overallAlignment: 76,
        rows: EVOLUTION_ROWS,
      },
    },
    full: {
      text: "Running full research scan…\n\nStep 1: Historical accuracy check\nStep 2: Theme drift analysis\nStep 3: Project evolution overview\nStep 4: Generating summary report…",
      result: {
        type: "text",
        text: "Full scan complete. Found 3 historical inconsistencies, 41% theme deviation from original brief, and significant story drift across 3 major aspects. See detailed panels below.",
      },
    },
  };

  const { text, result } = responses[mode] || responses.inconsistencies;

  // stream text character by character (batched)
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    await new Promise((r) => setTimeout(r, 28 + Math.random() * 22));
    onChunk((i === 0 ? "" : " ") + words[i]);
  }

  await new Promise((r) => setTimeout(r, 400));
  onResult(result);
}

// ─── helper renderers ─────────────────────────────────────────────────────────

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
  const arrow = impact === "Stable" ? null : <TrendingDown className="h-3 w-3" />;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      {arrow}
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

// ─── result renderers ─────────────────────────────────────────────────────────

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
            <span className={c.direction === "up" ? "text-red-400" : "text-emerald-400"}>
              {c.delta}
            </span>
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
  // Simple gauge
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
        <span className="text-xs text-ink/40">Key changes across versions</span>
        <div className="mt-1 flex items-center gap-2">
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
                    <ArrowRight className="h-3 w-3 text-ink/30" />
                    {row.v2}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/60">
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-ink/30" />
                    {row.v3}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ImpactBadge impact={row.impact} />
                </td>
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
      return (
        <div className="mt-2 text-sm text-ink/70">{result.text}</div>
      );
    default:
      return null;
  }
}

// ─── quick prompts ─────────────────────────────────────────────────────────────

const QUICK_PROMPTS: { label: string; prompt: string; mode: ScanMode }[] = [
  { label: "Check historical accuracy", prompt: "Check my story for historical inconsistencies against the selected time period.", mode: "inconsistencies" },
  { label: "Analyse theme drift", prompt: "Analyse how much my story has drifted from its original theme and tone.", mode: "theme" },
  { label: "Project evolution overview", prompt: "Show me how my project has evolved across versions.", mode: "evolution" },
  { label: "Full research scan", prompt: "Run a full research scan covering accuracy, theme drift, and evolution.", mode: "full" },
];

// ─── animation variants ───────────────────────────────────────────────────────

const msgVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as Transition },
};

// ─── main component ───────────────────────────────────────────────────────────

export function ResearchAgentPage({ accentClass = "violet" }: { accentClass?: "violet" | "gold" }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "agent",
      status: "done",
      text: "Hello! I'm your Research Agent. I check for historical accuracy, track theme alignment, and monitor how your project evolves across versions.\n\nWhat would you like me to analyse?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>("inconsistencies");
  const bottomRef = useRef<HTMLDivElement>(null);

  const titleColor = accentClass === "gold" ? "text-gold-1" : "text-violet-1";
  const accentBtn = accentClass === "gold"
    ? "bg-gold-2 hover:bg-gold-1 text-bg-0"
    : "bg-violet-2 hover:opacity-90 text-bg-0";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string, mode: ScanMode) {
    if (!text.trim() || isRunning) return;

    const userMsg: Message = { id: nextMessageId(), role: "user", text, status: "done" };
    const agentMsgId = nextMessageId();
    const agentMsg: Message = { id: agentMsgId, role: "agent", text: "", status: "typing" };

    setMessages((m) => [...m, userMsg, agentMsg]);
    setInput("");
    setIsRunning(true);

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
    sendMessage(input, scanMode);
  }

  function handleQuickPrompt(qp: typeof QUICK_PROMPTS[number]) {
    sendMessage(qp.prompt, qp.mode);
  }

  function handleNewScan() {
    setMessages([
      {
        id: "welcome-reset",
        role: "agent",
        status: "done",
        text: "Session reset. What would you like me to research next?",
      },
    ]);
    setInput("");
    setIsRunning(false);
  }

  return (
    <div className="flex h-[calc(100vh-73px)] flex-col px-6 py-6 md:px-10">
      {/* ── header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="mb-4 flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-2/15">
            <FlaskConical className="h-5 w-5 text-violet-2" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`font-display text-2xl tracking-wide ${titleColor}`}>
                Research Agent
              </h1>
              <Sparkles className="h-4 w-4 text-violet-2" />
            </div>
            <p className="mt-0.5 text-sm text-ink/55">
              AI research agent that checks for historical accuracy and theme alignment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* mode selector */}
          <div className="relative flex items-center gap-2 rounded-lg border border-violet-3/30 bg-bg-1 px-3 py-2 text-sm text-ink/70">
            <Search className="h-3.5 w-3.5 text-ink/40" />
            <select
              value={scanMode}
              onChange={(e) => setScanMode(e.target.value as ScanMode)}
              className="appearance-none bg-transparent text-sm text-ink focus:outline-none"
            >
              <option value="inconsistencies">View: Historical Accuracy</option>
              <option value="theme">View: Theme Alignment</option>
              <option value="evolution">View: Evolution</option>
              <option value="full">View: All Flags</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-ink/40" />
          </div>

          <button
            onClick={handleNewScan}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all ${accentBtn}`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Run New Scan
          </button>
        </div>
      </motion.div>

      {/* ── main two-col layout ── */}
      <div className="flex min-h-0 flex-1 gap-5">
        {/* LEFT — chat + results */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">

          {/* quick prompts */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="flex flex-wrap gap-2"
          >
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.mode}
                onClick={() => handleQuickPrompt(qp)}
                disabled={isRunning}
                className="flex items-center gap-1.5 rounded-full border border-violet-3/30 bg-bg-1 px-3 py-1.5 text-xs text-ink/70 transition-colors hover:border-violet-2/50 hover:text-ink disabled:opacity-40"
              >
                <Sparkles className="h-3 w-3 text-violet-2" />
                {qp.label}
              </button>
            ))}
          </motion.div>

          {/* message list */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-violet-3/20 bg-bg-1 p-4">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  variants={msgVariant}
                  initial="hidden"
                  animate="visible"
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* avatar */}
                  {msg.role === "agent" ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-2/20">
                      <Bot className="h-4 w-4 text-violet-2" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-2/15">
                      <span className="font-display text-xs text-gold-2">U</span>
                    </div>
                  )}

                  <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
                    {/* bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-violet-2/15 text-ink"
                          : "bg-bg-0 text-ink/80"
                      }`}
                    >
                      {msg.text}
                      {msg.status === "typing" && !msg.text && (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-2" />
                          <span className="text-ink/40">Thinking…</span>
                        </span>
                      )}
                    </div>

                    {/* structured result */}
                    {msg.result && <ResultRenderer result={msg.result} />}
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* input */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the research agent anything about your story…"
                disabled={isRunning}
                className="w-full rounded-xl border border-violet-3/30 bg-bg-1 py-3 pl-10 pr-4 text-sm text-ink placeholder:text-ink/35 focus:border-violet-2/60 focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isRunning}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-40 ${accentBtn}`}
            >
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {/* RIGHT — agent info panel */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="hidden w-64 shrink-0 flex-col gap-4 xl:flex"
        >
          {/* Agent card */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-2/20">
                <Bot className="h-5 w-5 text-violet-2" />
              </div>
              <div>
                <p className="font-medium text-ink">Research Agent</p>
                <p className="text-xs text-violet-2">Active</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink/60">
              Monitors your project for historical accuracy, tracks theme alignment, and maps how your story evolves across versions.
            </p>
          </div>

          {/* Capabilities */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="mb-3 text-sm text-ink">Capabilities</p>
            {[
              { icon: Clock, label: "Historical accuracy", sub: "Cross-references time periods" },
              { icon: Heart, label: "Theme alignment", sub: "Tracks original brief drift" },
              { icon: TrendingUp, label: "Version evolution", sub: "Maps story changes over time" },
              { icon: Globe, label: "World consistency", sub: "Flags lore conflicts" },
              { icon: BookOpen, label: "Source citations", sub: "Links to reference material" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="mb-3 flex items-start gap-2.5 last:mb-0">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-2" />
                <div>
                  <p className="text-xs font-medium text-ink">{label}</p>
                  <p className="text-[10px] text-ink/45">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Scan history */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="mb-3 text-sm text-ink">Recent Scans</p>
            {[
              { label: "Historical flags", count: "3 found", when: "Just now" },
              { label: "Theme alignment", count: "41% drift", when: "1h ago" },
              { label: "Full scan", count: "7 flags", when: "Yesterday" },
            ].map((s) => (
              <div key={s.label} className="mb-2.5 flex items-center justify-between last:mb-0">
                <div>
                  <p className="text-xs text-ink">{s.label}</p>
                  <p className="text-[10px] text-ink/40">{s.count}</p>
                </div>
                <span className="text-[10px] text-ink/35">{s.when}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
