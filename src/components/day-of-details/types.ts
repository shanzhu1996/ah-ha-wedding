// Shared types & defaults for Day-of Details sections
// No "use client" — safe to import from server components

// ── Schedule (day-of timeline) ─────────────────────────────────────────

export interface ScheduleEntry {
  id: string;
  time: string;
  title: string;
  notes: string;
  linkedSection?: string; // e.g., "ceremony", "reception"
}

export interface ScheduleData {
  ceremony_time: string; // e.g., "4:30 PM"
  entries: ScheduleEntry[];
  /** Custom phase labels — key is auto-detected phase name, value is user's custom name */
  phaseOverrides?: Record<string, string>;
}

export function getDefaultScheduleData(): ScheduleData {
  return {
    ceremony_time: "",
    entries: [],
  };
}

/** Generate a suggested timeline based on ceremony start time */
export function generateSuggestedTimeline(ceremonyTime: string): ScheduleEntry[] {
  // Parse ceremony time (e.g., "4:30 PM" or "16:30")
  const parsed = parseTo24h(ceremonyTime);
  if (parsed === null) return [];

  const [ceremonyH, ceremonyM] = parsed;

  function fmt(h: number, m: number): string {
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
  }

  function offset(hours: number, minutes: number = 0): string {
    let h = ceremonyH + hours;
    let m = ceremonyM + minutes;
    if (m >= 60) { h += 1; m -= 60; }
    if (m < 0) { h -= 1; m += 60; }
    return fmt(h, m);
  }

  return [
    { id: crypto.randomUUID(), time: offset(-5), title: "Hair & makeup begins", notes: "Allow ~45 min per person", linkedSection: "getting_ready" },
    { id: crypto.randomUUID(), time: offset(-2, -30), title: "Photographer arrives", notes: "", linkedSection: "getting_ready" },
    { id: crypto.randomUUID(), time: offset(-2), title: "Detail shots", notes: "Rings, dress, shoes, invitation suite", linkedSection: "photos" },
    { id: crypto.randomUUID(), time: offset(-1, -30), title: "First look", notes: "If applicable", linkedSection: "getting_ready" },
    { id: crypto.randomUUID(), time: offset(-1, -15), title: "Bridal party & family photos", notes: "", linkedSection: "photos" },
    { id: crypto.randomUUID(), time: offset(0, -30), title: "Guests arrive & are seated", notes: "" },
    { id: crypto.randomUUID(), time: offset(0), title: "Ceremony begins", notes: "", linkedSection: "ceremony" },
    { id: crypto.randomUUID(), time: offset(0, 30), title: "Ceremony ends — family formal photos", notes: "", linkedSection: "photos" },
    { id: crypto.randomUUID(), time: offset(0, 45), title: "Private moment — just you two", notes: "Take a breath. You're married!" },
    { id: crypto.randomUUID(), time: offset(1), title: "Cocktail hour", notes: "", linkedSection: "cocktail" },
    { id: crypto.randomUUID(), time: offset(2), title: "Grand entrance & first dance", notes: "", linkedSection: "reception" },
    { id: crypto.randomUUID(), time: offset(2, 15), title: "Dinner service", notes: "" },
    { id: crypto.randomUUID(), time: offset(3, 15), title: "Speeches & toasts", notes: "", linkedSection: "reception" },
    { id: crypto.randomUUID(), time: offset(3, 45), title: "Parent dances", notes: "", linkedSection: "reception" },
    { id: crypto.randomUUID(), time: offset(4), title: "Cake cutting", notes: "", linkedSection: "reception" },
    { id: crypto.randomUUID(), time: offset(4, 15), title: "Open dancing", notes: "" },
    { id: crypto.randomUUID(), time: offset(5, 45), title: "Last dance", notes: "", linkedSection: "reception" },
    { id: crypto.randomUUID(), time: offset(6), title: "Exit / send-off", notes: "", linkedSection: "reception" },
  ];
}

function parseTo24h(time: string): [number, number] | null {
  if (!time) return null;
  // Handle "4:30 PM", "16:30", "4:30pm", etc.
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return [h, m];
}

// ── Getting Ready ──────────────────────────────────────────────────────

export interface GettingReadyGroup {
  label: string;
  location: string;
  time: string;
  who: string;
}

export interface GettingReadyData {
  group_1: GettingReadyGroup;
  group_2: GettingReadyGroup;
  hair_makeup_notes: string;
  detail_shots: string[]; // checked items from default list
  first_look: boolean;
  first_look_time: string;
  first_look_location: string;
  cultural_notes: string;
}

export const DEFAULT_DETAIL_SHOTS = [
  "Wedding rings",
  "Dress / outfit on hanger",
  "Shoes",
  "Invitation suite & stationery",
  "Bouquet & florals",
  "Jewelry & accessories",
  "Perfume / cologne",
  "Cufflinks / tie",
  "Gifts exchanged",
  "Vow books",
];

export function getDefaultGettingReadyData(): GettingReadyData {
  return {
    group_1: { label: "Group 1", location: "", time: "", who: "" },
    group_2: { label: "Group 2", location: "", time: "", who: "" },
    hair_makeup_notes: "",
    detail_shots: [],
    first_look: false,
    first_look_time: "",
    first_look_location: "",
    cultural_notes: "",
  };
}

// ── Ceremony ───────────────────────────────────────────────────────────

export interface ProcessionalEntry {
  id: string;
  role: string;
  name: string;
}

export interface ReadingEntry {
  id: string;
  reader: string;
  title: string;
  notes: string;
}

export interface CeremonyData {
  processional: ProcessionalEntry[];
  readings: ReadingEntry[];
  vows_style: "custom" | "traditional" | "mix" | "";
  unity_ceremony: "none" | "sand" | "candle" | "handfasting" | "wine_box" | "other" | "";
  unity_notes: string;
  recessional_style: "together" | "bridal_party_first" | "";
  officiant_notes: string;
  cultural_notes: string;
}

export function getDefaultCeremonyData(): CeremonyData {
  return {
    processional: [
      { id: crypto.randomUUID(), role: "Officiant", name: "" },
      { id: crypto.randomUUID(), role: "Wedding party", name: "" },
      { id: crypto.randomUUID(), role: "Partner 1", name: "" },
      { id: crypto.randomUUID(), role: "Partner 2", name: "" },
    ],
    readings: [],
    vows_style: "",
    unity_ceremony: "",
    unity_notes: "",
    recessional_style: "",
    officiant_notes: "",
    cultural_notes: "",
  };
}

// ── Cocktail Hour ──────────────────────────────────────────────────────

export interface CocktailData {
  location: "same_venue" | "different_area" | "outdoor" | "";
  duration: "45" | "60" | "90" | "";
  activities_lawn_games: boolean;
  activities_photo_booth: boolean;
  activities_live_music: boolean;
  music_mood: "background_jazz" | "acoustic" | "dj_playlist" | "live_band" | "";
  catering_notes: string;
  photos_during: boolean;
  photos_notes: string;
  cultural_notes: string;
}

export function getDefaultCocktailData(): CocktailData {
  return {
    location: "",
    duration: "",
    activities_lawn_games: false,
    activities_photo_booth: false,
    activities_live_music: false,
    music_mood: "",
    catering_notes: "",
    photos_during: false,
    photos_notes: "",
    cultural_notes: "",
  };
}

// ── Reception ──────────────────────────────────────────────────────────

export interface ParentDance {
  id: string;
  who: string;
  song: string;
  artist: string;
}

export interface SpeechEntry {
  id: string;
  speaker: string;
}

export interface ReceptionData {
  grand_entrance: boolean;
  grand_entrance_song: string;
  first_dance_song: string;
  first_dance_artist: string;
  first_dance_notes: string;
  parent_dances: ParentDance[];
  speeches: SpeechEntry[];
  vendor_meals_note: string;
  bouquet_toss: boolean;
  garter_toss: boolean;
  anniversary_dance: boolean;
  shoe_game: boolean;
  cake_cutting: boolean;
  cake_cutting_song: string;
  last_dance_song: string;
  last_dance_artist: string;
  exit_style: "none" | "sparklers" | "bubbles" | "confetti" | "ribbon_wands" | "other" | "";
  exit_song: string;
  cultural_notes: string;
}

export function getDefaultReceptionData(): ReceptionData {
  return {
    grand_entrance: false,
    grand_entrance_song: "",
    first_dance_song: "",
    first_dance_artist: "",
    first_dance_notes: "",
    parent_dances: [
      { id: crypto.randomUUID(), who: "Partner 1 & Parent", song: "", artist: "" },
      { id: crypto.randomUUID(), who: "Partner 2 & Parent", song: "", artist: "" },
    ],
    speeches: [],
    vendor_meals_note: "",
    bouquet_toss: false,
    garter_toss: false,
    anniversary_dance: false,
    shoe_game: false,
    cake_cutting: true,
    cake_cutting_song: "",
    last_dance_song: "",
    last_dance_artist: "",
    exit_style: "",
    exit_song: "",
    cultural_notes: "",
  };
}

// ── Photo Shot List ────────────────────────────────────────────────────

export interface PhotoShot {
  id: string;
  label: string;
  notes: string;
  included: boolean;
  isCustom?: boolean;
}

export interface PhotoShotListData {
  pre_ceremony: PhotoShot[];
  ceremony_family: PhotoShot[];
  reception: PhotoShot[];
}

export function getDefaultPhotoShotListData(): PhotoShotListData {
  const shot = (label: string): PhotoShot => ({
    id: crypto.randomUUID(),
    label,
    notes: "",
    included: true,
  });

  return {
    pre_ceremony: [
      shot("Getting ready candids"),
      shot("Detail shots (rings, dress, shoes, invitation, bouquet)"),
      shot("First look reaction"),
      shot("Bridal party individual portraits"),
      shot("Full bridal party group shot"),
    ],
    ceremony_family: [
      shot("Processional moment"),
      shot("Ring exchange close-up"),
      shot("First kiss"),
      shot("Recessional (walking back up the aisle)"),
      shot("Couple + Partner 1's parents"),
      shot("Couple + Partner 2's parents"),
      shot("Couple + both sets of parents"),
      shot("Couple + siblings"),
      shot("Full bridal party"),
      shot("Couple + grandparents"),
    ],
    reception: [
      shot("Venue & table detail shots"),
      shot("First dance"),
      shot("Parent dances"),
      shot("Cake cutting"),
      shot("Speech reactions"),
      shot("Dancing candids"),
      shot("Golden hour portraits (schedule ~60 min before sunset)"),
      shot("Exit / send-off moment"),
    ],
  };
}

// ── Logistics ──────────────────────────────────────────────────────────

export interface LogisticsData {
  transportation: string;
  rain_plan: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vendor_meals_timing: string;
  cultural_notes: string;
  notes: string;
}

export function getDefaultLogisticsData(): LogisticsData {
  return {
    transportation: "",
    rain_plan: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    vendor_meals_timing: "",
    cultural_notes: "",
    notes: "",
  };
}

// ── Section keys ───────────────────────────────────────────────────────

export const SECTION_KEYS = [
  "schedule",
  "getting_ready",
  "ceremony",
  "cocktail",
  "reception",
  "photos",
  "logistics",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_META: Record<SectionKey, { label: string; shortLabel: string }> = {
  schedule: { label: "Schedule", shortLabel: "Schedule" },
  getting_ready: { label: "Getting Ready", shortLabel: "Ready" },
  ceremony: { label: "Ceremony", shortLabel: "Ceremony" },
  cocktail: { label: "Cocktail Hour", shortLabel: "Cocktail" },
  reception: { label: "Reception", shortLabel: "Reception" },
  photos: { label: "Photo Shot List", shortLabel: "Photos" },
  logistics: { label: "Logistics", shortLabel: "Logistics" },
};

export type AllSectionData = {
  schedule: ScheduleData;
  getting_ready: GettingReadyData;
  ceremony: CeremonyData;
  cocktail: CocktailData;
  reception: ReceptionData;
  photos: PhotoShotListData;
  logistics: LogisticsData;
};

export function getDefaultSectionData(key: SectionKey): AllSectionData[typeof key] {
  const defaults: Record<SectionKey, () => unknown> = {
    schedule: getDefaultScheduleData,
    getting_ready: getDefaultGettingReadyData,
    ceremony: getDefaultCeremonyData,
    cocktail: getDefaultCocktailData,
    reception: getDefaultReceptionData,
    photos: getDefaultPhotoShotListData,
    logistics: getDefaultLogisticsData,
  };
  return defaults[key]() as AllSectionData[typeof key];
}
