"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionSummaryChip {
  label: string;
  tone?: "neutral" | "accent" | "muted";
}

interface Props {
  /** Primary icon (lucide). Forced to 18px salmon via internal styles. */
  icon: ReactNode;
  title: string;
  /** Optional hint shown inline with the title (collapsed + expanded). */
  hint?: string;
  /** Optional time string (e.g., "9:00 AM"). Clickable when from Schedule. */
  time?: string;
  timeFromSchedule?: boolean;
  onNavigateToSchedule?: () => void;
  /** Chips shown in collapsed header when any content is filled in. */
  summaryChips?: SectionSummaryChip[];
  /** Copy for the empty summary state. Defaults to "Not planned yet". */
  emptyLabel?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Timeline-style pill card for Day-of planning sections that don't need
 * drag-reorder, rename, or hide (unlike MomentCard). Getting Ready uses
 * this because its 6 moments are fixed in order and all relevant.
 *
 *   ✨  Hair & makeup — stylists, stations       [chip] [chip]   9:00 AM ∨
 *      ... expanded content ...
 */
export function CollapsibleSection({
  icon,
  title,
  hint,
  time,
  timeFromSchedule = false,
  onNavigateToSchedule,
  summaryChips,
  emptyLabel = "Not planned yet",
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChips = !!(summaryChips && summaryChips.length > 0);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card transition-shadow",
        open && "shadow-sm"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left px-4 py-3"
      >
        {/* Top row: icon + title + (desktop chips) + time + chevron */}
        <div className="flex items-center gap-3">
          <span className="flex items-center self-center [&>svg]:!h-[18px] [&>svg]:!w-[18px] [&>svg]:!text-primary shrink-0">
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-foreground leading-none">
              {title}
            </div>
            {hint && (
              <div className="text-[13px] text-muted-foreground mt-1 leading-snug">
                {hint}
              </div>
            )}
          </div>

          {/* Summary chips (collapsed) — desktop inline */}
          {!open && (
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap min-w-0 max-w-[50%] justify-end">
              {hasChips ? (
                summaryChips!.map((c, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-[11px] px-1.5 py-0.5 rounded-md truncate max-w-[200px]",
                      c.tone === "accent" &&
                        "bg-primary/10 text-primary font-medium",
                      c.tone === "muted" &&
                        "bg-muted text-muted-foreground/70",
                      (!c.tone || c.tone === "neutral") &&
                        "bg-muted/60 text-foreground/70"
                    )}
                    title={c.label}
                  >
                    {c.label}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-muted-foreground/50 italic">
                  {emptyLabel}
                </span>
              )}
            </div>
          )}

          {/* Time — clickable when from Schedule */}
          {time &&
            (timeFromSchedule && onNavigateToSchedule ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToSchedule();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onNavigateToSchedule();
                  }
                }}
                title="From Schedule — click to edit"
                className="text-xs tabular-nums shrink-0 font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>{time}</span>
                <ArrowUpRight className="h-3 w-3 opacity-60" />
              </span>
            ) : (
              <span className="text-xs tabular-nums shrink-0 font-medium text-muted-foreground">
                {time}
              </span>
            ))}

          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground/60 transition-transform shrink-0",
              open && "rotate-180"
            )}
          />
        </div>

        {/* Mobile only: chips drop to second row (indented to align under title) */}
        {!open && (
          <div className="sm:hidden mt-1.5 pl-[30px] flex items-center gap-1.5 flex-wrap">
            {hasChips ? (
              summaryChips!.map((c, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-[11px] px-1.5 py-0.5 rounded-md truncate max-w-[180px]",
                    c.tone === "accent" &&
                      "bg-primary/10 text-primary font-medium",
                    c.tone === "muted" &&
                      "bg-muted text-muted-foreground/70",
                    (!c.tone || c.tone === "neutral") &&
                      "bg-muted/60 text-foreground/70"
                  )}
                  title={c.label}
                >
                  {c.label}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground/50 italic">
                {emptyLabel}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Expanded body */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          {open && (
            <div className="border-t border-border/50 px-4 py-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
