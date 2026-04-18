"use client";

import { LayoutGrid, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export type SeatingView = "room" | "grid";

interface Props {
  value: SeatingView;
  onChange: (view: SeatingView) => void;
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="Seating view"
      className="inline-flex rounded-md border border-border/60 bg-background p-0.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "room"}
        onClick={() => onChange("room")}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-sm inline-flex items-center gap-1.5 transition-colors",
          value === "room"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        Room
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "grid"}
        onClick={() => onChange("grid")}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-sm inline-flex items-center gap-1.5 transition-colors",
          value === "grid"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Grid
      </button>
    </div>
  );
}
