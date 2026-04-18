// Enrichment: pull secondary-text from other sections onto a schedule entry.
// Server-safe (no "use client"). Used by schedule-section.tsx + the print
// route + future vendor-booklet exports.

import type {
  ScheduleEntry,
  ReceptionData,
  CeremonyData,
  GettingReadyData,
} from "./types";
import { speechesTotalMinutes } from "./types";

export interface ScheduleEnrichmentContext {
  reception?: ReceptionData;
  ceremony?: CeremonyData;
  getting_ready?: GettingReadyData;
}

function songLine(song?: string, artist?: string): string | null {
  const s = song?.trim();
  const a = artist?.trim();
  if (s && a) return `${s} · ${a}`;
  return s || a || null;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Return a short subtitle pulled from other section data, or null if nothing
 * relevant is filled in. Matching uses `linkedSection` + title keywords.
 */
export function enrichScheduleEntry(
  entry: ScheduleEntry,
  ctx: ScheduleEnrichmentContext
): string | null {
  const t = (entry.title || "").toLowerCase();
  const r = ctx.reception;
  const c = ctx.ceremony;
  const g = ctx.getting_ready;

  if (t.includes("first dance") && r) {
    const line = songLine(r.first_dance_song, r.first_dance_artist);
    if (line) return line;
  }

  if (t.includes("cake cut") && r?.cake_cutting_song?.trim()) {
    return r.cake_cutting_song.trim();
  }

  if ((t.includes("exit") || t.includes("send-off") || t.includes("send off")) && r) {
    const style =
      r.exit_style && r.exit_style !== "none"
        ? capitalize(r.exit_style.replace(/_/g, " "))
        : null;
    const song = r.exit_song?.trim() || null;
    const parts = [style, song].filter(Boolean);
    if (parts.length) return parts.join(" · ");
  }

  if (t.includes("last dance") && r) {
    const line = songLine(r.last_dance_song, r.last_dance_artist);
    if (line) return line;
  }

  if (t.includes("grand entrance") && r?.grand_entrance_song?.trim()) {
    return r.grand_entrance_song.trim();
  }

  if (t.includes("parent dance") && r?.parent_dances?.length) {
    const meaningful = r.parent_dances.filter(
      (d) => d.who?.trim() || d.song?.trim()
    );
    if (meaningful.length) {
      return `${meaningful.length} dance${meaningful.length > 1 ? "s" : ""}`;
    }
  }

  if ((t.includes("speech") || t.includes("toast")) && r?.speeches?.length) {
    const named = r.speeches.filter((s) => s.speaker?.trim());
    const count = named.length || r.speeches.length;
    const total = speechesTotalMinutes(r.speeches);
    return `${count} speaker${count > 1 ? "s" : ""} · ~${total} min total`;
  }

  if (t.includes("processional") && c?.processional?.length) {
    const named = c.processional.filter((p) => p.name?.trim());
    if (named.length) {
      const preview = named.slice(0, 3).map((p) => p.name).join(", ");
      const suffix = named.length > 3 ? "…" : "";
      return `${named.length} people: ${preview}${suffix}`;
    }
  }

  if (t.includes("first look") && g?.first_look) {
    const parts: string[] = [];
    if (g.first_look_time?.trim()) parts.push(g.first_look_time.trim());
    if (g.first_look_location?.trim()) parts.push(g.first_look_location.trim());
    if (parts.length) return parts.join(" · ");
  }

  return null;
}
