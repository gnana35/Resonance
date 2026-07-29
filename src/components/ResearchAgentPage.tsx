"use client";

/**
 * ResearchAgentPage
 *
 * The complete story-aware research assistant UI.
 * Preserves: dark theme, purple/gold accents, flask icon, sidebar structure.
 * Replaces: all canned responses, fixed reports, and placeholder sources
 *           with a real streaming pipeline + block-based adaptive output.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit2,
  ExternalLink,
  FlaskConical,
  Globe,
  Heart,
  History,
  ImageIcon,
  Info,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Send,
  Settings2,
  Shield,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { motion, AnimatePresence, type Variants, type Transition } from "framer-motion";
import {
  useResearch,
  assembleProjectContext,
  type ResearchBlock,
  type ProseBlock,
  type SpecListBlock,
  type ComparisonBlock,
  type TimelineBlock,
  type VisualReferenceBlock,
  type ConflictBlock,
  type UncertaintyBlock,
  type SourcesBlock,
  type Source,
  type ResearchMessage,
  type PipelineStep,
  type ProjectContext,
  type SavedResearchItem,
} from "@/context/ResearchContext";

// ─── animation variants ───────────────────────────────────────────────────────

const msgVariant: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } as Transition },
};

const sidebarVariant: Variants = {
  open:   { width: 260, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } as Transition },
  closed: { width: 0,   opacity: 0, transition: { duration: 0.25, ease: "easeIn" } as Transition },
};

// ─── Research Tools — prefilled prompts, not fixed reports ────────────────────

const RESEARCH_TOOLS: { icon: typeof Clock; label: string; buildPrompt: (ctx: ProjectContext) => string }[] = [
  {
    icon: Clock,
    label: "Check period accuracy",
    buildPrompt: (ctx) =>
      `Check my story for historical or setting accuracy issues.${ctx.setting ? ` Setting: ${ctx.setting}.` : ""}${ctx.openChapter ? ` Current chapter: "${ctx.openChapter.title}".` : ""} Flag anything that conflicts with the established world or time frame.`,
  },
  {
    icon: Heart,
    label: "Research a character",
    buildPrompt: (ctx) => {
      const charList = ctx.characters.slice(0, 5).map((c) => c.name).join(", ");
      return `Research the background, period context, or real-world analogues relevant to ${charList || "my characters"} in my story.${ctx.setting ? ` Setting: ${ctx.setting}.` : ""}`;
    },
  },
  {
    icon: TrendingUp,
    label: "World-building research",
    buildPrompt: (ctx) => {
      const entities = ctx.worldEntities.slice(0, 3).map((e) => e.label).join(", ");
      return `Help me research the world-building for my project "${ctx.projectName}".${entities ? ` Key elements: ${entities}.` : ""}${ctx.setting ? ` Setting: ${ctx.setting}.` : ""} I want real-world analogues and sources I can build from.`;
    },
  },
  {
    icon: Globe,
    label: "Visual/design reference",
    buildPrompt: (ctx) =>
      `I need visual references and construction details for depicting${ctx.setting ? ` elements from ${ctx.setting}` : " elements from my story"}.${ctx.openChapter ? ` I'm currently working on "${ctx.openChapter.title}".` : ""} Give me sources with proportion, colour, material, and scale detail.`,
  },
];

// ─── Tier badge ───────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  const cls =
    tier === 1
      ? "bg-emerald-500/15 text-emerald-400"
      : tier === 2
      ? "bg-blue-500/15 text-blue-400"
      : "bg-ink/10 text-ink/50";
  const label = tier === 1 ? "Tier 1" : tier === 2 ? "Tier 2" : "Tier 3";
  return (
    <span className={`rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

// ─── Save menu ────────────────────────────────────────────────────────────────

function SaveMenu({
  onSave,
}: {
  onSave: (dest: SavedResearchItem["destination"]) => void;
  isGold?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-ink/40 hover:bg-ink/8 hover:text-ink transition-colors"
      >
        <Save className="h-3 w-3" /> Save
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 mb-1 z-20 min-w-[140px] overflow-hidden rounded-lg border border-ink/10 bg-bg-1 shadow-lg"
          >
            {(["research", "notes", "world", "canvas"] as const).map((d) => (
              <button
                key={d}
                onClick={() => { onSave(d); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs text-ink/70 hover:bg-ink/8 hover:text-ink transition-colors capitalize`}
              >
                {d === "research" ? <BookOpen className="h-3 w-3" /> :
                 d === "notes" ? <Edit2 className="h-3 w-3" /> :
                 d === "world" ? <Globe className="h-3 w-3" /> :
                 <ImageIcon className="h-3 w-3" />}
                {d === "canvas" ? "Canvas references" : `Save to ${d.charAt(0).toUpperCase() + d.slice(1)}`}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function ProseBlockView({
  block,
  isGold,
  onSave,
}: {
  block: ProseBlock;
  isGold: boolean;
  onSave: (dest: SavedResearchItem["destination"]) => void;
}) {
  return (
    <div className="group relative">
      {block.heading && (
        <h4 className={`mb-2 text-xs font-semibold uppercase tracking-widest ${isGold ? "text-gold-2" : "text-violet-2"}`}>
          {block.heading}
        </h4>
      )}
      <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-line">{block.body}</p>
      <div className="mt-1 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <SaveMenu onSave={onSave} isGold={isGold} />
      </div>
    </div>
  );
}

function SpecListBlockView({
  block,
  isGold,
  onSave,
}: {
  block: SpecListBlock;
  isGold: boolean;
  onSave: (dest: SavedResearchItem["destination"]) => void;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-ink/10 bg-bg-0">
      <div className={`flex items-center justify-between border-b border-ink/8 px-4 py-2.5 ${isGold ? "bg-gold-2/5" : "bg-violet-2/5"}`}>
        <div className="flex items-center gap-2">
          <Settings2 className={`h-3.5 w-3.5 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
          <span className="text-sm font-medium text-ink">{block.heading ?? "Construction Detail"}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <SaveMenu onSave={onSave} isGold={isGold} />
        </div>
      </div>
      <div className="divide-y divide-ink/5">
        {block.items.map((item, i) => (
          <div key={i} className="flex gap-3 px-4 py-2.5">
            <span className={`shrink-0 text-xs font-semibold ${isGold ? "text-gold-2" : "text-violet-2"} w-28 leading-relaxed`}>
              {item.label}
            </span>
            <span className="text-sm leading-relaxed text-ink/75 flex-1">
              {item.detail}
              {item.sourceKey && (
                <span className="ml-1 text-[10px] text-ink/35">{item.sourceKey}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonBlockView({
  block,
  isGold,
  onSave,
}: {
  block: ComparisonBlock;
  isGold: boolean;
  onSave: (dest: SavedResearchItem["destination"]) => void;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-ink/10 bg-bg-0">
      <div className={`flex items-center justify-between border-b border-ink/8 px-4 py-2.5 ${isGold ? "bg-gold-2/5" : "bg-violet-2/5"}`}>
        <span className="text-sm font-medium text-ink">{block.heading ?? "Comparison"}</span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <SaveMenu onSave={onSave} isGold={isGold} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-ink/8 text-ink/40">
              <th className="px-4 py-2 text-left font-normal">Aspect</th>
              <th className="px-4 py-2 text-left font-normal text-emerald-400">{block.leftLabel}</th>
              <th className="px-4 py-2 text-left font-normal text-amber-400">{block.rightLabel}</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, i) => (
              <tr key={i} className="border-b border-ink/5 last:border-0">
                <td className="px-4 py-2.5 font-medium text-ink">{row.aspect}</td>
                <td className="px-4 py-2.5 text-ink/70">{row.accurate}</td>
                <td className="px-4 py-2.5 text-ink/50 italic">{row.misconception}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimelineBlockView({
  block,
  isGold,
  onSave,
}: {
  block: TimelineBlock;
  isGold: boolean;
  onSave: (dest: SavedResearchItem["destination"]) => void;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-ink/10 bg-bg-0">
      <div className={`flex items-center justify-between border-b border-ink/8 px-4 py-2.5 ${isGold ? "bg-gold-2/5" : "bg-violet-2/5"}`}>
        <div className="flex items-center gap-2">
          <Clock className={`h-3.5 w-3.5 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
          <span className="text-sm font-medium text-ink">{block.heading ?? "Timeline"}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <SaveMenu onSave={onSave} isGold={isGold} />
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="relative border-l-2 border-ink/10 pl-4 space-y-4">
          {block.entries.map((entry, i) => (
            <div key={i} className="relative">
              <div className={`absolute -left-[21px] h-3 w-3 rounded-full border-2 ${isGold ? "border-gold-2 bg-bg-0" : "border-violet-2 bg-bg-0"}`} />
              <span className={`text-[10px] font-semibold ${isGold ? "text-gold-2" : "text-violet-2"}`}>{entry.date}</span>
              <p className="text-sm font-medium text-ink mt-0.5">{entry.event}</p>
              {entry.relevance && (
                <p className="text-xs text-ink/55 mt-0.5">{entry.relevance}</p>
              )}
              {entry.sourceKey && (
                <span className="text-[10px] text-ink/30">{entry.sourceKey}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VisualReferenceBlockView({
  block,
  isGold,
  onSave,
}: {
  block: VisualReferenceBlock;
  isGold: boolean;
  onSave: (dest: SavedResearchItem["destination"]) => void;
}) {
  return (
    <div className="group overflow-hidden rounded-xl border border-ink/10 bg-bg-0">
      <div className={`flex items-center justify-between border-b border-ink/8 px-4 py-2.5 ${isGold ? "bg-gold-2/5" : "bg-violet-2/5"}`}>
        <div className="flex items-center gap-2">
          <ImageIcon className={`h-3.5 w-3.5 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
          <span className="text-sm font-medium text-ink">{block.heading ?? "Visual References"}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <SaveMenu onSave={onSave} isGold={isGold} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {block.items.map((item, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-ink/8 bg-bg-1">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.caption} className="h-36 w-full object-cover" />
            ) : (
              <div className="flex h-36 w-full items-center justify-center bg-ink/5">
                <div className="text-center px-4">
                  <ImageIcon className="h-6 w-6 text-ink/20 mx-auto mb-1" />
                  <p className="text-[10px] text-ink/35">Open source to view</p>
                </div>
              </div>
            )}
            <div className="p-2.5">
              <p className="text-xs font-medium text-ink truncate">{item.caption}</p>
              {item.studyNote && (
                <p className="mt-1 text-[11px] leading-relaxed text-ink/55">{item.studyNote}</p>
              )}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[10px] text-ink/35">{item.source}</span>
                {item.sourceUrl && (
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 text-[10px] ${isGold ? "text-gold-2" : "text-violet-2"} hover:underline`}
                  >
                    Open <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConflictBlockView({
  block,
  isGold,
  onKeepAsWritten,
  onSave,
  onOpenChapter,
}: {
  block: ConflictBlock;
  isGold: boolean;
  onKeepAsWritten: () => void;
  onSave: (dest: SavedResearchItem["destination"]) => void;
  onOpenChapter?: (chapterId: string) => void;
}) {
  if (block.suppressed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-xl border border-amber-500/35 bg-amber-500/5"
    >
      <div className="flex items-start gap-3 border-b border-amber-500/20 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink">Possible conflict with manuscript</p>
          <p className="text-[11px] text-ink/45 mt-0.5">This may be deliberate — only you know your story.</p>
        </div>
      </div>
      <div className="space-y-3 px-4 py-3 text-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/40">Manuscript says</p>
          <p className="mt-0.5 text-ink/75">{block.manuscriptSays}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/70">Sources show</p>
          <p className="mt-0.5 text-ink/75">
            {block.evidenceSays}
            {block.sourceKeys.map((k) => (
              <span key={k} className="ml-1 text-[10px] text-ink/30">{k}</span>
            ))}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-amber-500/15 px-4 py-2.5">
        <button
          onClick={onKeepAsWritten}
          className="flex items-center gap-1.5 rounded-md bg-ink/8 px-3 py-1.5 text-xs text-ink/70 hover:bg-ink/12 hover:text-ink transition-colors"
        >
          <Check className="h-3 w-3" /> Keep as written
        </button>
        <button
          onClick={() => onSave("research")}
          className="flex items-center gap-1.5 rounded-md bg-ink/8 px-3 py-1.5 text-xs text-ink/70 hover:bg-ink/12 hover:text-ink transition-colors"
        >
          <Save className="h-3 w-3" /> Note in Research
        </button>
        {block.chapterId && onOpenChapter && (
          <button
            onClick={() => onOpenChapter(block.chapterId!)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors ${isGold ? "bg-gold-2/10 text-gold-2 hover:bg-gold-2/20" : "bg-violet-2/10 text-violet-2 hover:bg-violet-2/20"}`}
          >
            <BookOpen className="h-3 w-3" /> Open the chapter
          </button>
        )}
      </div>
    </motion.div>
  );
}

function UncertaintyBlockView({ block }: { block: UncertaintyBlock }) {
  return (
    <div className="flex gap-3 rounded-xl border border-yellow-500/25 bg-yellow-500/5 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
      <div>
        {block.heading && (
          <p className="text-xs font-semibold text-yellow-400 mb-1">{block.heading}</p>
        )}
        <p className="text-sm leading-relaxed text-ink/70">{block.body}</p>
      </div>
    </div>
  );
}

function SourcesBlockView({ block, isGold }: { block: SourcesBlock; isGold: boolean }) {
  const [open, setOpen] = useState(false);

  if (block.sources.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-bg-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Shield className={`h-3.5 w-3.5 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
          <span className="text-sm font-medium text-ink">
            Sources ({block.sources.length})
          </span>
        </div>
        {open
          ? <ChevronDown className="h-3.5 w-3.5 text-ink/40" />
          : <ChevronRight className="h-3.5 w-3.5 text-ink/40" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-ink/5 border-t border-ink/8">
              {block.sources.map((src, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                  <span className="mt-0.5 shrink-0 text-[10px] font-semibold text-ink/30 w-5">{src.key}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm ${isGold ? "text-gold-1 hover:text-gold-2" : "text-violet-1 hover:text-violet-2"} truncate max-w-xs hover:underline`}
                      >
                        {src.title}
                      </a>
                      <TierBadge tier={src.tier} />
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-ink/35">
                      <span>{src.publisher}</span>
                      {src.date && <span>· {src.date}</span>}
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 hover:text-ink/60"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        View
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Data-driven block router ─────────────────────────────────────────────────

function BlockRenderer({
  block,
  blockIndex,
  isGold,
  onSaveBlock,
  onSuppressConflict,
  onOpenChapter,
}: {
  block: ResearchBlock;
  blockIndex: number;
  isGold: boolean;
  onSaveBlock: (idx: number, b: ResearchBlock, dest: SavedResearchItem["destination"]) => void;
  onSuppressConflict: (fp: string) => void;
  onOpenChapter?: (chapterId: string) => void;
}) {
  const onSave = useCallback(
    (dest: SavedResearchItem["destination"]) => onSaveBlock(blockIndex, block, dest),
    [blockIndex, block, onSaveBlock]
  );

  switch (block.type) {
    case "prose":
      return <ProseBlockView block={block} isGold={isGold} onSave={onSave} />;
    case "spec_list":
      return <SpecListBlockView block={block} isGold={isGold} onSave={onSave} />;
    case "comparison":
      return <ComparisonBlockView block={block} isGold={isGold} onSave={onSave} />;
    case "timeline":
      return <TimelineBlockView block={block} isGold={isGold} onSave={onSave} />;
    case "visual_reference":
      return <VisualReferenceBlockView block={block} isGold={isGold} onSave={onSave} />;
    case "conflict":
      return (
        <ConflictBlockView
          block={block}
          isGold={isGold}
          onKeepAsWritten={() => {
            if (block.passageFingerprint) onSuppressConflict(block.passageFingerprint);
          }}
          onSave={onSave}
          onOpenChapter={onOpenChapter}
        />
      );
    case "uncertainty":
      return <UncertaintyBlockView block={block} />;
    case "sources":
      return <SourcesBlockView block={block} isGold={isGold} />;
    default:
      return null;
  }
}

// ─── Pipeline step indicator ──────────────────────────────────────────────────

function PipelineSteps({ steps, isGold }: { steps: PipelineStep[]; isGold: boolean }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5 rounded-xl border border-ink/8 bg-bg-0 px-4 py-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            {step.status === "running" ? (
              <Loader2 className={`h-3 w-3 animate-spin ${isGold ? "text-gold-2" : "text-violet-2"}`} />
            ) : step.status === "done" ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : step.status === "error" ? (
              <AlertTriangle className="h-3 w-3 text-amber-400" />
            ) : (
              <div className="h-3 w-3 rounded-full border border-ink/20" />
            )}
          </div>
          <div className="min-w-0">
            <p className={`text-xs ${step.status === "running" ? (isGold ? "text-gold-1" : "text-violet-1") : step.status === "done" ? "text-ink/70" : "text-ink/40"}`}>
              {step.label}
            </p>
            {step.detail && (
              <p className="mt-0.5 text-[10px] text-ink/35 truncate">{step.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Message component ────────────────────────────────────────────────────────

function MessageView({
  msg,
  isGold,
  onSaveBlock,
  onSuppressConflict,
  onOpenChapter,
}: {
  msg: ResearchMessage;
  isGold: boolean;
  onSaveBlock: (msgId: string, idx: number, b: ResearchBlock, dest: SavedResearchItem["destination"]) => void;
  onSuppressConflict: (fp: string) => void;
  onOpenChapter?: (chapterId: string) => void;
}) {
  return (
    <motion.div
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

      {/* Content */}
      <div className={`flex max-w-[82%] flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
        {/* Attached image thumbnail */}
        {msg.attachedImageUrl && (
          <div className="overflow-hidden rounded-lg border border-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={msg.attachedImageUrl} alt="Attached" className="max-h-48 max-w-xs object-contain" />
          </div>
        )}

        {/* Bubble */}
        {(msg.text || msg.status === "typing") && (
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
        )}

        {/* Pipeline steps */}
        {msg.role === "agent" && msg.steps && msg.steps.length > 0 && (
          <PipelineSteps steps={msg.steps} isGold={isGold} />
        )}

        {/* Blocks */}
        {msg.role === "agent" && msg.blocks && msg.blocks.length > 0 && (
          <div className="w-full space-y-3">
            {msg.blocks.map((block, idx) => (
              <BlockRenderer
                key={idx}
                block={block}
                blockIndex={idx}
                isGold={isGold}
                onSaveBlock={(i, b, dest) => onSaveBlock(msg.id, i, b, dest)}
                onSuppressConflict={onSuppressConflict}
                onOpenChapter={onOpenChapter}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Context bar ──────────────────────────────────────────────────────────────

function ContextBar({
  ctx,
  isGold,
  exclusions,
  onToggleExclusion,
}: {
  ctx: ProjectContext;
  isGold: boolean;
  exclusions: Set<string>;
  onToggleExclusion: (key: string, excluded: boolean) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setEditOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pills = [
    { key: "setting", label: ctx.setting ? `Setting: ${ctx.setting}` : "No setting", available: !!ctx.setting },
    { key: "chapter", label: ctx.openChapter ? `Chapter: ${ctx.openChapter.title}` : "No chapter open", available: !!ctx.openChapter },
    { key: "characters", label: `${ctx.characterCount} character${ctx.characterCount !== 1 ? "s" : ""}`, available: ctx.characterCount > 0 },
    { key: "world", label: `${ctx.worldEntities.length} world entr${ctx.worldEntities.length !== 1 ? "ies" : "y"}`, available: ctx.worldEntities.length > 0 },
  ];

  return (
    <div className="relative" ref={ref}>
      <div className={`flex items-center gap-2 border-b border-t border-ink/6 bg-bg-0/60 px-4 py-1.5 text-[11px]`}>
        <span className="text-ink/30 shrink-0">Context:</span>
        <div className="flex flex-1 flex-wrap gap-1.5 min-w-0">
          {pills.map((pill) => (
            <span
              key={pill.key}
              className={`rounded-full px-2 py-0.5 transition-opacity ${
                !pill.available || exclusions.has(pill.key)
                  ? "opacity-35"
                  : ""
              } ${isGold ? "bg-gold-2/10 text-gold-1" : "bg-violet-2/10 text-violet-1"}`}
            >
              {pill.label}
            </span>
          ))}
        </div>
        <button
          onClick={() => setEditOpen((v) => !v)}
          className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-ink/30 hover:bg-ink/6 hover:text-ink transition-colors"
        >
          <Edit2 className="h-3 w-3" />
          <span>edit</span>
        </button>
      </div>

      <AnimatePresence>
        {editOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-30 border border-ink/10 bg-bg-1 shadow-lg"
          >
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-ink/50">Include in context</p>
              <div className="space-y-2">
                {pills.map((pill) => {
                  const excluded = exclusions.has(pill.key);
                  return (
                    <label key={pill.key} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={!excluded && pill.available}
                        disabled={!pill.available}
                        onChange={(e) => onToggleExclusion(pill.key, !e.target.checked)}
                        className="h-3.5 w-3.5 accent-violet-400"
                      />
                      <span className={`text-xs ${pill.available ? "text-ink/75" : "text-ink/30"}`}>
                        {pill.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
            {ctx.openChapter && !exclusions.has("chapter") && (
              <div className="border-t border-ink/8 px-4 py-2.5">
                <p className="text-[10px] text-ink/35 font-medium">Chapter excerpt</p>
                <p className="mt-0.5 text-[11px] text-ink/45 line-clamp-2">{ctx.openChapter.contentExcerpt.slice(0, 180)}…</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sidebar chat item ────────────────────────────────────────────────────────

function SidebarChatItem({
  session,
  isActive,
  isGold,
  onOpen,
  onRename,
  onDelete,
}: {
  session: { id: string; title: string; createdAt: number };
  isActive: boolean;
  isGold: boolean;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(session.title);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div
      className={`group relative flex items-start gap-2 rounded-lg px-3 py-2 transition-colors ${
        isActive
          ? isGold ? "bg-gold-2/10 text-gold-1" : "bg-violet-2/10 text-violet-1"
          : "text-ink/65 hover:bg-ink/5 hover:text-ink"
      }`}
    >
      <button className="flex-1 min-w-0 text-left" onClick={onOpen}>
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => { onRename(editValue); setEditing(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onRename(editValue); setEditing(false); }
              if (e.key === "Escape") { setEditValue(session.title); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent text-sm text-ink focus:outline-none"
          />
        ) : (
          <>
            <p className="truncate text-sm">{session.title}</p>
            <p className="text-[10px] text-ink/30">
              {new Date(session.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            </p>
          </>
        )}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="mt-0.5 rounded-sm p-0.5 text-ink/25 opacity-0 group-hover:opacity-100 hover:text-ink transition-all"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-6 z-20 min-w-[110px] overflow-hidden rounded-lg border border-ink/10 bg-bg-1 shadow-lg"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink/70 hover:bg-ink/8 hover:text-ink transition-colors"
              >
                <Edit2 className="h-3 w-3" /> Rename
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Sources panel ────────────────────────────────────────────────────────────

function SessionSourcesPanel({
  sessions,
  activeChatId,
  isGold,
}: {
  sessions: { id: string; messages: ResearchMessage[] }[];
  activeChatId: string | null;
  isGold: boolean;
}) {
  const session = sessions.find((s) => s.id === activeChatId);
  if (!session) return null;

  const allSources: Source[] = [];
  const seenUrls = new Set<string>();
  for (const msg of session.messages) {
    if (msg.blocks) {
      for (const block of msg.blocks) {
        if (block.type === "sources") {
          for (const src of block.sources) {
            if (!seenUrls.has(src.url)) {
              seenUrls.add(src.url);
              allSources.push(src);
            }
          }
        }
      }
    }
  }

  if (allSources.length === 0) return null;

  return (
    <div className={`w-56 shrink-0 overflow-y-auto border-l border-ink/8 bg-bg-0`}>
      <div className={`flex items-center gap-2 border-b border-ink/8 px-3 py-3`}>
        <Shield className={`h-3.5 w-3.5 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
        <span className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Sources</span>
        <span className="ml-auto text-[10px] text-ink/25">{allSources.length}</span>
      </div>
      <div className="space-y-0 divide-y divide-ink/5">
        {allSources.map((src, i) => (
          <div key={i} className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TierBadge tier={src.tier} />
            </div>
            <a
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs ${isGold ? "text-gold-1 hover:text-gold-2" : "text-violet-1 hover:text-violet-2"} line-clamp-2 hover:underline`}
            >
              {src.title}
            </a>
            <p className="mt-0.5 text-[10px] text-ink/30">{src.publisher}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Intro message ────────────────────────────────────────────────────────────

function IntroMessage({
  isGold,
  ctx,
}: {
  isGold: boolean;
  ctx: ProjectContext;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex flex-col items-center px-4 py-12 text-center"
    >
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${isGold ? "bg-gold-2/20" : "bg-violet-2/20"} mb-5`}>
        <FlaskConical className={`h-7 w-7 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
      </div>
      <h2 className={`font-display text-2xl tracking-wide ${isGold ? "text-gold-1" : "text-violet-1"}`}>
        Research Agent
      </h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/55">
        {ctx.projectName !== "Unnamed Project"
          ? `Researching for "${ctx.projectName}". `
          : ""}
        Ask anything about your story — I&apos;ll search live sources and adapt the findings to your project.
      </p>
      {ctx.setting && (
        <p className="mt-1 text-xs text-ink/35">
          Setting: {ctx.setting}
          {ctx.characterCount > 0 ? ` · ${ctx.characterCount} character${ctx.characterCount !== 1 ? "s" : ""}` : ""}
        </p>
      )}
      <div className="mt-6 flex flex-col items-start gap-2.5 text-left">
        {[
          { icon: Clock,      label: "Period accuracy",        sub: "Cross-references your setting against real sources" },
          { icon: Heart,      label: "Character research",     sub: "Grounds your characters in their world" },
          { icon: TrendingUp, label: "World-building",         sub: "Real analogues for invented-world elements" },
          { icon: Globe,      label: "Visual references",      sub: "Construction detail for designers and illustrators" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isGold ? "bg-gold-2/15" : "bg-violet-2/15"}`}>
              <Icon className={`h-3.5 w-3.5 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">{label}</p>
              <p className="text-xs text-ink/40">{sub}</p>
            </div>
          </div>
        ))}
      </div>
      <p className={`mt-8 text-sm font-medium ${isGold ? "text-gold-2" : "text-violet-2"}`}>
        What would you like me to research?
      </p>
    </motion.div>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteConfirm({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-ink/10 bg-bg-1 shadow-xl"
      >
        <div className="p-6">
          <h3 className="font-display text-base text-ink">Delete chat?</h3>
          <p className="mt-2 text-sm text-ink/55">
            &ldquo;{title}&rdquo; will be permanently deleted along with all messages and sources.
          </p>
        </div>
        <div className="flex gap-2 border-t border-ink/8 px-6 py-4">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-ink/12 px-4 py-2 text-sm text-ink/60 hover:bg-ink/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500/80 px-4 py-2 text-sm text-white hover:bg-red-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ResearchAgentPage({
  accentClass = "violet",
  projectId,
}: {
  accentClass?: "violet" | "gold";
  projectId: string;
}) {
  const {
    sessions,
    activeChatId,
    setActiveChatId,
    startNewChat,
    deleteChat,
    renameChat,
    addUserMessage,
    appendAgentMessage,
    updateAgentMessage,
    setFirstMessageTitle,
    suppressConflict,
    saveBlock,
    contextExclusions,
    setContextExclusion,
  } = useResearch();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [input, setInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState<{ id: string; title: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGold = accentClass === "gold";
  const accentText = isGold ? "text-gold-1" : "text-violet-1";
  const accentBtn = isGold ? "bg-gold-2 hover:bg-gold-1 text-bg-0" : "bg-violet-2 hover:opacity-90 text-bg-0";
  const accentBorder = isGold ? "border-gold-3/25" : "border-violet-3/25";

  // Assemble context
  const ctx = assembleProjectContext(projectId, contextExclusions);

  // Active session messages
  const activeSession = sessions.find((s) => s.id === activeChatId);
  const messages = activeSession?.messages ?? [];

  // Auto-scroll
  const lastMsg = messages[messages.length - 1];
  const lastMsgStepsLen = lastMsg?.steps?.length;
  const lastMsgBlocksLen = lastMsg?.blocks?.length;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastMsgStepsLen, lastMsgBlocksLen]);

  const msPerDay = 86_400_000;
  // Snapshot time at mount so grouping is stable during a session
  const [mountTs] = useState<number>(() => new Date().valueOf());
  const { todaySessions, yesterdaySessions, earlierSessions } = useMemo(() => ({
    todaySessions: sessions.filter((s) => mountTs - s.createdAt < msPerDay),
    yesterdaySessions: sessions.filter((s) => mountTs - s.createdAt >= msPerDay && mountTs - s.createdAt < 2 * msPerDay),
    earlierSessions: sessions.filter((s) => mountTs - s.createdAt >= 2 * msPerDay),
  }), [sessions, mountTs, msPerDay]);

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string, imageUrl?: string) => {
    if (!text.trim() || isRunning) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = startNewChat();
    }

    setFirstMessageTitle(chatId, text);
    addUserMessage(chatId, text, imageUrl ?? undefined);
    const agentMsgId = appendAgentMessage(chatId);
    setInput("");
    setAttachedImage(null);
    setIsRunning(true);

    // Fresh context snapshot
    const snapshot = assembleProjectContext(projectId, contextExclusions);

    try {
      const res = await fetch("/api/research/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          context: snapshot,
          attachedImageUrl: imageUrl,
        }),
      });

      if (!res.ok || !res.body) {
        updateAgentMessage(chatId, agentMsgId, {
          text: `Search request failed (${res.status}). Check your API configuration.`,
          status: "error",
        });
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      const steps: PipelineStep[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const { event, data } = JSON.parse(line) as { event: string; data: unknown };

            if (event === "step") {
              const step = data as PipelineStep;
              // Update or add step
              const idx = steps.findIndex((s) => s.label === step.label);
              if (idx >= 0) {
                steps[idx] = step;
              } else {
                steps.push(step);
              }
              updateAgentMessage(chatId, agentMsgId, { steps: [...steps] });
            } else if (event === "blocks") {
              const blocks = data as ResearchBlock[];
              updateAgentMessage(chatId, agentMsgId, { blocks, status: "done" });
            } else if (event === "error") {
              const { message } = data as { message: string };
              updateAgentMessage(chatId, agentMsgId, {
                text: `Research error: ${message}`,
                status: "error",
              });
            }
          } catch { /* malformed frame */ }
        }
      }

      // Mark all steps done
      const finalSteps = steps.map((s) =>
        s.status === "running" ? { ...s, status: "done" as const } : s
      );
      updateAgentMessage(chatId, agentMsgId, { steps: finalSteps, status: "done" });

    } catch (err) {
      updateAgentMessage(chatId, agentMsgId, {
        text: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        status: "error",
      });
    } finally {
      setIsRunning(false);
    }
  }, [activeChatId, isRunning, projectId, contextExclusions, startNewChat, setFirstMessageTitle, addUserMessage, appendAgentMessage, updateAgentMessage]);

  // ── Handle tool click — prefills input, does NOT send ───────────────────────

  function handleTool(tool: typeof RESEARCH_TOOLS[number]) {
    const prompt = tool.buildPrompt(ctx);
    setInput(prompt);
    // Focus textarea
    setTimeout(() => {
      (document.querySelector("#research-textarea") as HTMLTextAreaElement | null)?.focus();
    }, 50);
  }

  // ── Handle image attachment ─────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setAttachedImage(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // ── Conflict suppression ────────────────────────────────────────────────────

  function handleSuppressConflict(fingerprint: string) {
    suppressConflict(projectId, fingerprint);
  }

  // ── Save block ──────────────────────────────────────────────────────────────

  function handleSaveBlock(msgId: string, idx: number, block: ResearchBlock, dest: SavedResearchItem["destination"]) {
    if (!activeChatId) return;
    saveBlock(activeChatId, msgId, idx, block, dest);
  }

  // ── Delete chat ─────────────────────────────────────────────────────────────

  function handleDeleteChat(id: string, title: string) {
    setDeletePending({ id, title });
  }

  function confirmDelete() {
    if (deletePending) deleteChat(deletePending.id);
    setDeletePending(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {deletePending && (
        <DeleteConfirm
          title={deletePending.title}
          onConfirm={confirmDelete}
          onCancel={() => setDeletePending(null)}
        />
      )}

      <div className="flex h-[calc(100vh-73px)] overflow-hidden">

        {/* ── Sidebar ── */}
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
              <div className="flex w-[260px] flex-col overflow-y-auto pb-6">
                {/* Header */}
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

                {/* New Chat */}
                <div className="px-3 pt-4">
                  <button
                    onClick={() => { const id = startNewChat(); setActiveChatId(id); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${accentBtn}`}
                  >
                    <MessageSquarePlus className="h-4 w-4 shrink-0" />
                    New Chat
                  </button>
                </div>

                {/* Research Tools — prefilled prompts */}
                <div className="px-3 pt-5">
                  <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-ink/35">
                    Research Tools
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {RESEARCH_TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.label}
                          onClick={() => {
                            if (!activeChatId) {
                              const id = startNewChat();
                              setActiveChatId(id);
                            }
                            handleTool(tool);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink/70 transition-colors hover:bg-ink/6 hover:text-ink"
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

                  {[
                    { label: "Today", list: todaySessions },
                    { label: "Yesterday", list: yesterdaySessions },
                    { label: "Earlier", list: earlierSessions },
                  ].map(({ label, list }) =>
                    list.length > 0 ? (
                      <div key={label}>
                        <p className="mb-1 mt-2 px-3 text-[10px] text-ink/30">{label}</p>
                        {list.map((s) => (
                          <SidebarChatItem
                            key={s.id}
                            session={s}
                            isActive={activeChatId === s.id}
                            isGold={isGold}
                            onOpen={() => setActiveChatId(s.id)}
                            onRename={(title) => renameChat(s.id, title)}
                            onDelete={() => handleDeleteChat(s.id, s.title)}
                          />
                        ))}
                      </div>
                    ) : null
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Main area ── */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Topbar */}
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FlaskConical className={`h-4 w-4 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
              <span className={`font-display text-base tracking-wide ${accentText} truncate`}>
                {activeChatId
                  ? (sessions.find((s) => s.id === activeChatId)?.title ?? "Research Agent")
                  : "Research Agent"}
              </span>
            </div>
            {activeChatId && (
              <button
                onClick={() => setShowSourcesPanel((v) => !v)}
                className={`rounded-md p-1.5 transition-colors ${showSourcesPanel ? (isGold ? "bg-gold-2/15 text-gold-2" : "bg-violet-2/15 text-violet-2") : "text-ink/40 hover:bg-ink/8 hover:text-ink"}`}
                aria-label="Toggle sources panel"
              >
                <Shield className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Context bar */}
          {activeChatId && (
            <ContextBar
              ctx={ctx}
              isGold={isGold}
              exclusions={contextExclusions}
              onToggleExclusion={setContextExclusion}
            />
          )}

          {/* Messages + sources panel */}
          <div className="flex flex-1 min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              {activeChatId === null ? (
                /* No session */
                <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${isGold ? "bg-gold-2/15" : "bg-violet-2/15"} mb-4`}>
                    <FlaskConical className={`h-6 w-6 ${isGold ? "text-gold-2" : "text-violet-2"}`} />
                  </div>
                  <h2 className={`font-display text-xl ${accentText}`}>Research Agent</h2>
                  <p className="mt-2 max-w-xs text-sm text-ink/50">
                    Start a new conversation or select a previous research chat from the sidebar.
                  </p>
                  <button
                    onClick={() => { const id = startNewChat(); setActiveChatId(id); }}
                    className={`mt-6 flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all ${accentBtn}`}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                    New Chat
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <IntroMessage isGold={isGold} ctx={ctx} />
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
                      <MessageView
                        key={msg.id}
                        msg={msg}
                        isGold={isGold}
                        onSaveBlock={handleSaveBlock}
                        onSuppressConflict={handleSuppressConflict}
                      />
                    ))}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Sources panel */}
            <AnimatePresence>
              {showSourcesPanel && activeChatId && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 224, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="shrink-0 overflow-hidden"
                >
                  <SessionSourcesPanel
                    sessions={sessions}
                    activeChatId={activeChatId}
                    isGold={isGold}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input bar */}
          {activeChatId !== null && (
            <div className={`shrink-0 border-t ${accentBorder} px-4 py-3`}>
              {/* Attached image */}
              {attachedImage && (
                <div className="mx-auto mb-2 flex max-w-3xl gap-2">
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={attachedImage} alt="Attached" className="h-20 rounded-lg border border-ink/15 object-contain" />
                    <button
                      onClick={() => setAttachedImage(null)}
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-bg-1 border border-ink/20 text-ink/50 hover:text-ink"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input, attachedImage ?? undefined); }}
                className={`mx-auto flex max-w-3xl items-end gap-2 rounded-xl border ${isGold ? "border-gold-3/30 focus-within:border-gold-2/60" : "border-violet-3/30 focus-within:border-violet-2/60"} bg-bg-1 px-4 py-2.5 transition-colors`}
              >
                <textarea
                  id="research-textarea"
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
                      sendMessage(input, attachedImage ?? undefined);
                    }
                  }}
                  placeholder="Ask the research agent anything about your story…"
                  disabled={isRunning}
                  className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none disabled:opacity-50"
                  style={{ minHeight: "24px", maxHeight: "120px" }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 rounded-md p-1.5 text-ink/35 hover:text-ink transition-colors"
                  title="Attach image or canvas"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isRunning}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all disabled:opacity-35 ${accentBtn}`}
                >
                  {isRunning
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                </button>
              </form>
              <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-ink/25">
                Press Enter to send · Shift+Enter for new line · 📎 for image / canvas
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
