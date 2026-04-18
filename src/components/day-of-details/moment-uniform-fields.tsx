"use client";

import { useState } from "react";
import { Mic, Users2, StickyNote, Clock, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MomentExtras, ReceptionData } from "./types";
import { defaultMcLineForMoment, TYPICAL_MC_MOMENTS } from "./types";

interface Props {
  momentId: string;
  extras: MomentExtras | undefined;
  onChange: (patch: Partial<MomentExtras>) => void;
  receptionData: ReceptionData;
  /** When Schedule owns the time, hide the local Time input. */
  showTime?: boolean;
  /** When true, show a small "Set in Schedule ↗" link instead of the Time row. */
  scheduleOwnsTime?: boolean;
  /** Click handler for the "Set in Schedule" link. */
  onNavigateToSchedule?: () => void;
}

/**
 * Shared optional fields for any reception moment (Variant A+).
 *
 * Behavior:
 *   - Every field starts as a chip — even if it already has content. This
 *     enforces consistent visual weight between moments so the hierarchy
 *     (primary > optional) reads at a glance.
 *   - Filled chips show a salmon dot + inline value preview so the couple
 *     knows the content exists without having to expand it.
 *   - Clicking a chip swaps it for an inline row (no border/background) —
 *     Done and Clear actions live in the row's header.
 *   - MC chips on "typical" moments (Grand entrance, First dance, etc.)
 *     get a subtle "typical" hint to surface planner wisdom.
 *
 * The OPTIONAL divider above the chips makes the hierarchy break explicit.
 */
export function MomentUniformFields({
  momentId,
  extras,
  onChange,
  receptionData,
  showTime = true,
  scheduleOwnsTime = false,
}: Props) {
  // Always chip-first. Never auto-expand based on data — the filled chip
  // carries the information, and the couple chooses to expand for edits.
  const [mcOpen, setMcOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const mcTypical = TYPICAL_MC_MOMENTS.has(momentId);
  // Chip state = line content only. Deleting all text = chip goes empty.
  const mcFilledValue = extras?.mc_line?.trim() || "";
  const guestsFilledValue = extras?.guest_action?.trim() || "";
  const notesFilledValue = extras?.notes?.trim() || "";

  // Clicking the MC chip is the "enable MC" action. If the line is empty,
  // pre-fill the suggested script so the textarea opens with content.
  function openMc() {
    if (!extras?.mc_line?.trim()) {
      onChange({
        mc_needed: true,
        mc_line: defaultMcLineForMoment(momentId, receptionData),
      });
    } else if (!extras?.mc_needed) {
      onChange({ mc_needed: true });
    }
    setMcOpen(true);
  }

  function clearMc() {
    onChange({ mc_needed: false, mc_line: "" });
    setMcOpen(false);
  }
  function clearGuests() {
    onChange({ guest_action: "" });
    setGuestsOpen(false);
  }
  function clearNotes() {
    onChange({ notes: "" });
    setNotesOpen(false);
  }

  return (
    <div className="space-y-3">
      {/* Divider + OPTIONAL label — clear hierarchy break from primary */}
      <div className="border-t border-border/40 pt-3 space-y-2">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/60">
          Optional · click to add or edit
        </p>

        {/* Chip row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!mcOpen && (
            <InlineChip
              icon={<Mic />}
              label="MC announcement"
              value={mcFilledValue}
              typical={mcTypical}
              onClick={openMc}
            />
          )}
          {!guestsOpen && (
            <InlineChip
              icon={<Users2 />}
              label="Guest action"
              value={guestsFilledValue}
              onClick={() => setGuestsOpen(true)}
            />
          )}
          {!notesOpen && (
            <InlineChip
              icon={<StickyNote />}
              label="Notes"
              value={notesFilledValue}
              onClick={() => setNotesOpen(true)}
            />
          )}
        </div>

        {/* Expanded inline rows */}
        {mcOpen && (
          <InlineRow
            icon={<Mic />}
            label="MC announcement"
            hint="what the MC says for this moment"
            onDone={() => setMcOpen(false)}
            onClear={clearMc}
            canClear={!!(extras?.mc_needed || extras?.mc_line?.trim())}
          >
            <Textarea
              autoFocus={!extras?.mc_line}
              value={extras?.mc_line ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                // Keep mc_needed in sync with content — deleting all text
                // disables MC so the chip + "needs MC" pill chip go away.
                onChange({ mc_line: v, mc_needed: v.trim().length > 0 });
              }}
              placeholder="Edit the suggested script, or write your own"
              className="text-sm min-h-[52px] bg-background"
              rows={2}
            />
          </InlineRow>
        )}
        {guestsOpen && (
          <InlineRow
            icon={<Users2 />}
            label="Guest action"
            hint='What guests do — e.g., "stand", "applaud"'
            onDone={() => setGuestsOpen(false)}
            onClear={clearGuests}
            canClear={!!extras?.guest_action?.trim()}
          >
            <Input
              autoFocus={!extras?.guest_action}
              placeholder='e.g., "everyone stand"'
              value={extras?.guest_action ?? ""}
              onChange={(e) => onChange({ guest_action: e.target.value })}
              className="h-9 text-sm bg-background max-w-sm"
            />
          </InlineRow>
        )}
        {notesOpen && (
          <InlineRow
            icon={<StickyNote />}
            label="Notes"
            onDone={() => setNotesOpen(false)}
            onClear={clearNotes}
            canClear={!!extras?.notes?.trim()}
          >
            <Textarea
              autoFocus={!extras?.notes}
              value={extras?.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Anything else for this moment"
              className="text-sm min-h-[52px] bg-background"
              rows={2}
            />
          </InlineRow>
        )}
      </div>

      {/* Local time input only for custom moments (no Schedule entry) */}
      {showTime && !scheduleOwnsTime && (
        <div className="flex items-center gap-2 pt-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
          <span className="text-xs font-medium text-muted-foreground">
            Time
          </span>
          <Input
            placeholder="e.g., 7:00 PM"
            value={extras?.time ?? ""}
            onChange={(e) => onChange({ time: e.target.value })}
            className="h-8 text-sm w-36 tabular-nums"
          />
          <span className="text-[10px] text-muted-foreground/60">
            Sorts this moment chronologically
          </span>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

/**
 * Chip with two visual states:
 *   - Empty: plain border, "+" icon, label. Optional "typical" hint.
 *   - Filled: salmon dot + label + ":" + truncated value preview.
 */
export function InlineChip({
  icon,
  label,
  value,
  typical,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  typical?: boolean;
  onClick: () => void;
}) {
  const hasValue = !!(value && value.trim());
  // Color encodes on/off only. "typical" is advisory — rendered as a
  // small neutral text hint so it never gets mistaken for a filled state.
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors max-w-full",
        hasValue
          ? "border-primary/40 bg-primary/5 text-foreground/80 hover:border-primary/70"
          : "border-border/80 bg-background text-foreground/70 hover:border-primary/40 hover:text-primary"
      )}
      title={hasValue ? value : typical ? "Typical for this moment" : undefined}
    >
      {hasValue ? (
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
      ) : (
        <Plus className="h-3 w-3 shrink-0" />
      )}
      <span
        className={cn(
          "[&>svg]:h-3 [&>svg]:w-3 shrink-0",
          hasValue
            ? "[&>svg]:text-primary/70"
            : "[&>svg]:text-muted-foreground/60"
        )}
      >
        {icon}
      </span>
      <span className="font-medium shrink-0">{label}</span>
      {hasValue ? (
        <>
          <span className="text-muted-foreground/60 shrink-0">:</span>
          <span className="text-muted-foreground/80 truncate min-w-0">
            {value}
          </span>
        </>
      ) : typical ? (
        <span className="text-[10px] text-muted-foreground/60 shrink-0">
          typical
        </span>
      ) : null}
    </button>
  );
}

/**
 * Inline expanded row — header with label + Done/Clear actions, body below.
 * No border, no background — reads as "tucked under the OPTIONAL group"
 * rather than a stand-alone module.
 */
export function InlineRow({
  icon,
  label,
  hint,
  onDone,
  onClear,
  canClear,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onDone: () => void;
  onClear: () => void;
  /** Disable Clear visually when there's nothing to clear. */
  canClear?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="pl-1 py-1.5">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 min-w-0">
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-primary/70 shrink-0">
            {icon}
          </span>
          <span className="shrink-0">{label}</span>
          {hint && (
            <span className="text-[11px] font-normal text-muted-foreground/60 truncate">
              {hint}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDone}
            className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Done
          </button>
          <span className="text-muted-foreground/30">·</span>
          <button
            type="button"
            onClick={onClear}
            disabled={!canClear}
            className={cn(
              "text-[11px] transition-colors",
              canClear
                ? "text-muted-foreground/70 hover:text-destructive"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            title="Clear and collapse"
          >
            Clear
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
