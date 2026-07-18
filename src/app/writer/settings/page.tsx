"use client";

import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";

const TABS = [
  "General",
  "Editor",
  "AI & Assistance",
  "Privacy & Data",
  "Notifications",
  "Account",
  "Billing",
] as const;
type Tab = (typeof TABS)[number];

type ThemeOption = "Dark" | "Sepia" | "Light";

const THEMES: { key: ThemeOption; bg: string; line: string }[] = [
  { key: "Dark", bg: "bg-bg-0", line: "bg-gold-2/60" },
  { key: "Sepia", bg: "bg-[#3a2f22]", line: "bg-[#d9c39a]" },
  { key: "Light", bg: "bg-[#f2ede3]", line: "bg-[#2a2a2a]" },
];

const ACCENTS = [
  { key: "gold", color: "#d9a84e" },
  { key: "violet", color: "#a78bfa" },
  { key: "blue", color: "#38bdf8" },
  { key: "emerald", color: "#34d399" },
  { key: "teal", color: "#2dd4bf" },
  { key: "red", color: "#f87171" },
  { key: "pink", color: "#f472b6" },
];

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        checked ? "bg-gold-2" : "bg-bg-0 border border-ink/30"
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

function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-[160px] items-center justify-between gap-3 rounded-md border border-gold-3/30 px-3 py-2 text-sm text-ink hover:border-gold-2/50"
      >
        {value}
        <ChevronDown className="h-3.5 w-3.5 text-ink/50" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-full min-w-[160px] rounded-md border border-gold-3/30 bg-bg-1 py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-gold-2/10 ${
                opt === value ? "text-gold-1" : "text-ink"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingRow({
  label,
  description,
  control,
}: {
  label: string;
  description: string;
  control: React.ReactNode;
}) {
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

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("General");
  const [theme, setTheme] = useState<ThemeOption>("Dark");
  const [accent, setAccent] = useState("gold");

  const [defaultFont, setDefaultFont] = useState("Lora");
  const [fontSize, setFontSize] = useState("16px");
  const [lineHeight, setLineHeight] = useState("1.6");
  const [focusModeDefault, setFocusModeDefault] = useState(true);
  const [showWordCount, setShowWordCount] = useState(true);
  const [showToolbar, setShowToolbar] = useState(true);

  const [autosave, setAutosave] = useState("Every 30 seconds");
  const [defaultDocType, setDefaultDocType] = useState("Chapter");

  const [workspaceName, setWorkspaceName] = useState("Aravinda's Workspace");
  const [editingName, setEditingName] = useState(false);
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("(GMT-04:00) Eastern Time");

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-1">Settings</h1>
          <p className="mt-1 text-ink/70">
            Customize your experience and manage your workspace.
          </p>
        </div>
        <button
          onClick={() => console.log("reset to defaults")}
          className="flex items-center gap-2 rounded-md border border-gold-3/30 px-3 py-1.5 text-sm text-ink hover:border-gold-2/50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to Defaults
        </button>
      </div>

      <div className="mt-6 flex gap-6 overflow-x-auto border-b border-gold-3/20">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`-mb-px shrink-0 border-b-2 pb-3 text-sm transition-colors ${
              activeTab === tab
                ? "border-gold-2 text-gold-1"
                : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          {activeTab !== "General" ? (
            <div className="mt-16 flex flex-col items-center text-center text-ink/60">
              <p className="font-display text-xl text-gold-1">{activeTab}</p>
              <p className="mt-2 max-w-sm">Coming soon.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
                <p className="text-ink">Appearance</p>
                <p className="text-sm text-ink/50">
                  Choose how Resonance looks for you.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {THEMES.map((t) => {
                    const selected = theme === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setTheme(t.key)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          selected
                            ? "border-gold-2"
                            : "border-gold-3/25 hover:border-gold-3/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`h-16 w-full rounded-md ${t.bg} flex flex-col justify-center gap-1.5 p-2`}
                          >
                            <span className={`h-1 w-3/4 rounded ${t.line}`} />
                            <span className={`h-1 w-1/2 rounded ${t.line}`} />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              selected
                                ? "border-gold-2 bg-gold-2 text-bg-0"
                                : "border-ink/30"
                            }`}
                          >
                            {selected && <Check className="h-3 w-3" />}
                          </span>
                          <span className="text-sm text-ink">{t.key}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-6 text-ink">Accent Color</p>
                <p className="text-sm text-ink/50">
                  Choose your accent color across Resonance.
                </p>
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
                          boxShadow: selected
                            ? `0 0 0 2px #03040a, 0 0 0 4px ${a.color}`
                            : undefined,
                        }}
                      >
                        {selected && (
                          <Check className="h-4 w-4 text-bg-0" strokeWidth={3} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
                <p className="text-ink">Editor Preferences</p>

                <div className="mt-2 divide-y divide-gold-3/10">
                  <SettingRow
                    label="Default Font"
                    description="Choose the default font for the editor."
                    control={
                      <Dropdown
                        value={defaultFont}
                        options={["Lora", "Cormorant Garamond", "Georgia", "Inter"]}
                        onChange={setDefaultFont}
                      />
                    }
                  />
                  <SettingRow
                    label="Font Size"
                    description="Adjust the default font size."
                    control={
                      <Dropdown
                        value={fontSize}
                        options={["14px", "16px", "18px", "20px"]}
                        onChange={setFontSize}
                      />
                    }
                  />
                  <SettingRow
                    label="Line Height"
                    description="Adjust the line spacing in the editor."
                    control={
                      <Dropdown
                        value={lineHeight}
                        options={["1.4", "1.6", "1.8", "2.0"]}
                        onChange={setLineHeight}
                      />
                    }
                  />
                  <SettingRow
                    label="Focus Mode by Default"
                    description="Open the editor in distraction-free focus mode."
                    control={
                      <Toggle
                        checked={focusModeDefault}
                        onChange={setFocusModeDefault}
                      />
                    }
                  />
                  <SettingRow
                    label="Show Word Count in Editor"
                    description="Display word count while writing."
                    control={
                      <Toggle checked={showWordCount} onChange={setShowWordCount} />
                    }
                  />
                  <SettingRow
                    label="Show Formatting Toolbar"
                    description="Keep the formatting toolbar visible."
                    control={
                      <Toggle checked={showToolbar} onChange={setShowToolbar} />
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
                <p className="text-ink">Workspace</p>

                <div className="mt-2 divide-y divide-gold-3/10">
                  <SettingRow
                    label="Autosave"
                    description="Automatically save your work as you write."
                    control={
                      <Dropdown
                        value={autosave}
                        options={[
                          "Every 15 seconds",
                          "Every 30 seconds",
                          "Every minute",
                          "Off",
                        ]}
                        onChange={setAutosave}
                      />
                    }
                  />
                  <SettingRow
                    label="Default New Document Type"
                    description="Choose the default type when creating a new document."
                    control={
                      <Dropdown
                        value={defaultDocType}
                        options={["Chapter", "Scene", "Note", "Blank"]}
                        onChange={setDefaultDocType}
                      />
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <p className="text-ink">Account</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-2/15 font-display text-gold-1">
                A
              </div>
              <div>
                <p className="text-ink">Aravinda S.</p>
                <p className="text-sm text-ink/50">
                  aravinda@resonance.studio
                </p>
              </div>
            </div>
            <button
              onClick={() => console.log("manage account")}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-gold-3/25 px-3 py-2 text-sm text-gold-2 hover:border-gold-2/50"
            >
              Manage Account
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <p className="text-ink">Subscription</p>
            <p className="mt-2 text-ink">Resonance Pro</p>
            <p className="text-sm text-ink/50">
              You have access to all premium features.
            </p>
            <button
              onClick={() => console.log("manage subscription")}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-gold-3/25 px-3 py-2 text-sm text-gold-2 hover:border-gold-2/50"
            >
              Manage Subscription
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
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
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
                    className="w-40 rounded border border-gold-3/30 bg-bg-0 px-2 py-1 text-right text-ink focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setEditingName(true)}
                    className="flex items-center gap-1.5 text-ink hover:text-gold-1"
                  >
                    {workspaceName}
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink/60">Language</span>
                <Dropdown
                  value={language}
                  options={["English", "Spanish", "French", "German"]}
                  onChange={setLanguage}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-ink/60">Time Zone</span>
                <Dropdown
                  value={timezone}
                  options={[
                    "(GMT-08:00) Pacific Time",
                    "(GMT-05:00) Central Time",
                    "(GMT-04:00) Eastern Time",
                    "(GMT+00:00) UTC",
                  ]}
                  onChange={setTimezone}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <p className="text-ink">Data & Backup</p>
            <div className="mt-3 flex flex-col gap-3">
              <button
                onClick={() => console.log("export all data")}
                className="flex items-center justify-between text-left"
              >
                <span>
                  <span className="block text-sm text-ink">
                    Export All Data
                  </span>
                  <span className="block text-sm text-ink/50">
                    Download all your projects and data.
                  </span>
                </span>
                <Download className="h-4 w-4 shrink-0 text-ink/50" />
              </button>
              <button
                onClick={() => console.log("import data")}
                className="flex items-center justify-between text-left"
              >
                <span>
                  <span className="block text-sm text-ink">Import Data</span>
                  <span className="block text-sm text-ink/50">
                    Import from a backup file.
                  </span>
                </span>
                <Upload className="h-4 w-4 shrink-0 text-ink/50" />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/25 bg-bg-1 p-5">
            <p className="text-red-400">Danger Zone</p>
            <button
              onClick={() => console.log("delete workspace")}
              className="mt-3 flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="block text-sm text-red-400">
                  Delete Workspace
                </span>
                <span className="block text-sm text-ink/50">
                  Permanently delete this workspace and all its data. This
                  action cannot be undone.
                </span>
              </span>
              <Trash2 className="h-4 w-4 shrink-0 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
