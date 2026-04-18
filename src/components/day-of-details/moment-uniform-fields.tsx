"use client";

import { useState } from "react";
import { Mic, Users2, StickyNote, Clock, ArrowRight, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
 * Shared optional fields for any reception moment.
 *
 * Design goal (Variant A): universal extras (MC, Guest action, Notes) hide
 * behind chip buttons so the couple only sees fields that are filled in or
 * that they've explicitly opted to add. This keeps the moment card focused
 * on its primary decision and matches native-mobile UX conventions
 * (iOS / Notion / Linear).
 *
 * States per field:
 *   - empty + not opted: chip visible, input hidden
 *   - opted or has content: input visible in a soft sub-card with close "×"
 *
 * Time input (when Schedule doesn't own it) always renders.
 */
export function MomentUniformFields({
  momentId,
  extras,
  onChange,
  receptionData,
  showTime = true,
  scheduleOwnsTime = false,
  onNavigateToSchedule,
}: Props) {
  // Each optional field stays expanded once the user either clicks the chip or
  // types anything. It collapses back only when the user clicks × to clear.
  const [mcOpen, setMcOpen] = useState(
    () => !!(extras?.mc_needed || extras?.mc_line?.trim())
  );
  const [guestsOpen, setGuestsOpen] = useState(
    () => !!extras?.guest_action?.trim()
  );
  const [notesOpen, setNotesOpen] = useState(() => !!extras?.notes?.trim());

  const anyChipVisible = !mcOpen || !guestsOpen || !notesOpen;
  const mcTypical = TYPICAL_MC_MOMENTS.has(momentId);

  function handleMcToggle(checked: boolean) {
    if (checked && !extras?.mc_line?.trim()) {
      onChange({
        mc_needed: true,
        mc_line: defaultMcLineForMoment(momentId, receptionData),
      });
    } else {
      onChange({ mc_needed: checked });
    }
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
      {/* Chip row — only for closed fields */}
      {anyChipVisible && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/70">
            Optional
          </span>
          {!mcOpen && (
            <ChipButton
              icon={<Mic />}
              onClick={() => setMcOpen(true)}
              typical={mcTypical}
            >
              MC announcement
            </ChipButton>
          )}
          {!guestsOpen && (
            <ChipButton icon={<Users2 />} onClick={() => setGuestsOpen(true)}>
              Guest action
            </ChipButton>
          )}
          {!notesOpen && (
            <ChipButton icon={<StickyNote />} onClick={() => setNotesOpen(true)}>
              Notes
            </ChipButton>
          )}
        </div>
      )}

      {/* Expanded MC field */}
      {mcOpen && (
        <OptionalCard icon={<Mic />} label="MC announcement" onClear={clearMc}>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={extras?.mc_needed ?? false}
              onCheckedChange={(v) => handleMcToggle(!!v)}
            />
            <span
              className={cn(
                !extras?.mc_needed && "text-muted-foreground"
              )}
            >
              MC announces this moment
            </span>
          </label>
          {extras?.mc_needed && (
            <Textarea
              value={extras?.mc_line ?? ""}
              onChange={(e) => onChange({ mc_line: e.target.value })}
              placeholder="What the MC says (we've suggested one — edit freely)"
              className="text-sm min-h-[52px] bg-background mt-2"
              rows={2}
            />
          )}
        </OptionalCard>
      )}

      {/* Expanded Guests field */}
      {guestsOpen && (
        <OptionalCard
          icon={<Users2 />}
          label="Guest action"
          hint='What guests do — e.g., "stand", "applaud"'
          onClear={clearGuests}
        >
          <Input
            placeholder='e.g., "everyone stand"'
            value={extras?.guest_action ?? ""}
            onChange={(e) => onChange({ guest_action: e.target.value })}
            className="h-9 text-sm bg-background max-w-sm"
            autoFocus={!extras?.guest_action}
          />
        </OptionalCard>
      )}

      {/* Expanded Notes field */}
      {notesOpen && (
        <OptionalCard icon={<StickyNote />} label="Notes" onClear={clearNotes}>
          <Textarea
            value={extras?.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Anything else for this moment"
            className="text-sm min-h-[52px] bg-background"
            rows={2}
            autoFocus={!extras?.notes}
          />
        </OptionalCard>
      )}

      {/* Time input / Schedule link */}
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

      {scheduleOwnsTime && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pt-1">
          <Clock className="h-3 w-3" />
          <span>Time is set in the Schedule tab.</span>
          {onNavigateToSchedule && (
            <button
              type="button"
              onClick={onNavigateToSchedule}
              className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary transition-colors"
            >
              Open Schedule
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function ChipButton({
  icon,
  children,
  onClick,
  typical,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
  /** Soft planner-wisdom hint: this field is conventionally set for this moment. */
  typical?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
        typical
          ? "border-primary/30 bg-primary/5 text-foreground/80 hover:border-primary/60 hover:text-primary"
          : "border-border/80 bg-background text-foreground/70 hover:border-primary/40 hover:text-primary"
      )}
      title={typical ? "Typical for this moment" : undefined}
    >
      <Plus className="h-3 w-3" />
      <span
        className={cn(
          "[&>svg]:h-3 [&>svg]:w-3",
          typical
            ? "[&>svg]:text-primary/70"
            : "[&>svg]:text-muted-foreground/60"
        )}
      >
        {icon}
      </span>
      {children}
      {typical && (
        <span className="text-[10px] text-primary/70 font-medium">typical</span>
      )}
    </button>
  );
}

function OptionalCard({
  icon,
  label,
  hint,
  onClear,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-muted/30 border border-border/40 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-muted-foreground/70">
            {icon}
          </span>
          {label}
          {hint && (
            <span className="text-[10px] font-normal text-muted-foreground/60 ml-1">
              {hint}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground/50 hover:text-destructive transition-colors"
          title="Clear and collapse"
          aria-label={`Clear ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {children}
    </div>
  );
}
