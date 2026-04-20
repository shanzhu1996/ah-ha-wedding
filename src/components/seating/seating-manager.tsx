"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Wand2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { AddTableDialog } from "./add-table-dialog";
import { RoomCanvas } from "./room-canvas";
import { TableDetailPanel } from "./table-detail-panel";
import {
  TableVisual,
  dietaryKindFor,
  type SeatAssignment,
} from "./table-visual";
import { DietarySummary } from "./dietary-summary";
import { toast } from "sonner";
import { triggerConfetti } from "@/components/ui/confetti";
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
  rotation: number;
  notes: string | null;
  locked: boolean;
  sweetheart_partner_swap: boolean;
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
  /** Newlywed names — shown on sweetheart tables as virtual seats and labels */
  partner1Name?: string | null;
  partner2Name?: string | null;
}

// ── Tag color palette ──────────────────────────────────────────────────

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

// ── Shape helpers for room view ────────────────────────────────────────

function tableBoundsForShape(shape: TableShape, capacity: number) {
  // Approximate bounding box of the TableVisual SVG + seat perimeter
  // Round seat radius ~ 82 from computeSeatPositions → total ~200 with margin
  if (shape === "sweetheart") return { width: 200, height: 120 };
  if (shape === "rectangle") return { width: 240, height: 140 };
  return { width: 200, height: 200 }; // round / square
}

// ── Component ──────────────────────────────────────────────────────────

export function SeatingManager({
  tables: initialTables,
  guests: initialGuests,
  weddingId,
  partner1Name,
  partner2Name,
}: Props) {
  // Friendly label for a sweetheart table, and virtual seat assignments for
  // seats 1/2 so the couple's names show up as defaults. When a specific
  // sweetheart has partner_swap=true, partner2 takes seat 1.
  const sweetheartLabel =
    partner1Name && partner2Name
      ? `${partner1Name} & ${partner2Name}`
      : "Sweetheart";
  const firstInitial = (name: string | null | undefined) =>
    name?.trim()?.[0]?.toUpperCase() ?? "";
  const buildSweetheartVirtualSeats = useCallback(
    (swap: boolean): Record<number, SeatAssignment> => {
      const seats: Record<number, SeatAssignment> = {};
      const seatOneName = swap ? partner2Name : partner1Name;
      const seatTwoName = swap ? partner1Name : partner2Name;
      const seatOneId = swap ? "__partner2__" : "__partner1__";
      const seatTwoId = swap ? "__partner1__" : "__partner2__";
      if (seatOneName?.trim()) {
        seats[1] = {
          guestId: seatOneId,
          initials: firstInitial(seatOneName),
          dietaryKind: null,
          fullName: seatOneName,
        };
      }
      if (seatTwoName?.trim()) {
        seats[2] = {
          guestId: seatTwoId,
          initials: firstInitial(seatTwoName),
          dietaryKind: null,
          fullName: seatTwoName,
        };
      }
      return seats;
    },
    [partner1Name, partner2Name]
  );
  const router = useRouter();
  const supabase = createClient();
  const { assign, unassign, swap, applyOverlay } = useSeatAssignment();

  const [addOpen, setAddOpen] = useState(false);
  // Selection state removed 2026-04-19 — the old "pick a guest → click a seat"
  // flow was replaced by the inline per-seat picker in TableDetailPanel.
  // Kept as a const so existing code paths don't break while we clean up.
  const selectedGuestId: string | null = null;
  const setSelectedGuestId: (id: string | null) => void = () => {};
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  // Briefly pulse a seat (e.g. after guest-search jump) — {tableId, seat}.
  const [highlightSeat, setHighlightSeat] = useState<{
    tableId: string;
    seatNumber: number;
  } | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Undo / redo history ─────────────────────────────────────────────
  // In-memory only. Each entry knows how to undo and redo itself.
  // Stored in refs so we can read current values synchronously from
  // keyboard handlers and mutation callbacks.
  interface HistoryEntry {
    label: string;
    undo: () => Promise<unknown>;
    redo: () => Promise<unknown>;
  }
  const HISTORY_LIMIT = 20;
  const historyRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);

  function pushHistory(entry: HistoryEntry) {
    historyRef.current = [
      ...historyRef.current.slice(-(HISTORY_LIMIT - 1)),
      entry,
    ];
    futureRef.current = [];
  }

  async function undoLast() {
    const last = historyRef.current[historyRef.current.length - 1];
    if (!last) return;
    historyRef.current = historyRef.current.slice(0, -1);
    await last.undo();
    futureRef.current = [...futureRef.current, last];
    toast(`Undone: ${last.label}`, {
      action: { label: "Redo", onClick: () => redoLast() },
    });
  }

  async function redoLast() {
    const next = futureRef.current[futureRef.current.length - 1];
    if (!next) return;
    futureRef.current = futureRef.current.slice(0, -1);
    await next.redo();
    historyRef.current = [...historyRef.current, next];
    toast(`Redone: ${next.label}`, {
      action: { label: "Undo", onClick: () => undoLast() },
    });
  }

  // Apply optimistic overlays to guests
  const guests = useMemo(
    () => initialGuests.map((g) => applyOverlay(g)),
    [initialGuests, applyOverlay]
  );

  function clearSelection() {
    setSelectedGuestId(null);
  }

  // Jump to a seated guest: open their table + pulse their seat for ~2s.
  function jumpToSeated(
    _guestId: string,
    tableId: string,
    seatNumber: number
  ) {
    setSelectedTableId(tableId);
    setHighlightSeat({ tableId, seatNumber });
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightSeat(null);
    }, 2200);
  }

  // Cleanup pending highlight timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  // Dismiss selection / unseat with keyboard — and Cmd/Ctrl+Z undo/redo
  useEffect(() => {
    function isEditable(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }
    function onKey(e: KeyboardEvent) {
      // Undo/redo — don't hijack when user is typing in inputs/textarea
      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z")) {
        if (isEditable(e.target)) return;
        e.preventDefault();
        if (e.shiftKey) {
          redoLast();
        } else {
          undoLast();
        }
        return;
      }
      if (e.key === "Escape") {
        clearSelection();
        setSelectedTableId(null);
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedGuestId
      ) {
        const g = initialGuests.find((x) => x.id === selectedGuestId);
        if (!g?.table_id) return;
        if (isEditable(e.target)) return;
        e.preventDefault();
        unseatGuest(selectedGuestId);
        clearSelection();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGuestId, initialGuests]);

  // ── Derived data ────────────────────────────────────────────────────

  const unassigned = guests.filter((g) => !g.table_id);
  const confirmed = guests.filter((g) => g.rsvp_status === "confirmed");
  const seatedConfirmed = confirmed.filter((g) => g.table_id).length;
  const unseatedConfirmed = confirmed.filter((g) => !g.table_id).length;
  const pendingRsvp = guests.filter(
    (g) => g.rsvp_status === "pending" || g.rsvp_status === "no_response"
  ).length;

  // Completion celebration — fires once per wedding when every confirmed
  // guest has a seat. Uses localStorage so undo/redo or returning users
  // don't re-trigger the confetti.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (confirmed.length === 0) return;
    if (unseatedConfirmed > 0) return;
    const key = `ahha:seating-confetti-seen:${weddingId}`;
    if (localStorage.getItem(key) === "1") return;
    triggerConfetti();
    localStorage.setItem(key, "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseatedConfirmed, confirmed.length, weddingId]);
  const recommendedTables = Math.ceil(confirmed.length / 10);

  // Tables full/partial counts
  const tableFills = useMemo(() => {
    return initialTables.map((t) => {
      const seated = guests.filter((g) => g.table_id === t.id).length;
      return { id: t.id, seated, capacity: t.capacity };
    });
  }, [initialTables, guests]);
  const tablesFull = tableFills.filter(
    (t) => t.capacity > 0 && t.seated >= t.capacity
  ).length;

  // Guest map for lookup
  const guestMap = useMemo(() => {
    const m = new Map<string, Guest>();
    guests.forEach((g) => m.set(g.id, g));
    return m;
  }, [guests]);

  // Build tagline — richer, honest counts. Each part hides when count is 0.
  interface TaglinePart {
    text: string;
    emphasize?: boolean;
  }
  const taglineParts: TaglinePart[] = [];

  // Primary counts
  if (confirmed.length > 0) {
    taglineParts.push({
      text: `${seatedConfirmed} of ${confirmed.length} seated`,
    });
  }
  if (unseatedConfirmed > 0) {
    taglineParts.push({
      text: `${unseatedConfirmed} unseated confirmed`,
      emphasize: true, // the actionable number
    });
  }
  if (pendingRsvp > 0) {
    taglineParts.push({
      text: `${pendingRsvp} RSVP${pendingRsvp === 1 ? "" : "s"} pending`,
    });
  }
  if (initialTables.length > 0) {
    taglineParts.push({
      text:
        tablesFull > 0
          ? `${tablesFull} of ${initialTables.length} ${initialTables.length === 1 ? "table" : "tables"} full`
          : `${initialTables.length} ${initialTables.length === 1 ? "table" : "tables"}`,
    });
  }
  // Fallback: when there are no tables yet and we have confirmed guests, recommend count
  if (
    initialTables.length === 0 &&
    confirmed.length > 0 &&
    recommendedTables > 0
  ) {
    taglineParts.push({
      text: `need ~${recommendedTables} round 10${recommendedTables === 1 ? "" : "s"}`,
    });
  }

  // ── Table mutations ─────────────────────────────────────────────────

  async function createTable(input: {
    shape: TableShape;
    capacity: number;
    name: string | null;
  }) {
    // Sweethearts sit outside the 1..N sequence (they display as
    // "Sweetheart" / "Partner & Partner" instead of "Table N"). Give them
    // number 0 so they never collide with regular numbering.
    const nextNumber =
      input.shape === "sweetheart"
        ? 0
        : initialTables
            .filter((t) => t.shape !== "sweetheart")
            .reduce((max, t) => Math.max(max, t.number), 0) + 1;

    // Place the new table next to the existing cluster so it's immediately
    // visible on the canvas instead of landing at (0,0) off-screen.
    let position_x = 0;
    let position_y = 0;
    const placed = initialTables.filter(
      (t) => (t.position_x ?? 0) !== 0 || (t.position_y ?? 0) !== 0
    );
    if (placed.length > 0) {
      // Drop the new table to the right of the rightmost existing one
      const rightmost = placed.reduce(
        (acc, t) => ((t.position_x ?? 0) > acc ? (t.position_x ?? 0) : acc),
        -Infinity
      );
      const avgY =
        placed.reduce((s, t) => s + (t.position_y ?? 0), 0) / placed.length;
      position_x = rightmost + 260;
      position_y = Math.round(avgY);
    }

    await supabase.from("tables").insert({
      wedding_id: weddingId,
      number: nextNumber,
      name: input.name,
      capacity: input.capacity,
      shape: input.shape,
      position_x,
      position_y,
    });
    router.refresh();
  }

  async function deleteTable(tableId: string) {
    if (!confirm("Delete this table? Guests will be unseated.")) return;
    await supabase
      .from("guests")
      .update({ table_id: null, seat_number: null })
      .eq("table_id", tableId);
    await supabase.from("tables").delete().eq("id", tableId);

    // Renumber remaining NON-SWEETHEART tables so numbering stays 1..N.
    // Sweethearts live outside the sequence and keep number=0.
    // Iterating in ascending order of current number means each reassignment
    // targets a number that's either already correct or about to be freed.
    const remaining = initialTables
      .filter((t) => t.id !== tableId && t.shape !== "sweetheart")
      .sort((a, b) => a.number - b.number);
    for (let i = 0; i < remaining.length; i++) {
      const want = i + 1;
      if (remaining[i].number !== want) {
        await supabase
          .from("tables")
          .update({ number: want })
          .eq("id", remaining[i].id);
      }
    }

    if (selectedTableId === tableId) setSelectedTableId(null);
    router.refresh();
  }

  async function renameTable(tableId: string, name: string | null) {
    await supabase.from("tables").update({ name }).eq("id", tableId);
    router.refresh();
  }

  async function rotateTable(tableId: string, rotation: 0 | 90 | 180 | 270) {
    await supabase.from("tables").update({ rotation }).eq("id", tableId);
    router.refresh();
  }

  async function updateTableNotes(tableId: string, notes: string | null) {
    await supabase.from("tables").update({ notes }).eq("id", tableId);
    router.refresh();
  }

  async function toggleTableLock(tableId: string, locked: boolean) {
    await supabase.from("tables").update({ locked }).eq("id", tableId);
    router.refresh();
  }

  async function toggleSweetheartSwap(tableId: string, swap: boolean) {
    await supabase
      .from("tables")
      .update({ sweetheart_partner_swap: swap })
      .eq("id", tableId);
    router.refresh();
  }

  // Debounced position save (canvas drag)
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const moveTable = useCallback(
    (tableId: string, x: number, y: number) => {
      const existing = saveTimeoutRef.current[tableId];
      if (existing) clearTimeout(existing);
      saveTimeoutRef.current[tableId] = setTimeout(async () => {
        await supabase
          .from("tables")
          .update({ position_x: x, position_y: y })
          .eq("id", tableId);
        router.refresh();
      }, 250);
    },
    [supabase, router]
  );

  // ── Unseat a single guest ───────────────────────────────────────────

  async function unseatGuest(guestId: string) {
    const g = initialGuests.find((x) => x.id === guestId);
    const name = g ? `${g.first_name} ${g.last_name}` : "guest";
    await recordedUnassign(guestId, `Unseated ${name}`);
  }

  // ── History-recording mutation wrappers ─────────────────────────────
  // Every user-initiated guest-seat mutation goes through one of these.
  // Raw assign/unassign/swap (from useSeatAssignment) are still used
  // directly from the undo/redo closures so they don't re-record history.

  async function recordedAssign(
    guestId: string,
    tableId: string,
    seatNumber: number,
    label = "Placed guest"
  ) {
    const prev = initialGuests.find((g) => g.id === guestId);
    const prevTableId = prev?.table_id ?? null;
    const prevSeatNumber = prev?.seat_number ?? null;
    const result = await assign(guestId, tableId, seatNumber);
    if (result.ok) {
      pushHistory({
        label,
        undo: async () => {
          if (prevTableId && prevSeatNumber) {
            await assign(guestId, prevTableId, prevSeatNumber);
          } else {
            await unassign(guestId);
          }
        },
        redo: async () => {
          await assign(guestId, tableId, seatNumber);
        },
      });
      toast(label, {
        action: { label: "Undo", onClick: () => undoLast() },
      });
    }
    return result;
  }

  async function recordedUnassign(guestId: string, label = "Unseated guest") {
    const prev = initialGuests.find((g) => g.id === guestId);
    const prevTableId = prev?.table_id ?? null;
    const prevSeatNumber = prev?.seat_number ?? null;
    const result = await unassign(guestId);
    if (result.ok && prevTableId && prevSeatNumber) {
      pushHistory({
        label,
        undo: async () => {
          await assign(guestId, prevTableId, prevSeatNumber);
        },
        redo: async () => {
          await unassign(guestId);
        },
      });
      toast(label, {
        action: { label: "Undo", onClick: () => undoLast() },
      });
    }
    return result;
  }

  async function recordedSwap(
    a: { id: string; table_id: string | null; seat_number: number | null },
    b: { id: string; table_id: string | null; seat_number: number | null },
    label = "Swapped seats"
  ) {
    const result = await swap(a, b);
    if (result.ok) {
      pushHistory({
        label,
        undo: async () => {
          // Restore each guest to their pre-swap position directly.
          // We can't reuse swap() here because the current DB state
          // reflects the swapped positions already.
          if (a.table_id && a.seat_number) {
            await assign(a.id, a.table_id, a.seat_number);
          } else {
            await unassign(a.id);
          }
          if (b.table_id && b.seat_number) {
            await assign(b.id, b.table_id, b.seat_number);
          } else {
            await unassign(b.id);
          }
        },
        redo: async () => {
          await swap(a, b);
        },
      });
      toast(label, {
        action: { label: "Undo", onClick: () => undoLast() },
      });
    }
    return result;
  }

  // ── Fill empty seats (previously "Auto-assign") ─────────────────────

  interface FillPlanItem {
    guestId: string;
    tableId: string;
    seatNumber: number;
    guestName: string;
    initials: string;
  }
  const [fillPreviewOpen, setFillPreviewOpen] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<FillPlanItem[] | null>(null);

  // Group preview plan by tableId → seat map for rendering ghosts
  const previewByTable = useMemo(() => {
    const map: Record<string, Record<number, SeatAssignment>> = {};
    if (!previewPlan) return map;
    for (const p of previewPlan) {
      if (!map[p.tableId]) map[p.tableId] = {};
      map[p.tableId][p.seatNumber] = {
        guestId: p.guestId,
        initials: p.initials,
        dietaryKind: null,
        fullName: p.guestName,
      };
    }
    return map;
  }, [previewPlan]);

  function computeFillPlan(): FillPlanItem[] {
    const unassignedConfirmed = unassigned.filter(
      (g) => g.rsvp_status === "confirmed"
    );
    const byLastName = new Map<string, Guest[]>();
    for (const g of unassignedConfirmed) {
      const key = (g.last_name || "").trim().toLowerCase() || "_unnamed";
      const list = byLastName.get(key) ?? [];
      list.push(g);
      byLastName.set(key, list);
    }
    const queue: Guest[] = [];
    Array.from(byLastName.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([, list]) => queue.push(...list));

    const occupancy = new Map<string, Set<number>>();
    initialTables.forEach((t) => occupancy.set(t.id, new Set()));
    guests.forEach((g) => {
      if (g.table_id && g.seat_number) {
        occupancy.get(g.table_id)?.add(g.seat_number);
      }
    });

    const plan: FillPlanItem[] = [];
    for (const g of queue) {
      for (const t of initialTables) {
        if (t.locked) continue;
        const taken = occupancy.get(t.id) ?? new Set();
        if (taken.size >= t.capacity) continue;
        let openSeat = 1;
        while (taken.has(openSeat)) openSeat++;
        if (openSeat > t.capacity) continue;
        taken.add(openSeat);
        occupancy.set(t.id, taken);
        plan.push({
          guestId: g.id,
          tableId: t.id,
          seatNumber: openSeat,
          guestName: `${g.first_name} ${g.last_name}`,
          initials:
            (g.first_name?.[0] ?? "") + (g.last_name?.[0] ?? ""),
        });
        break;
      }
    }
    return plan;
  }

  function openFillPreview() {
    setPreviewPlan(computeFillPlan());
    setFillPreviewOpen(true);
  }
  function cancelFillPreview() {
    setPreviewPlan(null);
    setFillPreviewOpen(false);
  }

  // Compute the preview stats whenever the dialog opens
  const fillPreview = useMemo(() => {
    const unassignedConfirmed = unassigned.filter(
      (g) => g.rsvp_status === "confirmed"
    );
    const openSeatsPerTable = initialTables.map((t) => {
      if (t.locked) return 0;
      const taken = guests.filter((g) => g.table_id === t.id).length;
      return Math.max(0, t.capacity - taken);
    });
    const totalOpenSeats = openSeatsPerTable.reduce((s, n) => s + n, 0);
    const tablesEligible = initialTables.filter((t) => !t.locked).length;
    const tablesLocked = initialTables.filter((t) => t.locked).length;
    const willPlace = Math.min(unassignedConfirmed.length, totalOpenSeats);
    return {
      unassignedCount: unassignedConfirmed.length,
      totalOpenSeats,
      tablesEligible,
      tablesLocked,
      willPlace,
      overflow: Math.max(0, unassignedConfirmed.length - totalOpenSeats),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillPreviewOpen, unassigned, initialTables, guests]);

  async function fillEmptySeats() {
    // Use the pre-computed preview plan so the UI and DB writes match
    // exactly what the couple saw as ghosts on the canvas.
    const plan = previewPlan;
    setPreviewPlan(null);
    setFillPreviewOpen(false);
    if (!plan || plan.length === 0) return;

    for (const p of plan) {
      await assign(p.guestId, p.tableId, p.seatNumber);
    }

    const label = `Filled ${plan.length} seat${plan.length === 1 ? "" : "s"}`;
    pushHistory({
      label,
      undo: async () => {
        for (const p of plan) await unassign(p.guestId);
      },
      redo: async () => {
        for (const p of plan) {
          await assign(p.guestId, p.tableId, p.seatNumber);
        }
      },
    });
    toast(label, {
      action: { label: "Undo", onClick: () => undoLast() },
    });
    router.refresh();
  }

  // ── Click-to-assign / swap logic ────────────────────────────────────

  async function handleSeatClick(tableId: string, seatNumber: number) {
    if (!selectedGuestId) {
      // No selection — if seat has a guest, select them
      const occupant = guests.find(
        (g) => g.table_id === tableId && g.seat_number === seatNumber
      );
      if (occupant) setSelectedGuestId(occupant.id);
      return;
    }

    const selected = guestMap.get(selectedGuestId);
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
      await recordedAssign(
        selected.id,
        tableId,
        seatNumber,
        `Placed ${selected.first_name} ${selected.last_name}`
      );
      clearSelection();
      return;
    }

    if (selected.table_id && selected.seat_number) {
      await recordedSwap(
        {
          id: selected.id,
          table_id: selected.table_id,
          seat_number: selected.seat_number,
        },
        {
          id: occupant.id,
          table_id: occupant.table_id,
          seat_number: occupant.seat_number,
        },
        `Swapped ${selected.first_name} and ${occupant.first_name}`
      );
    } else {
      await recordedUnassign(
        occupant.id,
        `Unseated ${occupant.first_name} ${occupant.last_name}`
      );
      await recordedAssign(
        selected.id,
        tableId,
        seatNumber,
        `Placed ${selected.first_name} ${selected.last_name}`
      );
    }
    clearSelection();
  }

  function handleGuestPillClick(guestId: string) {
    if (selectedGuestId === null) {
      setSelectedGuestId(guestId);
      return;
    }
    if (selectedGuestId === guestId) {
      clearSelection();
      return;
    }
    const a = guestMap.get(selectedGuestId);
    const b = guestMap.get(guestId);
    if (a && b) {
      recordedSwap(
        { id: a.id, table_id: a.table_id, seat_number: a.seat_number },
        { id: b.id, table_id: b.table_id, seat_number: b.seat_number },
        `Swapped ${a.first_name} and ${b.first_name}`
      );
    }
    clearSelection();
  }

  // Drag-to-seat in detail panel: drop on empty → move; drop on occupied → swap
  async function handleGuestDragToSeat(
    draggedGuestId: string,
    tableId: string,
    targetSeatNumber: number
  ) {
    const dragged = guestMap.get(draggedGuestId);
    if (!dragged) return;
    // Dropped onto its own seat → no-op
    if (
      dragged.table_id === tableId &&
      dragged.seat_number === targetSeatNumber
    ) {
      return;
    }
    const occupant = guests.find(
      (g) =>
        g.table_id === tableId &&
        g.seat_number === targetSeatNumber &&
        g.id !== dragged.id
    );
    if (!occupant) {
      await recordedAssign(
        dragged.id,
        tableId,
        targetSeatNumber,
        `Moved ${dragged.first_name} ${dragged.last_name}`
      );
      return;
    }
    // Occupied → reject. Swap was removed 2026-04-19 to keep the mental
    // model simple (drag only lands on empty seats). To swap two people,
    // unseat one first then drag the other. Note: `occupant` is kept in scope
    // so the toast can name whose seat is taken.
    toast.info(
      `Seat is taken by ${occupant.first_name} ${occupant.last_name} — unseat them first.`
    );
  }

  // ── Selected table for detail panel ─────────────────────────────────

  const selectedTable = selectedTableId
    ? initialTables.find((t) => t.id === selectedTableId)
    : null;
  const seatedAtSelected = selectedTable
    ? guests.filter((g) => g.table_id === selectedTable.id)
    : [];

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Editorial header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Seating
        </h1>
        {taglineParts.length > 0 ? (
          <p className="text-sm text-muted-foreground mt-2">
            {taglineParts.map((part, i) => (
              <span key={i}>
                {i > 0 && (
                  <span className="text-muted-foreground/50"> · </span>
                )}
                <span
                  className={cn(part.emphasize && "font-medium text-foreground/80")}
                >
                  {part.text}
                </span>
              </span>
            ))}
          </p>
        ) : guests.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-2">
            Seating starts with guests.{" "}
            <Link href="/guests" className="text-primary font-medium hover:underline">
              Add guests →
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            Build your floor plan — add tables, open one to pick a guest for each seat. Best done after RSVPs close.
          </p>
        )}
      </div>

      {/* Dietary rollup — click to see per-table breakdown */}
      <DietarySummary guests={guests} tables={initialTables} />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add table
        </Button>
        {initialTables.length > 0 && unseatedConfirmed > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={openFillPreview}
            className="gap-1.5"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Fill empty seats
          </Button>
        )}
      </div>

      {/* Contextual help — varies by state */}
      {initialTables.length === 0 && selectedGuestId === null && (
        <p className="text-xs text-muted-foreground leading-relaxed -mt-3 max-w-xl">
          Start by adding your sweetheart table or head table.
          Everyone else gathers around.
        </p>
      )}
      {initialTables.length > 0 && seatedConfirmed === 0 && (
        <p className="text-xs text-muted-foreground leading-relaxed -mt-3">
          <strong className="font-medium text-foreground/70">Drag tables</strong>{" "}
          to arrange them. Click a table to open it, then click any seat to
          pick a guest.
        </p>
      )}
      {confirmed.length > 0 &&
        unseatedConfirmed === 0 &&
        initialTables.length > 0 && (
          <div className="inline-flex items-center gap-2 -mt-3 px-3 py-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            <Check className="h-3.5 w-3.5" />
            <span className="font-medium">All confirmed guests seated</span>
          </div>
        )}

      {/* Main layout — Room view is the only view */}
      <RoomViewLayout
        initialTables={initialTables}
        guests={guests}
        unassigned={unassigned}
        selectedTableId={selectedTableId}
        setSelectedTableId={setSelectedTableId}
        moveTable={moveTable}
        selectedGuestId={selectedGuestId}
        setSelectedGuestId={setSelectedGuestId}
        selectedTable={selectedTable}
        seatedAtSelected={seatedAtSelected}
        handleSeatClick={handleSeatClick}
        handleGuestPillClick={handleGuestPillClick}
        handleGuestDragToSeat={handleGuestDragToSeat}
        assignGuestToSeat={async (guestId, tableId, seatNumber) => {
          await recordedAssign(
            guestId,
            tableId,
            seatNumber,
            `Placed guest at seat ${seatNumber}`
          );
        }}
        unseatGuest={unseatGuest}
        deleteTable={deleteTable}
        renameTable={renameTable}
        rotateTable={rotateTable}
        updateTableNotes={updateTableNotes}
        toggleTableLock={toggleTableLock}
        toggleSweetheartSwap={toggleSweetheartSwap}
        sweetheartLabel={sweetheartLabel}
        buildSweetheartVirtualSeats={buildSweetheartVirtualSeats}
        highlightSeat={highlightSeat}
        previewByTable={previewByTable}
        tagColor={tagColor}
      />

      <AddTableDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={createTable}
      />

      {/* Fill empty seats — preview dialog */}
      <Dialog
        open={fillPreviewOpen}
        onOpenChange={(open) => (open ? setFillPreviewOpen(true) : cancelFillPreview())}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fill empty seats</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {fillPreview.unassignedCount === 0 ? (
              <p className="text-muted-foreground">
                Every confirmed guest already has a seat. Nothing to fill.
              </p>
            ) : fillPreview.tablesEligible === 0 ? (
              <p className="text-muted-foreground">
                All your tables are locked. Unlock at least one to fill seats.
              </p>
            ) : (
              <>
                <p>
                  This will place{" "}
                  <strong className="text-foreground">
                    {fillPreview.willPlace}
                  </strong>{" "}
                  unseated confirmed guest
                  {fillPreview.willPlace === 1 ? "" : "s"} into open seats,
                  grouped by last name.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>
                    · {fillPreview.tablesEligible} eligible table
                    {fillPreview.tablesEligible === 1 ? "" : "s"}
                    {fillPreview.tablesLocked > 0 && (
                      <>
                        {" "}
                        ({fillPreview.tablesLocked} locked, will be skipped)
                      </>
                    )}
                  </li>
                  <li>
                    · {fillPreview.totalOpenSeats} open seat
                    {fillPreview.totalOpenSeats === 1 ? "" : "s"} available
                  </li>
                  {fillPreview.overflow > 0 && (
                    <li className="text-amber-700">
                      · {fillPreview.overflow} guest
                      {fillPreview.overflow === 1 ? "" : "s"} won&apos;t fit —
                      add more tables after this runs
                    </li>
                  )}
                </ul>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={cancelFillPreview}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  await fillEmptySeats();
                }}
                disabled={
                  fillPreview.willPlace === 0 ||
                  fillPreview.tablesEligible === 0
                }
              >
                Fill {fillPreview.willPlace} seat
                {fillPreview.willPlace === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Room view layout ───────────────────────────────────────────────────
// Extracted for clarity: handles side-by-side (xl+) vs stacked (<xl)
// when the detail panel is open; hides sidebar during detail view.

interface RoomViewLayoutProps {
  initialTables: Table[];
  guests: Guest[];
  unassigned: Guest[];
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
  moveTable: (id: string, x: number, y: number) => void;
  selectedGuestId: string | null;
  setSelectedGuestId: (id: string | null) => void;
  selectedTable: Table | null | undefined;
  seatedAtSelected: Guest[];
  handleSeatClick: (tableId: string, seatNumber: number) => void;
  handleGuestPillClick: (guestId: string) => void;
  handleGuestDragToSeat: (
    draggedGuestId: string,
    tableId: string,
    targetSeatNumber: number
  ) => void;
  assignGuestToSeat: (
    guestId: string,
    tableId: string,
    seatNumber: number
  ) => Promise<void> | void;
  unseatGuest: (guestId: string) => void;
  deleteTable: (tableId: string) => void;
  renameTable: (tableId: string, name: string | null) => Promise<void> | void;
  rotateTable: (
    tableId: string,
    rotation: 0 | 90 | 180 | 270
  ) => Promise<void> | void;
  updateTableNotes: (
    tableId: string,
    notes: string | null
  ) => Promise<void> | void;
  toggleTableLock: (
    tableId: string,
    locked: boolean
  ) => Promise<void> | void;
  toggleSweetheartSwap: (
    tableId: string,
    swap: boolean
  ) => Promise<void> | void;
  sweetheartLabel: string;
  buildSweetheartVirtualSeats: (swap: boolean) => Record<number, SeatAssignment>;
  /** Seat to pulse in the detail panel when this table is the selected one. */
  highlightSeat: { tableId: string; seatNumber: number } | null;
  /** Per-table ghost seat assignments shown while the Fill-empty preview is open. */
  previewByTable: Record<string, Record<number, SeatAssignment>>;
  tagColor: (tag: string | null) => string;
}

function RoomViewLayout({
  initialTables,
  guests,
  unassigned,
  selectedTableId,
  setSelectedTableId,
  moveTable,
  selectedGuestId,
  setSelectedGuestId,
  selectedTable,
  seatedAtSelected,
  handleSeatClick,
  handleGuestPillClick,
  handleGuestDragToSeat,
  assignGuestToSeat,
  unseatGuest,
  deleteTable,
  renameTable,
  rotateTable,
  updateTableNotes,
  toggleTableLock,
  toggleSweetheartSwap,
  sweetheartLabel,
  buildSweetheartVirtualSeats,
  highlightSeat,
  previewByTable,
  tagColor,
}: RoomViewLayoutProps) {
  const detailRef = useRef<HTMLDivElement>(null);
  const [isWide, setIsWide] = useState(false);

  // Watch for wide-viewport to flip between side-by-side and stacked
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1100px)");
    const handler = () => setIsWide(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Auto-scroll to detail panel on narrow screens when table is selected
  useEffect(() => {
    if (!selectedTable) return;
    if (isWide) return; // no scroll needed — side-by-side
    // Short delay so the panel has time to render
    const t = setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [selectedTable?.id, isWide]);

  const detailOpen = Boolean(selectedTable);
  const showSidebar = !detailOpen;

  // Canvas size: shorter by default, even shorter when side-by-side with panel
  const canvasHeight = detailOpen && isWide ? 560 : 420;

  const canvas = (
    <RoomCanvas
      tables={initialTables.map((t) => {
        const bounds = tableBoundsForShape(
          t.shape as TableShape,
          t.capacity
        );
        return {
          id: t.id,
          x: t.position_x ?? 0,
          y: t.position_y ?? 0,
          width: bounds.width,
          height: bounds.height,
        };
      })}
      selectedTableId={selectedTableId}
      onSelectTable={setSelectedTableId}
      onMoveTable={moveTable}
      renderTable={(tableId) => {
        const t = initialTables.find((x) => x.id === tableId);
        if (!t) return null;
        const seated = guests.filter((g) => g.table_id === t.id);
        const assigned: Record<number, SeatAssignment> = {};
        for (const g of seated) {
          if (g.seat_number) {
            assigned[g.seat_number] = {
              guestId: g.id,
              initials:
                (g.first_name?.[0] ?? "") + (g.last_name?.[0] ?? ""),
              dietaryKind: dietaryKindFor(g),
              fullName: `${g.first_name} ${g.last_name}`,
            };
          }
        }
        // Sweetheart tables render the couple's names as virtual seats (dim,
        // non-interactive). Real assignments still win on the same seat.
        const virtualSeats =
          t.shape === "sweetheart"
            ? buildSweetheartVirtualSeats(t.sweetheart_partner_swap)
            : undefined;
        const previewSeats = previewByTable[t.id];
        return (
          <div
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-md",
              selectedTableId === t.id &&
                "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5"
            )}
          >
            <TableVisual
              shape={t.shape as TableShape}
              capacity={t.capacity}
              assigned={assigned}
              virtualSeats={virtualSeats}
              previewSeats={previewSeats}
              highlightSeat={
                highlightSeat?.tableId === t.id
                  ? highlightSeat.seatNumber
                  : undefined
              }
              size="md"
              rotation={(t.rotation as 0 | 90 | 180 | 270) ?? 0}
              fillState={
                seated.length === 0
                  ? "empty"
                  : seated.length >= t.capacity
                    ? "full"
                    : "partial"
              }
              locked={t.locked}
            />
            <div className="text-center">
              <div className="text-xs font-medium text-foreground">
                {t.shape === "sweetheart"
                  ? sweetheartLabel
                  : `Table ${t.number}`}
              </div>
              {t.shape !== "sweetheart" && t.name && (
                <div className="text-[10px] text-muted-foreground">
                  {t.name}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground/60 tabular-nums">
                {seated.length} / {t.capacity}
              </div>
            </div>
          </div>
        );
      }}
      height={canvasHeight}
      compactFooter={detailOpen}
    />
  );

  const detailPanel = selectedTable ? (
    <div ref={detailRef}>
      <TableDetailPanel
        id={selectedTable.id}
        number={selectedTable.number}
        name={selectedTable.name}
        shape={selectedTable.shape as TableShape}
        capacity={selectedTable.capacity}
        rotation={(selectedTable.rotation as 0 | 90 | 180 | 270) ?? 0}
        notes={selectedTable.notes}
        locked={selectedTable.locked}
        seated={seatedAtSelected}
        displayLabel={
          selectedTable.shape === "sweetheart"
            ? sweetheartLabel
            : `Table ${selectedTable.number}`
        }
        virtualSeats={
          selectedTable.shape === "sweetheart"
            ? buildSweetheartVirtualSeats(
                selectedTable.sweetheart_partner_swap
              )
            : undefined
        }
        sweetheartPartnerSwap={
          selectedTable.shape === "sweetheart"
            ? selectedTable.sweetheart_partner_swap
            : undefined
        }
        previewSeats={previewByTable[selectedTable.id]}
        highlightSeat={
          highlightSeat?.tableId === selectedTable.id
            ? highlightSeat.seatNumber
            : undefined
        }
        unseatedGuests={guests
          .filter((g) => !g.table_id)
          .map((g) => ({
            id: g.id,
            first_name: g.first_name,
            last_name: g.last_name,
          }))}
        onAssignToSeat={(seatNum, guestId) =>
          assignGuestToSeat(guestId, selectedTable.id, seatNum)
        }
        isSelectable={selectedGuestId !== null}
        selectedGuestId={selectedGuestId}
        onClose={() => setSelectedTableId(null)}
        onSeatClick={(seat) =>
          handleSeatClick(selectedTable.id, seat)
        }
        onGuestPillClick={handleGuestPillClick}
        onGuestUnassign={unseatGuest}
        onDelete={() => deleteTable(selectedTable.id)}
        onRename={(n) => renameTable(selectedTable.id, n)}
        onRotate={(r) => rotateTable(selectedTable.id, r)}
        onNotesChange={(n) => updateTableNotes(selectedTable.id, n)}
        onLockToggle={(l) => toggleTableLock(selectedTable.id, l)}
        onSweetheartSwapToggle={(s) =>
          toggleSweetheartSwap(selectedTable.id, s)
        }
        onGuestDragToSeat={(draggedGuestId, targetSeat) =>
          handleGuestDragToSeat(draggedGuestId, selectedTable.id, targetSeat)
        }
        tagColor={tagColor}
      />
    </div>
  ) : null;

  // ── Layouts ──
  //  (a) No panel open: canvas full-width
  //  (b) Panel open, wide: canvas left, panel right
  //  (c) Panel open, narrow: canvas on top, panel below

  if (!detailOpen) {
    return <div>{canvas}</div>;
  }

  if (isWide) {
    return (
      <div className="grid grid-cols-[1fr_400px] gap-4 items-start">
        {canvas}
        {detailPanel}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canvas}
      {detailPanel}
    </div>
  );
}
