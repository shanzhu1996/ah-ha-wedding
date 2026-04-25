"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Plus, Sparkles, Clock, Pencil, RefreshCw, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  type ScheduleData,
  type ScheduleEntry,
  generateSuggestedTimeline,
  subtractMinutes,
  type SectionKey,
} from "./types";
import {
  enrichScheduleEntry,
  type ScheduleEnrichmentContext,
} from "./schedule-enrichment";
import { getPhaseBlocks, type PhaseBlock } from "@/lib/day-of/phase";

// Phase detection + grouping moved to lib/day-of/phase.ts so the print
// brief can apply the exact same chronological structure.

// ── Duration helper ────────────────────────────────────────────────────

function calcDuration(a: string, b: string): string | null {
  const t1 = parseTime(a);
  const t2 = parseTime(b);
  if (t1 === null || t2 === null) return null;
  const diff = t2 - t1;
  if (diff <= 0 || diff > 360) return null;
  if (diff < 60) return `${diff}m`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parseTime(t: string): number | null {
  if (!t) return null;
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

/** Parse loose time input and format as "H:MM AM/PM" */
function formatTimeInput(raw: string): string | null {
  if (!raw.trim()) return null;
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");

  // Extract am/pm hint
  let period: "AM" | "PM" | null = null;
  let cleaned = s;
  if (s.endsWith("am") || s.endsWith("a")) {
    period = "AM";
    cleaned = s.replace(/a(m)?$/, "");
  } else if (s.endsWith("pm") || s.endsWith("p")) {
    period = "PM";
    cleaned = s.replace(/p(m)?$/, "");
  }

  let h: number;
  let m: number;

  if (cleaned.includes(":")) {
    // "4:15", "16:30"
    const [hStr, mStr] = cleaned.split(":");
    h = parseInt(hStr, 10);
    m = parseInt(mStr || "0", 10);
  } else if (cleaned.length <= 2) {
    // "4", "16"
    h = parseInt(cleaned, 10);
    m = 0;
  } else if (cleaned.length === 3) {
    // "415" → 4:15
    h = parseInt(cleaned[0], 10);
    m = parseInt(cleaned.slice(1), 10);
  } else if (cleaned.length === 4) {
    // "1630" → 16:30, "0415" → 4:15
    h = parseInt(cleaned.slice(0, 2), 10);
    m = parseInt(cleaned.slice(2), 10);
  } else {
    return null;
  }

  if (isNaN(h) || isNaN(m) || m < 0 || m > 59) return null;

  // Handle 24h to 12h conversion
  if (h >= 13 && h <= 23) {
    period = "PM";
    h -= 12;
  } else if (h === 0) {
    period = "AM";
    h = 12;
  } else if (h === 12) {
    period = period || "PM";
  } else if (h >= 1 && h <= 12) {
    // Guess PM for wedding times (most events are afternoon/evening)
    if (!period) period = h >= 7 && h <= 11 ? "AM" : "PM";
  } else {
    return null;
  }

  return `${h}:${m.toString().padStart(2, "0")} ${period}`;
}

// ── Merge helper ───────────────────────────────────────────────────────

interface MergeResult {
  merged: ScheduleEntry[];
  /** IDs of current entries that were preserved (user_touched). */
  keptIds: Set<string>;
  /** IDs of current entries that were dropped in favour of a fresh template. */
  droppedIds: Set<string>;
  /** IDs of fresh entries that are newly inserted (not colliding with a user entry). */
  addedIds: Set<string>;
}

/**
 * Merge a fresh template timeline with the user's current timeline.
 *  - Entries flagged `user_touched=true` survive as-is (kept).
 *  - Untouched current entries are dropped.
 *  - Fresh template entries are added, but skipped if a kept user entry already
 *    occupies the same exact time slot (avoids duplicates).
 */
function mergeTimeline(
  current: ScheduleEntry[],
  fresh: ScheduleEntry[]
): MergeResult {
  const kept = current.filter((e) => e.user_touched === true);
  const dropped = current.filter((e) => e.user_touched !== true);
  const occupied = new Set(kept.map((e) => (e.time || "").trim()).filter(Boolean));
  const freshToInsert = fresh.filter((f) => !occupied.has((f.time || "").trim()));

  const merged = [...kept, ...freshToInsert];
  merged.sort((a, b) => {
    const ta = parseTime(a.time);
    const tb = parseTime(b.time);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });

  return {
    merged,
    keptIds: new Set(kept.map((e) => e.id)),
    droppedIds: new Set(dropped.map((e) => e.id)),
    addedIds: new Set(freshToInsert.map((e) => e.id)),
  };
}

// ── Component ──────────────────────────────────────────────────────────

interface ScheduleSectionProps {
  data: ScheduleData;
  onChange: (data: ScheduleData) => void;
  onNavigate?: (section: SectionKey) => void;
  /** Data from other sections — used to show enriched subtitles under entries. */
  enrichment?: ScheduleEnrichmentContext;
  /** Flag-gated cultural suggestion chips (A4). When true, shows a bottom
   *  chip strip for inserting a Tea Ceremony block. */
  hasTeaCeremony?: boolean;
}

export function ScheduleSection({
  data,
  onChange,
  onNavigate,
  enrichment,
  hasTeaCeremony = false,
}: ScheduleSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingCeremonyTime, setEditingCeremonyTime] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [refreshSummary, setRefreshSummary] = useState<string | null>(null);
  const entries = data.entries || [];
  const hasEntries = entries.length > 0;

  // One-shot cleanup on mount: drop entries that have no title AND no
  // time. These are abandoned drafts from earlier sessions where the
  // couple clicked "+ Add here" and walked away without typing.
  // Without this, they'd keep showing up as ghost "New entry" rows.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const cleaned = entries.filter(
      (e) => e.title.trim() || e.time.trim()
    );
    if (cleaned.length < entries.length) {
      onChange({ ...data, entries: cleaned });
    }
  }, []);
  const hasCeremonyTime = (data.ceremony_time || "").trim().length > 0;
  const phaseBlocks = hasEntries ? getPhaseBlocks(entries) : [];

  // Compute summary stats
  const firstTime = entries.length > 0 ? entries[0].time : null;
  const lastTime = entries.length > 0 ? entries[entries.length - 1].time : null;
  const totalDuration = firstTime && lastTime ? calcDuration(firstTime, lastTime) : null;

  function updateCeremonyTime(value: string) {
    onChange({ ...data, ceremony_time: value });
  }

  function handleCeremonyTimeBlur(rawValue: string) {
    const formatted = formatTimeInput(rawValue);
    if (formatted) onChange({ ...data, ceremony_time: formatted });
  }

  function handleGenerate() {
    // First-time generation: fresh template, nothing to merge.
    const result = generateSuggestedTimeline(data.ceremony_time);
    if (result.length > 0) onChange({ ...data, entries: result });
  }

  /** Silent merge refresh — preserves user_touched entries. */
  function doRefresh() {
    const fresh = generateSuggestedTimeline(data.ceremony_time);
    if (fresh.length === 0) return;
    const { merged, keptIds, droppedIds, addedIds } = mergeTimeline(entries, fresh);
    onChange({ ...data, entries: merged });
    const parts: string[] = [];
    if (keptIds.size) parts.push(`${keptIds.size} kept`);
    if (droppedIds.size) parts.push(`${droppedIds.size} refreshed`);
    if (addedIds.size) parts.push(`${addedIds.size} added`);
    setRefreshSummary(parts.join(" · "));
    // Clear the summary after 4 seconds.
    setTimeout(() => setRefreshSummary(null), 4000);
  }

  /** Compute preview merge without applying it. */
  const previewMerge = useMemo(() => {
    if (!previewOpen) return null;
    const fresh = generateSuggestedTimeline(data.ceremony_time);
    if (fresh.length === 0) return null;
    return mergeTimeline(entries, fresh);
  }, [previewOpen, data.ceremony_time, entries]);

  function acceptPreview() {
    if (previewMerge) {
      onChange({ ...data, entries: previewMerge.merged });
      setRefreshSummary(
        [
          previewMerge.keptIds.size && `${previewMerge.keptIds.size} kept`,
          previewMerge.droppedIds.size && `${previewMerge.droppedIds.size} refreshed`,
          previewMerge.addedIds.size && `${previewMerge.addedIds.size} added`,
        ]
          .filter(Boolean)
          .join(" · ") || null
      );
      setTimeout(() => setRefreshSummary(null), 4000);
    }
    setPreviewOpen(false);
  }

  function sortEntriesByTime(list: ScheduleEntry[]): ScheduleEntry[] {
    return [...list].sort((a, b) => {
      const ta = parseTime(a.time);
      const tb = parseTime(b.time);
      if (ta === null && tb === null) return 0;
      if (ta === null) return 1; // empty times go to end
      if (tb === null) return -1;
      return ta - tb;
    });
  }

  function updateEntry(id: string, field: keyof ScheduleEntry, value: string) {
    const updated = entries.map((e) =>
      e.id === id ? { ...e, [field]: value, user_touched: true } : e
    );
    onChange({ ...data, entries: updated });
  }

  function updateEntrySetupMinutes(id: string, minutes: number | undefined) {
    const updated = entries.map((e) =>
      e.id === id
        ? { ...e, setup_minutes: minutes, user_touched: true }
        : e
    );
    onChange({ ...data, entries: updated });
  }

  function handleTimeBlur(id: string, rawValue: string) {
    const formatted = formatTimeInput(rawValue);
    if (formatted) {
      let updated = entries.map((e) =>
        e.id === id ? { ...e, time: formatted, user_touched: true } : e
      );
      updated = sortEntriesByTime(updated);
      onChange({ ...data, entries: updated });
    }
  }

  function removeEntry(id: string) {
    onChange({ ...data, entries: entries.filter((e) => e.id !== id) });
    if (editingId === id) setEditingId(null);
  }

  function removePhaseBlock(block: PhaseBlock) {
    const idsToRemove = new Set(
      entries.slice(block.startIndex, block.endIndex + 1).map((e) => e.id)
    );
    onChange({ ...data, entries: entries.filter((e) => !idsToRemove.has(e.id)) });
  }

  function renamePhaseBlock(originalLabel: string, newLabel: string) {
    const overrides = { ...(data.phaseOverrides || {}), [originalLabel]: newLabel };
    onChange({ ...data, phaseOverrides: overrides });
    setEditingPhase(null);
  }

  function getDisplayLabel(autoLabel: string): string {
    return data.phaseOverrides?.[autoLabel] || autoLabel;
  }

  function insertAfter(index: number) {
    const newEntry: ScheduleEntry = {
      id: crypto.randomUUID(),
      time: "",
      title: "",
      notes: "",
      user_touched: true,
    };
    const next = [...entries];
    next.splice(index + 1, 0, newEntry);
    onChange({ ...data, entries: next });
    setEditingId(newEntry.id);
  }

  function addAtEnd() {
    const newEntry: ScheduleEntry = {
      id: crypto.randomUUID(),
      time: "",
      title: "",
      notes: "",
      user_touched: true,
    };
    onChange({ ...data, entries: [...entries, newEntry] });
    setEditingId(newEntry.id);
  }

  // Insert a pre-tagged Tea Ceremony block (A4). Title is pre-filled so it
  // can't land as an empty "New entry" placeholder — linkedSection drives
  // both the Schedule↔Ceremony tab link and the phase-block grouping.
  // Default time = 9:00 AM (most common per North American practice;
  // 9 also carries auspicious meaning 久 in Chinese). Re-sorts to the
  // user's chosen time as soon as they edit it.
  function insertTeaCeremony() {
    const newEntry: ScheduleEntry = {
      id: crypto.randomUUID(),
      time: "9:00 AM",
      title: "Tea Ceremony",
      notes: "",
      linkedSection: "tea_ceremony",
      user_touched: true,
    };
    const updated = sortEntriesByTime([...entries, newEntry]);
    onChange({ ...data, entries: updated });
    setEditingId(newEntry.id);
  }

  const hasTeaCeremonyEntry = entries.some(
    (e) => e.linkedSection === "tea_ceremony"
  );

  return (
    <div className="space-y-6">
      {/* Ceremony time — smart summary or input */}
      {hasCeremonyTime && hasEntries && !editingCeremonyTime ? (
        /* Summary card — shows when time is set and timeline exists */
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-[family-name:var(--font-heading)]">
                Ceremony at {data.ceremony_time}
              </h3>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {firstTime} – {lastTime}
                {totalDuration && ` · about ${totalDuration}`}
                {` · ${entries.length} moments`}
              </p>
            </div>
            {/* Desktop: 3 inline action links (unchanged) */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => setEditingCeremonyTime(true)}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Change time
              </button>
              <button
                onClick={doRefresh}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
                title="Merge fresh suggestions — your edits are preserved"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
              <button
                onClick={() => setPreviewOpen(true)}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
                title="See a side-by-side preview before applying"
              >
                <Sparkles className="h-3 w-3" />
                Preview…
              </button>
            </div>

            {/* Mobile: collapse 3 actions into a ⋯ dropdown so the
                "Ceremony at X:XX" header breathes. */}
            <div className="sm:hidden shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Schedule actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingCeremonyTime(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Change time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={doRefresh}>
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPreviewOpen(true)}>
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                    Preview…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {refreshSummary && (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1.5 inline-block">
              {refreshSummary} · Your edits are preserved.
            </div>
          )}
        </div>
      ) : (
        /* Input mode — shows on first visit or when editing */
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            When does your ceremony start? Everything else builds around this.
          </p>
          <div className="flex items-center gap-3">
            <Input
              className="w-40 h-10 text-sm"
              placeholder="e.g., 4:30 PM"
              value={data.ceremony_time || ""}
              onChange={(e) => updateCeremonyTime(e.target.value)}
              onBlur={(e) => handleCeremonyTimeBlur(e.target.value)}
              autoFocus={editingCeremonyTime}
            />
            {hasCeremonyTime && !hasEntries && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (editingCeremonyTime) setEditingCeremonyTime(false);
                  handleGenerate();
                }}
                className="gap-1.5 text-xs"
              >
                <Sparkles className="h-3 w-3" />
                Generate timeline
              </Button>
            )}
            {hasCeremonyTime && hasEntries && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (editingCeremonyTime) setEditingCeremonyTime(false);
                  doRefresh();
                }}
                className="gap-1.5 text-xs"
                title="Merge fresh suggestions — your edits are preserved"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            )}
            {editingCeremonyTime && (
              <Button variant="ghost" size="sm" onClick={() => setEditingCeremonyTime(false)} className="text-xs">
                Done
              </Button>
            )}
          </div>

          {refreshSummary && (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1.5 inline-block">
              {refreshSummary} · Your edits are preserved.
            </div>
          )}
        </div>
      )}

      {/* Timeline by phase blocks */}
      {hasEntries && (
        <div className="space-y-6">
          {phaseBlocks
            // Visual filter (#3): when has_tea_ceremony is off, hide the
            // tea ceremony phase block. Entries stay in `entries` array
            // (so save/edit indexes remain valid) — we just skip rendering.
            // Also hide the "other" block label when its only contents
            // are placeholder drafts; the entries still render under
            // whatever phase block precedes them.
            .filter((block) => hasTeaCeremony || block.label !== "tea ceremony")
            .map((block, bi) => {
            const blockEntries = entries.slice(block.startIndex, block.endIndex + 1);

            // "other" = catch-all phase for entries that don't match any
            // recognized phase keyword. Suppress the header label entirely
            // so the user doesn't see a stigmatizing "OTHER" tag — entries
            // still render below the previous block.
            const isOtherBlock = block.label === "other";

            return (
              <div key={`${block.label}-${bi}`}>
                {/* Phase header — editable + removable. Hidden for "other" block. */}
                {!isOtherBlock && (
                <div className="flex items-center justify-between mb-2 group/phase">
                  {editingPhase === block.label ? (
                    <input
                      className="text-xs font-medium tracking-[0.1em] uppercase text-muted-foreground/70 bg-transparent border-b border-primary/30 outline-none py-0.5 w-40"
                      defaultValue={getDisplayLabel(block.label)}
                      autoFocus
                      onBlur={(e) => renamePhaseBlock(block.label, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renamePhaseBlock(block.label, e.currentTarget.value);
                        if (e.key === "Escape") setEditingPhase(null);
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingPhase(block.label)}
                      className="text-xs font-medium tracking-[0.1em] uppercase text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                      title="Click to rename"
                    >
                      {getDisplayLabel(block.label)}
                    </button>
                  )}
                  <button
                    onClick={() => removePhaseBlock(block)}
                    className="opacity-0 group-hover/phase:opacity-100 text-[10px] text-muted-foreground/40 hover:text-destructive transition-all"
                  >
                    Remove section
                  </button>
                </div>
                )}

                {/* Entries in this phase */}
                <div className="border-l-2 border-primary/10 ml-1">
                  {blockEntries.map((entry, ei) => {
                    const globalIndex = block.startIndex + ei;
                    const isEditing = editingId === entry.id;
                    const nextEntry = globalIndex < entries.length - 1 ? entries[globalIndex + 1] : null;
                    const duration = nextEntry ? calcDuration(entry.time, nextEntry.time) : null;

                    return (
                      <div key={entry.id}>
                        {/* Entry */}
                        <div
                          className={`group relative flex gap-3 py-2 pl-5 pr-2 -ml-px rounded-r-lg transition-colors cursor-pointer ${
                            isEditing
                              ? "flex-col max-sm:items-stretch sm:flex-row bg-primary/[0.03]"
                              : "hover:bg-muted/20"
                          }`}
                          onClick={() => setEditingId(isEditing ? null : entry.id)}
                        >
                          {/* Timeline dot */}
                          <div className="absolute left-[-5px] top-4 h-2 w-2 rounded-full bg-primary/30" />

                          {/* Time column — narrower on mobile only when editing to let title/notes breathe */}
                          {isEditing ? (
                            <Input
                              className="w-full max-sm:max-w-[120px] sm:w-24 h-8 text-sm shrink-0"
                              value={entry.time}
                              onChange={(e) => updateEntry(entry.id, "time", e.target.value)}
                              onBlur={(e) => handleTimeBlur(entry.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <span className="w-20 text-sm font-medium tabular-nums shrink-0 pt-0.5">
                              {entry.time || "—"}
                            </span>
                          )}

                          {/* Content column — title on top, notes below */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <Input
                                  className="h-8 text-sm"
                                  placeholder="What happens"
                                  value={entry.title}
                                  onChange={(e) => updateEntry(entry.id, "title", e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Input
                                  className="h-8 text-sm text-muted-foreground"
                                  placeholder="Notes (optional)"
                                  value={entry.notes}
                                  onChange={(e) => updateEntry(entry.id, "notes", e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div
                                  className="flex items-center gap-2 pt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <label className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    Setup buffer
                                  </label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={180}
                                    step={5}
                                    placeholder="0"
                                    value={entry.setup_minutes ?? ""}
                                    onChange={(e) => {
                                      const n = parseInt(e.target.value, 10);
                                      updateEntrySetupMinutes(
                                        entry.id,
                                        Number.isFinite(n) && n > 0 ? n : undefined
                                      );
                                    }}
                                    className="h-7 w-16 text-xs tabular-nums"
                                    title="Minutes the vendor needs to set up before the displayed time"
                                  />
                                  <span className="text-[11px] text-muted-foreground">min</span>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm block">{entry.title || "New entry"}</span>
                                {(() => {
                                  const enriched = enrichment
                                    ? enrichScheduleEntry(entry, enrichment)
                                    : null;
                                  const arrives =
                                    entry.setup_minutes && entry.time
                                      ? subtractMinutes(entry.time, entry.setup_minutes)
                                      : null;
                                  return (
                                    <>
                                      {enriched && (
                                        <span className="text-xs text-primary/70 block mt-0.5 italic">
                                          {enriched}
                                        </span>
                                      )}
                                      {arrives && (
                                        <span className="text-xs text-amber-700/80 block mt-0.5 tabular-nums">
                                          arrives {arrives} · ready {entry.time}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                                {entry.notes && (
                                  <span className="text-xs text-muted-foreground/60 block mt-0.5">{entry.notes}</span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Right side — duration or actions */}
                          {isEditing ? (
                            <div className="flex items-center gap-1 shrink-0 self-start mt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Auto-clean empty drafts: clicking Done with
                                  // no title and no time removes the row instead
                                  // of leaving a "New entry" placeholder behind.
                                  if (!entry.title.trim() && !entry.time.trim()) {
                                    removeEntry(entry.id);
                                  } else {
                                    setEditingId(null);
                                  }
                                }}
                                className="text-xs text-primary/70 hover:text-primary transition-colors px-2 py-0.5 rounded"
                              >
                                Done
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }}
                                className="text-muted-foreground/30 hover:text-destructive transition-colors p-1"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 shrink-0 self-start pt-0.5">
                              {duration && (
                                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                                  {duration}
                                </span>
                              )}
                              <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/30 transition-colors" />
                            </div>
                          )}
                        </div>

                        {/* Insert between entries */}
                        {ei < blockEntries.length - 1 && (
                          <div className="relative h-0 ml-5">
                            <button
                              onClick={(e) => { e.stopPropagation(); insertAfter(globalIndex); }}
                              className="absolute left-8 -translate-y-1/2 z-10 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity bg-background border border-border/50 hover:border-primary/30 rounded-full p-0.5 shadow-sm"
                            >
                              <Plus className="h-2.5 w-2.5 text-muted-foreground/50" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Insert after this phase block */}
                <button
                  onClick={() => insertAfter(block.endIndex)}
                  className="flex items-center gap-1.5 mt-1.5 ml-5 text-[11px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add here</span>
                </button>
              </div>
            );
          })}

          {/* Bottom controls */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={addAtEnd} className="gap-1.5 text-xs text-muted-foreground">
              <Plus className="h-3 w-3" />
              Add at end
            </Button>
            <p className="text-[10px] text-muted-foreground/50 max-w-xs text-right">
              Click any entry to edit. Build in 10–15 min buffers between transitions.
            </p>
          </div>

          {/* Cultural traditions — suggestion chip (A4). Flag-gated. Shows
              "[+] Tea ceremony" until a tea_ceremony entry exists; after
              insert, becomes a link into the Ceremony tab where elder order
              + envelopes live. */}
          {hasTeaCeremony && (
            <div className="mt-3 pt-3 border-t border-border/40">
              {hasTeaCeremonyEntry ? (
                <div className="text-[11px] inline-flex items-center gap-1 text-muted-foreground/70">
                  <span>🍵</span>
                  <span>Tea Ceremony added —</span>
                  <button
                    type="button"
                    onClick={() => onNavigate?.("ceremony")}
                    className="text-primary hover:underline font-medium"
                  >
                    configure elder order in Ceremony tab →
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-2">
                    Based on your cultural traditions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={insertTeaCeremony}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
                      title="Insert a Tea Ceremony block in your schedule"
                    >
                      <span>🍵</span>
                      <span>Tea ceremony</span>
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasEntries && (
        <div className="text-center py-16">
          <Clock className="h-6 w-6 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground/60">
            {hasCeremonyTime
              ? "Click \"Generate timeline\" to create your schedule"
              : "Enter your ceremony time to get started"
            }
          </p>
        </div>
      )}

      {/* Refresh preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Refresh preview</DialogTitle>
          </DialogHeader>
          {previewMerge ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Current timeline
                </h4>
                <ul className="space-y-1.5">
                  {entries.map((e) => {
                    const kept = previewMerge.keptIds.has(e.id);
                    const dropped = previewMerge.droppedIds.has(e.id);
                    return (
                      <li
                        key={e.id}
                        className={cn(
                          "text-xs rounded-md px-2 py-1.5 border",
                          kept && "bg-emerald-50 border-emerald-200 text-emerald-900",
                          dropped && "bg-muted/40 border-border/60 text-muted-foreground line-through"
                        )}
                      >
                        <span className="font-medium tabular-nums mr-2">{e.time || "—"}</span>
                        {e.title || "(empty)"}
                        <span className="ml-2 text-[10px] uppercase tracking-wider opacity-60">
                          {kept ? "kept" : "refreshed"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  After refresh
                </h4>
                <ul className="space-y-1.5">
                  {previewMerge.merged.map((e) => {
                    const added = previewMerge.addedIds.has(e.id);
                    const kept = previewMerge.keptIds.has(e.id);
                    return (
                      <li
                        key={e.id}
                        className={cn(
                          "text-xs rounded-md px-2 py-1.5 border",
                          kept && "bg-emerald-50 border-emerald-200 text-emerald-900",
                          added && "bg-amber-50 border-amber-200 text-amber-900"
                        )}
                      >
                        <span className="font-medium tabular-nums mr-2">{e.time || "—"}</span>
                        {e.title || "(empty)"}
                        <span className="ml-2 text-[10px] uppercase tracking-wider opacity-60">
                          {kept ? "kept" : added ? "added" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Set a ceremony time first to preview.</p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={acceptPreview} disabled={!previewMerge}>
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
