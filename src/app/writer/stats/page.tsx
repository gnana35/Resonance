"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Flame,
  PenLine,
} from "lucide-react";
import {
  ACHIEVEMENTS,
  STORY_HEALTH,
  WEEK_STREAK,
  WORDS_BY_TYPE,
  WORDS_OVER_TIME,
  WRITING_BY_DAY,
} from "@/data/stats";

const TOTAL_WORDS_BY_TYPE = WORDS_BY_TYPE.reduce((s, t) => s + t.value, 0);

const chartTooltipStyle = {
  backgroundColor: "#0a0e1c",
  border: "1px solid rgba(138,106,47,0.4)",
  borderRadius: 8,
  fontSize: 12,
  color: "#cfd6e6",
};

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof PenLine;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="rounded-xl border border-gold-3/25 bg-bg-1 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/60">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-2/10 text-gold-2">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-display text-2xl text-ink">{value}</p>
      <p className="mt-1 text-sm text-emerald-400/80">{delta}</p>
    </div>
  );
}

export default function Stats() {
  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-gold-1">Stats</h1>
          <p className="mt-1 text-ink/70">
            Track your writing progress and story health.
          </p>
        </div>
        <button
          onClick={() => console.log("change date range")}
          className="flex items-center gap-2 rounded-md border border-gold-3/30 px-3 py-1.5 text-sm text-ink hover:border-gold-2/50"
        >
          <Calendar className="h-3.5 w-3.5" />
          May 10 – May 16, 2025
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={PenLine}
          label="Total Words"
          value="2,734"
          delta="+ 320 from yesterday"
        />
        <StatCard
          icon={BarChart3}
          label="Daily Average"
          value="391"
          delta="+ 48 vs last 7 days"
        />
        <StatCard
          icon={Clock}
          label="Total Time Writing"
          value="8h 42m"
          delta="+ 1h 12m vs last 7 days"
        />
        <StatCard
          icon={FileText}
          label="Documents"
          value="14"
          delta="+ 2 new this week"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="font-display text-lg text-gold-1">
                Words Over Time
              </p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={WORDS_OVER_TIME}>
                    <defs>
                      <linearGradient id="wordsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d9a84e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#d9a84e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#8a6a2f22" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#cfd6e6", fontSize: 11 }}
                      axisLine={{ stroke: "#8a6a2f33" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#cfd6e6", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="words"
                      stroke="#d9a84e"
                      strokeWidth={2}
                      fill="url(#wordsFill)"
                      dot={{ r: 3, fill: "#d9a84e" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="font-display text-lg text-gold-1">
                Words by Type
              </p>
              <div className="relative mt-2 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={WORDS_BY_TYPE}
                      dataKey="value"
                      nameKey="type"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {WORDS_BY_TYPE.map((entry) => (
                        <Cell key={entry.type} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-display text-xl text-gold-1">
                    {TOTAL_WORDS_BY_TYPE.toLocaleString()}
                  </p>
                  <p className="text-xs text-ink/50">Total</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                {WORDS_BY_TYPE.map((entry) => (
                  <div
                    key={entry.type}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2 text-ink/70">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      {entry.type}
                    </span>
                    <span className="text-ink/50">
                      {Math.round((entry.value / TOTAL_WORDS_BY_TYPE) * 100)}%
                      ({entry.value.toLocaleString()})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px_320px]">
            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="font-display text-lg text-gold-1">
                Writing by Day
              </p>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={WRITING_BY_DAY}>
                    <CartesianGrid stroke="#8a6a2f22" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#cfd6e6", fontSize: 11 }}
                      axisLine={{ stroke: "#8a6a2f33" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#cfd6e6", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={chartTooltipStyle}
                      cursor={{ fill: "#a78bfa11" }}
                    />
                    <Bar dataKey="words" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
              <p className="font-display text-lg text-gold-1">Story Health</p>
              <p className="mt-1 text-sm text-ink/60">
                AI analysis of your story based on continuity, pacing, and
                balance.
              </p>
              <div className="mt-5 flex flex-col gap-4">
                {STORY_HEALTH.map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink/70">{metric.label}</span>
                      <span className="text-ink">{metric.value}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-0">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${metric.value}%`,
                          backgroundColor: metric.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => console.log("view full story health report")}
                className="mt-6 w-full rounded-full border border-gold-2/50 py-2 text-sm text-gold-2 transition-colors hover:border-gold-1 hover:text-gold-1"
              >
                View Full Story Health Report
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <div className="flex items-center gap-2 text-ink">
              <Flame className="h-4 w-4 text-gold-2" />
              Writing Streak
            </div>
            <p className="mt-3 font-display text-2xl text-gold-1">7 days</p>
            <p className="text-sm text-ink/60">Keep the momentum going!</p>

            <div className="mt-4 flex justify-between">
              {WEEK_STREAK.map((day, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 text-xs text-ink/50"
                >
                  <span>{day.label}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      day.done
                        ? "bg-gold-2 text-bg-0"
                        : "border border-ink/30"
                    }`}
                  >
                    {day.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gold-3/15 pt-4 text-sm">
              <div>
                <p className="text-ink/50">Longest Streak</p>
                <p className="mt-1 text-ink">21 days</p>
              </div>
              <div>
                <p className="text-ink/50">Total Writing Days</p>
                <p className="mt-1 text-ink">38</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gold-3/25 bg-bg-1 p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg text-gold-1">Achievements</p>
              <button
                onClick={() => console.log("view all achievements")}
                className="text-sm text-gold-2 hover:text-gold-1"
              >
                View all
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {ACHIEVEMENTS.map((achievement) => (
                <div key={achievement.id} className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      achievement.unlockedDate
                        ? "bg-gold-2/15 text-gold-2"
                        : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    <Award className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{achievement.title}</p>
                    <p className="text-sm text-ink/50">
                      {achievement.description}
                    </p>
                    {achievement.unlockedDate ? (
                      <p className="mt-0.5 text-xs text-ink/40">
                        Unlocked {achievement.unlockedDate}
                      </p>
                    ) : achievement.progress ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-0">
                          <div
                            className="h-full rounded-full bg-gold-2"
                            style={{
                              width: `${
                                (achievement.progress.current /
                                  achievement.progress.target) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-xs text-ink/40">
                          {achievement.progress.current}/
                          {achievement.progress.target}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {achievement.unlockedDate && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
