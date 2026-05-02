// Server-safe helpers for resolving the reception moment timeline.
// Used by reception-section.tsx (client), the print route (server), and
// booklet-generator.tsx (client). No "use client" — pure logic.

import type {
  ReceptionData,
  MomentExtras,
  CustomReceptionMoment,
  ScheduleData,
  ScheduleEntry,
} from "./types";
import {
  RECEPTION_MOMENT_IDS,
  RECEPTION_TOSS_IDS,
  RECEPTION_MOMENT_TITLES,
} from "./types";
import { getPhase } from "@/lib/day-of/phase";

// ── Schedule ↔ Reception moment matching ───────────────────────────────

/**
 * Keyword lists for fuzzy-matching a built-in Reception moment to a
 * Schedule entry by title. First-match wins. Case-insensitive.
 */
const MOMENT_SCHEDULE_KEYWORDS: Record<string, string[]> = {
  grand_entrance: ["grand entrance"],
  first_dance: ["first dance"],
  dinner: ["dinner"],
  parent_dances: ["parent dance"],
  speeches: ["speech", "toast"],
  cake_cutting: ["cake cut", "cake"],
  last_dance: ["last dance"],
  exit: ["exit", "send-off", "send off"],
  bouquet_toss: ["bouquet toss"],
  garter_toss: ["garter toss"],
  anniversary_dance: ["anniversary dance"],
  shoe_game: ["shoe game"],
  slideshow: ["slideshow", "photo montage", "montage"],
  dessert_bar: ["dessert bar", "dessert table", "sweet table"],
};

/**
 * Find the Schedule entry that best matches a given reception moment id.
 * Returns undefined if no Schedule is provided or no entry matches.
 */
export function findScheduleEntryForMoment(
  momentId: string,
  schedule: ScheduleData | undefined
): ScheduleEntry | undefined {
  if (!schedule?.entries?.length) return undefined;
  const keywords = MOMENT_SCHEDULE_KEYWORDS[momentId];
  if (!keywords) return undefined;
  for (const entry of schedule.entries) {
    const title = (entry.title || "").toLowerCase();
    for (const kw of keywords) {
      if (title.includes(kw)) return entry;
    }
  }
  return undefined;
}

/**
 * Resolve the effective time for a reception moment. Priority:
 *   1. Matching Schedule entry's time (Schedule is master)
 *   2. `moment_extras[id].time` fallback
 */
export function effectiveMomentTime(
  momentId: string,
  reception: ReceptionData,
  schedule: ScheduleData | undefined
): string | undefined {
  const fromSchedule = findScheduleEntryForMoment(momentId, schedule)?.time;
  if (fromSchedule?.trim()) return fromSchedule.trim();
  return reception.moment_extras?.[momentId]?.time;
}

export interface ResolvedMoment {
  id: string;
  title: string;
  time?: string;
  extras?: MomentExtras;
  /** True if this is a user-added custom moment (rather than a built-in). */
  isCustom: boolean;
  /** The custom moment source, when `isCustom`. */
  custom?: CustomReceptionMoment;
  /** True if sourced from a user-added Schedule entry (Phase 3) — title +
   *  time come from Schedule; details live in moment_extras keyed by entry id. */
  isScheduleCustom?: boolean;
}

function parseTime(t: string | undefined): number {
  if (!t) return NaN;
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (!match) return NaN;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Resolve the full reception timeline — built-ins + toggled tosses + custom
 * moments — in the order they should display. Honors `moment_order` first,
 * then sorts by `time`, then falls back to built-in chronological order.
 */
export function resolveReceptionMoments(
  data: ReceptionData,
  schedule?: ScheduleData
): ResolvedMoment[] {
  // Built-ins + tosses are visible only when a matching Schedule entry
  // exists. Schedule is the single source of truth — to remove a moment,
  // delete its Schedule entry; to bring it back, re-add in Schedule.
  // The legacy `hidden_moments` field is ignored (preserved in data
  // for backward compat but no longer read).
  const builtInIds: string[] = RECEPTION_MOMENT_IDS.filter(
    (id) => findScheduleEntryForMoment(id, schedule) !== undefined
  );
  const tossIds: string[] = RECEPTION_TOSS_IDS.filter(
    (id) => findScheduleEntryForMoment(id, schedule) !== undefined
  );
  const customs = data.custom_moments || [];
  const customIds = customs.map((c) => c.id);

  // Phase 3: Schedule entries the user added directly that aren't
  // matched by any built-in/toss keyword and aren't already a
  // custom_moment. These get rendered as generic cards so anything
  // the couple types in Schedule shows up in Reception.
  const matchedEntryIds = new Set<string>();
  for (const id of [...builtInIds, ...tossIds]) {
    const e = findScheduleEntryForMoment(id, schedule);
    if (e) matchedEntryIds.add(e.id);
  }
  const customIdSet = new Set(customIds);
  const scheduleCustomIds: string[] = (schedule?.entries || [])
    .filter((e) => {
      if (matchedEntryIds.has(e.id)) return false;
      if (customIdSet.has(e.id)) return false;
      const phase = getPhase(e);
      return phase === "reception" || phase === "dancing & send-off";
    })
    .map((e) => e.id);

  const all = [...builtInIds, ...tossIds, ...customIds, ...scheduleCustomIds];

  // Apply saved moment_order if any (filter + append missing)
  let ordered: string[];
  if (data.moment_order && data.moment_order.length > 0) {
    const saved = data.moment_order.filter((id) => all.includes(id));
    const missing = all.filter((id) => !saved.includes(id));
    ordered = [...saved, ...missing];
  } else {
    // Stable sort: time-set first (asc), time-unset keep initial order.
    // Prefer Schedule-derived time over local moment_extras.time.
    const indexed = all.map((id, i) => ({
      id,
      i,
      t: parseTime(
        findScheduleEntryForMoment(id, schedule)?.time ||
          data.moment_extras?.[id]?.time ||
          customs.find((c) => c.id === id)?.time
      ),
    }));
    indexed.sort((a, b) => {
      const aHas = !isNaN(a.t);
      const bHas = !isNaN(b.t);
      if (aHas && bHas) return a.t - b.t;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return a.i - b.i;
    });
    ordered = indexed.map((x) => x.id);
  }

  const scheduleCustomSet = new Set(scheduleCustomIds);
  return ordered.map((id) => {
    const custom = customs.find((c) => c.id === id);
    if (custom) {
      const { time, music_needed, mc_needed, mc_line, guest_action, notes } = custom;
      return {
        id,
        title: custom.title || "Untitled moment",
        time: custom.time,
        extras: { time, music_needed, mc_needed, mc_line, guest_action, notes },
        isCustom: true,
        custom,
      };
    }
    // Schedule-custom (Phase 3): Schedule entry that isn't a known
    // built-in/toss/custom. Title + time come from Schedule; song/MC/notes
    // live in moment_extras keyed by the entry id.
    if (scheduleCustomSet.has(id)) {
      const entry = (schedule?.entries || []).find((e) => e.id === id);
      const extras = data.moment_extras?.[id];
      return {
        id,
        title: extras?.display_title?.trim() || entry?.title || "Untitled moment",
        time: entry?.time?.trim() || extras?.time,
        extras,
        isCustom: false,
        isScheduleCustom: true,
      };
    }
    const extras = data.moment_extras?.[id];
    const stockTitle =
      RECEPTION_MOMENT_TITLES[id as keyof typeof RECEPTION_MOMENT_TITLES] ?? id;
    // Honor display_title override if set
    const title = extras?.display_title?.trim() || stockTitle;
    // Prefer the Schedule-derived time (Schedule is master); fall back to local.
    const scheduleTime = findScheduleEntryForMoment(id, schedule)?.time;
    const effectiveTime = scheduleTime?.trim() || extras?.time;
    return {
      id,
      title,
      time: effectiveTime,
      extras,
      isCustom: false,
    };
  });
}
