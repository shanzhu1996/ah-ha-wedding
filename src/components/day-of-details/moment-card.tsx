"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export interface MomentSummaryChip {
  label: string;
  tone?: "neutral" | "accent" | "muted";
}

interface MomentCardProps {
  id: string;
  title: string;
  /** Optional time (e.g., "7:00 PM") — reserves space even when blank. */
  time?: string;
  /** True when the displayed time is derived from the Schedule tab. Makes the
   *  time clickable and adds a small ↗ affordance. */
  timeFromSchedule?: boolean;
  /** Jump to Schedule tab. Invoked when the time pill is clicked. */
  onNavigateToSchedule?: () => void;
  summaryChips?: MomentSummaryChip[];
  children: ReactNode;
  defaultOpen?: boolean;
  /** Start the card with its title in rename mode (for newly added customs). */
  defaultEditingTitle?: boolean;
  /** Called when the couple saves a new display title. If omitted, title isn't renamable. */
  onRename?: (newTitle: string) => void;
  /** Called when the couple removes the moment. Built-ins hide, customs delete. */
  onRemove?: () => void;
  /** Tooltip/aria label for the remove button. */
  removeLabel?: string;
  sortableDisabled?: boolean;
}

export function MomentCard({
  id,
  title,
  time,
  timeFromSchedule = false,
  onNavigateToSchedule,
  summaryChips,
  children,
  defaultOpen = false,
  defaultEditingTitle = false,
  onRename,
  onRemove,
  removeLabel,
  sortableDisabled = false,
}: MomentCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [editingTitle, setEditingTitle] = useState(defaultEditingTitle);
  const [titleDraft, setTitleDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync if the title changes from the outside.
  useEffect(() => {
    if (!editingTitle) setTitleDraft(title);
  }, [title, editingTitle]);

  // Focus the title input when entering edit mode.
  useEffect(() => {
    if (editingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTitle]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: sortableDisabled || editingTitle });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  const hasChips = !!(summaryChips && summaryChips.length > 0);

  function commitRename() {
    const next = titleDraft.trim();
    if (!next) {
      // Reject empty titles — revert
      setTitleDraft(title);
    } else if (next !== title && onRename) {
      onRename(next);
    }
    setEditingTitle(false);
  }

  function cancelRename() {
    setTitleDraft(title);
    setEditingTitle(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/moment rounded-lg border border-border/80 bg-card transition-shadow",
        isDragging && "shadow-lg ring-1 ring-primary/30",
        open && "shadow-sm"
      )}
    >
      <div className="flex items-stretch">
        {/* Drag handle — visible on hover/focus */}
        <button
          type="button"
          aria-label={`Drag to reorder ${title}`}
          className={cn(
            "px-1.5 flex items-center text-muted-foreground/0 group-hover/moment:text-muted-foreground/50 focus-visible:text-muted-foreground hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing touch-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-l-lg"
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Pill body — stacks chips below title on mobile, keeps inline on desktop */}
        <div className="flex-1 min-w-0 flex flex-col px-2 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Time slot — always reserved; clickable when derived from Schedule */}
            {time ? (
              timeFromSchedule && onNavigateToSchedule ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToSchedule();
                  }}
                  title="From Schedule — click to edit"
                  className="text-xs tabular-nums shrink-0 w-16 font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5 group/time"
                >
                  <span>{time}</span>
                  <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/time:opacity-70 transition-opacity" />
                </button>
              ) : (
                <span className="text-xs tabular-nums shrink-0 w-16 font-medium text-muted-foreground">
                  {time}
                </span>
              )
            ) : (
              <span
                aria-hidden
                className="text-xs tabular-nums shrink-0 w-16 invisible"
              >
                0:00 PM
              </span>
            )}

            {/* Title — inline editable when onRename is provided */}
            {editingTitle && onRename ? (
              <input
                ref={inputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitRename();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    cancelRename();
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-medium shrink-0 bg-transparent border-b border-primary/40 outline-none focus:border-primary min-w-[8rem]"
                placeholder="Moment title"
              />
            ) : onRename ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTitle(true);
                }}
                title="Rename"
                className="text-sm font-medium shrink-0 inline-flex items-center gap-1 hover:text-primary transition-colors"
              >
                <span>{title}</span>
                <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover/moment:text-muted-foreground/40 transition-colors" />
              </button>
            ) : (
              <span className="text-sm font-medium shrink-0">{title}</span>
            )}

            {/* Desktop: chips inline in the middle */}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className={cn(
                "hidden sm:flex flex-1 items-center gap-1.5 flex-wrap overflow-hidden text-left min-w-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md py-0.5"
              )}
            >
              {hasChips ? (
                summaryChips!.map((c, i) => (
                  <span
                    key={i}
                    className={cn(
                      "text-[11px] px-1.5 py-0.5 rounded-md truncate max-w-[220px]",
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
                  Not planned yet
                </span>
              )}
            </button>

            {/* Mobile: spacer pushes chevron right */}
            <span className="sm:hidden flex-1" aria-hidden />

            {/* Chevron is also a toggle */}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Collapse" : "Expand"}
              className="shrink-0 rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground/60 transition-transform motion-reduce:transition-none",
                  open && "rotate-180"
                )}
              />
            </button>
          </div>

          {/* Mobile: chips drop to row 2, indented to align under title */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={cn(
              "sm:hidden mt-1 pl-[calc(4rem+0.75rem)] flex items-center gap-1.5 flex-wrap overflow-hidden text-left min-w-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md py-0.5"
            )}
          >
            {hasChips ? (
              summaryChips!.map((c, i) => (
                <span
                  key={`mobile-${i}`}
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
                Not planned yet
              </span>
            )}
          </button>
        </div>

        {onRemove && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`More options for ${title}`}
              title="More options"
              className="px-2 text-muted-foreground/40 focus-visible:text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-r-lg data-[popup-open]:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-[180px]">
              <DropdownMenuItem
                variant="destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {removeLabel ?? "Remove from timeline"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

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
