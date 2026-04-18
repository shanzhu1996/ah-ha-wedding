"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TableShape } from "./table-templates";

// ── Types ──────────────────────────────────────────────────────────────

export type DietaryKind = "vegan" | "vegetarian" | "other" | null;

export interface SeatAssignment {
  guestId: string;
  initials: string;
  /** null = no dietary. Used to render a small icon on the seat dot. */
  dietaryKind: DietaryKind;
  fullName: string;
}

/** Derive the dietary kind from a guest's meal_choice and dietary_restrictions fields. */
export function dietaryKindFor(g: {
  meal_choice: string | null;
  dietary_restrictions: string | null;
}): DietaryKind {
  if (g.meal_choice === "vegan") return "vegan";
  if (g.meal_choice === "vegetarian") return "vegetarian";
  if (g.dietary_restrictions && g.dietary_restrictions.trim()) return "other";
  return null;
}

export type TableFillState = "empty" | "partial" | "full";

interface Props {
  shape: TableShape;
  capacity: number;
  assigned: Record<number, SeatAssignment>; // seat_number (1-based) → guest
  /**
   * Decorative seat assignments that render dimmed and are not interactive
   * (no click handler, no hover ring). Currently used to pre-fill sweetheart
   * tables with the couple's names without creating real guest records.
   * Real `assigned` entries always win over virtual ones at the same seat.
   */
  virtualSeats?: Record<number, SeatAssignment>;
  /**
   * Ghost seat assignments shown during a "Fill empty seats" preview.
   * Rendered dimmed with amber tint + pulse, non-interactive. Real
   * assignments and virtual seats still win over preview entries.
   */
  previewSeats?: Record<number, SeatAssignment>;
  selectedSeat?: number;
  /**
   * Seat number to briefly highlight with an animated ring (e.g. after a
   * "find a guest" jump-to-seat action). Owner clears it after the pulse
   * duration.
   */
  highlightSeat?: number;
  hoverHint?: boolean; // true when user has a guest selected and is looking for a target
  onSeatClick?: (seatNumber: number) => void;
  size?: "sm" | "md" | "lg";
  rotation?: 0 | 90 | 180 | 270;
  fillState?: TableFillState;
  /** Show a locked padlock overlay — used when tables.locked is true */
  locked?: boolean;
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
  capacity: number,
  bodyClassName: string = "fill-muted/30 stroke-border"
): {
  positions: SeatPosition[];
  body: React.ReactNode;
  viewBox: string;
} {
  const viewBox = "0 0 200 200";

  if (shape === "sweetheart") {
    // Small 2-person table. Seat 1 left, seat 2 right.
    const body = (
      <ellipse
        cx={100}
        cy={100}
        rx={52}
        ry={32}
        className={bodyClassName}
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
          className={bodyClassName}
          strokeWidth={1.5}
        />
      ) : (
        <rect
          x={42}
          y={42}
          width={116}
          height={116}
          rx={8}
          className={bodyClassName}
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
      className={bodyClassName}
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
  virtualSeats,
  previewSeats,
  selectedSeat,
  highlightSeat,
  hoverHint = false,
  onSeatClick,
  size = "md",
  rotation = 0,
  fillState = "empty",
  locked = false,
}: Props) {
  // Fill state drives the table body color
  const bodyClassName = useMemo(() => {
    switch (fillState) {
      case "full":
        return "fill-primary/15 stroke-primary/40";
      case "partial":
        return "fill-amber-50 stroke-amber-200";
      case "empty":
      default:
        return "fill-muted/30 stroke-border";
    }
  }, [fillState]);

  const { positions, body, viewBox } = useMemo(
    () => computeSeatPositions(shape, capacity, bodyClassName),
    [shape, capacity, bodyClassName]
  );

  const px = SIZE_PX[size];
  const isLg = size === "lg";
  // At lg size, seats grow so initials + number both fit
  const seatRadius = isLg ? 13 : 10;
  const hoverRingRadius = seatRadius + 4;
  const selectedRingRadius = seatRadius + 4;

  return (
    <svg
      width={px}
      height={px}
      viewBox={viewBox}
      className="block select-none"
      role="img"
      aria-label={`${shape} table with ${capacity} seats`}
    >
      {/* Everything inside rotates around the center (100,100) */}
      <g transform={`rotate(${rotation} 100 100)`}>
        {body}
        {/* Sweetheart heart — drawn inside the table body for romance */}
        {shape === "sweetheart" && (
          <path
            d="M100 108 c-4 -4 -10 -6 -10 -12 a5 5 0 0 1 10 -3 a5 5 0 0 1 10 3 c0 6 -6 8 -10 12 z"
            className="fill-primary/60 pointer-events-none"
          />
        )}
        {positions.map((pos) => {
          const realGuest = assigned[pos.seatNumber];
          const virtual = !realGuest ? virtualSeats?.[pos.seatNumber] : null;
          const preview = !realGuest && !virtual
            ? previewSeats?.[pos.seatNumber]
            : null;
          const guest = realGuest ?? virtual ?? preview ?? null;
          const isVirtual = !realGuest && !!virtual;
          const isPreview = !realGuest && !virtual && !!preview;
          const isReadOnly = isVirtual || isPreview;
          const isSelected = selectedSeat === pos.seatNumber;
          const ariaLabel = guest
            ? `Seat ${pos.seatNumber}, ${guest.fullName}${
                isVirtual ? " (host)" : isPreview ? " (preview)" : ""
              }`
            : `Seat ${pos.seatNumber}, empty`;

          return (
            <g
              key={pos.seatNumber}
              role="button"
              tabIndex={onSeatClick && !isReadOnly ? 0 : -1}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              className={cn(
                "outline-none transition-[transform,opacity] origin-center group/seat",
                onSeatClick && !isReadOnly && "cursor-pointer",
                isPreview && "animate-pulse",
                hoverHint && !guest && "animate-pulse"
              )}
              onClick={
                onSeatClick && !isReadOnly
                  ? () => onSeatClick(pos.seatNumber)
                  : undefined
              }
              onKeyDown={
                onSeatClick && !isReadOnly
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
                  r={selectedRingRadius}
                  className="fill-none stroke-primary"
                  strokeWidth={2}
                />
              )}
              {highlightSeat === pos.seatNumber && (
                <>
                  {/* Animated pulse for jump-to-seat */}
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r={selectedRingRadius + 4}
                    className="fill-none stroke-primary opacity-80 animate-ping"
                    strokeWidth={2}
                  />
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r={selectedRingRadius}
                    className="fill-none stroke-primary"
                    strokeWidth={2}
                  />
                </>
              )}
              {/* Hover ring — larger circle that appears on hover/focus */}
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={hoverRingRadius}
                className={cn(
                  "fill-none stroke-primary/40 opacity-0 transition-opacity",
                  onSeatClick &&
                    !isReadOnly &&
                    "group-hover/seat:opacity-100 group-focus-visible/seat:opacity-100"
                )}
                strokeWidth={2}
              />
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={seatRadius}
                className={cn(
                  guest
                    ? isPreview
                      ? "fill-amber-200 stroke-amber-500"
                      : isVirtual
                        ? "fill-primary/30 stroke-primary/40"
                        : "fill-primary/90 stroke-primary"
                    : "fill-background stroke-muted-foreground/40",
                  isSelected && "stroke-primary"
                )}
                strokeWidth={1.5}
              />
              {/*
                Always show the seat number.
                Text is counter-rotated so it remains upright at any table rotation.
                On lg size, also show initials below the number for the detail panel.
              */}
              <g
                transform={`rotate(${-rotation} ${pos.cx} ${pos.cy})`}
                className="pointer-events-none"
              >
                {isLg && guest ? (
                  <>
                    <text
                      x={pos.cx}
                      y={pos.cy - 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-primary-foreground/80"
                      style={{ fontSize: "6px" }}
                    >
                      {pos.seatNumber}
                    </text>
                    <text
                      x={pos.cx}
                      y={pos.cy + 5}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-primary-foreground font-semibold"
                      style={{ fontSize: "7px" }}
                    >
                      {guest.initials}
                    </text>
                  </>
                ) : (
                  <text
                    x={pos.cx}
                    y={pos.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className={cn(
                      "font-semibold",
                      guest
                        ? "fill-primary-foreground"
                        : "fill-muted-foreground/70"
                    )}
                    style={{ fontSize: isLg ? "9px" : "7px" }}
                  >
                    {pos.seatNumber}
                  </text>
                )}
              </g>
            </g>
          );
        })}
      </g>
      {/* Padlock overlay — static, does not rotate with the table */}
      {locked && (
        <g className="pointer-events-none">
          <circle
            cx={176}
            cy={24}
            r={14}
            className="fill-background stroke-muted-foreground/40"
            strokeWidth={1}
          />
          {/* Simple padlock glyph */}
          <path
            d="M172 22 v-3 a4 4 0 0 1 8 0 v3 h-8 z"
            className="fill-none stroke-muted-foreground"
            strokeWidth={1.5}
          />
          <rect
            x={170}
            y={22}
            width={12}
            height={8}
            rx={1.5}
            className="fill-muted-foreground"
          />
        </g>
      )}
    </svg>
  );
}

