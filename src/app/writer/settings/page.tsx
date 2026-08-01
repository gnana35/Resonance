"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CreditCard,
  Download,
  ExternalLink,
  Lock,
  Mail,
  Pencil,
  RotateCcw,
  Shield,
  Trash2,
  Upload,
  User,
} from "lucide-react";

/* ─── tabs ─────────────────────────────────────────────────────────────── */

const TABS = [
  "General",
  "Editor",
  "AI & Assistance",
  "Notifications",
  "Privacy & Data",
  "Account",
  "Billing",
] as const;
type Tab = (typeof TABS)[number];

/* ─── appearance data ──────────────────────────────────────────────────── */

type ThemeOption = "Dark" | "Sepia" | "Light";

const THEMES: { key: ThemeOption; bg: string; line: string }[] = [
  { key: "Dark",  bg: "bg-bg-0",      line: "bg-gold-2/60"  },
  { key: "Sepia", bg: "bg-[#3a2f22]", line: "bg-[#d9c39a]" },
  { key: "Light", bg: "bg-[#f2ede3]", line: "bg-[#2a2a2a]" },
];

const ACCENTS = [
  { key: "gold",    color: "#d9a84e" },
  { key: "violet",  color: "#a78bfa" },
  { key: "blue",    color: "#38bdf8" },
  { key: "emerald", color: "#34d399" },
  { key: "teal",    color: "#2dd4bf" },
  { key: "red",     color: "#f87171" },
  { key: "pink",    color: "#f472b6" },
];

/* ─── reusable primitives ──────────────────────────────────────────────── */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        checked ? "bg-gold-2" : "border border-ink/30 bg-bg-0"
      }`}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function Dropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-[160px] items-center justify-between gap-3 rounded-md border border-gold-3/30 px-3 py-2 text-sm text-ink hover:border-gold-2/50"
      >
        {value}
        <ChevronDown className={`h-3.5 w-3.5 text-ink/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-full min-w-[160px] rounded-md border border-gold-3/30 bg-bg-1 py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-gold-2/10 ${opt === value ? "text-gold-1" : "text-ink"}`}
            >
              {opt}
              {opt === value && <Check className="h-3.5 w-3.5 text-gold-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SegmentedControl({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-gold-3/30">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-2 text-sm transition-colors ${opt === value ? "bg-gold-2/20 text-gold-1" : "text-ink/60 hover:text-ink"}`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SettingRow({ label, description, control }: { label: string; description: string; control: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-ink">{label}</p>
        <p className="text-sm text-ink/50">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/* ─── toast helper ─────────────────────────────────────────────────────── */

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  function show(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2200);
  }
  return { msg, show };
}

/* ─── confirm dialog ───────────────────────────────────────────────────── */

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/80 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-bg-1 p-6 shadow-2xl">
        <p className="text-sm text-ink/80">{message}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-full border border-gold-3/30 py-2 text-sm text-ink hover:border-gold-2/50">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 rounded-full bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-400">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────────────── */

export default function Settings() {
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("General");

  /* — General / Appearance — */
  const [theme, setTheme] = useState<ThemeOption>("Dark");

  useEffect(() => {
    const el = document.documentElement;
    if (theme === "Dark") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", theme.toLowerCase());
  }, [theme]);
  const [accent, setAccent] = useState("gold");
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("(GMT-04:00) Eastern Time");
  const [workspaceName, setWorkspaceName] = useState("Aravinda's Workspace");
  const [editingName, setEditingName] = useState(false);
  const [autosave, setAutosave] = useState("Every 30 seconds");

  /* — Editor — */
  const [defaultFont, setDefaultFont] = useState("Lora");
  const [fontSize, setFontSize] = useState("16px");
  const [lineHeight, setLineHeight] = useState("1.6");
  const [focusModeDefault, setFocusModeDefault] = useState(true);
  const [showWordCount, setShowWordCount] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);
  const [defaultDocType, setDefaultDocType] = useState("Chapter");
  const [spellCheck, setSpellCheck] = useState(true);
  const [grammarCheck, setGrammarCheck] = useState(true);
  const [typewriterMode, setTypewriterMode] = useState(false);
  const [paragraphSpacing, setParagraphSpacing] = useState("Comfortable");

  /* — AI & Assistance — */
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [continuityScanning, setContinuityScanning] = useState(true);
  const [autoSummarize, setAutoSummarize] = useState(false);
  const [aiModel, setAiModel] = useState("Resonance Pro");
  const [writingCoach, setWritingCoach] = useState(true);

  /* — Notifications — */
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [collaboratorActivity, setCollaboratorActivity] = useState(true);
  const [aiInsightAlerts, setAiInsightAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [streakReminders, setStreakReminders] = useState(true);
  const [notifFrequency, setNotifFrequency] = useState("Immediately");

  /* — Account — */
  const [displayName, setDisplayName] = useState("Aravinda S.");
  const [editingDisplayName, setEditingDisplayName] = useState(false);

  function handleResetDefaults() {
    setTheme("Dark");
    setAccent("gold");
    setLanguage("English");
    setTimezone("(GMT-04:00) Eastern Time");
    setAutosave("Every 30 seconds");
    setDefaultFont("Lora");
    setFontSize("16px");
    setLineHeight("1.6");
    setFocusModeDefault(true);
    setShowWordCount(true);
    setShowToolbar(true);
    setDefaultDocType("Chapter");
    setSpellCheck(true);
    setGrammarCheck(true);
    setTypewriterMode(false);
    setParagraphSpacing("Comfortable");
    setAiSuggestions(true);
    setContinuityScanning(true);
    setAutoSummarize(false);
    setAiModel("Resonance Pro");
    setWritingCoach(true);
    setEmailNotifs(true);
    setPushNotifs(true);
    setCollaboratorActivity(true);
    setAiInsightAlerts(true);
    setWeeklyDigest(false);
    setStreakReminders(true);
    setNotifFrequency("Immediately");
    toast.show("Settings reset to defaults.");
  }

  /* ── tab renderers ── */

  function renderGeneral() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Appearance</p>
          <p className="text-sm text-ink/50">Choose how Resonance looks for you.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {THEMES.map((t) => {
              const selected = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`rounded-xl border p-3 text-left transition-colors ${selected ? "border-gold-2" : "border-gold-3/25 hover:border-gold-3/50"}`}
                >
                  <div className={`h-16 w-full rounded-md ${t.bg} flex flex-col justify-center gap-1.5 p-2`}>
                    <span className={`h-1 w-3/4 rounded ${t.line}`} />
                    <span className={`h-1 w-1/2 rounded ${t.line}`} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-gold-2 bg-gold-2 text-bg-0" : "border-ink/30"}`}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="text-sm text-ink">{t.key}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-ink">Accent Color</p>
          <p className="text-sm text-ink/50">Choose your accent color across Resonance.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {ACCENTS.map((a) => {
              const selected = accent === a.key;
              return (
                <button
                  key={a.key}
                  onClick={() => setAccent(a.key)}
                  aria-label={a.key}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: a.color, boxShadow: selected ? `0 0 0 2px #03040a, 0 0 0 4px ${a.color}` : undefined }}
                >
                  {selected && <Check className="h-4 w-4 text-bg-0" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Workspace</p>
          <div className="mt-2 divide-y divide-gold-3/10">
            <SettingRow label="Autosave" description="Automatically save your work as you write." control={
              <Dropdown value={autosave} options={["Every 15 seconds", "Every 30 seconds", "Every minute", "Off"]} onChange={setAutosave} />
            } />
            <SettingRow label="Language" description="Your preferred language." control={
              <Dropdown value={language} options={["English", "Spanish", "French", "German", "Japanese"]} onChange={setLanguage} />
            } />
            <SettingRow label="Time Zone" description="Used for timestamps and deadlines." control={
              <Dropdown value={timezone} options={["(GMT-08:00) Pacific Time", "(GMT-05:00) Central Time", "(GMT-04:00) Eastern Time", "(GMT+00:00) UTC"]} onChange={setTimezone} />
            } />
          </div>
        </div>
      </div>
    );
  }

  function renderEditor() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Typography</p>
          <div className="mt-2 divide-y divide-gold-3/10">
            <SettingRow label="Default Font" description="The default font for new documents." control={
              <Dropdown value={defaultFont} options={["Lora", "Cormorant Garamond", "Georgia", "Inter", "Merriweather"]} onChange={setDefaultFont} />
            } />
            <SettingRow label="Font Size" description="Default font size in the editor." control={
              <Dropdown value={fontSize} options={["14px", "16px", "18px", "20px", "22px"]} onChange={setFontSize} />
            } />
            <SettingRow label="Line Height" description="Spacing between lines." control={
              <Dropdown value={lineHeight} options={["1.4", "1.6", "1.8", "2.0"]} onChange={setLineHeight} />
            } />
            <SettingRow label="Paragraph Spacing" description="Space between paragraphs." control={
              <SegmentedControl value={paragraphSpacing} options={["Compact", "Comfortable", "Spacious"]} onChange={setParagraphSpacing} />
            } />
          </div>
        </div>

        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Editor Behaviour</p>
          <div className="mt-2 divide-y divide-gold-3/10">
            <SettingRow label="Focus Mode by Default" description="Open the editor in distraction-free mode." control={
              <Toggle checked={focusModeDefault} onChange={setFocusModeDefault} />
            } />
            <SettingRow label="Typewriter Mode" description="Keep the current line centered as you type." control={
              <Toggle checked={typewriterMode} onChange={setTypewriterMode} />
            } />
            <SettingRow label="Show Word Count" description="Display word count while writing." control={
              <Toggle checked={showWordCount} onChange={setShowWordCount} />
            } />
            <SettingRow label="Show Formatting Toolbar" description="Keep the formatting toolbar visible." control={
              <Toggle checked={showToolbar} onChange={setShowToolbar} />
            } />
            <SettingRow label="Spell Check" description="Highlight spelling errors as you write." control={
              <Toggle checked={spellCheck} onChange={setSpellCheck} />
            } />
            <SettingRow label="Grammar Check" description="Highlight grammar issues as you write." control={
              <Toggle checked={grammarCheck} onChange={setGrammarCheck} />
            } />
            <SettingRow label="Default New Document Type" description="Starting type for new documents." control={
              <Dropdown value={defaultDocType} options={["Chapter", "Scene", "Note", "Blank"]} onChange={setDefaultDocType} />
            } />
          </div>
        </div>
      </div>
    );
  }

  function renderAI() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">AI Model</p>
          <p className="text-sm text-ink/50">Choose the AI model powering your workspace.</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {["Resonance Lite", "Resonance Pro", "Resonance Max"].map((model) => {
              const selected = aiModel === model;
              return (
                <button
                  key={model}
                  onClick={() => setAiModel(model)}
                  className={`rounded-xl border p-4 text-left transition-colors ${selected ? "border-gold-2 bg-gold-2/5" : "border-gold-3/25 hover:border-gold-3/50"}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink">{model}</p>
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${selected ? "border-gold-2 bg-gold-2 text-bg-0" : "border-ink/30"}`}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink/40">
                    {model === "Resonance Lite" ? "Fast, basic suggestions" : model === "Resonance Pro" ? "Balanced quality and speed" : "Highest quality, creative depth"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">AI Features</p>
          <div className="mt-2 divide-y divide-gold-3/10">
            <SettingRow label="Writing Suggestions" description="Receive AI-powered suggestions as you write." control={
              <Toggle checked={aiSuggestions} onChange={setAiSuggestions} />
            } />
            <SettingRow label="Writing Coach" description="Proactive tips on pacing, structure, and style." control={
              <Toggle checked={writingCoach} onChange={setWritingCoach} />
            } />
            <SettingRow label="Continuity Scanning" description="Automatically scan for plot holes and arc breaks." control={
              <Toggle checked={continuityScanning} onChange={setContinuityScanning} />
            } />
            <SettingRow label="Auto-Summarize Chapters" description="Generate chapter summaries automatically on save." control={
              <Toggle checked={autoSummarize} onChange={setAutoSummarize} />
            } />
          </div>
        </div>
      </div>
    );
  }

  function renderNotifications() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Delivery</p>
          <div className="mt-2 divide-y divide-gold-3/10">
            <SettingRow label="Email Notifications" description="Receive notifications by email." control={
              <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
            } />
            <SettingRow label="Push Notifications" description="Receive browser push notifications." control={
              <Toggle checked={pushNotifs} onChange={setPushNotifs} />
            } />
            <SettingRow label="Notification Frequency" description="How often notifications are sent." control={
              <Dropdown value={notifFrequency} options={["Immediately", "Hourly digest", "Daily digest", "Never"]} onChange={setNotifFrequency} />
            } />
          </div>
        </div>

        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">What to Notify</p>
          <div className="mt-2 divide-y divide-gold-3/10">
            <SettingRow label="Collaborator Activity" description="When collaborators edit or comment." control={
              <Toggle checked={collaboratorActivity} onChange={setCollaboratorActivity} />
            } />
            <SettingRow label="AI Insight Alerts" description="When AI detects continuity issues or patterns." control={
              <Toggle checked={aiInsightAlerts} onChange={setAiInsightAlerts} />
            } />
            <SettingRow label="Streak Reminders" description="Remind me to write daily to keep my streak." control={
              <Toggle checked={streakReminders} onChange={setStreakReminders} />
            } />
            <SettingRow label="Weekly Digest" description="A weekly summary of your writing activity." control={
              <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
            } />
          </div>
        </div>
      </div>
    );
  }

  function renderPrivacy() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Data & Backup</p>
          <div className="mt-3 flex flex-col gap-4">
            <button onClick={() => toast.show("Preparing export… check your email shortly.")} className="flex items-center justify-between rounded-lg border border-gold-3/25 px-4 py-3 text-left transition-colors hover:border-gold-2/50">
              <span>
                <span className="block text-sm text-ink">Export All Data</span>
                <span className="block text-xs text-ink/50">Download all your projects, notes, and settings.</span>
              </span>
              <Download className="h-4 w-4 shrink-0 text-ink/50" />
            </button>
            <button onClick={() => toast.show("Opening import dialog…")} className="flex items-center justify-between rounded-lg border border-gold-3/25 px-4 py-3 text-left transition-colors hover:border-gold-2/50">
              <span>
                <span className="block text-sm text-ink">Import Data</span>
                <span className="block text-xs text-ink/50">Restore from a Resonance backup file.</span>
              </span>
              <Upload className="h-4 w-4 shrink-0 text-ink/50" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Privacy</p>
          <div className="mt-3 flex flex-col gap-4">
            <button onClick={() => toast.show("Opening privacy policy in a new tab…")} className="flex items-center justify-between rounded-lg border border-gold-3/25 px-4 py-3 text-left transition-colors hover:border-gold-2/50">
              <span>
                <span className="block text-sm text-ink">Privacy Policy</span>
                <span className="block text-xs text-ink/50">Read how we handle your data.</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-ink/50" />
            </button>
            <button onClick={() => toast.show("Opening terms of service…")} className="flex items-center justify-between rounded-lg border border-gold-3/25 px-4 py-3 text-left transition-colors hover:border-gold-2/50">
              <span>
                <span className="block text-sm text-ink">Terms of Service</span>
                <span className="block text-xs text-ink/50">Read our terms and conditions.</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-ink/50" />
            </button>
            <button onClick={() => toast.show("Opening cookie preferences…")} className="flex items-center justify-between rounded-lg border border-gold-3/25 px-4 py-3 text-left transition-colors hover:border-gold-2/50">
              <span>
                <span className="block text-sm text-ink">Cookie Preferences</span>
                <span className="block text-xs text-ink/50">Manage your cookie and tracking settings.</span>
              </span>
              <Shield className="h-4 w-4 shrink-0 text-ink/50" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderAccount() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Profile</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-2/15 font-display text-2xl text-gold-1">A</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {editingDisplayName ? (
                  <input
                    autoFocus
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => { setEditingDisplayName(false); toast.show("Name updated."); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { setEditingDisplayName(false); toast.show("Name updated."); } }}
                    className="rounded border border-gold-3/30 bg-bg-0 px-2 py-1 text-ink focus:outline-none"
                  />
                ) : (
                  <>
                    <p className="text-ink">{displayName}</p>
                    <button onClick={() => setEditingDisplayName(true)} className="text-ink/40 hover:text-ink"><Pencil className="h-3.5 w-3.5" /></button>
                  </>
                )}
              </div>
              <p className="text-sm text-ink/50">aravinda@resonance.studio</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-gold-3/10">
            <SettingRow label="Change Email" description="Update your login email address." control={
              <button onClick={() => toast.show("Opening email change flow…")} className="flex items-center gap-2 rounded-md border border-gold-3/30 px-3 py-2 text-sm text-ink hover:border-gold-2/50"><Mail className="h-3.5 w-3.5" /> Change</button>
            } />
            <SettingRow label="Change Password" description="Update your password." control={
              <button onClick={() => toast.show("Opening password change flow…")} className="flex items-center gap-2 rounded-md border border-gold-3/30 px-3 py-2 text-sm text-ink hover:border-gold-2/50"><Lock className="h-3.5 w-3.5" /> Change</button>
            } />
            <SettingRow label="Profile Photo" description="Update your profile picture." control={
              <button onClick={() => toast.show("Opening photo upload…")} className="flex items-center gap-2 rounded-md border border-gold-3/30 px-3 py-2 text-sm text-ink hover:border-gold-2/50"><User className="h-3.5 w-3.5" /> Upload</button>
            } />
          </div>
        </div>

        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Workspace Settings</p>
          <div className="mt-3 flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink/60">Workspace Name</span>
              {editingName ? (
                <input
                  autoFocus
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  onBlur={() => { setEditingName(false); toast.show("Workspace name saved."); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setEditingName(false); toast.show("Workspace name saved."); } }}
                  className="w-44 rounded border border-gold-3/30 bg-bg-0 px-2 py-1 text-right text-ink focus:outline-none"
                />
              ) : (
                <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-ink hover:text-gold-1">
                  {workspaceName}
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/25 bg-bg-1 p-5">
          <p className="text-red-400">Danger Zone</p>
          <button
            onClick={() => setConfirm({ message: "Are you sure you want to delete this workspace? This action cannot be undone and all data will be permanently lost.", onConfirm: () => { setConfirm(null); toast.show("Workspace deletion requested. You'll receive a confirmation email."); } })}
            className="mt-3 flex w-full items-center justify-between text-left hover:opacity-80"
          >
            <span>
              <span className="block text-sm text-red-400">Delete Workspace</span>
              <span className="block text-sm text-ink/50">Permanently delete this workspace and all its data.</span>
            </span>
            <Trash2 className="h-4 w-4 shrink-0 text-red-400" />
          </button>
        </div>
      </div>
    );
  }

  function renderBilling() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <p className="text-ink">Current Plan</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-2/15">
              <CreditCard className="h-5 w-5 text-gold-2" />
            </div>
            <div>
              <p className="text-lg text-ink">Resonance Pro</p>
              <p className="text-sm text-ink/50">Billed monthly · Next renewal June 16, 2025</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {["Unlimited documents", "AI Continuity Scanner", "Resonance Pro AI model", "Priority support", "Collaboration (up to 5)", "Advanced stats"].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-ink/70">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                {feature}
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <button onClick={() => toast.show("Opening plan upgrade…")} className="flex-1 rounded-full bg-gold-2 py-2.5 text-sm font-medium text-bg-0 hover:bg-gold-1">
              Upgrade to Max
            </button>
            <button onClick={() => setConfirm({ message: "Are you sure you want to cancel your subscription? You'll lose access to Pro features at the end of your billing cycle.", onConfirm: () => { setConfirm(null); toast.show("Cancellation requested. Your plan remains active until June 16, 2025."); } })} className="flex-1 rounded-full border border-gold-3/30 py-2.5 text-sm text-ink/70 hover:border-gold-2/50">
              Cancel Plan
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <div className="flex items-center justify-between">
            <p className="text-ink">Payment Method</p>
            <button onClick={() => toast.show("Opening payment method editor…")} className="text-sm text-gold-2 hover:text-gold-1">Edit</button>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-gold-3/20 bg-bg-0 px-4 py-3">
            <CreditCard className="h-5 w-5 text-ink/50" />
            <span className="text-sm text-ink">•••• •••• •••• 4242</span>
            <span className="ml-auto text-xs text-ink/40">Expires 08/27</span>
          </div>
          <button onClick={() => toast.show("Opening add payment method…")} className="mt-3 text-sm text-gold-2 hover:text-gold-1">+ Add payment method</button>
        </div>

        <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
          <div className="flex items-center justify-between">
            <p className="text-ink">Billing History</p>
            <button onClick={() => toast.show("Downloading invoice history…")} className="flex items-center gap-1.5 text-sm text-gold-2 hover:text-gold-1">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
          <div className="mt-3 flex flex-col divide-y divide-gold-3/10">
            {[
              { date: "May 16, 2025", amount: "$12.00", status: "Paid" },
              { date: "Apr 16, 2025", amount: "$12.00", status: "Paid" },
              { date: "Mar 16, 2025", amount: "$12.00", status: "Paid" },
            ].map((inv) => (
              <div key={inv.date} className="flex items-center justify-between py-3 text-sm">
                <span className="text-ink/70">{inv.date}</span>
                <span className="text-ink">{inv.amount}</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-300">{inv.status}</span>
                <button onClick={() => toast.show(`Downloading invoice for ${inv.date}…`)} className="text-gold-2 hover:text-gold-1">
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast */}
      {toast.msg && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-gold-3/40 bg-bg-1 px-5 py-3 text-sm text-ink shadow-xl">
          {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="px-6 py-8 md:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl text-gold-1">Settings</h1>
            <p className="mt-1 text-ink/70">Customize your experience and manage your workspace.</p>
          </div>
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-2 rounded-md border border-gold-3/30 px-3 py-1.5 text-sm text-ink hover:border-gold-2/50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Defaults
          </button>
        </div>

        {/* Tab bar */}
        <div className="mt-6 flex gap-6 overflow-x-auto border-b border-gold-3/20">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px shrink-0 border-b-2 pb-3 text-sm transition-colors ${
                activeTab === tab ? "border-gold-2 text-gold-1" : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          {/* Main panel */}
          <div>
            {activeTab === "General"          && renderGeneral()}
            {activeTab === "Editor"           && renderEditor()}
            {activeTab === "AI & Assistance"  && renderAI()}
            {activeTab === "Notifications"    && renderNotifications()}
            {activeTab === "Privacy & Data"   && renderPrivacy()}
            {activeTab === "Account"          && renderAccount()}
            {activeTab === "Billing"          && renderBilling()}
          </div>

          {/* Right sidebar — always visible */}
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="text-ink">Account</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-2/15 font-display text-gold-1">A</div>
                <div>
                  <p className="text-ink">{displayName}</p>
                  <p className="text-sm text-ink/50">aravinda@resonance.studio</p>
                </div>
              </div>
              <button onClick={() => setActiveTab("Account")} className="mt-4 flex w-full items-center justify-between rounded-lg border border-gold-3/25 px-3 py-2 text-sm text-gold-2 hover:border-gold-2/50">
                Manage Account
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="text-ink">Subscription</p>
              <p className="mt-2 text-ink">Resonance Pro</p>
              <p className="text-sm text-ink/50">You have access to all premium features.</p>
              <button onClick={() => setActiveTab("Billing")} className="mt-4 flex w-full items-center justify-between rounded-lg border border-gold-3/25 px-3 py-2 text-sm text-gold-2 hover:border-gold-2/50">
                Manage Subscription
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="text-ink">Quick Links</p>
              <div className="mt-3 flex flex-col gap-2">
                {[
                  { label: "Notifications", icon: Bell, tab: "Notifications" as Tab },
                  { label: "Privacy & Data", icon: Shield, tab: "Privacy & Data" as Tab },
                  { label: "Billing History", icon: CreditCard, tab: "Billing" as Tab },
                ].map(({ label, icon: Icon, tab }) => (
                  <button key={label} onClick={() => setActiveTab(tab)} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-ink/70 transition-colors hover:bg-gold-2/5 hover:text-gold-1">
                    <Icon className="h-4 w-4 text-gold-2/60" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="text-ink">Workspace Settings</p>
              <div className="mt-3 flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink/60">Workspace Name</span>
                  {editingName ? (
                    <input
                      autoFocus
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      onBlur={() => { setEditingName(false); toast.show("Workspace name saved."); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { setEditingName(false); toast.show("Workspace name saved."); } }}
                      className="w-40 rounded border border-gold-3/30 bg-bg-0 px-2 py-1 text-right text-ink focus:outline-none"
                    />
                  ) : (
                    <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-ink hover:text-gold-1">
                      {workspaceName}
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink/60">Language</span>
                  <Dropdown value={language} options={["English", "Spanish", "French", "German"]} onChange={setLanguage} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-ink/60">Time Zone</span>
                  <Dropdown value={timezone} options={["(GMT-08:00) Pacific", "(GMT-05:00) Central", "(GMT-04:00) Eastern", "(GMT+00:00) UTC"]} onChange={setTimezone} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
