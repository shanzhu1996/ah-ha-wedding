"use client";

import Link from "next/link";
import { Music, ArrowUpRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeddingSong } from "./day-stepper";

interface Props {
  /** The Music tab phase this moment maps to (e.g., "grand_entrance"). */
  phase: string;
  /** Full song list, pre-fetched server-side. */
  songs: WeddingSong[];
  /** How many songs are expected — drives the empty-state copy. */
  expected?: "single" | "playlist";
  /** Override the placeholder label (e.g., "Entrance song"). */
  label?: string;
  /** Hint shown inline with the label, e.g., "you walk in to this". */
  hint?: string;
}

/**
 * Read-only display of song(s) for a reception moment, pulling from the
 * Music tab's `wedding_songs` table. Clicking jumps to the Music tab
 * deep-linked to the correct phase.
 *
 * Three visual states:
 *   - Single filled: ♪ "Song title" · Artist  ↗ Edit in Music
 *   - Playlist:      ♪ 12 songs planned       ↗ Manage in Music
 *   - Empty:         ♪ No song set            ↗ Add in Music tab
 */
export function MusicLink({
  phase,
  songs,
  expected = "single",
  label,
  hint,
}: Props) {
  const phaseSongs = songs
    .filter((s) => s.phase === phase && !s.is_do_not_play)
    .sort((a, b) => a.sort_order - b.sort_order);

  const count = phaseSongs.length;
  const firstSong = phaseSongs[0];

  const href = `/music#${phase}`;

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-baseline gap-2 flex-wrap">
          <Music className="h-[18px] w-[18px] text-primary self-center" />
          <span className="text-[15px] font-semibold text-foreground leading-none">
            {label}
          </span>
          {hint && (
            <span className="text-[13px] text-muted-foreground">— {hint}</span>
          )}
        </div>
      )}

      <Link
        href={href}
        className={cn(
          "group/music-link flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
          count > 0
            ? "border-primary/30 bg-primary/[0.04] hover:border-primary/60"
            : "border-dashed border-border/80 bg-background hover:border-primary/40"
        )}
      >
        {count === 0 ? (
          <>
            <Plus className="h-4 w-4 text-muted-foreground/70" />
            <span className="text-sm text-muted-foreground flex-1">
              {expected === "playlist"
                ? "No songs planned yet"
                : "No song set"}
            </span>
          </>
        ) : expected === "single" && count === 1 && firstSong ? (
          <>
            <span className="text-sm font-medium text-foreground truncate flex-1">
              &ldquo;{firstSong.song_title}&rdquo;
              {firstSong.artist?.trim() && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {firstSong.artist.trim()}
                </span>
              )}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-foreground flex-1">
              <span className="font-medium tabular-nums">{count}</span>{" "}
              <span className="text-muted-foreground">
                {count === 1 ? "song planned" : "songs planned"}
              </span>
              {expected === "single" && count > 1 && (
                <span className="text-[11px] text-muted-foreground/70 ml-2">
                  · usually 1 is expected
                </span>
              )}
            </span>
          </>
        )}

        <span className="inline-flex items-center gap-1 text-xs text-primary/70 group-hover/music-link:text-primary transition-colors shrink-0">
          {count === 0
            ? "Add in Music"
            : expected === "playlist"
            ? "Manage"
            : "Edit"}
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </Link>
    </div>
  );
}

/**
 * Compact helper for building the summary chip shown on the collapsed pill.
 * Returns the song/playlist summary string for a phase, or null when empty.
 */
export function summarizeSongs(
  phase: string,
  songs: WeddingSong[],
  expected: "single" | "playlist" = "single"
): string | null {
  const phaseSongs = songs.filter(
    (s) => s.phase === phase && !s.is_do_not_play
  );
  if (phaseSongs.length === 0) return null;
  if (expected === "single" && phaseSongs.length === 1) {
    const s = phaseSongs[0];
    const text = s.artist?.trim()
      ? `${s.song_title} · ${s.artist.trim()}`
      : s.song_title;
    return `♪ ${text}`;
  }
  return `♪ ${phaseSongs.length} song${phaseSongs.length > 1 ? "s" : ""}`;
}
