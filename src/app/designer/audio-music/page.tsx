"use client";

import { useMemo, useState } from "react";
import {
  AudioWaveform,
  Download,
  Heart,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Target,
  Volume2,
} from "lucide-react";
import {
  AUDIO_FILTERS,
  AUDIO_QUICK_TOOLS,
  AUDIO_TRACKS,
  MUSIC_THEME_CARDS,
  PLAYLISTS,
  RECENTLY_PLAYED_IDS,
  type AudioFilter,
} from "@/data/designer";
import { PlaceholderImage } from "@/components/PlaceholderImage";

const TOOL_ICONS: Record<string, typeof Sparkles> = {
  "ai-music-generator": Sparkles,
  "stinger-generator": AudioWaveform,
  "loop-builder": Repeat,
  "bpm-finder": Target,
};

const FIRST_TRACK = AUDIO_TRACKS[0];

export default function AudioMusic() {
  const [filter, setFilter] = useState<AudioFilter>("All");
  const [nowPlayingId, setNowPlayingId] = useState(FIRST_TRACK.id);
  const [isPlaying, setIsPlaying] = useState(false);

  const nowPlaying =
    AUDIO_TRACKS.find((t) => t.id === nowPlayingId) ?? FIRST_TRACK;

  const filteredTracks = useMemo(
    () =>
      filter === "All"
        ? AUDIO_TRACKS
        : AUDIO_TRACKS.filter((t) => t.type === filter),
    [filter],
  );

  const recentlyPlayed = useMemo(
    () =>
      RECENTLY_PLAYED_IDS.map((id) => AUDIO_TRACKS.find((t) => t.id === id)).filter(
        (t): t is (typeof AUDIO_TRACKS)[number] => Boolean(t),
      ),
    [],
  );

  function playTrack(id: string) {
    if (id === nowPlayingId) {
      setIsPlaying((v) => !v);
    } else {
      setNowPlayingId(id);
      setIsPlaying(true);
    }
  }

  function skip(direction: 1 | -1) {
    const idx = AUDIO_TRACKS.findIndex((t) => t.id === nowPlayingId);
    const nextIdx =
      (idx + direction + AUDIO_TRACKS.length) % AUDIO_TRACKS.length;
    setNowPlayingId(AUDIO_TRACKS[nextIdx].id);
    setIsPlaying(true);
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col">
      <div className="flex-1 px-6 py-8 md:px-10">
        <h1 className="font-display text-2xl text-violet-1">Audio &amp; Music</h1>
        <p className="mt-1 text-ink/70">
          Find, preview, and manage all your audio assets. Set the perfect
          mood for your world.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-8">
            <div>
              <p className="text-ink">Music Themes</p>
              <p className="text-sm text-ink/50">
                Curated themes to spark inspiration.
              </p>
              <div className="mt-4 flex gap-4 overflow-x-auto pb-1">
                {MUSIC_THEME_CARDS.map((theme) => (
                  <div key={theme.id} className="w-48 shrink-0">
                    <PlaceholderImage
                      seed={theme.id}
                      className="h-28 w-48 rounded-lg"
                    />
                    <p className="mt-2 text-ink">{theme.title}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {theme.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-violet-2/10 px-2 py-0.5 text-xs text-violet-2"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-ink/50">
                      {theme.trackCount} tracks
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-ink">Quick Tools</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {AUDIO_QUICK_TOOLS.map((tool) => {
                  const Icon = TOOL_ICONS[tool.id] ?? Sparkles;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => console.log("open tool", tool.id)}
                      className="flex items-start gap-3 rounded-xl border border-violet-3/25 bg-bg-1 p-4 text-left transition-colors hover:border-violet-2/50"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-2" />
                      <span>
                        <span className="block text-sm text-ink">
                          {tool.title}
                        </span>
                        <span className="block text-xs text-ink/50">
                          {tool.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-ink">All Audio</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {AUDIO_FILTERS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                      filter === f
                        ? "bg-violet-2 text-bg-0"
                        : "bg-bg-1 text-ink/70 hover:text-ink"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-violet-3/25 bg-bg-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-violet-3/20 text-ink/50">
                      <th className="px-4 py-3 font-normal">Track</th>
                      <th className="px-4 py-3 font-normal">Mood</th>
                      <th className="px-4 py-3 font-normal">BPM / Key</th>
                      <th className="px-4 py-3 font-normal">Duration</th>
                      <th className="px-4 py-3 font-normal">Date Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTracks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-ink/50">
                          No tracks in this category yet.
                        </td>
                      </tr>
                    ) : (
                      filteredTracks.map((track) => {
                        const active = track.id === nowPlayingId;
                        return (
                          <tr
                            key={track.id}
                            className="border-b border-violet-3/10 last:border-0"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => playTrack(track.id)}
                                  aria-label={
                                    active && isPlaying
                                      ? `Pause ${track.title}`
                                      : `Play ${track.title}`
                                  }
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-2/15 text-violet-1 hover:bg-violet-2/25"
                                >
                                  {active && isPlaying ? (
                                    <Pause className="h-3.5 w-3.5" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <PlaceholderImage
                                  seed={track.id}
                                  className="h-8 w-8 shrink-0 rounded-md"
                                />
                                <div className="min-w-0">
                                  <p
                                    className={`truncate ${active ? "text-violet-1" : "text-ink"}`}
                                  >
                                    {track.title}
                                  </p>
                                  <p className="truncate text-xs text-ink/40">
                                    {track.artist}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5">
                                {track.mood.map((m) => (
                                  <span
                                    key={m}
                                    className="rounded-full bg-violet-2/10 px-2 py-0.5 text-xs text-violet-2"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-ink/70">
                              {track.bpmKey ?? "–"}
                            </td>
                            <td className="px-4 py-3 text-ink/70">
                              {track.duration}
                            </td>
                            <td className="px-4 py-3 text-ink/70">
                              {track.dateAdded}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
              <div className="flex items-center justify-between">
                <p className="text-ink">Recently Played</p>
                <button
                  onClick={() => console.log("view all recently played")}
                  className="text-sm text-violet-2 hover:text-violet-1"
                >
                  View all
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {recentlyPlayed.map((track) => {
                  const active = track.id === nowPlayingId;
                  return (
                    <button
                      key={track.id}
                      onClick={() => playTrack(track.id)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-violet-2/5"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-2/15 text-violet-1">
                        {active && isPlaying ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${active ? "text-violet-1" : "text-ink"}`}
                        >
                          {track.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink/40">
                        {track.duration}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-3/25 bg-bg-1 p-5">
              <div className="flex items-center justify-between">
                <p className="text-ink">My Playlists</p>
                <button
                  onClick={() => console.log("new playlist")}
                  aria-label="New playlist"
                  className="text-ink/50 hover:text-ink"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {PLAYLISTS.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => console.log("open playlist", playlist.id)}
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-violet-2/5"
                  >
                    <span className="truncate text-ink">{playlist.name}</span>
                    <span className="shrink-0 text-ink/40">
                      {playlist.trackCount} tracks
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-4 border-t border-violet-3/25 bg-bg-1 px-6 py-3 md:px-10">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none sm:w-56">
          <PlaceholderImage
            seed={nowPlaying.id}
            className="h-10 w-10 shrink-0 rounded-md"
          />
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{nowPlaying.title}</p>
            <p className="truncate text-xs text-ink/50">{nowPlaying.artist}</p>
          </div>
          <button
            onClick={() => console.log("favorite", nowPlaying.id)}
            aria-label="Favorite"
            className="ml-1 shrink-0 text-ink/40 hover:text-violet-1"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => console.log("shuffle")}
              aria-label="Shuffle"
              className="text-ink/50 hover:text-ink"
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={() => skip(-1)}
              aria-label="Previous track"
              className="text-ink/70 hover:text-ink"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsPlaying((v) => !v)}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-2 text-bg-0 hover:bg-violet-1"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => skip(1)}
              aria-label="Next track"
              className="text-ink/70 hover:text-ink"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              onClick={() => console.log("repeat")}
              aria-label="Repeat"
              className="text-ink/50 hover:text-ink"
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 text-xs text-ink/40">
            <span>00:00</span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-0">
              <div className="h-full w-1/3 rounded-full bg-violet-2" />
            </div>
            <span>{nowPlaying.duration}</span>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex sm:w-40">
          <Volume2 className="h-4 w-4 shrink-0 text-ink/50" />
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-0">
            <div className="h-full w-2/3 rounded-full bg-violet-2" />
          </div>
        </div>

        <button
          onClick={() => console.log("queue")}
          aria-label="Download"
          className="hidden shrink-0 text-ink/50 hover:text-ink sm:block"
        >
          <Download className="h-4 w-4" />
        </button>
        <button
          onClick={() => console.log("more")}
          aria-label="More options"
          className="hidden shrink-0 text-ink/50 hover:text-ink sm:block"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
