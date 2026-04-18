"use client";

import { useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  table_id: string | null;
  seat_number: number | null;
}

interface TableRef {
  id: string;
  number: number;
  shape: string;
}

interface Props {
  guests: Guest[];
  tables: TableRef[];
  /** Used to render "Alice & Bob, Seat 1" for the sweetheart table instead of "Table 0". */
  sweetheartLabel: string;
  /** Called when clicking a seated result. Opens their table + pulses the seat. */
  onJumpToSeated: (guestId: string, tableId: string, seatNumber: number) => void;
  /** Called when clicking an unseated result. Same mental model as sidebar click. */
  onSelectUnseated: (guestId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────

export function GuestSearch({
  guests,
  tables,
  sweetheartLabel,
  onJumpToSeated,
  onSelectUnseated,
}: Props) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tableMap = useMemo(() => {
    const m = new Map<string, TableRef>();
    tables.forEach((t) => m.set(t.id, t));
    return m;
  }, [tables]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return guests
      .filter((g) => {
        const full = `${g.first_name} ${g.last_name}`.toLowerCase();
        return (
          full.includes(q) ||
          (g.first_name ?? "").toLowerCase().includes(q) ||
          (g.last_name ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [guests, query]);

  // Keep the active index in range as results change
  if (activeIdx >= results.length && results.length > 0) {
    setActiveIdx(0);
  }

  function statusFor(g: Guest): { text: string; seated: boolean } {
    if (!g.table_id || !g.seat_number) return { text: "not seated", seated: false };
    const t = tableMap.get(g.table_id);
    if (!t) return { text: "not seated", seated: false };
    const label =
      t.shape === "sweetheart" ? sweetheartLabel : `Table ${t.number}`;
    return { text: `${label}, Seat ${g.seat_number}`, seated: true };
  }

  function pick(g: Guest) {
    if (g.table_id && g.seat_number) {
      onJumpToSeated(g.id, g.table_id, g.seat_number);
    } else {
      onSelectUnseated(g.id);
    }
    setQuery("");
    setActiveIdx(0);
    inputRef.current?.blur();
  }

  const showResults = focused && (results.length > 0 || query.trim().length > 0);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Find a guest…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(0);
          }}
          onFocus={() => setFocused(true)}
          // Delay blur so a result click registers first
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[activeIdx]) pick(results[activeIdx]);
            } else if (e.key === "Escape") {
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          className="pl-8 h-8 text-xs w-48"
          aria-label="Find a guest"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={showResults}
        />
      </div>
      {showResults && (
        <ul
          role="listbox"
          className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-auto rounded-md border border-border/60 bg-popover shadow-md z-50"
        >
          {results.length === 0 ? (
            <li className="px-2.5 py-2 text-xs text-muted-foreground italic">
              No guests match “{query}”
            </li>
          ) : (
            results.map((g, i) => {
              const { text, seated } = statusFor(g);
              const isActive = i === activeIdx;
              return (
                <li key={g.id} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    // onMouseDown fires before input blur — so click wins
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(g);
                    }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 text-xs flex items-baseline gap-1.5 transition-colors",
                      isActive ? "bg-muted/60" : "hover:bg-muted/40"
                    )}
                  >
                    <span className="flex-1 truncate">
                      {g.first_name} {g.last_name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] shrink-0",
                        seated ? "text-muted-foreground" : "text-amber-700"
                      )}
                    >
                      {text}
                    </span>
                    {isActive && (
                      <CornerDownLeft className="h-3 w-3 text-muted-foreground/60" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
