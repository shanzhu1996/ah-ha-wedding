/**
 * Phase detection + grouping for Day-of schedule entries.
 *
 * Shared between the on-screen Schedule editor (schedule-section.tsx) and
 * the printable brief (day-of-details/print/page.tsx) so the same chronological
 * structure shows in both surfaces. Keeping a single source-of-truth
 * prevents the two views from drifting apart.
 *
 * Phase labels are lowercase ("getting ready", "ceremony", ...) — the
 * rendering code applies any uppercase/title-case transformation.
 */

import type { ScheduleEntry } from "@/components/day-of-details/types";

export type PhaseLabel =
  | "getting ready"
  | "tea ceremony"
  | "ceremony"
  | "cocktail hour"
  | "reception"
  | "dancing & send-off"
  | "other";

export interface PhaseBlock {
  label: string;
  startIndex: number;
  /** Inclusive — entries[startIndex..endIndex] all share this phase. */
  endIndex: number;
}

/**
 * Classify a single entry. Order of checks matters:
 *   1. tea ceremony — must precede generic "ceremony" since
 *      t.includes("ceremony") would otherwise swallow it.
 *   2. getting ready — hair/makeup/photographer arrival/etc.
 *   3. ceremony — vows, formal photos, "private moment", etc.
 *   4. cocktail hour
 *   5. dancing & send-off — terminal phase keywords first.
 *   6. reception — dinner/speeches/toasts (broader catch-all).
 *
 * Falls through to "" for entries that don't match any pattern.
 */
export function getPhase(entry: ScheduleEntry): string {
  const t = entry.title.toLowerCase();
  const s = entry.linkedSection;
  if (s === "tea_ceremony" || t.includes("tea ceremony")) return "tea ceremony";
  if (
    s === "getting_ready" ||
    t.includes("hair") ||
    t.includes("makeup") ||
    t.includes("detail shot") ||
    t.includes("first look") ||
    t.includes("photographer arrive") ||
    t.includes("portrait") ||
    (t.includes("photo") &&
      !t.includes("ceremony") &&
      !t.includes("formal"))
  )
    return "getting ready";
  if (
    s === "ceremony" ||
    t.includes("ceremony") ||
    t.includes("guests arrive") ||
    t.includes("family formal") ||
    t.includes("private moment")
  )
    return "ceremony";
  if (s === "cocktail" || t.includes("cocktail")) return "cocktail hour";
  if (
    t.includes("open danc") ||
    t.includes("last dance") ||
    t.includes("exit") ||
    t.includes("send-off") ||
    t.includes("send off")
  )
    return "dancing & send-off";
  if (
    s === "reception" ||
    t.includes("dinner") ||
    t.includes("speech") ||
    t.includes("toast") ||
    t.includes("entrance") ||
    t.includes("cake") ||
    t.includes("dance")
  )
    return "reception";
  return "";
}

/**
 * Group consecutive entries that share a phase into blocks. Empty/unrecognized
 * entries fall into label="other"; consumers may choose to suppress its
 * heading entirely.
 */
export function getPhaseBlocks(entries: ScheduleEntry[]): PhaseBlock[] {
  const blocks: PhaseBlock[] = [];
  let current: PhaseBlock | null = null;
  for (let i = 0; i < entries.length; i++) {
    const phase = getPhase(entries[i]);
    if (!current || phase !== current.label) {
      if (current) blocks.push(current);
      current = { label: phase || "other", startIndex: i, endIndex: i };
    } else {
      current.endIndex = i;
    }
  }
  if (current) blocks.push(current);
  return blocks;
}
