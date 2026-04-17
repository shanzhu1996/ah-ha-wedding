import type { VendorType } from "@/types/database";

// Map vendor type → human-readable budget category used across the app.
export const VENDOR_TYPE_TO_CATEGORY: Record<VendorType, string> = {
  photographer: "Photography",
  videographer: "Videography",
  dj: "Music/DJ",
  band: "Music/DJ",
  caterer: "Catering",
  florist: "Flowers",
  baker: "Catering",
  hair_makeup: "Beauty",
  officiant: "Other",
  rentals: "Rentals",
  venue: "Venue",
  transportation: "Transportation",
  coordinator: "Other",
  photo_booth: "Other",
  other: "Other",
};

export function vendorCategory(type: string): string {
  return VENDOR_TYPE_TO_CATEGORY[type as VendorType] ?? "Other";
}
