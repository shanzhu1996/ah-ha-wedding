"use client";

import { useState } from "react";
import { Trash2, Pencil, Check, X, GripVertical } from "lucide-react";
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

interface Props {
  id: string;
  number: number;
  name: string | null;
  shape: TableShape;
  capacity: number;
  rotation?: 0 | 90 | 180 | 270;
  seated: SeatedGuest[]; // all guests assigned to this table
  isSelectable: boolean; // user has a guest selected — clicks will assign/swap
  selectedGuestId: string | null; // a guest selected in sidebar OR on another table
  onSeatClick: (seatNumber: number) => void;
  onGuestPillClick: (guestId: string) => void;
  onGuestUnassign: (guestId: string) => void;
  onDelete: () => void;
  onRename: (newName: string | null) => Promise<void> | void;
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

// ── Component ──────────────────────────────────────────────────────────

export function TableCard({
  id,
  number,
  name,
  shape,
  capacity,
  rotation = 0,
  seated,
  isSelectable,
  selectedGuestId,
  onSeatClick,
  onGuestPillClick,
  onGuestUnassign,
  onDelete,
  onRename,
  tagColor,
}: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name ?? "");
  const [saving, setSaving] = useState(false);

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

  // Find the selected seat number (if any) — for ring highlight
  const selectedSeat = seated.find(
    (g) => g.id === selectedGuestId && g.seat_number
  )?.seat_number ?? undefined;

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
    <div className="group/table rounded-lg border border-border/60 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 min-h-[28px]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Table {number}
            </span>
            <span className="text-xs text-muted-foreground/60 tabular-nums">
              {seated.length} / {capacity}
            </span>
          </div>
          {editingName ? (
            <div className="flex items-center gap-1 mt-1">
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
                className="h-7 text-sm"
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
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setNameDraft(name ?? "");
                  setEditingName(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group/name"
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
        <button
          type="button"
          onClick={onDelete}
          className="opacity-0 group-hover/table:opacity-100 transition-opacity h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
          aria-label={`Delete Table ${number}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Visual */}
      <div
        className={cn(
          "flex justify-center py-2",
          isSelectable && "cursor-cell"
        )}
      >
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
      </div>

      {/* Seated guest pills */}
      {seated.length > 0 && (
        <ul className="flex flex-wrap gap-1 text-[11px]">
          {seated
            .slice()
            .sort(
              (a, b) => (a.seat_number ?? 99) - (b.seat_number ?? 99)
            )
            .map((g) => {
              const isSelected = selectedGuestId === g.id;
              return (
                <li key={g.id} className="group/pill relative inline-flex">
                  <button
                    type="button"
                    onClick={() => onGuestPillClick(g.id)}
                    title={`Click to move ${g.first_name} ${g.last_name}`}
                    className={cn(
                      "pl-1 pr-2 py-0.5 rounded-full transition-all inline-flex items-center gap-1",
                      isSelected
                        ? "bg-primary text-primary-foreground ring-2 ring-primary"
                        : cn(
                            tagColor(g.relationship_tag),
                            "hover:ring-2 ring-primary/40"
                          )
                    )}
                  >
                    <GripVertical
                      className={cn(
                        "h-3 w-3 transition-opacity",
                        isSelected
                          ? "opacity-70"
                          : "opacity-40 group-hover/pill:opacity-70"
                      )}
                    />
                    <span className="opacity-70 tabular-nums">
                      {g.seat_number}
                    </span>
                    <span className="truncate max-w-[140px]">
                      {g.first_name} {g.last_name[0]}.
                    </span>
                    {hasDietary(g) && (
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isSelected ? "bg-white/80" : "bg-amber-500"
                        )}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGuestUnassign(g.id);
                    }}
                    title={`Unseat ${g.first_name} ${g.last_name}`}
                    aria-label={`Unseat ${g.first_name} ${g.last_name}`}
                    className={cn(
                      "absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-background border border-border shadow-sm flex items-center justify-center text-muted-foreground hover:text-destructive hover:border-destructive transition-all",
                      "opacity-0 group-hover/pill:opacity-100"
                    )}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
