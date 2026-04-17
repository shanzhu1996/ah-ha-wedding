"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TableShape } from "./table-templates";

// ── Types ──────────────────────────────────────────────────────────────

export interface SeatAssignment {
  guestId: string;
  initials: string;
  hasDietary: boolean;
  fullName: string;
}

interface Props {
  shape: TableShape;
  capacity: number;
  assigned: Record<number, SeatAssignment>; // seat_number (1-based) → guest
  selectedSeat?: number;
  hoverHint?: boolean; // true when user has a guest selected and is looking for a target
  onSeatClick?: (seatNumber: number) => void;
  size?: "sm" | "md" | "lg";
}

interface SeatPosition {
  seatNumber: number;
  cx: number;
  cy: number;
}

// ── Layout helpers ─────────────────────────────────────────────────────

/**
 * Return SVG (x, y) positions for every seat given a shape + capacity.
 * All positions are in a 200x200 viewBox with origin at (100, 100).
 */
function computeSeatPositions(
  shape: TableShape,
  capacity: number
): { positions: SeatPosition[]; body: React.ReactNode; viewBox: string } {
  const viewBox = "0 0 200 200";

  if (shape === "sweetheart") {
    // Small 2-person table. Seat 1 left, seat 2 right.
    const body = (
      <ellipse
        cx={100}
        cy={100}
        rx={52}
        ry={32}
        className="fill-muted/30 stroke-border"
        strokeWidth={1.5}
      />
    );
    return {
      positions: [
        { seatNumber: 1, cx: 42, cy: 100 },
        { seatNumber: 2, cx: 158, cy: 100 },
      ],
      body,
      viewBox,
    };
  }

  if (shape === "round" || shape === "square") {
    // Round: seats evenly around perimeter, seat 1 at 12 o'clock, clockwise
    const r = 58;
    const seatRadius = 82; // where seat dots live — just outside table edge
    const positions: SeatPosition[] = [];
    for (let i = 0; i < capacity; i++) {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / capacity;
      positions.push({
        seatNumber: i + 1,
        cx: 100 + seatRadius * Math.cos(angle),
        cy: 100 + seatRadius * Math.sin(angle),
      });
    }
    const body =
      shape === "round" ? (
        <circle
          cx={100}
          cy={100}
          r={r}
          className="fill-muted/30 stroke-border"
          strokeWidth={1.5}
        />
      ) : (
        <rect
          x={42}
          y={42}
          width={116}
          height={116}
          rx={8}
          className="fill-muted/30 stroke-border"
          strokeWidth={1.5}
        />
      );
    return { positions, body, viewBox };
  }

  // Rectangle: 4+4 distribution for cap=8; odd capacities get one end seat
  // Canonical banquet look: seats along top + bottom, optionally on short ends
  const tableWidth = 140;
  const tableHeight = 48;
  const tableX = 100 - tableWidth / 2;
  const tableY = 100 - tableHeight / 2;
  const topY = tableY - 24;
  const bottomY = tableY + tableHeight + 24;
  const leftX = tableX - 24;
  const rightX = tableX + tableWidth + 24;

  const positions: SeatPosition[] = [];

  if (capacity <= 2) {
    // 1 at each short end
    positions.push({ seatNumber: 1, cx: leftX, cy: 100 });
    if (capacity === 2) positions.push({ seatNumber: 2, cx: rightX, cy: 100 });
  } else {
    // Compute top vs bottom distribution. Prefer even split; odd gets extra on top.
    const hasEnds = capacity % 2 === 1; // odd → one end seat
    const sideCount = hasEnds ? capacity - 1 : capacity;
    const topCount = Math.ceil(sideCount / 2);
    const bottomCount = sideCount - topCount;

    // seats along top, left-to-right (seat 1 top-left, clockwise → end → bottom right-to-left)
    let seat = 1;
    for (let i = 0; i < topCount; i++) {
      const x =
        tableX + ((i + 1) * tableWidth) / (topCount + 1);
      positions.push({ seatNumber: seat++, cx: x, cy: topY });
    }
    // right end (if odd capacity)
    if (hasEnds) {
      positions.push({ seatNumber: seat++, cx: rightX, cy: 100 });
    }
    // bottom, right-to-left
    for (let i = 0; i < bottomCount; i++) {
      const x =
        tableX + tableWidth - ((i + 1) * tableWidth) / (bottomCount + 1);
      positions.push({ seatNumber: seat++, cx: x, cy: bottomY });
    }
  }

  const body = (
    <rect
      x={tableX}
      y={tableY}
      width={tableWidth}
      height={tableHeight}
      rx={6}
      className="fill-muted/30 stroke-border"
      strokeWidth={1.5}
    />
  );

  return { positions, body, viewBox };
}

// ── Component ──────────────────────────────────────────────────────────

const SIZE_PX: Record<NonNullable<Props["size"]>, number> = {
  sm: 84,
  md: 200,
  lg: 260,
};

export function TableVisual({
  shape,
  capacity,
  assigned,
  selectedSeat,
  hoverHint = false,
  onSeatClick,
  size = "md",
}: Props) {
  const { positions, body, viewBox } = useMemo(
    () => computeSeatPositions(shape, capacity),
    [shape, capacity]
  );

  const px = SIZE_PX[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox={viewBox}
      className="block select-none"
      role="img"
      aria-label={`${shape} table with ${capacity} seats`}
    >
      {body}
      {positions.map((pos) => {
        const guest = assigned[pos.seatNumber];
        const isSelected = selectedSeat === pos.seatNumber;
        const ariaLabel = guest
          ? `Seat ${pos.seatNumber}, ${guest.fullName}`
          : `Seat ${pos.seatNumber}, empty`;

        return (
          <g
            key={pos.seatNumber}
            role="button"
            tabIndex={onSeatClick ? 0 : -1}
            aria-label={ariaLabel}
            aria-pressed={isSelected}
            className={cn(
              "outline-none transition-[transform,opacity] origin-center group/seat",
              onSeatClick && "cursor-pointer",
              hoverHint && !guest && "animate-pulse"
            )}
            onClick={
              onSeatClick ? () => onSeatClick(pos.seatNumber) : undefined
            }
            onKeyDown={
              onSeatClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSeatClick(pos.seatNumber);
                    }
                  }
                : undefined
            }
          >
            {isSelected && (
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={14}
                className="fill-none stroke-primary"
                strokeWidth={2}
              />
            )}
            {/* Hover ring — larger circle that appears on hover/focus */}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={14}
              className={cn(
                "fill-none stroke-primary/40 opacity-0 transition-opacity",
                onSeatClick &&
                  "group-hover/seat:opacity-100 group-focus-visible/seat:opacity-100"
              )}
              strokeWidth={2}
            />
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={10}
              className={cn(
                guest
                  ? "fill-primary/90 stroke-primary"
                  : "fill-background stroke-muted-foreground/40",
                isSelected && "stroke-primary"
              )}
              strokeWidth={1.5}
            />
            {guest ? (
              <text
                x={pos.cx}
                y={pos.cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-primary-foreground font-semibold pointer-events-none"
                style={{ fontSize: "7px" }}
              >
                {guest.initials}
              </text>
            ) : (
              <text
                x={pos.cx}
                y={pos.cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-muted-foreground/60 pointer-events-none"
                style={{ fontSize: "7px" }}
              >
                {pos.seatNumber}
              </text>
            )}
            {guest?.hasDietary && (
              <circle
                cx={pos.cx + 8}
                cy={pos.cy - 8}
                r={3}
                className="fill-amber-500 pointer-events-none"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
