"use client";

import { useState } from "react";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  ChevronDown,
  Clock,
  CloudUpload,
  Database,
  Download,
  ExternalLink,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  Pencil,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Volume2,
  WifiOff,
} from "lucide-react";

const TABS = [
  "General",
  "Appearance",
  "Notifications",
  "Collaboration",
  "Shortcuts",
  "Integrations",
  "Security",
  "Billing",
] as const;
type Tab = (typeof TABS)[number];

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
        checked ? "bg-violet-2" : "bg-bg-0 border border-ink/30"
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
        className="flex w-full min-w-[180px] items-center justify-between gap-3 rounded-md border border-violet-3/30 px-3 py-2 text-sm text-ink hover:border-violet-2/50"
      >
        {value}
        <ChevronDown className="h-3.5 w-3.5 text-ink/50" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-full min-w-[180px] rounded-md border border-violet-3/30 bg-bg-1 py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-violet-2/10 ${
                opt === value ? "text-violet-1" : "text-ink"
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

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-md border border-violet-3/30">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-2 text-sm transition-colors ${
            opt === value
              ? "bg-violet-2/20 text-violet-1"
              : "text-ink/60 hover:text-ink"
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
  icon: typeof Globe;
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-2" />
        <div>
          <p className="text-ink">{label}</p>
          <p className="text-sm text-ink/50">{description}</p>
        </div>
      </div>
      <div className="shrink-0 sm:pl-7">{control}</div>
    </div>
  );
}

export default function DesignerSettings() {
  const [activeTab, setActiveTab] = useState<Tab>("General");

  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("(UTC-05:00) Eastern Time (US & Canada)");
  const [dateFormat, setDateFormat] = useState("May 16, 2025 (MMM D, YYYY)");
  const [timeFormat, setTimeFormat] = useState("12 Hour (AM/PM)");
  const [startWeekOn, setStartWeekOn] = useState("Monday");
  const [projectView, setProjectView] = useState("Grid");
  const [autosave, setAutosave] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [animations, setAnimations] = useState(true);

  const [imageQuality, setImageQuality] = useState("High");
  const [offlineMode, setOfflineMode] = useState(false);

  const [exportFormat, setExportFormat] = useState("PNG");
  const [exportQuality, setExportQuality] = useState("High (1080p)");
  const [autoOrganize, setAutoOrganize] = useState(true);
  const [showTips, setShowTips] = useState(true);
  const [betaFeatures, setBetaFeatures] = useState(false);

  return (
    <div className="px-6 py-8 md:px-10">
      <h1 className="font-display text-2xl text-violet-1">Settings</h1>
      <p className="mt-1 text-ink/70">
        Customize your experience and manage your account preferences.
      </p>

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
        <div>
          {activeTab !== "General" ? (
            <div className="mt-16 flex flex-col items-center text-center text-ink/60">
              <p className="font-display text-xl text-violet-1">{activeTab}</p>
              <p className="mt-2 max-w-sm">Coming soon.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">General Settings</p>

                <div className="mt-2 divide-y divide-violet-3/10">
                  <SettingRow
                    icon={Globe}
                    label="Language"
                    description="Choose your preferred language."
                    control={
                      <Dropdown
                        value={language}
                        options={["English", "Spanish", "French", "German"]}
                        onChange={setLanguage}
                      />
                    }
                  />
                  <SettingRow
                    icon={Clock}
                    label="Timezone"
                    description="Set your local timezone."
                    control={
                      <Dropdown
                        value={timezone}
                        options={[
                          "(UTC-08:00) Pacific Time",
                          "(UTC-05:00) Eastern Time (US & Canada)",
                          "(UTC+00:00) UTC",
                        ]}
                        onChange={setTimezone}
                      />
                    }
                  />
                  <SettingRow
                    icon={Calendar}
                    label="Date Format"
                    description="Choose how dates are displayed."
                    control={
                      <Dropdown
                        value={dateFormat}
                        options={[
                          "May 16, 2025 (MMM D, YYYY)",
                          "16/05/2025 (DD/MM/YYYY)",
                          "05/16/2025 (MM/DD/YYYY)",
                        ]}
                        onChange={setDateFormat}
                      />
                    }
                  />
                  <SettingRow
                    icon={Clock}
                    label="Time Format"
                    description="Choose how times are displayed."
                    control={
                      <SegmentedControl
                        value={timeFormat}
                        options={["12 Hour (AM/PM)", "24 Hour"]}
                        onChange={setTimeFormat}
                      />
                    }
                  />
                  <SettingRow
                    icon={CalendarDays}
                    label="Start Week On"
                    description="Set the first day of the week."
                    control={
                      <Dropdown
                        value={startWeekOn}
                        options={["Sunday", "Monday"]}
                        onChange={setStartWeekOn}
                      />
                    }
                  />
                  <SettingRow
                    icon={LayoutGrid}
                    label="Default Project View"
                    description="Choose your default view when opening projects."
                    control={
                      <SegmentedControl
                        value={projectView}
                        options={["Grid", "List", "Board"]}
                        onChange={setProjectView}
                      />
                    }
                  />
                  <SettingRow
                    icon={CloudUpload}
                    label="Autosave"
                    description="Automatically save your work in real time."
                    control={<Toggle checked={autosave} onChange={setAutosave} />}
                  />
                  <SettingRow
                    icon={Volume2}
                    label="Sounds"
                    description="Enable UI sounds and notifications."
                    control={<Toggle checked={sounds} onChange={setSounds} />}
                  />
                  <SettingRow
                    icon={Sparkles}
                    label="Animations"
                    description="Enable interface animations and transitions."
                    control={
                      <Toggle checked={animations} onChange={setAnimations} />
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
                <p className="text-ink">Performance</p>

                <div className="mt-2 divide-y divide-violet-3/10">
                  <SettingRow
                    icon={ImageIcon}
                    label="Image Quality"
                    description="Set the quality for previews and exports."
                    control={
                      <SegmentedControl
                        value={imageQuality}
                        options={["Low", "Medium", "High"]}
                        onChange={setImageQuality}
                      />
                    }
                  />
                  <SettingRow
                    icon={Database}
                    label="Cache Management"
                    description="Clear temporary files to free up space."
                    control={
                      <button
                        onClick={() => console.log("clear cache")}
                        className="rounded-md border border-violet-2/50 px-4 py-2 text-sm text-violet-1 hover:border-violet-1"
                      >
                        Clear Cache
                      </button>
                    }
                  />
                  <SettingRow
                    icon={WifiOff}
                    label="Offline Mode"
                    description="Work offline and sync when you're back online."
                    control={
                      <Toggle checked={offlineMode} onChange={setOfflineMode} />
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Account</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-2/15 font-display text-violet-1">
                L
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-ink">
                  Luna Designer
                  <span className="rounded-full bg-violet-2/15 px-2 py-0.5 text-xs text-violet-2">
                    Pro
                  </span>
                </p>
                <p className="truncate text-sm text-ink/50">
                  luna.designer@resonance.gg
                </p>
              </div>
            </div>
            <button
              onClick={() => console.log("edit profile")}
              className="mt-4 flex w-full items-center justify-between rounded-lg border border-violet-3/25 px-3 py-2 text-sm text-violet-2 hover:border-violet-2/50"
            >
              <span className="mx-auto flex items-center gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit Profile
              </span>
            </button>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Preferences</p>
            <div className="mt-2 divide-y divide-violet-3/10">
              <SettingRow
                icon={Download}
                label="Default Export Format"
                description="Choose the default file type for exports."
                control={
                  <Dropdown
                    value={exportFormat}
                    options={["PNG", "JPG", "SVG", "PDF"]}
                    onChange={setExportFormat}
                  />
                }
              />
              <SettingRow
                icon={ImageIcon}
                label="Default Export Quality"
                description="Choose the default quality for exports."
                control={
                  <Dropdown
                    value={exportQuality}
                    options={["Low (480p)", "Medium (720p)", "High (1080p)", "Max (4K)"]}
                    onChange={setExportQuality}
                  />
                }
              />
              <SettingRow
                icon={Sparkles}
                label="Auto-Organize Assets"
                description="Automatically organize assets on upload."
                control={
                  <Toggle checked={autoOrganize} onChange={setAutoOrganize} />
                }
              />
              <SettingRow
                icon={Sparkles}
                label="Show Tips"
                description="Show helpful tips and suggestions."
                control={<Toggle checked={showTips} onChange={setShowTips} />}
              />
              <SettingRow
                icon={Sparkles}
                label="Beta Features"
                description="Enable experimental features."
                control={
                  <Toggle checked={betaFeatures} onChange={setBetaFeatures} />
                }
              />
            </div>
            <button
              onClick={() => console.log("manage preferences")}
              className="mt-4 flex items-center gap-1.5 text-sm text-violet-2 hover:text-violet-1"
            >
              Manage Preferences
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
            <p className="text-ink">Data &amp; Privacy</p>
            <div className="mt-3 flex flex-col gap-3">
              <button
                onClick={() => console.log("export my data")}
                className="flex items-center gap-3 text-left"
              >
                <Download className="h-4 w-4 shrink-0 text-ink/50" />
                <span>
                  <span className="block text-sm text-ink">
                    Export My Data
                  </span>
                  <span className="block text-sm text-ink/50">
                    Download a copy of your data.
                  </span>
                </span>
              </button>
              <button
                onClick={() => console.log("import data")}
                className="flex items-center gap-3 text-left"
              >
                <Upload className="h-4 w-4 shrink-0 text-ink/50" />
                <span>
                  <span className="block text-sm text-ink">Import Data</span>
                  <span className="block text-sm text-ink/50">
                    Import projects and data.
                  </span>
                </span>
              </button>
              <button
                onClick={() => console.log("privacy policy")}
                className="flex items-center gap-3 text-left"
              >
                <Shield className="h-4 w-4 shrink-0 text-ink/50" />
                <span className="flex-1">
                  <span className="block text-sm text-ink">
                    Privacy Policy
                  </span>
                  <span className="block text-sm text-ink/50">
                    Read our privacy policy.
                  </span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-ink/40" />
              </button>
              <button
                onClick={() => console.log("terms of service")}
                className="flex items-center gap-3 text-left"
              >
                <ExternalLink className="h-4 w-4 shrink-0 text-ink/50" />
                <span className="flex-1">
                  <span className="block text-sm text-ink">
                    Terms of Service
                  </span>
                  <span className="block text-sm text-ink/50">
                    Read our terms of service.
                  </span>
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/25 bg-bg-1 p-5">
            <p className="text-red-400">Danger Zone</p>
            <button
              onClick={() => console.log("delete account")}
              className="mt-3 flex w-full items-center justify-between text-left"
            >
              <span>
                <span className="block text-sm text-red-400">
                  Delete Account
                </span>
                <span className="block text-sm text-ink/50">
                  Permanently delete your account and all data.
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
