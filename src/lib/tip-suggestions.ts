import type { VendorType } from "@/types/database";

/**
 * Suggested tipping ranges by vendor type, based on industry norms
 * (The Knot, Zola, WedSociety, 2025–2026). These are starting points —
 * couples adjust based on service quality, region, and whether gratuity
 * is already baked into the contract (caterers often include it).
 *
 * `flat` = fixed dollar range (photographer, DJ, officiant)
 * `percent` = percentage of contract amount (caterer, hair_makeup)
 *
 * Some vendor types support both — we prefer `flat` as the default
 * suggestion because percent-of-contract for a $15k photographer would
 * be unreasonable. Couples can flip to percent if they want.
 */
export interface TipSuggestion {
  kind: "flat" | "percent" | "none";
  /** Flat dollar amounts (min, max) — used when kind === "flat" */
  flatMin?: number;
  flatMax?: number;
  /** Percent-of-contract (min, max, e.g. 15 and 20 mean 15%-20%) */
  percentMin?: number;
  percentMax?: number;
  /** Default choice — what we suggest out of the box. */
  defaultAmount: number;
  note?: string;
}

export const TIP_SUGGESTIONS: Record<VendorType, TipSuggestion> = {
  photographer: {
    kind: "flat",
    flatMin: 50,
    flatMax: 200,
    defaultAmount: 100,
    note: "Flat tip per person. Owner-operators are often skipped — their rate is already their profit.",
  },
  videographer: {
    kind: "flat",
    flatMin: 50,
    flatMax: 200,
    defaultAmount: 100,
    note: "Same logic as photographer.",
  },
  dj: {
    kind: "flat",
    flatMin: 50,
    flatMax: 150,
    defaultAmount: 100,
    note: "$50–$150 flat, or 10–15% of total if you're feeling generous.",
  },
  band: {
    kind: "flat",
    flatMin: 25,
    flatMax: 50,
    defaultAmount: 40,
    note: "$25–$50 per band member. Multiply by member count.",
  },
  mc: {
    kind: "flat",
    flatMin: 50,
    flatMax: 100,
    defaultAmount: 75,
    note: "Solo MCs appreciate a flat tip like officiants.",
  },
  caterer: {
    kind: "percent",
    percentMin: 15,
    percentMax: 20,
    defaultAmount: 0,
    note: "15–20% of total bill — but check if gratuity is already in the contract. If so, you may not owe extra.",
  },
  florist: {
    kind: "flat",
    flatMin: 50,
    flatMax: 150,
    defaultAmount: 75,
    note: "Not traditionally tipped. Tip if they deliver + set up + strike in person.",
  },
  baker: {
    kind: "flat",
    flatMin: 25,
    flatMax: 75,
    defaultAmount: 50,
    note: "Tip delivery + setup crew, not the baker alone.",
  },
  hair_makeup: {
    kind: "percent",
    percentMin: 15,
    percentMax: 20,
    defaultAmount: 0,
    note: "15–20% of service cost. Tip each stylist individually.",
  },
  officiant: {
    kind: "flat",
    flatMin: 50,
    flatMax: 100,
    defaultAmount: 75,
    note: "Secular officiants: $50–$100. Religious leaders: donation to their place of worship ($100–$500 typical).",
  },
  rentals: {
    kind: "flat",
    flatMin: 25,
    flatMax: 75,
    defaultAmount: 50,
    note: "Tip the delivery/setup crew, typically $25–$75 each.",
  },
  venue: {
    kind: "none",
    defaultAmount: 0,
    note: "Typically not tipped directly — service charges usually cover this. Tip specific staff (banquet manager, attendants) if applicable.",
  },
  transportation: {
    kind: "percent",
    percentMin: 15,
    percentMax: 20,
    defaultAmount: 0,
    note: "15–20% of fare. Check if gratuity is already in the contract.",
  },
  coordinator: {
    kind: "flat",
    flatMin: 100,
    flatMax: 500,
    defaultAmount: 200,
    note: "Wedding planners aren't always tipped. If they go above and beyond, $100–$500 or 15–20% of fee.",
  },
  photo_booth: {
    kind: "flat",
    flatMin: 25,
    flatMax: 75,
    defaultAmount: 50,
    note: "Tip the on-site attendant, not the company.",
  },
  other: {
    kind: "flat",
    flatMin: 50,
    flatMax: 100,
    defaultAmount: 50,
    note: "Generic tip range — adjust based on service.",
  },
};

/**
 * Compute the default tip amount for a given vendor, given the contract
 * amount. For percent-based suggestions, returns percent × contract.
 * For flat-based, returns the defaultAmount directly (ignores contract).
 */
export function computeDefaultTip(
  vendorType: VendorType,
  contractAmount: number | null
): number {
  const s = TIP_SUGGESTIONS[vendorType];
  if (s.kind === "none") return 0;
  if (s.kind === "flat") return s.defaultAmount;
  // percent
  if (!contractAmount || contractAmount <= 0) return 0;
  const midPct = ((s.percentMin ?? 0) + (s.percentMax ?? 0)) / 2;
  return Math.round((contractAmount * midPct) / 100);
}

/**
 * Human-readable range label. Used in the UI, e.g. "$50–$200" or "15%–20%".
 */
export function formatTipRange(vendorType: VendorType): string {
  const s = TIP_SUGGESTIONS[vendorType];
  if (s.kind === "none") return "Typically not tipped";
  if (s.kind === "flat") return `$${s.flatMin}–$${s.flatMax}`;
  return `${s.percentMin}%–${s.percentMax}%`;
}
