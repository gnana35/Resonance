"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bell,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  CloudUpload,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  Mail,
  Pencil,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  User,
  Volume2,
  WifiOff,
} from "lucide-react";

/* ─── tabs ─────────────────────────────────────────────────────────────── */

const TABS = [
  "General",
  "Appearance",
  "Canvas & Export",
  "AI & Assistance",
  "Privacy & Data",
  "Notifications",
  "Account",
  "Billing",
] as const;
type Tab = (typeof TABS)[number];

/* ─── appearance data ──────────────────────────────────────────────────── */

type ThemeOption = "Dark" | "Sepia" | "Light";

const THEMES: { key: ThemeOption; bg: string; line: string }[] = [
  { key: "Dark",  bg: "bg-bg-0",        line: "bg-violet-2/60" },
  { key: "Sepia", bg: "bg-[#3a2f22]",   line: "bg-[#d9c39a]"  },
  { key: "Light", bg: "bg-[#f2ede3]",   line: "bg-[#2a2a2a]"  },
];

const ACCENTS = [
  { key: "violet",  color: "#a78bfa" },
  { key: "gold",    color: "#d9a84e" },
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
        checked ? "bg-violet-2" : "border border-ink/30 bg-bg-0"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Dropdown({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-[180px] items-center justify-between gap-3 rounded-md border border-violet-3/30 px-3 py-2 text-sm text-ink hover:border-violet-2/50"
      >
        {value}
        <ChevronDown className={`h-3.5 w-3.5 text-ink/50 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-full min-w-[180px] rounded-md border border-violet-3/30 bg-bg-1 py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-violet-2/10 ${
                opt === value ? "text-violet-1" : "text-ink"
              }`}
            >
              {opt}
              {opt === value && <Check className="h-3.5 w-3.5 text-violet-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SegmentedControl({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex overflow-hidden rounded-md border border-violet-3/30">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-2 text-sm transition-colors ${
            opt === value ? "bg-violet-2/20 text-violet-1" : "text-ink/60 hover:text-ink"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  control,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-2" />}
        <div>
          <p className="text-ink">{label}</p>
          <p className="text-sm text-ink/50">{description}</p>
        </div>
      </div>
      <div className={`shrink-0 ${Icon ? "sm:pl-7" : ""}`}>{control}</div>
    </div>
  );
}

/* ─── notification toast helper ───────────────────────────────────────── */

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  function show(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2200);
  }
  return { msg, show };
}

/* ─── page ─────────────────────────────────────────────────────────────── */

export default function DesignerSettings() {
  const [activeTab, setActiveTab] = useState<Tab>("General");
  const toast = useToast();

  /* — General — */
  const [language, setLanguage] = useState("English");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [notifFrequency, setNotifFrequency] = useState("Immediately");
  const [approvalAlerts, setApprovalAlerts] = useState(true);
  const [commentAlerts, setCommentAlerts] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [displayName, setDisplayName] = useState("Luna Designer");
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [timezone, setTimezone] = useState("(UTC-05:00) Eastern Time (US & Canada)");
  const [dateFormat, setDateFormat] = useState("May 16, 2025 (MMM D, YYYY)");
  const [timeFormat, setTimeFormat] = useState("12 Hour (AM/PM)");
  const [startWeekOn, setStartWeekOn] = useState("Monday");
  const [projectView, setProjectView] = useState("Grid");
  const [autosave, setAutosave] = useState(true);
  const [autosaveFreq, setAutosaveFreq] = useState("Every 30 seconds");
  const [sounds, setSounds] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  /* — Appearance — */
  const [theme, setTheme] = useState<ThemeOption>("Dark");

  useEffect(() => {
    const el = document.documentElement;
    if (theme === "Dark") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", theme.toLowerCase());
  }, [theme]);
  const [accent, setAccent] = useState("violet");
  const [imageQuality, setImageQuality] = useState("High");
  const [showTips, setShowTips] = useState(true);
  const [betaFeatures, setBetaFeatures] = useState(false);

  /* — Canvas & Export — */
  const [exportFormat, setExportFormat] = useState("PNG");
  const [exportQuality, setExportQuality] = useState("High (1080p)");
  const [canvasUnit, setCanvasUnit] = useState("Pixels");
  const [defaultCanvasSize, setDefaultCanvasSize] = useState("1920 × 1080");
  const [autoOrganize, setAutoOrganize] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);

  /* — AI & Assistance — */
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [autoTagAssets, setAutoTagAssets] = useState(true);
  const [aiModel, setAiModel] = useState("Resonance Pro");

  /* — Workspace — */
  const [workspaceName, setWorkspaceName] = useState("Luna's Workspace");
  const [editingName, setEditingName] = useState(false);

  /* — cache cleared state — */
  const [cacheCleared, setCacheCleared] = useState(false);

  function handleClearCache() {
    setCacheCleared(true);
    toast.show("Cache cleared successfully.");
    setTimeout(() => setCacheCleared(false), 3000);
  }

  function handleResetDefaults() {
    setLanguage("English");
    setTimezone("(UTC-05:00) Eastern Time (US & Canada)");
    setDateFormat("May 16, 2025 (MMM D, YYYY)");
    setTimeFormat("12 Hour (AM/PM)");
    setStartWeekOn("Monday");
    setProjectView("Grid");
    setAutosave(true);
    setAutosaveFreq("Every 30 seconds");
    setSounds(true);
    setAnimations(true);
    setOfflineMode(false);
    setTheme("Dark");
    setAccent("violet");
    setImageQuality("High");
    setExportFormat("PNG");
    setExportQuality("High (1080p)");
    setCanvasUnit("Pixels");
    setDefaultCanvasSize("1920 × 1080");
    setAutoOrganize(true);
    setSnapToGrid(true);
    setAiSuggestions(true);
    setAutoTagAssets(true);
    setAiModel("Resonance Pro");
    setEmailNotifs(true);
    setPushNotifs(true);
    setNotifFrequency("Immediately");
    setApprovalAlerts(true);
    setCommentAlerts(true);
    setProjectUpdates(true);
    setWeeklyDigest(false);
    toast.show("Settings reset to defaults.");
  }

  /* ── render helpers ── */
  function renderGeneral() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
          <p className="text-ink">Regional</p>
          <div className="mt-2 divide-y divide-violet-3/10">
            <SettingRow icon={Globe} label="Language" description="Your preferred language." control={
              <Dropdown value={language} options={["English", "Spanish", "French", "German", "Japanese"]} onChange={setLanguage} />
            } />
            <SettingRow icon={Clock} label="Timezone" description="Your local timezone." control={
              <Dropdown value={timezone} options={["(UTC-08:00) Pacific Time", "(UTC-05:00) Eastern Time (US & Canada)", "(UTC+00:00) UTC", "(UTC+01:00) Central Europe"]} onChange={setTimezone} />
            } />
            <SettingRow icon={Calendar} label="Date Format" description="How dates are displayed." control={
              <Dropdown value={dateFormat} options={["May 16, 2025 (MMM D, YYYY)", "16/05/2025 (DD/MM/YYYY)", "05/16/2025 (MM/DD/YYYY)"]} onChange={setDateFormat} />
            } />
            <SettingRow icon={Clock} label="Time Format" description="How times are displayed." control={
              <SegmentedControl value={timeFormat} options={["12 Hour (AM/PM)", "24 Hour"]} onChange={setTimeFormat} />
            } />
            <SettingRow icon={CalendarDays} label="Start Week On" description="First day of the week." control={
              <Dropdown value={startWeekOn} options={["Sunday", "Monday"]} onChange={setStartWeekOn} />
            } />
          </div>
        </div>

        <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
          <p className="text-ink">Workspace Behaviour</p>
          <div className="mt-2 divide-y divide-violet-3/10">
            <SettingRow icon={LayoutGrid} label="Default Project View" description="Your default view when opening projects." control={
              <SegmentedControl value={projectView} options={["Grid", "List", "Board"]} onChange={setProjectView} />
            } />
            <SettingRow icon={CloudUpload} label="Autosave" description="Automatically save your work in real time." control={
              <Toggle checked={autosave} onChange={setAutosave} />
            } />
            {autosave && (
              <SettingRow icon={CloudUpload} label="Autosave Frequency" description="How often your work is saved." control={
                <Dropdown value={autosaveFreq} options={["Every 15 seconds", "Every 30 seconds", "Every minute", "Every 5 minutes"]} onChange={setAutosaveFreq} />
              } />
            )}
            <SettingRow icon={Volume2} label="Sounds" description="Enable UI sounds and notifications." control={
              <Toggle checked={sounds} onChange={setSounds} />
            } />
            <SettingRow icon={Sparkles} label="Animations" description="Enable interface animations and transitions." control={
              <Toggle checked={animations} onChange={setAnimations} />
            } />
            <SettingRow icon={WifiOff} label="Offline Mode" description="Work offline and sync when back online." control={
              <Toggle checked={offlineMode} onChange={setOfflineMode} />
            } />
            <SettingRow icon={Database} label="Cache Management" description="Clear temporary files to free up space." control={
              <button
                onClick={handleClearCache}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  cacheCleared
                    ? "border-emerald-400/50 text-emerald-400"
                    : "border-violet-2/50 text-violet-1 hover:border-violet-1"
                }`}
              >
                {cacheCleared ? "Cleared ✓" : "Clear Cache"}
              </button>
            } />
          </div>
        </div>
      </div>
    );
  }

  function renderAppearance() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
          <p className="text-ink">Theme</p>
          <p className="text-sm text-ink/50">Choose how Resonance looks for you.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {THEMES.map((t) => {
              const selected = theme === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTheme(t.key)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    selected ? "border-violet-2" : "border-violet-3/25 hover:border-violet-3/50"
                  }`}
                >
                  <div className={`h-16 w-full rounded-md ${t.bg} flex flex-col justify-center gap-1.5 p-2`}>
                    <span className={`h-1 w-3/4 rounded ${t.line}`} />
                    <span className={`h-1 w-1/2 rounded ${t.line}`} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      selected ? "border-violet-2 bg-violet-2 text-bg-0" : "border-ink/30"
                    }`}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="text-sm text-ink">{t.key}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-ink">Accent Color</p>
          <p className="text-sm text-ink/50">Your accent color across Resonance.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {ACCENTS.map((a) => {
              const selected = accent === a.key;
              return (
                <button
                  key={a.key}
                  onClick={() => setAccent(a.key)}
                  aria-label={a.key}
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: a.color,
                    boxShadow: selected ? `0 0 0 2px #03040a, 0 0 0 4px ${a.color}` : undefined,
                  }}
                >
                  {selected && <Check className="h-4 w-4 text-bg-0" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
          <p className="text-ink">Display</p>
          <div className="mt-2 divide-y divide-violet-3/10">
            <SettingRow icon={ImageIcon} label="Preview Quality" description="Quality for asset previews in the workspace." control={
              <SegmentedControl value={imageQuality} options={["Low", "Medium", "High"]} onChange={setImageQuality} />
            } />
            <SettingRow icon={Sparkles} label="Show Tips" description="Show helpful tips and suggestions." control={
              <Toggle checked={showTips} onChange={setShowTips} />
            } />
            <SettingRow icon={Sparkles} label="Beta Features" description="Enable experimental features." control={
              <Toggle checked={betaFeatures} onChange={setBetaFeatures} />
            } />
          </div>
        </div>
      </div>
    );
  }

  function renderCanvasExport() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
          <p className="text-ink">Canvas Defaults</p>
          <div className="mt-2 divide-y divide-violet-3/10">
            <SettingRow icon={LayoutGrid} label="Default Canvas Size" description="Starting dimensions for new canvases." control={
              <Dropdown value={defaultCanvasSize} options={["1920 × 1080", "2560 × 1440", "3840 × 2160", "1280 × 720", "800 × 600"]} onChange={setDefaultCanvasSize} />
            } />
            <SettingRow icon={Globe} label="Canvas Unit" description="Unit of measurement on the canvas." control={
              <SegmentedControl value={canvasUnit} options={["Pixels", "Inches", "mm"]} onChange={setCanvasUnit} />
            } />
            <SettingRow icon={LayoutGrid} label="Snap to Grid" description="Snap elements to grid when moving." control={
              <Toggle checked={snapToGrid} onChange={setSnapToGrid} />
            } />
          </div>
        </div>

        <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
          <p className="text-ink">Export Settings</p>
          <div className="mt-2 divide-y divide-violet-3/10">
            <SettingRow icon={Download} label="Default Export Format" description="File type for exported assets." control={
              <Dropdown value={exportFormat} options={["PNG", "JPG", "SVG", "PDF", "WebP"]} onChange={setExportFormat} />
            } />
            <SettingRow icon={ImageIcon} label="Default Export Quality" description="Quality for exported assets." control={
              <Dropdown value={exportQuality} options={["Low (480p)", "Medium (720p)", "High (1080p)", "Max (4K)"]} onChange={setExportQuality} />
            } />
            <SettingRow icon={Sparkles} label="Auto-Organize on Upload" description="Automatically sort assets into folders on upload." control={
              <Toggle checked={autoOrganize} onChange={setAutoOrganize} />
            } />
          </div>
        </div>
      </div>
    );
  }

  function renderAI() {
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
          <p className="text-ink">AI Assistance</p>
          <div className="mt-2 divide-y divide-violet-3/10">
            <SettingRow icon={Sparkles} label="AI Suggestions" description="Show AI-powered design suggestions while working." control={
              <Toggle checked={aiSuggestions} onChange={setAiSuggestions} />
            } />
            <SettingRow icon={Sparkles} label="Auto-Tag Assets" description="Use AI to automatically tag uploaded assets." control={
              <Toggle checked={autoTagAssets} onChange={setAutoTagAssets} />
            } />
            <SettingRow icon={Sparkles} label="AI Model" description="Choose the AI model powering your workspace." control={
              <Dropdown value={aiModel} options={["Resonance Lite", "Resonance Pro", "Resonance Max"]} onChange={setAiModel} />
            } />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 md:px-10">
      {/* Toast */}
      {toast.msg && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-violet-3/40 bg-bg-1 px-5 py-3 text-sm text-ink shadow-xl">
          {toast.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-violet-1">Settings</h1>
          <p className="mt-1 text-ink/70">Customize your experience and manage your workspace.</p>
        </div>
        <button
          onClick={handleResetDefaults}
          className="flex items-center gap-2 rounded-md border border-violet-3/30 px-3 py-1.5 text-sm text-ink hover:border-violet-2/50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to Defaults
        </button>
      </div>

      {/* Tab bar */}
      <div className="mt-6 flex gap-6 overflow-x-auto border-b border-violet-3/20">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px shrink-0 border-b-2 pb-3 text-sm transition-colors ${
              activeTab === tab
                ? "border-violet-2 text-violet-1"
                : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div>
          {activeTab === "General"          && renderGeneral()}
          {activeTab === "Appearance"       && renderAppearance()}
          {activeTab === "Canvas & Export"  && renderCanvasExport()}
          {activeTab === "AI & Assistance"  && renderAI()}
          {activeTab === "Notifications" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Delivery</p>
                <div className="mt-2 divide-y divide-violet-3/10">
                  <SettingRow icon={Bell} label="Email Notifications" description="Receive notifications by email." control={
                    <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
                  } />
                  <SettingRow icon={Bell} label="Push Notifications" description="Receive browser push notifications." control={
                    <Toggle checked={pushNotifs} onChange={setPushNotifs} />
                  } />
                  <SettingRow icon={Clock} label="Notification Frequency" description="How often notifications are sent." control={
                    <Dropdown value={notifFrequency} options={["Immediately", "Hourly digest", "Daily digest", "Never"]} onChange={setNotifFrequency} />
                  } />
                </div>
              </div>
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">What to Notify</p>
                <div className="mt-2 divide-y divide-violet-3/10">
                  <SettingRow icon={Bell} label="Approval Alerts" description="When a submission is approved, rejected, or needs changes." control={
                    <Toggle checked={approvalAlerts} onChange={setApprovalAlerts} />
                  } />
                  <SettingRow icon={Bell} label="Comment Alerts" description="When someone comments on your work." control={
                    <Toggle checked={commentAlerts} onChange={setCommentAlerts} />
                  } />
                  <SettingRow icon={Bell} label="Project Updates" description="When project settings or collaborators change." control={
                    <Toggle checked={projectUpdates} onChange={setProjectUpdates} />
                  } />
                  <SettingRow icon={Bell} label="Weekly Digest" description="A weekly summary of your design activity." control={
                    <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} />
                  } />
                </div>
              </div>
            </div>
          )}
          {activeTab === "Privacy & Data" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Data & Backup</p>
                <div className="mt-3 flex flex-col gap-4">
                  <button onClick={() => toast.show("Preparing export… check your email shortly.")} className="flex items-center justify-between rounded-lg border border-violet-3/25 px-4 py-3 text-left transition-colors hover:border-violet-2/50">
                    <span>
                      <span className="block text-sm text-ink">Export All Assets</span>
                      <span className="block text-xs text-ink/50">Download all your projects and asset files.</span>
                    </span>
                    <Download className="h-4 w-4 shrink-0 text-ink/50" />
                  </button>
                  <button onClick={() => toast.show("Opening import dialog…")} className="flex items-center justify-between rounded-lg border border-violet-3/25 px-4 py-3 text-left transition-colors hover:border-violet-2/50">
                    <span>
                      <span className="block text-sm text-ink">Import Data</span>
                      <span className="block text-xs text-ink/50">Restore from a Resonance backup file.</span>
                    </span>
                    <Upload className="h-4 w-4 shrink-0 text-ink/50" />
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Privacy</p>
                <div className="mt-3 flex flex-col gap-4">
                  <button onClick={() => toast.show("Opening privacy policy…")} className="flex items-center justify-between rounded-lg border border-violet-3/25 px-4 py-3 text-left transition-colors hover:border-violet-2/50">
                    <span>
                      <span className="block text-sm text-ink">Privacy Policy</span>
                      <span className="block text-xs text-ink/50">Read how we handle your data.</span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-ink/50" />
                  </button>
                  <button onClick={() => toast.show("Opening terms of service…")} className="flex items-center justify-between rounded-lg border border-violet-3/25 px-4 py-3 text-left transition-colors hover:border-violet-2/50">
                    <span>
                      <span className="block text-sm text-ink">Terms of Service</span>
                      <span className="block text-xs text-ink/50">Read our terms and conditions.</span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-ink/50" />
                  </button>
                  <button onClick={() => toast.show("Opening cookie preferences…")} className="flex items-center justify-between rounded-lg border border-violet-3/25 px-4 py-3 text-left transition-colors hover:border-violet-2/50">
                    <span>
                      <span className="block text-sm text-ink">Cookie Preferences</span>
                      <span className="block text-xs text-ink/50">Manage your cookie and tracking settings.</span>
                    </span>
                    <Shield className="h-4 w-4 shrink-0 text-ink/50" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === "Billing" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Current Plan</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-2/15">
                    <CreditCard className="h-5 w-5 text-violet-2" />
                  </div>
                  <div>
                    <p className="text-lg text-ink">Resonance Pro</p>
                    <p className="text-sm text-ink/50">Billed monthly · Next renewal June 16, 2025</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => toast.show("Opening plan upgrade flow…")} className="flex items-center gap-2 rounded-md border border-violet-2/50 px-4 py-2 text-sm text-violet-1 hover:border-violet-1">
                    Upgrade to Max
                  </button>
                  <button onClick={() => toast.show("Opening cancellation flow…")} className="flex items-center gap-2 rounded-md border border-ink/20 px-4 py-2 text-sm text-ink/60 hover:border-ink/40">
                    Cancel Plan
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Payment Method</p>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-violet-3/20 px-3 py-2 text-sm">
                  <span className="text-ink/70">Visa ending in 4242</span>
                  <button onClick={() => toast.show("Opening payment update flow…")} className="text-violet-2 hover:text-violet-1">Update</button>
                </div>
              </div>
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Invoice History</p>
                <div className="mt-3 flex flex-col divide-y divide-violet-3/10 text-sm">
                  {[
                    { date: "May 16, 2025", amount: "$12.00", status: "Paid" },
                    { date: "Apr 16, 2025", amount: "$12.00", status: "Paid" },
                    { date: "Mar 16, 2025", amount: "$12.00", status: "Paid" },
                  ].map((inv) => (
                    <div key={inv.date} className="flex items-center justify-between py-3">
                      <span className="text-ink/70">{inv.date}</span>
                      <span className="text-ink">{inv.amount}</span>
                      <span className="text-emerald-400">{inv.status}</span>
                      <button onClick={() => toast.show(`Downloading invoice for ${inv.date}…`)} className="flex items-center gap-1 text-violet-2 hover:text-violet-1">
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === "Account" && (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Profile</p>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-2/15 font-display text-2xl text-violet-1">L</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {editingDisplayName ? (
                        <input
                          autoFocus
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          onBlur={() => { setEditingDisplayName(false); toast.show("Name updated."); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { setEditingDisplayName(false); toast.show("Name updated."); } }}
                          className="rounded border border-violet-3/30 bg-bg-0 px-2 py-1 text-ink focus:outline-none"
                        />
                      ) : (
                        <>
                          <p className="text-ink">{displayName}</p>
                          <button onClick={() => setEditingDisplayName(true)} className="text-ink/40 hover:text-ink"><Pencil className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-ink/50">luna.designer@resonance.gg</p>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-violet-3/10">
                  <SettingRow icon={Mail} label="Change Email" description="Update your login email address." control={
                    <button onClick={() => toast.show("Opening email change flow…")} className="flex items-center gap-2 rounded-md border border-violet-3/30 px-3 py-2 text-sm text-ink hover:border-violet-2/50"><Mail className="h-3.5 w-3.5" /> Change</button>
                  } />
                  <SettingRow icon={Lock} label="Change Password" description="Update your password." control={
                    <button onClick={() => toast.show("Opening password change flow…")} className="flex items-center gap-2 rounded-md border border-violet-3/30 px-3 py-2 text-sm text-ink hover:border-violet-2/50"><Lock className="h-3.5 w-3.5" /> Change</button>
                  } />
                  <SettingRow icon={User} label="Profile Photo" description="Update your profile picture." control={
                    <button onClick={() => toast.show("Opening photo upload…")} className="flex items-center gap-2 rounded-md border border-violet-3/30 px-3 py-2 text-sm text-ink hover:border-violet-2/50"><User className="h-3.5 w-3.5" /> Upload</button>
                  } />
                </div>
              </div>
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Workspace Settings</p>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink/60">Workspace Name</span>
                  {editingName ? (
                    <input
                      autoFocus
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      onBlur={() => setEditingName(false)}
                      onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
                      className="w-44 rounded border border-violet-3/30 bg-bg-0 px-2 py-1 text-right text-ink focus:outline-none"
                    />
                  ) : (
                    <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-ink hover:text-violet-1">
                      {workspaceName}
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-red-500/25 bg-bg-1 p-5">
                <p className="text-red-400">Danger Zone</p>
                <button
                  onClick={() => toast.show("Workspace deletion requested. You'll receive a confirmation email.")}
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
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-6">
          {/* Account card */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Account</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-2/15 font-display text-violet-1">L</div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-ink">
                  Luna Designer
                  <span className="rounded-full bg-violet-2/15 px-2 py-0.5 text-xs text-violet-2">Pro</span>
                </p>
                <p className="truncate text-sm text-ink/50">luna.designer@resonance.gg</p>
              </div>
            </div>
            <button
              onClick={() => { setActiveTab("Account"); }}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-violet-3/25 px-3 py-2 text-sm text-violet-2 hover:border-violet-2/50"
            >
              Manage Account
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Subscription */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Subscription</p>
            <p className="mt-2 text-ink">Resonance Pro</p>
            <p className="text-sm text-ink/50">You have access to all premium features.</p>
            <button
              onClick={() => { setActiveTab("Billing"); }}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-violet-3/25 px-3 py-2 text-sm text-violet-2 hover:border-violet-2/50"
            >
              Manage Subscription
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Workspace */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Workspace Settings</p>
            <div className="mt-3 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink/60">Workspace Name</span>
                {editingName ? (
                  <input
                    autoFocus
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
                    className="w-40 rounded border border-violet-3/30 bg-bg-0 px-2 py-1 text-right text-ink focus:outline-none"
                  />
                ) : (
                  <button onClick={() => setEditingName(true)} className="flex items-center gap-1.5 text-ink hover:text-violet-1">
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
                <Dropdown value={timezone} options={["(UTC-08:00) Pacific Time", "(UTC-05:00) Eastern Time (US & Canada)", "(UTC+00:00) UTC"]} onChange={setTimezone} />
              </div>
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Data &amp; Privacy</p>
            <div className="mt-3 flex flex-col gap-3">
              <button onClick={() => toast.show("Preparing export…")} className="flex items-center gap-3 text-left hover:opacity-80">
                <Download className="h-4 w-4 shrink-0 text-ink/50" />
                <span>
                  <span className="block text-sm text-ink">Export My Data</span>
                  <span className="block text-sm text-ink/50">Download a copy of all your data.</span>
                </span>
              </button>
              <button onClick={() => toast.show("Opening import…")} className="flex items-center gap-3 text-left hover:opacity-80">
                <Upload className="h-4 w-4 shrink-0 text-ink/50" />
                <span>
                  <span className="block text-sm text-ink">Import Data</span>
                  <span className="block text-sm text-ink/50">Import from a backup file.</span>
                </span>
              </button>
              <button onClick={() => toast.show("Opening privacy policy…")} className="flex items-center gap-3 text-left hover:opacity-80">
                <Shield className="h-4 w-4 shrink-0 text-ink/50" />
                <span className="flex-1">
                  <span className="block text-sm text-ink">Privacy Policy</span>
                  <span className="block text-sm text-ink/50">Read our privacy policy.</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink/40" />
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-500/25 bg-bg-1 p-5">
            <p className="text-red-400">Danger Zone</p>
            <button
              onClick={() => toast.show("Are you sure? This cannot be undone.")}
              className="mt-3 flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="block text-sm text-red-400">Delete Workspace</span>
                <span className="block text-sm text-ink/50">Permanently delete this workspace and all its data.</span>
              </span>
              <Trash2 className="h-4 w-4 shrink-0 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
