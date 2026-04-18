"use client";

import { useState } from "react";
import {
  X,
  Trash2,
  Pencil,
  Check,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TableVisual, dietaryKindFor, type SeatAssignment } from "./table-visual";
import type { TableShape } from "./table-templates";

// ── Types ──────────────────────────────────────────────────────────────

export interface SeatedGuest {
  id: string;
  first_name: string;
  last_name: string;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  relationship_tag: string | null;
  seat_number: number | null;
}

type Rotation = 0 | 90 | 180 | 270;

interface Props {
  id: string;
  number: number;
  name: string | null;
  shape: TableShape;
  capacity: number;
  rotation: Rotation;
  seated: SeatedGuest[];
  isSelectable: boolean;
  selectedGuestId: string | null;
  onClose: () => void;
  onSeatClick: (seatNumber: number) => void;
  onGuestPillClick: (guestId: string) => void;
  onGuestUnassign: (guestId: string) => void;
  onDelete: () => void;
  onRename: (newName: string | null) => Promise<void> | void;
  onRotate: (newRotation: Rotation) => Promise<void> | void;
  /**
   * Called when a seated guest is dragged onto another seat in this table.
   * Empty target → move. Occupied target → swap.
   */
  onGuestDragToSeat: (
    draggedGuestId: string,
    targetSeatNumber: number
  ) => void;
  tagColor: (tag: string | null) => string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function initialsOf(g: { first_name: string; last_name: string }) {
  return (
    (g.first_name?.[0] ?? "").toUpperCase() +
    (g.last_name?.[0] ?? "").toUpperCase()
  );
}

function hasDietary(g: SeatedGuest): boolean {
  return Boolean(
    (g.dietary_restrictions && g.dietary_restrictions.trim()) ||
      g.meal_choice === "vegan" ||
      g.meal_choice === "vegetarian"
  );
}

/**
 * Short dietary label for the inline pill in the seat list.
 * Priority: vegan > vegetarian > dietary_restrictions text (truncated).
 */
function dietaryLabel(g: SeatedGuest): { short: string; full: string } | null {
  if (g.meal_choice === "vegan") return { short: "vegan", full: "vegan" };
  if (g.meal_choice === "vegetarian") return { short: "veg", full: "vegetarian" };
  const txt = g.dietary_restrictions?.trim();
  if (txt) {
    const short = txt.length > 10 ? txt.slice(0, 10) + "…" : txt;
    return { short, full: txt };
  }
  return null;
}

function summarizeDietary(seated: SeatedGuest[]): string | null {
  const counts: Record<string, number> = {};
  for (const g of seated) {
    if (g.meal_choice === "vegan") counts["vegan"] = (counts["vegan"] ?? 0) + 1;
    if (g.meal_choice === "vegetarian")
      counts["vegetarian"] = (counts["vegetarian"] ?? 0) + 1;
    if (g.dietary_restrictions && g.dietary_restrictions.trim()) {
      counts["other"] = (counts["other"] ?? 0) + 1;
    }
  }
  const parts: string[] = [];
  if (counts["vegan"]) parts.push(`${counts["vegan"]} vegan`);
  if (counts["vegetarian"]) parts.push(`${counts["vegetarian"]} vegetarian`);
  if (counts["other"]) parts.push(`${counts["other"]} other dietary`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

// ── Component ──────────────────────────────────────────────────────────

const SHAPE_LABEL: Record<TableShape, string> = {
  round: "Round",
  rectangle: "Rectangle",
  square: "Square",
  sweetheart: "Sweetheart",
};

export function TableDetailPanel({
  id,
  number,
  name,
  shape,
  capacity,
  rotation,
  seated,
  isSelectable,
  selectedGuestId,
  onClose,
  onSeatClick,
  onGuestPillClick,
  onGuestUnassign,
  onDelete,
  onRename,
  onRotate,
  onGuestDragToSeat,
  tagColor,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name ?? "");
  const [saving, setSaving] = useState(false);
  const [dragOverSeat, setDragOverSeat] = useState<number | null>(null);
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);

  // Build seat_number → guest map
  const assigned: Record<number, SeatAssignment> = {};
  for (const g of seated) {
    if (g.seat_number && g.seat_number >= 1 && g.seat_number <= capacity) {
      assigned[g.seat_number] = {
        guestId: g.id,
        initials: initialsOf(g),
        dietaryKind: dietaryKindFor(g),
        fullName: `${g.first_name} ${g.last_name}`,
      };
    }
  }

  const selectedSeat = seated.find(
    (g) => g.id === selectedGuestId && g.seat_number
  )?.seat_number ?? undefined;

  const dietarySummary = summarizeDietary(seated);

  async function handleRenameSubmit() {
    setSaving(true);
    try {
      await onRename(nameDraft.trim() || null);
      setEditingName(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/60">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground">
              Table {number}
            </span>
            <span className="text-xs text-muted-foreground/60">
              · {SHAPE_LABEL[shape]} · {seated.length} / {capacity}
            </span>
          </div>
          {editingName ? (
            <div className="flex items-center gap-1">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                placeholder="Table name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") {
                    setNameDraft(name ?? "");
                    setEditingName(false);
                  }
                }}
                className="h-7 text-sm max-w-xs"
                disabled={saving}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={handleRenameSubmit}
                disabled={saving}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-base font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group/name"
            >
              {name || (
                <span className="italic text-muted-foreground">
                  Add a name
                </span>
              )}
              <Pencil className="h-3 w-3 opacity-0 group-hover/name:opacity-40 transition-opacity" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
            aria-label="Delete table"
            title="Delete table"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close detail panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body — compact visual + rotation side-by-side on top, seat list below */}
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-4">
          <TableVisual
            shape={shape}
            capacity={capacity}
            assigned={assigned}
            selectedSeat={selectedSeat}
            hoverHint={isSelectable}
            onSeatClick={onSeatClick}
            size="md"
            rotation={rotation}
            fillState={
              seated.length === 0
                ? "empty"
                : seated.length >= capacity
                  ? "full"
                  : "partial"
            }
          />
          <div className="flex flex-col gap-1 pt-3">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Seat 1 faces
            </span>
            <div
              className="grid gap-0.5"
              style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "repeat(3, 1fr)",
              }}
            >
              <div />
              <button
                type="button"
                onClick={() => onRotate(0)}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                  rotation === 0
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
                aria-label="Seat 1 to top"
                title="Seat 1 to top"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => onRotate(270)}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                  rotation === 270
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
                aria-label="Seat 1 to left"
                title="Seat 1 to left"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => onRotate(90)}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                  rotation === 90
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
                aria-label="Seat 1 to right"
                title="Seat 1 to right"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <div />
              <button
                type="button"
                onClick={() => onRotate(180)}
                className={cn(
                  "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
                  rotation === 180
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                )}
                aria-label="Seat 1 to bottom"
                title="Seat 1 to bottom"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <div />
            </div>
          </div>
        </div>

        {/* Seat list + dietary */}
        <div className="space-y-4">
          {dietarySummary && (
            <div className="text-xs text-muted-foreground px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200">
              <span className="font-medium text-amber-800">
                Dietary:
              </span>{" "}
              {dietarySummary}
            </div>
          )}

          {seated.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No guests seated yet. Pick a guest and click a seat.
            </p>
          ) : (
            <ul className="space-y-1">
              {Array.from({ length: capacity }).map((_, idx) => {
                const seatNum = idx + 1;
                const guest = seated.find((g) => g.seat_number === seatNum);
                const isSelected = guest && selectedGuestId === guest.id;
                const isDropTarget = dragOverSeat === seatNum;
                const isBeingDragged =
                  guest && draggingGuestId === guest.id;

                return (
                  <li
                    key={seatNum}
                    className={cn(
                      "group/row flex items-center gap-2 text-sm rounded-md transition-colors",
                      isDropTarget && "bg-primary/10 ring-1 ring-primary/60",
                      isBeingDragged && "opacity-40"
                    )}
                    onDragOver={(e) => {
                      // Only accept drops when there's an active drag
                      if (draggingGuestId) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverSeat !== seatNum) setDragOverSeat(seatNum);
                      }
                    }}
                    onDragLeave={() => {
                      if (dragOverSeat === seatNum) setDragOverSeat(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData("text/plain");
                      if (draggedId) onGuestDragToSeat(draggedId, seatNum);
                      setDragOverSeat(null);
                      setDraggingGuestId(null);
                    }}
                  >
                    <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">
                      {seatNum}
                    </span>
                    {guest ? (
                      <>
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", guest.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingGuestId(guest.id);
                          }}
                          onDragEnd={() => {
                            setDraggingGuestId(null);
                            setDragOverSeat(null);
                          }}
                          onClick={() => onGuestPillClick(guest.id)}
                          title={`Drag to another seat, or click to select and move ${guest.first_name} ${guest.last_name}`}
                          className={cn(
                            "flex-1 flex items-center gap-1.5 text-left pl-1 pr-2 py-0.5 rounded-md transition-colors cursor-grab active:cursor-grabbing",
                            isSelected
                              ? "bg-primary text-primary-foreground ring-2 ring-primary"
                              : "hover:bg-muted/60"
                          )}
                        >
                          <GripVertical
                            className={cn(
                              "h-3 w-3",
                              isSelected
                                ? "opacity-70"
                                : "opacity-30 group-hover/row:opacity-60"
                            )}
                          />
                          <span className="truncate">
                            {guest.first_name} {guest.last_name}
                          </span>
                          {(() => {
                            const diet = dietaryLabel(guest);
                            if (!diet) return null;
                            return (
                              <span
                                className={cn(
                                  "ml-auto inline-block px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0",
                                  isSelected
                                    ? "bg-white/20 text-primary-foreground"
                                    : "bg-amber-100 text-amber-800"
                                )}
                                title={diet.full}
                              >
                                {diet.short}
                              </span>
                            );
                          })()}
                        </button>
                        <button
                          type="button"
                          onClick={() => onGuestUnassign(guest.id)}
                          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted opacity-0 group-hover/row:opacity-100 transition-all"
                          aria-label={`Unseat ${guest.first_name}`}
                          title={`Unseat ${guest.first_name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSeatClick(seatNum)}
                        className={cn(
                          "flex-1 text-left pl-1 pr-2 py-0.5 rounded-md text-muted-foreground/60 italic hover:bg-muted/40 transition-colors",
                          isSelectable && "text-muted-foreground",
                          isDropTarget && "text-primary font-medium not-italic"
                        )}
                      >
                        {isDropTarget
                          ? "(drop here)"
                          : isSelectable
                            ? "(click to place here)"
                            : "empty"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
