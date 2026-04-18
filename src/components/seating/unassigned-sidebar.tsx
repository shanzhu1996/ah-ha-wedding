"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  relationship_tag: string | null;
}

interface Props {
  guests: Guest[]; // already filtered to unassigned
  selectedGuestId: string | null;
  onSelectGuest: (guestId: string | null) => void;
}

// ── Component ──────────────────────────────────────────────────────────

export function UnassignedSidebar({
  guests,
  selectedGuestId,
  onSelectGuest,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterRsvp, setFilterRsvp] = useState<string>("all");
  const [filterDietary, setFilterDietary] = useState<boolean>(false);

  const rsvpCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: guests.length,
      pending: 0,
      confirmed: 0,
      declined: 0,
      no_response: 0,
    };
    guests.forEach((g) => {
      counts[g.rsvp_status] = (counts[g.rsvp_status] ?? 0) + 1;
    });
    return counts;
  }, [guests]);

  const dietaryCount = useMemo(
    () =>
      guests.filter(
        (g) =>
          (g.dietary_restrictions && g.dietary_restrictions.trim()) ||
          g.meal_choice === "vegan" ||
          g.meal_choice === "vegetarian"
      ).length,
    [guests]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guests.filter((g) => {
      const name = `${g.first_name} ${g.last_name}`.toLowerCase();
      const tag = g.relationship_tag?.toLowerCase() ?? "";
      const matchesSearch = !q || name.includes(q) || tag.includes(q);
      const matchesRsvp =
        filterRsvp === "all" || g.rsvp_status === filterRsvp;
      const hasDietary =
        (g.dietary_restrictions && g.dietary_restrictions.trim()) ||
        g.meal_choice === "vegan" ||
        g.meal_choice === "vegetarian";
      const matchesDietary = !filterDietary || hasDietary;
      return matchesSearch && matchesRsvp && matchesDietary;
    });
  }, [guests, search, filterRsvp, filterDietary]);

  // Flat list, alphabetical by last name (tag grouping removed — see roadmap)
  const sortedGuests = useMemo(
    () =>
      [...filtered].sort((a, b) =>
        (a.last_name || "").localeCompare(b.last_name || "")
      ),
    [filtered]
  );

  const rsvpLabel = filterRsvp === "all" ? "All" : filterRsvp.replace("_", " ");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.12em] uppercase text-foreground/80">
          Unassigned · {filtered.length}
        </h2>
        {selectedGuestId && (
          <button
            type="button"
            onClick={() => onSelectGuest(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search guests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 text-[11px]">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "inline-flex items-center gap-1 transition-colors",
              filterRsvp !== "all"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            RSVP: {rsvpLabel}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {(["all", "confirmed", "pending", "declined", "no_response"] as const).map(
              (status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => setFilterRsvp(status)}
                  className="flex justify-between text-xs"
                >
                  <span className="capitalize">{status.replace("_", " ")}</span>
                  <span className="text-muted-foreground">
                    {rsvpCounts[status]}
                  </span>
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => setFilterDietary(!filterDietary)}
          className={cn(
            "inline-flex items-center gap-1 transition-colors",
            filterDietary
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Dietary
          {dietaryCount > 0 && (
            <span className="text-muted-foreground">({dietaryCount})</span>
          )}
        </button>
      </div>

      {/* Guest groups */}
      {sortedGuests.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">
          {guests.length === 0
            ? "Every guest is seated."
            : "No guests match your filters."}
        </p>
      ) : (
        <ul className="space-y-0.5">
          {sortedGuests.map((g) => {
            const isSelected = selectedGuestId === g.id;
            const dietShort =
              g.meal_choice === "vegan"
                ? "vegan"
                : g.meal_choice === "vegetarian"
                  ? "veg"
                  : g.dietary_restrictions?.trim()
                    ? g.dietary_restrictions.trim().length > 10
                      ? g.dietary_restrictions.trim().slice(0, 10) + "…"
                      : g.dietary_restrictions.trim()
                    : null;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onSelectGuest(isSelected ? null : g.id)}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded-md text-xs transition-colors flex items-center gap-1.5",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted/60"
                  )}
                >
                  <span className="truncate flex-1">
                    {g.first_name} {g.last_name}
                  </span>
                  {dietShort && (
                    <span
                      className={cn(
                        "inline-block px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0",
                        isSelected
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-amber-100 text-amber-800"
                      )}
                      title={g.dietary_restrictions || g.meal_choice || ""}
                    >
                      {dietShort}
                    </span>
                  )}
                  {g.rsvp_status === "confirmed" && !isSelected && (
                    <span className="text-[9px] font-medium text-emerald-700">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
