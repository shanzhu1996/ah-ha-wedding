"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export interface OptimisticGuestOverlay {
  table_id: string | null;
  seat_number: number | null;
}

/**
 * Custom hook managing seat-assignment mutations with optimistic state.
 *
 * - `assign(guestId, tableId, seatNumber)` — places guest in an empty seat
 * - `swap(guestAId, guestBId)` — calls RPC swap_seat_assignment for atomicity
 * - `unassign(guestId)` — clears table_id + seat_number
 *
 * Every mutation updates local `overlays` instantly, then fires supabase,
 * then calls `router.refresh()` to reconcile with server. If mutation fails,
 * the overlay is cleared so UI falls back to server state on next refresh.
 */
export function useSeatAssignment() {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();
  const [overlays, setOverlays] = useState<
    Record<string, OptimisticGuestOverlay>
  >({});

  const assign = useCallback(
    async (guestId: string, tableId: string, seatNumber: number) => {
      setOverlays((prev) => ({
        ...prev,
        [guestId]: { table_id: tableId, seat_number: seatNumber },
      }));
      const { error } = await supabase
        .from("guests")
        .update({ table_id: tableId, seat_number: seatNumber })
        .eq("id", guestId);
      if (error) {
        setOverlays((prev) => {
          const next = { ...prev };
          delete next[guestId];
          return next;
        });
        toast.error("Couldn’t seat that guest", {
          description: error.message,
          action: {
            label: "Retry",
            onClick: () => assign(guestId, tableId, seatNumber),
          },
        });
        return { ok: false, error };
      }
      startTransition(() => router.refresh());
      return { ok: true };
    },
    [router, supabase]
  );

  const unassign = useCallback(
    async (guestId: string) => {
      setOverlays((prev) => ({
        ...prev,
        [guestId]: { table_id: null, seat_number: null },
      }));
      const { error } = await supabase
        .from("guests")
        .update({ table_id: null, seat_number: null })
        .eq("id", guestId);
      if (error) {
        setOverlays((prev) => {
          const next = { ...prev };
          delete next[guestId];
          return next;
        });
        toast.error("Couldn’t unseat that guest", {
          description: error.message,
          action: {
            label: "Retry",
            onClick: () => unassign(guestId),
          },
        });
        return { ok: false, error };
      }
      startTransition(() => router.refresh());
      return { ok: true };
    },
    [router, supabase]
  );

  const swap = useCallback(
    async (
      guestA: { id: string; table_id: string | null; seat_number: number | null },
      guestB: { id: string; table_id: string | null; seat_number: number | null }
    ) => {
      // Optimistic overlay: swap positions locally
      setOverlays((prev) => ({
        ...prev,
        [guestA.id]: {
          table_id: guestB.table_id,
          seat_number: guestB.seat_number,
        },
        [guestB.id]: {
          table_id: guestA.table_id,
          seat_number: guestA.seat_number,
        },
      }));
      const { error } = await supabase.rpc("swap_seat_assignment", {
        guest_a: guestA.id,
        guest_b: guestB.id,
      });
      if (error) {
        setOverlays((prev) => {
          const next = { ...prev };
          delete next[guestA.id];
          delete next[guestB.id];
          return next;
        });
        toast.error("Couldn’t swap seats", {
          description: error.message,
          action: {
            label: "Retry",
            onClick: () => swap(guestA, guestB),
          },
        });
        return { ok: false, error };
      }
      startTransition(() => router.refresh());
      return { ok: true };
    },
    [router, supabase]
  );

  // Apply overlay to any guest; returns { table_id, seat_number }
  function applyOverlay<
    G extends { id: string; table_id: string | null; seat_number: number | null }
  >(guest: G): G {
    const ov = overlays[guest.id];
    if (!ov) return guest;
    return { ...guest, table_id: ov.table_id, seat_number: ov.seat_number };
  }

  return { assign, unassign, swap, applyOverlay, overlays };
}
