"use client";

import { useState, useMemo } from "react";
import { Utensils, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ── Types ──────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  table_id: string | null;
}

interface Table {
  id: string;
  number: number;
  name: string | null;
}

interface Props {
  guests: Guest[];
  tables: Table[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function countDietary(guests: Guest[]) {
  const counts = {
    vegan: 0,
    vegetarian: 0,
    other: 0,
    kids: 0,
  };
  for (const g of guests) {
    if (g.meal_choice === "vegan") counts.vegan++;
    else if (g.meal_choice === "vegetarian") counts.vegetarian++;
    else if (g.meal_choice === "kids") counts.kids++;
    if (g.dietary_restrictions && g.dietary_restrictions.trim()) {
      // Don't double-count vegans/vegetarians with additional notes
      if (g.meal_choice !== "vegan" && g.meal_choice !== "vegetarian") {
        counts.other++;
      }
    }
  }
  return counts;
}

// ── Component ──────────────────────────────────────────────────────────

export function DietarySummary({ guests, tables }: Props) {
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => countDietary(guests), [guests]);
  const totalFlagged =
    totals.vegan + totals.vegetarian + totals.other + totals.kids;

  // Per-table breakdown (only tables with at least one flagged guest)
  const perTable = useMemo(() => {
    return tables
      .map((t) => {
        const tableGuests = guests.filter((g) => g.table_id === t.id);
        const c = countDietary(tableGuests);
        return { table: t, counts: c, total: c.vegan + c.vegetarian + c.other + c.kids };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => a.table.number - b.table.number);
  }, [tables, guests]);

  if (totalFlagged === 0) return null;

  const parts: string[] = [];
  if (totals.vegan) parts.push(`${totals.vegan} vegan`);
  if (totals.vegetarian) parts.push(`${totals.vegetarian} vegetarian`);
  if (totals.kids) parts.push(`${totals.kids} kids`);
  if (totals.other) parts.push(`${totals.other} other dietary`);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1 rounded-md border border-border/60 bg-muted/20 hover:bg-muted/40"
      >
        <Utensils className="h-3 w-3" />
        <span>
          <span className="font-medium text-foreground/80">Dietary:</span>{" "}
          {parts.join(" · ")}
        </span>
        <ChevronRight className="h-3 w-3 opacity-60" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dietary report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Totals row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              {totals.vegan > 0 && (
                <div className="p-2 rounded-md bg-emerald-50 border border-emerald-200">
                  <div className="text-lg font-semibold text-emerald-800">
                    {totals.vegan}
                  </div>
                  <div className="text-xs text-emerald-700">Vegan</div>
                </div>
              )}
              {totals.vegetarian > 0 && (
                <div className="p-2 rounded-md bg-amber-50 border border-amber-200">
                  <div className="text-lg font-semibold text-amber-800">
                    {totals.vegetarian}
                  </div>
                  <div className="text-xs text-amber-700">Vegetarian</div>
                </div>
              )}
              {totals.kids > 0 && (
                <div className="p-2 rounded-md bg-sky-50 border border-sky-200">
                  <div className="text-lg font-semibold text-sky-800">
                    {totals.kids}
                  </div>
                  <div className="text-xs text-sky-700">Kids meals</div>
                </div>
              )}
              {totals.other > 0 && (
                <div className="p-2 rounded-md bg-rose-50 border border-rose-200">
                  <div className="text-lg font-semibold text-rose-800">
                    {totals.other}
                  </div>
                  <div className="text-xs text-rose-700">Allergy / other</div>
                </div>
              )}
            </div>

            {/* Per-table breakdown */}
            {perTable.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2">
                  By table
                </h3>
                <ul className="space-y-1 text-sm">
                  {perTable.map(({ table, counts }) => {
                    const bits: string[] = [];
                    if (counts.vegan) bits.push(`${counts.vegan}v`);
                    if (counts.vegetarian) bits.push(`${counts.vegetarian}veg`);
                    if (counts.kids) bits.push(`${counts.kids}kids`);
                    if (counts.other) bits.push(`${counts.other}other`);
                    return (
                      <li
                        key={table.id}
                        className="flex justify-between py-1 border-b border-border/40"
                      >
                        <span>
                          Table {table.number}
                          {table.name && (
                            <span className="text-muted-foreground">
                              {" · "}
                              {table.name}
                            </span>
                          )}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {bits.join(" · ")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
