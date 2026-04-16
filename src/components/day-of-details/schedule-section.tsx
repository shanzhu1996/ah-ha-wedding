"use client";

import { useState } from "react";
import { X, Plus, Sparkles, Clock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type ScheduleData,
  type ScheduleEntry,
  generateSuggestedTimeline,
  type SectionKey,
} from "./types";

// ── Phase detection ────────────────────────────────────────────────────

function getPhase(entry: ScheduleEntry): string {
  const t = entry.title.toLowerCase();
  const s = entry.linkedSection;
  if (s === "getting_ready" || t.includes("hair") || t.includes("makeup") || t.includes("detail shot") || t.includes("first look") || t.includes("photographer arrive") || t.includes("portrait") || (t.includes("photo") && !t.includes("ceremony") && !t.includes("formal")))
    return "getting ready";
  if (s === "ceremony" || t.includes("ceremony") || t.includes("guests arrive") || t.includes("family formal") || t.includes("private moment"))
    return "ceremony";
  if (s === "cocktail" || t.includes("cocktail"))
    return "cocktail hour";
  if (t.includes("open danc") || t.includes("last dance") || t.includes("exit") || t.includes("send-off") || t.includes("send off"))
    return "dancing & send-off";
  if (s === "reception" || t.includes("dinner") || t.includes("speech") || t.includes("toast") || t.includes("entrance") || t.includes("cake") || t.includes("dance"))
    return "reception";
  return "";
}

/** Group entries into phase sections with start/end indices */
interface PhaseBlock {
  label: string;
  startIndex: number;
  endIndex: number; // inclusive
}

function getPhaseBlocks(entries: ScheduleEntry[]): PhaseBlock[] {
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

// ── Component ──────────────────────────────────────────────────────────

interface ScheduleSectionProps {
  data: ScheduleData;
  onChange: (data: ScheduleData) => void;
  onNavigate?: (section: SectionKey) => void;
}

export function ScheduleSection({ data, onChange }: ScheduleSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingCeremonyTime, setEditingCeremonyTime] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const entries = data.entries || [];
  const hasEntries = entries.length > 0;
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
    if (hasEntries) { setShowRegenConfirm(true); return; }
    doGenerate();
  }

  function doGenerate() {
    const result = generateSuggestedTimeline(data.ceremony_time);
    if (result.length > 0) onChange({ ...data, entries: result });
    setShowRegenConfirm(false);
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
    const updated = entries.map((e) => e.id === id ? { ...e, [field]: value } : e);
    onChange({ ...data, entries: updated });
  }

  function handleTimeBlur(id: string, rawValue: string) {
    const formatted = formatTimeInput(rawValue);
    if (formatted) {
      let updated = entries.map((e) => e.id === id ? { ...e, time: formatted } : e);
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
    const newEntry: ScheduleEntry = { id: crypto.randomUUID(), time: "", title: "", notes: "" };
    const next = [...entries];
    next.splice(index + 1, 0, newEntry);
    onChange({ ...data, entries: next });
    setEditingId(newEntry.id);
  }

  function addAtEnd() {
    const newEntry: ScheduleEntry = { id: crypto.randomUUID(), time: "", title: "", notes: "" };
    onChange({ ...data, entries: [...entries, newEntry] });
    setEditingId(newEntry.id);
  }

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingCeremonyTime(true)}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Change time
              </button>
              <button
                onClick={handleGenerate}
                className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" />
                Regenerate
              </button>
            </div>
          </div>

          {showRegenConfirm && (
            <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-between gap-4 text-sm">
              <span>This will replace your current timeline. Are you sure?</span>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setShowRegenConfirm(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={doGenerate}>Replace</Button>
              </div>
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
            {hasCeremonyTime && (
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
                {hasEntries ? "Regenerate" : "Generate timeline"}
              </Button>
            )}
            {editingCeremonyTime && (
              <Button variant="ghost" size="sm" onClick={() => setEditingCeremonyTime(false)} className="text-xs">
                Done
              </Button>
            )}
          </div>

          {showRegenConfirm && (
            <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-between gap-4 text-sm">
              <span>This will replace your current timeline. Are you sure?</span>
              <div className="flex gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setShowRegenConfirm(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={doGenerate}>Replace</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline by phase blocks */}
      {hasEntries && (
        <div className="space-y-6">
          {phaseBlocks.map((block, bi) => {
            const blockEntries = entries.slice(block.startIndex, block.endIndex + 1);

            return (
              <div key={`${block.label}-${bi}`}>
                {/* Phase header — editable + removable */}
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
                            isEditing ? "bg-primary/[0.03]" : "hover:bg-muted/20"
                          }`}
                          onClick={() => setEditingId(isEditing ? null : entry.id)}
                        >
                          {/* Timeline dot */}
                          <div className="absolute left-[-5px] top-4 h-2 w-2 rounded-full bg-primary/30" />

                          {/* Time column */}
                          {isEditing ? (
                            <Input
                              className="w-24 h-8 text-sm shrink-0"
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
                              </div>
                            ) : (
                              <>
                                <span className="text-sm block">{entry.title || "New entry"}</span>
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
                                onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
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
    </div>
  );
}
