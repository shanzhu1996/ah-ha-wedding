"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AddTableDialog } from "./add-table-dialog";
import { UnassignedSidebar } from "./unassigned-sidebar";
import { TableCard } from "./table-card";
import { useSeatAssignment } from "./use-seat-assignment";
import type { TableShape } from "./table-templates";

// ── Types ──────────────────────────────────────────────────────────────

interface Table {
  id: string;
  wedding_id: string;
  number: number;
  name: string | null;
  capacity: number;
  shape: string;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
}

interface Guest {
  id: string;
  wedding_id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  table_id: string | null;
  seat_number: number | null;
  relationship_tag: string | null;
}

interface Props {
  tables: Table[];
  guests: Guest[];
  weddingId: string;
}

// ── Tag color palette (carried over from old seating-manager) ──────────

const TAG_COLORS: Record<string, string> = {};
const PALETTE = [
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-amber-100 text-amber-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
  "bg-lime-100 text-lime-800",
  "bg-orange-100 text-orange-800",
];

function tagColor(tag: string | null): string {
  if (!tag) return "bg-gray-100 text-gray-600";
  if (!TAG_COLORS[tag]) {
    TAG_COLORS[tag] = PALETTE[Object.keys(TAG_COLORS).length % PALETTE.length];
  }
  return TAG_COLORS[tag];
}

// ── Component ──────────────────────────────────────────────────────────

export function SeatingManager({
  tables: initialTables,
  guests: initialGuests,
  weddingId,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { assign, unassign, swap, applyOverlay } = useSeatAssignment();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [selectionLabel, setSelectionLabel] = useState<string | null>(null);
  const selectedGuestId =
    selectedGuestIds.length === 1 ? selectedGuestIds[0] : null;

  // Apply optimistic overlays to guests
  const guests = useMemo(
    () => initialGuests.map((g) => applyOverlay(g)),
    [initialGuests, applyOverlay]
  );

  function clearSelection() {
    setSelectedGuestIds([]);
    setSelectionLabel(null);
  }

  // Unseat a single guest
  async function unseatGuest(guestId: string) {
    await unassign(guestId);
  }

  // Dismiss selection / unseat with keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") clearSelection();
      if ((e.key === "Delete" || e.key === "Backspace") && selectedGuestIds.length > 0) {
        // Only unseat seated guests; don't nuke unassigned ones
        const seatedIds = selectedGuestIds.filter((id) => {
          const g = initialGuests.find((x) => x.id === id);
          return g?.table_id;
        });
        if (seatedIds.length === 0) return;
        e.preventDefault();
        seatedIds.forEach((id) => unassign(id));
        clearSelection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuestIds, initialGuests]);

  // ── Derived data ────────────────────────────────────────────────────

  const unassigned = guests.filter((g) => !g.table_id);
  const confirmed = guests.filter((g) => g.rsvp_status === "confirmed");
  const unseatedConfirmed = confirmed.filter((g) => !g.table_id).length;
  const totalCapacity = initialTables.reduce((s, t) => s + t.capacity, 0);
  const recommendedTables = Math.ceil(confirmed.length / 10);

  // Build a guest map for swap lookups
  const guestMap = useMemo(() => {
    const m = new Map<string, Guest>();
    guests.forEach((g) => m.set(g.id, g));
    return m;
  }, [guests]);

  // Tagline
  const taglineParts: string[] = [];
  if (unseatedConfirmed > 0) {
    taglineParts.push(`${unseatedConfirmed} to seat`);
  } else if (confirmed.length > 0 && initialTables.length > 0) {
    taglineParts.push(`all ${confirmed.length} seated`);
  }
  if (initialTables.length > 0) {
    taglineParts.push(
      `${initialTables.length} ${
        initialTables.length === 1 ? "table" : "tables"
      }`
    );
  }
  if (
    initialTables.length === 0 &&
    confirmed.length > 0 &&
    recommendedTables > 0
  ) {
    taglineParts.push(
      `need ~${recommendedTables} round 10${recommendedTables === 1 ? "" : "s"}`
    );
  }

  // ── Mutations ───────────────────────────────────────────────────────

  async function createTable(input: {
    shape: TableShape;
    capacity: number;
    name: string | null;
  }) {
    const nextNumber =
      initialTables.reduce((max, t) => Math.max(max, t.number), 0) + 1;
    await supabase.from("tables").insert({
      wedding_id: weddingId,
      number: nextNumber,
      name: input.name,
      capacity: input.capacity,
      shape: input.shape,
    });
    router.refresh();
  }

  async function deleteTable(tableId: string) {
    if (!confirm("Delete this table? Guests will be unseated.")) return;
    // Clear both table_id AND seat_number first (no FK cascade in schema)
    await supabase
      .from("guests")
      .update({ table_id: null, seat_number: null })
      .eq("table_id", tableId);
    await supabase.from("tables").delete().eq("id", tableId);
    router.refresh();
  }

  async function renameTable(tableId: string, name: string | null) {
    await supabase.from("tables").update({ name }).eq("id", tableId);
    router.refresh();
  }

  async function autoAssign() {
    if (!confirm("Auto-assign all unassigned confirmed guests?")) return;
    if (initialTables.length === 0) return;

    // Group unassigned confirmed guests by relationship_tag
    const unassignedConfirmed = unassigned.filter(
      (g) => g.rsvp_status === "confirmed"
    );
    const byTag = new Map<string, Guest[]>();
    for (const g of unassignedConfirmed) {
      const tag = g.relationship_tag?.trim() || "_ungrouped";
      const list = byTag.get(tag) ?? [];
      list.push(g);
      byTag.set(tag, list);
    }
    // Alphabetical queue so same tag stays adjacent
    const queue: Guest[] = [];
    Array.from(byTag.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([, list]) => queue.push(...list));

    // Current occupancy per table
    const occupancy = new Map<string, Set<number>>();
    initialTables.forEach((t) => occupancy.set(t.id, new Set()));
    guests.forEach((g) => {
      if (g.table_id && g.seat_number) {
        occupancy.get(g.table_id)?.add(g.seat_number);
      }
    });

    // Assign each guest to first table with an open seat
    for (const g of queue) {
      for (const t of initialTables) {
        const taken = occupancy.get(t.id) ?? new Set();
        if (taken.size >= t.capacity) continue;
        // Find next open seat (1-based)
        let openSeat = 1;
        while (taken.has(openSeat)) openSeat++;
        if (openSeat > t.capacity) continue;
        taken.add(openSeat);
        occupancy.set(t.id, taken);
        await assign(g.id, t.id, openSeat);
        break;
      }
    }
    router.refresh();
  }

  // ── Click-to-assign / swap logic ────────────────────────────────────

  async function handleSeatClick(tableId: string, seatNumber: number) {
    // No selection — if seat has a guest, select them
    if (selectedGuestIds.length === 0) {
      const occupant = guests.find(
        (g) => g.table_id === tableId && g.seat_number === seatNumber
      );
      if (occupant) setSelectedGuestIds([occupant.id]);
      return;
    }

    // ── Group selection: fill consecutive empty seats from the clicked seat ──
    if (selectedGuestIds.length > 1) {
      const table = initialTables.find((t) => t.id === tableId);
      if (!table) return;
      const taken = new Set(
        guests
          .filter(
            (g) =>
              g.table_id === tableId &&
              g.seat_number &&
              !selectedGuestIds.includes(g.id)
          )
          .map((g) => g.seat_number as number)
      );
      // Walk seat numbers starting at clicked seat, wrap around
      const openSeats: number[] = [];
      for (let i = 0; i < table.capacity; i++) {
        const s = ((seatNumber - 1 + i) % table.capacity) + 1;
        if (!taken.has(s)) openSeats.push(s);
        if (openSeats.length >= selectedGuestIds.length) break;
      }
      // Assign as many as fit
      for (let i = 0; i < Math.min(openSeats.length, selectedGuestIds.length); i++) {
        await assign(selectedGuestIds[i], tableId, openSeats[i]);
      }
      clearSelection();
      return;
    }

    // ── Single selection ──
    const selected = guestMap.get(selectedGuestIds[0]);
    if (!selected) {
      clearSelection();
      return;
    }

    const occupant = guests.find(
      (g) =>
        g.table_id === tableId &&
        g.seat_number === seatNumber &&
        g.id !== selected.id
    );

    if (!occupant) {
      await assign(selected.id, tableId, seatNumber);
      clearSelection();
      return;
    }

    // Occupied seat → swap (uses RPC)
    if (selected.table_id && selected.seat_number) {
      await swap(
        { id: selected.id, table_id: selected.table_id, seat_number: selected.seat_number },
        { id: occupant.id, table_id: occupant.table_id, seat_number: occupant.seat_number }
      );
    } else {
      // Selected is unassigned; bump occupant to unseated, then place selected
      await unassign(occupant.id);
      await assign(selected.id, tableId, seatNumber);
    }
    clearSelection();
  }

  function handleGuestPillClick(guestId: string) {
    if (selectedGuestIds.length === 0) {
      setSelectedGuestIds([guestId]);
      setSelectionLabel(null);
      return;
    }
    if (selectedGuestIds.length === 1 && selectedGuestIds[0] === guestId) {
      clearSelection();
      return;
    }
    // Single selection + different guest pill clicked → swap them
    if (selectedGuestIds.length === 1) {
      const a = guestMap.get(selectedGuestIds[0]);
      const b = guestMap.get(guestId);
      if (a && b) {
        swap(
          { id: a.id, table_id: a.table_id, seat_number: a.seat_number },
          { id: b.id, table_id: b.table_id, seat_number: b.seat_number }
        );
      }
      clearSelection();
      return;
    }
    // Group selection active + pill clicked → just replace with single guest
    setSelectedGuestIds([guestId]);
    setSelectionLabel(null);
  }

  function handleSidebarSelectGuest(guestId: string | null) {
    if (guestId === null) {
      clearSelection();
      return;
    }
    setSelectedGuestIds([guestId]);
    setSelectionLabel(null);
  }

  function handleSidebarSelectGroup(guestIds: string[], groupName: string) {
    // If same group already selected, toggle off
    if (
      selectedGuestIds.length === guestIds.length &&
      guestIds.every((id) => selectedGuestIds.includes(id))
    ) {
      clearSelection();
      return;
    }
    setSelectedGuestIds(guestIds);
    setSelectionLabel(groupName);
  }

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Editorial header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Seating chart
        </h1>
        {taglineParts.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {taglineParts.map((part, i) => (
              <span key={i}>
                {i > 0 && (
                  <span className="text-muted-foreground/50"> · </span>
                )}
                <span
                  className={cn(
                    i === 0 &&
                      unseatedConfirmed > 0 &&
                      "font-medium text-foreground/80"
                  )}
                >
                  {part}
                </span>
              </span>
            ))}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add table
        </Button>
        {initialTables.length > 0 && unseatedConfirmed > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={autoAssign}
            className="gap-1.5"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Auto-assign
          </Button>
        )}
        {selectedGuestIds.length > 0 && (
          <div className="text-xs ml-2 px-2 py-1 rounded-md bg-primary/10 text-primary font-medium inline-flex items-center gap-2">
            <span>
              {selectedGuestIds.length === 1 ? (
                <>Click a seat to place</>
              ) : (
                <>
                  {selectedGuestIds.length} guests selected
                  {selectionLabel && ` from ${selectionLabel}`} · click a seat to start filling
                </>
              )}
            </span>
            {/* Unseat button only shown when ALL selected guests are currently seated */}
            {selectedGuestIds.every((id) => {
              const g = initialGuests.find((x) => x.id === id);
              return g?.table_id;
            }) && (
              <>
                <span className="text-primary/40">·</span>
                <button
                  type="button"
                  onClick={() => {
                    selectedGuestIds.forEach((id) => unassign(id));
                    clearSelection();
                  }}
                  className="underline hover:text-foreground"
                >
                  unseat
                </button>
              </>
            )}
            <span className="text-primary/40">·</span>
            <button
              type="button"
              onClick={clearSelection}
              className="underline hover:text-foreground"
            >
              cancel
            </button>
          </div>
        )}
      </div>

      {/* Persistent help hint when nothing selected yet and tables exist */}
      {initialTables.length > 0 &&
        selectedGuestIds.length === 0 &&
        guests.length > 0 && (
          <p className="text-xs text-muted-foreground -mt-4 leading-relaxed">
            <strong className="font-medium text-foreground/70">Click any name</strong>{" "}
            — unassigned on the right, or seated on a table — then click a seat to place or
            swap. Hover a seated name to unseat (×) or press Delete.
          </p>
        )}

      {/* Main layout: tables grid + unassigned sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Tables area */}
        <div>
          {initialTables.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border/60 rounded-lg">
              <p className="text-sm text-muted-foreground mb-4">
                No tables yet. Pick a shape to get started.
              </p>
              <Button onClick={() => setAddOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add your first table
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initialTables.map((t) => {
                const seated = guests.filter((g) => g.table_id === t.id);
                return (
                  <TableCard
                    key={t.id}
                    id={t.id}
                    number={t.number}
                    name={t.name}
                    shape={t.shape as TableShape}
                    capacity={t.capacity}
                    seated={seated}
                    isSelectable={selectedGuestId !== null}
                    selectedGuestId={selectedGuestId}
                    onSeatClick={(seat) => handleSeatClick(t.id, seat)}
                    onGuestPillClick={handleGuestPillClick}
                    onGuestUnassign={unseatGuest}
                    onDelete={() => deleteTable(t.id)}
                    onRename={(name) => renameTable(t.id, name)}
                    tagColor={tagColor}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Unassigned sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <UnassignedSidebar
            guests={unassigned}
            selectedGuestIds={selectedGuestIds}
            onSelectGuest={handleSidebarSelectGuest}
            onSelectGroup={handleSidebarSelectGroup}
            tagColor={tagColor}
          />
        </aside>
      </div>

      <AddTableDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={createTable}
      />
    </div>
  );
}
