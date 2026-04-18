// Shared types & defaults for Day-of Details sections
// No "use client" — safe to import from server components

// ── Schedule (day-of timeline) ─────────────────────────────────────────

export interface ScheduleEntry {
  id: string;
  time: string;
  title: string;
  notes: string;
  linkedSection?: string; // e.g., "ceremony", "reception"
  /**
   * True if user edited, added, or inserted this entry. Untouched template
   * entries can be replaced by Regenerate without losing user work.
   */
  user_touched?: boolean;
  /**
   * Minutes of setup/buffer before `time`. The displayed `time` is when the
   * vendor/event is "ready" — actual arrival = time − setup_minutes.
   * Useful for photographer, hair & makeup, florist load-in, etc.
   */
  setup_minutes?: number;
}

/**
 * Subtract minutes from a formatted time string. Returns null if unparsable.
 * Used to render "arrives X:XX · ready Y:YY" with setup_minutes.
 */
export function subtractMinutes(time: string, minutes: number): string | null {
  if (!time || !minutes) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  let total = h * 60 + m - minutes;
  if (total < 0) total += 24 * 60;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  const p = newH >= 12 ? "PM" : "AM";
  const h12 = newH === 0 ? 12 : newH > 12 ? newH - 12 : newH;
  return `${h12}:${newM.toString().padStart(2, "0")} ${p}`;
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
  /** Planned speech length in minutes. Default 3 when missing on older data. */
  estimated_minutes?: number;
  /** Role / relationship — Maid of Honor, Best Man, Father of the bride, etc. */
  role?: string;
  /** Optional MC introduction line. If empty, a default is generated from speaker + role. */
  intro_line?: string;
}

/** Sum of estimated minutes across speeches. Treats missing as 3. */
export function speechesTotalMinutes(speeches: SpeechEntry[] | undefined): number {
  if (!speeches?.length) return 0;
  return speeches.reduce((sum, s) => sum + (s.estimated_minutes ?? 3), 0);
}

/**
 * Build an MC intro line. If `intro_line` is set use it verbatim; otherwise
 * fall back to a friendly template using speaker + role.
 */
export function mcIntroFor(s: SpeechEntry): string {
  if (s.intro_line?.trim()) return s.intro_line.trim();
  const speaker = s.speaker?.trim();
  const role = s.role?.trim();
  if (speaker && role) {
    return `Please welcome to the mic, ${speaker}, ${role}.`;
  }
  if (speaker) {
    return `Please welcome to the mic, ${speaker}.`;
  }
  if (role) {
    return `Please welcome our next speaker — ${role}.`;
  }
  return "Please welcome our next speaker.";
}

// ── Reception moment helpers ───────────────────────────────────────────

/** Stable built-in moment ids for the reception timeline. */
export const RECEPTION_MOMENT_IDS = [
  "grand_entrance",
  "first_dance",
  "dinner",
  "parent_dances",
  "speeches",
  "cake_cutting",
  "last_dance",
  "exit",
] as const;

export type BuiltInReceptionMomentId = (typeof RECEPTION_MOMENT_IDS)[number];

/** Optional "extra" moments shown only when their toggle is on. */
export const RECEPTION_TOSS_IDS = [
  "bouquet_toss",
  "garter_toss",
  "anniversary_dance",
  "shoe_game",
] as const;

export type TossMomentId = (typeof RECEPTION_TOSS_IDS)[number];

export const RECEPTION_MOMENT_TITLES: Record<
  BuiltInReceptionMomentId | TossMomentId,
  string
> = {
  grand_entrance: "Grand entrance",
  first_dance: "First dance",
  dinner: "Dinner service",
  parent_dances: "Parent dances",
  speeches: "Speeches & toasts",
  cake_cutting: "Cake cutting",
  last_dance: "Last dance",
  exit: "Exit / send-off",
  bouquet_toss: "Bouquet toss",
  garter_toss: "Garter toss",
  anniversary_dance: "Anniversary dance",
  shoe_game: "Shoe game",
};

/**
 * Generate a default MC line for a moment based on its id + current data.
 * Used to pre-fill `moment_extras[id].mc_line` when the couple toggles
 * "MC announces this moment."
 */
export function defaultMcLineForMoment(
  momentId: string,
  data: ReceptionData
): string {
  const songLine = (song?: string, artist?: string) => {
    const s = song?.trim();
    const a = artist?.trim();
    if (s && a) return `${s} by ${a}`;
    return s || null;
  };

  switch (momentId) {
    case "grand_entrance": {
      const song = data.grand_entrance_song?.trim();
      return song
        ? `Ladies and gentlemen, please rise and welcome the newlyweds — entering to ${song}!`
        : "Ladies and gentlemen, please rise and welcome the newlyweds!";
    }
    case "first_dance": {
      const sl = songLine(data.first_dance_song, data.first_dance_artist);
      return sl
        ? `And now, for their first dance as a married couple — ${sl}.`
        : "And now, for their first dance as a married couple.";
    }
    case "dinner":
      return "Dinner is served — please join us at your tables.";
    case "parent_dances":
      return "Please join the floor for our parent dances.";
    case "speeches":
      return "We'll now hear a few words from family and friends.";
    case "cake_cutting": {
      const song = data.cake_cutting_song?.trim();
      return song
        ? `Please gather round as the couple cuts their cake — to ${song}.`
        : "Please gather round as the couple cuts their cake.";
    }
    case "last_dance": {
      const sl = songLine(data.last_dance_song, data.last_dance_artist);
      return sl
        ? `Last dance of the night — ${sl}. Get out there!`
        : "Last dance of the night — get out there!";
    }
    case "exit": {
      const song = data.exit_song?.trim();
      return song
        ? `It's time to send the couple off — to ${song}.`
        : "It's time to send the couple off!";
    }
    case "bouquet_toss":
      return "All the single guests to the floor — it's time for the bouquet toss!";
    case "garter_toss":
      return "Single gentlemen to the floor — it's garter toss time!";
    case "anniversary_dance":
      return "We invite all married couples to the dance floor.";
    case "shoe_game":
      return "Time for the shoe game — grab your chairs!";
    default:
      return "";
  }
}

/**
 * Moments where an MC announcement is conventionally expected. Used to show
 * a "typical" hint on the MC chip so couples know which moments usually have
 * an announcement, even before they've opted in. Planner wisdom — not a rule.
 */
export const TYPICAL_MC_MOMENTS: ReadonlySet<string> = new Set([
  "grand_entrance",
  "first_dance",
  "cake_cutting",
  "last_dance",
  "exit",
  "bouquet_toss",
  "garter_toss",
  "anniversary_dance",
  "shoe_game",
]);

export interface ExitPlan {
  /** Who owns the logistics on the day (lights sparklers, hands out bubbles, etc.) */
  point_person: string;
  /** Backup if weather / venue cancels the exit */
  rain_backup: string;
  /** Notes: quantity, storage, distribution staging */
  notes: string;
  /** Has venue signed off on flames / litter / timing? */
  venue_policy_confirmed: boolean;
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
  /** Conditional on exit_style being set to something other than "none" or "". */
  exit_plan?: ExitPlan;
  cultural_notes: string;
  /**
   * Per-moment uniform extras (time, music toggle, MC intro, guest action, notes).
   * Keyed by stable moment id. Optional — older data omits this.
   */
  moment_extras?: Record<string, MomentExtras>;
  /** Custom moments the couple added to the reception timeline. */
  custom_moments?: CustomReceptionMoment[];
  /**
   * User-set ordering of moment ids (built-in + custom). When missing/empty,
   * fall back to: (a) sort by `time` if any set, (b) built-in chronological order.
   */
  moment_order?: string[];
  /**
   * Built-in moment ids the couple has hidden from their timeline (e.g., they're
   * skipping cake cutting). Hidden moments don't appear in the timeline, hero
   * summary, or exports. Data is preserved so restoring brings it back intact.
   * Custom moments aren't hidden — they're truly deleted via remove.
   */
  hidden_moments?: string[];
}

// ── Reception moment extras ────────────────────────────────────────────

export interface MomentExtras {
  /** Optional explicit time (e.g., "7:00 PM"). Drives sort when moment_order is absent. */
  time?: string;
  /**
   * Explicit opt-out: "no music for this moment." Distinct from blank (not
   * planned yet) vs. song filled (music is planned). An important signal
   * for DJ/vendors so silence is understood as intentional.
   */
  skip_music?: boolean;
  /**
   * @deprecated Replaced by `skip_music`. Left in place so older data still
   * parses cleanly; not read by the new UI.
   */
  music_needed?: boolean;
  /** Optional music notes for moments without a primary song field (e.g., Dinner: "low-volume jazz playlist"). */
  music_mood?: string;
  /** Whether the MC should announce this moment. */
  mc_needed?: boolean;
  /** Line the MC reads. When mc_needed=true and blank, we suggest one. */
  mc_line?: string;
  /** What guests do (e.g., "Everyone stands", "Applaud as they enter"). */
  guest_action?: string;
  /** Free-text notes for this moment. */
  notes?: string;
  /**
   * Optional song for moments that don't have a dedicated song field in the
   * reception schema (tosses, custom moments). Built-in moments that already
   * have a song in ReceptionData keep using those fields.
   */
  song?: string;
  /**
   * Display label override for built-in moments. Example: couple renames
   * "First dance" to "Our first song together". Stable moment id is preserved
   * so exports/print/booklets still work. Custom moments store title in
   * `CustomReceptionMoment.title` directly, not here.
   */
  display_title?: string;
}

export interface CustomReceptionMoment extends MomentExtras {
  id: string;
  title: string;
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

export interface DayOfRoles {
  rings: string;
  license: string;
  tips: string;
  toasts_cue: string;
  gifts: string;
  timeline: string;
}

export const DAY_OF_ROLE_META: {
  key: keyof DayOfRoles;
  label: string;
  hint: string;
}[] = [
  { key: "rings", label: "Rings", hint: "Holds both rings until the ceremony" },
  { key: "license", label: "Marriage license", hint: "Brings & safeguards the license" },
  { key: "tips", label: "Vendor tips & envelopes", hint: "Distributes sealed envelopes day-of" },
  { key: "toasts_cue", label: "Toast cueing", hint: "Signals speakers when to start" },
  { key: "gifts", label: "Gifts & cards", hint: "Collects & secures gift table items" },
  { key: "timeline", label: "Timeline nudger", hint: "Keeps the day on schedule" },
];

export interface LogisticsData {
  transportation: string;
  rain_plan: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  vendor_meals_timing: string;
  cultural_notes: string;
  notes: string;
  /** Named runners for day-of responsibilities. Optional; older records may omit. */
  roles?: DayOfRoles;
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
    roles: {
      rings: "",
      license: "",
      tips: "",
      toasts_cue: "",
      gifts: "",
      timeline: "",
    },
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

// ── Completion signal ──────────────────────────────────────────────────
// Each section reports "empty" | "partial" | "done" | "none".
// "none" is used for Photos — its defaults pre-seed the list, so a
// completion dot would be misleading.

export type CompletionState = "empty" | "partial" | "done" | "none";

function hasText(s: string | null | undefined): boolean {
  return !!s && s.trim().length > 0;
}

export function isScheduleComplete(d: ScheduleData): CompletionState {
  const hasTime = hasText(d.ceremony_time);
  const hasEntries = (d.entries?.length ?? 0) > 0;
  if (hasEntries) return "done";
  if (hasTime) return "partial";
  return "empty";
}

export function isGettingReadyComplete(d: GettingReadyData): CompletionState {
  const g1 = d.group_1 || ({} as GettingReadyGroup);
  const g2 = d.group_2 || ({} as GettingReadyGroup);
  const anyGroupStarted =
    hasText(g1.time) || hasText(g1.location) ||
    hasText(g2.time) || hasText(g2.location);
  const firstLookDecided = d.first_look === true
    ? hasText(d.first_look_time) || hasText(d.first_look_location)
    : d.first_look === false;
  if (hasText(g1.time) && firstLookDecided) return "done";
  if (anyGroupStarted) return "partial";
  return "empty";
}

export function isCeremonyComplete(d: CeremonyData): CompletionState {
  const hasProcessional = (d.processional || []).some((p) => hasText(p.name));
  const hasVows = !!d.vows_style;
  const hasRecessional = !!d.recessional_style;
  if (hasVows && hasRecessional) return "done";
  if (hasProcessional || hasVows || hasRecessional) return "partial";
  return "empty";
}

export function isCocktailComplete(d: CocktailData): CompletionState {
  if (!!d.duration && !!d.location) return "done";
  if (!!d.duration || !!d.location) return "partial";
  return "empty";
}

export function isReceptionComplete(d: ReceptionData): CompletionState {
  const hasFirstDance = hasText(d.first_dance_song);
  const hasExit = !!d.exit_style;
  if (hasFirstDance && hasExit) return "done";
  if (hasFirstDance || hasExit) return "partial";
  return "empty";
}

export function isLogisticsComplete(d: LogisticsData): CompletionState {
  const hasEmergency = hasText(d.emergency_contact_phone);
  const hasRain = hasText(d.rain_plan);
  const anyField =
    hasText(d.transportation) ||
    hasText(d.rain_plan) ||
    hasText(d.emergency_contact_name) ||
    hasText(d.emergency_contact_phone) ||
    hasText(d.vendor_meals_timing) ||
    hasText(d.cultural_notes) ||
    hasText(d.notes);
  if (hasEmergency && hasRain) return "done";
  if (anyField) return "partial";
  return "empty";
}

/**
 * Central dispatcher. Photos returns "none" — its completion isn't a useful
 * signal because the default shot list is pre-seeded as included.
 */
export function getSectionCompletion<K extends SectionKey>(
  key: K,
  data: AllSectionData[K]
): CompletionState {
  switch (key) {
    case "schedule": return isScheduleComplete(data as ScheduleData);
    case "getting_ready": return isGettingReadyComplete(data as GettingReadyData);
    case "ceremony": return isCeremonyComplete(data as CeremonyData);
    case "cocktail": return isCocktailComplete(data as CocktailData);
    case "reception": return isReceptionComplete(data as ReceptionData);
    case "photos": return "none";
    case "logistics": return isLogisticsComplete(data as LogisticsData);
    default: return "empty";
  }
}
