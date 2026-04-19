// ---------------------------------------------------------------------------
// Static content for the Tips page. Keys are stable — never change them,
// because they're referenced in DB (dismissed_tips, packed_keys, hidden_keys).
// ---------------------------------------------------------------------------

export interface TipEntry {
  id: string;
  title: string;
  body?: string;
  meta?: string; // e.g. savings hint
  iconName?: string; // lucide icon name; page maps to component
}

// ---- Budget hacks ---------------------------------------------------------

export const BUDGET_HACKS: TipEntry[] = [
  { id: "budget-flower-cake", title: "Ask florist to decorate cake with fresh flowers", meta: "Saves $100-300" },
  { id: "budget-repurpose-ceremony-flowers", title: "Repurpose ceremony flowers at reception", meta: "Ask florist to plan double-duty arrangements" },
  { id: "budget-display-plus-sheet", title: "Display cake + sheet cake from kitchen", meta: "Saves 40-60%" },
  { id: "budget-seasonal-flowers", title: "Choose in-season, locally grown flowers", meta: "Lower markup, fresher blooms" },
  { id: "budget-bulk-amazon", title: "Bulk non-floral items from Amazon", meta: "Candles, votives, card boxes" },
  { id: "budget-greenery", title: "Use greenery-heavy arrangements", meta: "Eucalyptus & ferns cost less than blooms" },
  { id: "budget-striking-venue", title: "Pick an architecturally stunning venue", meta: "Needs less decor" },
  { id: "budget-skip-wedding-label", title: 'Skip the "wedding" label', meta: 'Order "event" cake, "party" linens' },
];

// ---- Day-of tips ----------------------------------------------------------

export const DAY_OF_TIPS: TipEntry[] = [
  { id: "dayof-10min-alone", title: "Schedule 10 min alone with partner right after ceremony", iconName: "Heart" },
  { id: "dayof-lock-cardbox", title: "Lock your card box; assign someone to transport it", iconName: "CreditCard" },
  { id: "dayof-people-wrangler", title: "Assign a people wrangler for family photos (not the photographer)", iconName: "Users" },
  { id: "dayof-dj-transitions", title: "Have DJ announce every transition", iconName: "Music" },
  { id: "dayof-mic-for-vows", title: "Use a microphone for vows", iconName: "Mic" },
  { id: "dayof-outfit-weights", title: "Sew weights into outfit hem (for lightweight fabrics outdoors)", iconName: "Shirt" },
  { id: "dayof-eat", title: "EAT. Breakfast, lunch, dinner. Someone must put food in your hands", iconName: "Utensils" },
  { id: "dayof-phone-away", title: "Put phone away or give it to someone", iconName: "Phone" },
  { id: "dayof-timeline-cards", title: "Brief your wedding party with printed timeline cards", iconName: "Clock" },
  { id: "dayof-someone-pays-vendors", title: "Have someone else manage vendor payments/tips on the day", iconName: "CreditCard" },
];

// ---- Things to prepare for (merged What-If + Pitfalls) --------------------

export interface PreparationEntry {
  id: string;
  title: string;
  lead: string; // one-line summary shown by default
  body: string; // full detail revealed on expand
  iconName: string;
  timeframe: "weeks_out" | "week_of" | "day_of";
  // Weeks before wedding_date when this task should happen. Drives the
  // smart "Add to Timeline" — the created event's date is auto-set to
  // `wedding_date - offsetWeeks * 7 days`. Omit for tips that aren't
  // time-anchored (e.g., generic mindset reminders).
  offsetWeeks?: number;
  // Auto-hide this tip for couples whose venue is fully indoor. They
  // don't need rain plans or heat mitigation.
  hideWhenIndoor?: boolean;
}

// Each entry has a `lead` — a one-line summary shown by default.
// `body` is the full detail, revealed on click. Keeps dense reference
// reading optional, not forced.
export const THINGS_TO_PREPARE: PreparationEntry[] = [
  // ── Weeks out: plan + prevent ────────────────────────────────────────
  {
    id: "prep-guest-list-politics",
    title: "Guest list politics",
    lead: "Set the number early and hold the line — every exception creates three more.",
    body: "Set your number early, agree on rules with your partner, and hold the line. Every exception creates three more.",
    iconName: "ListChecks",
    timeframe: "weeks_out",
    offsetWeeks: 24,
  },
  {
    id: "prep-diy-reality",
    title: "DIY is harder than Pinterest",
    lead: "Do a full test run and multiply your estimate by 1.5× per table.",
    body: "Do a full test run before committing. Multiply your estimated time by 1.5x per table. Know when to outsource.",
    iconName: "Scissors",
    timeframe: "weeks_out",
    offsetWeeks: 8,
  },
  {
    id: "prep-rain-plan",
    title: "Rain on outdoor wedding",
    lead: "Get the venue rain plan in writing; keep clear bubble umbrellas ready.",
    body: "Get venue rain plan in writing. Keep clear bubble umbrellas on hand. Inform guests of any changes via your wedding website.",
    iconName: "CloudRain",
    timeframe: "weeks_out",
    offsetWeeks: 4,
    hideWhenIndoor: true,
  },
  {
    id: "prep-vendor-backup",
    title: "Vendor no-show",
    lead: "Keep a backup contact for every vendor category plus a DJ-backup playlist.",
    body: "Maintain a backup contact list for every vendor category. Have a friend with a good camera on standby. Keep a Spotify playlist and Bluetooth speaker as DJ backup.",
    iconName: "UserX",
    timeframe: "weeks_out",
    offsetWeeks: 4,
  },
  {
    id: "prep-legal-marriage-license",
    title: "Marriage license requirements",
    lead: "Rules vary by state — confirm waiting period and expiration at least 6 weeks out.",
    body: "Licensing requirements vary wildly by state/country — some require a waiting period (e.g. 24–72 hours), some require in-person appearance by both parties, some have specific expiration windows. Confirm the rules at least 6 weeks out and schedule the appointment.",
    iconName: "FileText",
    timeframe: "weeks_out",
    offsetWeeks: 6,
  },
  {
    id: "prep-honeymoon-docs",
    title: "Honeymoon travel docs",
    lead: "Passport must be valid 6+ months past return; don't rename until after you travel.",
    body: "Passport must be valid 6+ months past return date for most international destinations. Check visa rules; some require in-advance application. If flights are in one partner's maiden name, don't change your name on the passport until AFTER you return.",
    iconName: "Plane",
    timeframe: "weeks_out",
    offsetWeeks: 12,
  },
  {
    id: "prep-vendor-contracts",
    title: "Vendor contract red flags",
    lead: "Watch for discretionary clauses, no weather refund, and uncapped travel fees.",
    body: "Watch for: 'discretionary' clauses (vendor decides terms), no refund policy on weather, no backup-vendor clause for illness, no cap on travel/overtime fees. Get everything (arrival time, hours of service, what's included) in writing.",
    iconName: "ShieldAlert",
    timeframe: "weeks_out",
    offsetWeeks: 12,
  },

  // ── Week of: final stretch ───────────────────────────────────────────
  {
    id: "prep-hmu-delays",
    title: "H&MU delays cascade",
    lead: "Give your hair & makeup artist the hard deadline, not just the start time.",
    body: "Build buffer time into the morning schedule. Your hair and makeup artist must know the hard deadline, not just the start time.",
    iconName: "Timer",
    timeframe: "week_of",
    offsetWeeks: 1,
  },
  {
    id: "prep-av-failure",
    title: "Tech / AV failure",
    lead: "Test the mic at rehearsal; print all readings in case screens fail.",
    body: "Test the mic at rehearsal. Bring a portable Bluetooth speaker as backup. Print all readings so they can be delivered without screens.",
    iconName: "Mic",
    timeframe: "week_of",
    offsetWeeks: 1,
  },
  {
    id: "prep-late-person",
    title: "Key person running late",
    lead: "Build a 15–30 minute buffer into the morning schedule.",
    body: "Build a 15-30 minute buffer into the morning schedule. Keep backup transport phone numbers handy.",
    iconName: "Car",
    timeframe: "week_of",
    offsetWeeks: 1,
  },

  // ── Day of: acute issues ─────────────────────────────────────────────
  {
    id: "prep-wardrobe-malfunction",
    title: "Wardrobe malfunction",
    lead: "Your emergency kit has fashion tape, sewing kit, safety pins, and stain remover.",
    body: "Your emergency kit covers this: fashion tape, sewing kit, safety pins, and stain remover. Pack extras of anything you cannot live without.",
    iconName: "Shirt",
    timeframe: "day_of",
  },
  {
    id: "prep-medical-emergency",
    title: "Guest medical emergency",
    lead: "Know the nearest hospital address; designate one person as 911 caller.",
    body: "Know the address of the nearest hospital. Designate a specific person as the 911 caller. Keep first aid supplies in your emergency kit.",
    iconName: "AlertTriangle",
    timeframe: "day_of",
  },
  {
    id: "prep-extreme-heat",
    title: "Extreme heat",
    lead: "Water stations + shade; keep outdoor ceremony to 20 minutes max.",
    body: "Set up water stations and provide fans or shade. Shorten the outdoor ceremony portion to 20 minutes max.",
    iconName: "Thermometer",
    timeframe: "day_of",
    hideWhenIndoor: true,
  },
  {
    id: "prep-cake-disaster",
    title: "Cake disaster",
    lead: "Identify a grocery store backup — or skip the cake-cutting entirely, nobody notices.",
    body: "Have a grocery store backup option identified in advance. Or skip the cake cutting entirely — genuinely, no one notices.",
    iconName: "Cake",
    timeframe: "day_of",
  },
];

// ---- Emergency Kit --------------------------------------------------------

export type KitCategoryId = "freshen_up" | "first_aid" | "fix_it" | "fuel_comfort";

export interface KitCategoryDef {
  id: KitCategoryId;
  name: string;
  iconName: string;
  colorClass: string; // Tailwind pair for icon bg + fg
  essentials: string[];
  extended: string[];
}

// Item identity is `${categoryId}::${itemName}` for defaults.
// Custom items use "custom::${uuid}" keys and live entirely in DB.
export const KIT_CATEGORIES: KitCategoryDef[] = [
  {
    id: "freshen_up",
    name: "Freshen-up",
    iconName: "Sparkles",
    colorClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    essentials: [
      "Deodorant",
      "Mints",
      "Tissues",
      "Wet wipes",
      "Blotting papers",
      "Hair spray",
      "Bobby pins",
      "Lipstick / lip color",
    ],
    extended: [
      "Floss",
      "Mouthwash",
      "Hand sanitizer",
      "Static guard",
      "Wrinkle release spray",
      "Lint roller",
      "Hair ties",
      "Dry shampoo",
      "Small brush / comb",
      "Hair clips",
      "Pressed powder",
      "Makeup wipes",
      "Cotton swabs",
      "Setting spray",
      "Concealer",
    ],
  },
  {
    id: "first_aid",
    name: "First Aid",
    iconName: "Cross",
    colorClass: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    essentials: [
      "Band-aids (+ blister-specific)",
      "Ibuprofen",
      "Antacid",
      "Allergy medicine",
      "Eye drops",
      "Sunscreen",
    ],
    extended: [
      "Acetaminophen",
      "Bug spray",
    ],
  },
  {
    id: "fix_it",
    name: "Fix-it",
    iconName: "Wrench",
    colorClass: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    essentials: [
      "Safety pins",
      "Fashion tape",
      "Sewing kit",
      "Stain remover pen",
      "Scissors",
      "Super glue",
      "Sharpie",
      "Phone charger + cable",
    ],
    extended: [
      "Box cutter",
      "Clear tape",
      "Double-sided tape",
      "Duct tape",
      "Zip ties",
      "Rubber bands",
      "Pen",
      "Extra batteries",
      "Extension cord",
      "Lighter",
      "Hem tape",
      "Extra buttons",
      "White chalk",
      "Clear nail polish",
      "Shoe insoles",
      "Moleskin",
    ],
  },
  {
    id: "fuel_comfort",
    name: "Fuel & Comfort",
    iconName: "Apple",
    colorClass: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    essentials: [
      "Water bottles",
      "Protein bars",
      "Electrolyte packets",
      "Umbrella (clear bubble)",
      "Pashminas / blankets",
    ],
    extended: [
      "Crackers",
      "Straws",
      "Hand fans",
    ],
  },
];

export interface CustomKitItem {
  id: string; // uuid generated client-side
  category: KitCategoryId;
  name: string;
  packed: boolean;
}

export interface EmergencyKitState {
  packed: string[]; // keys of default items that are packed
  hidden: string[]; // keys of default items the couple removed
  custom: CustomKitItem[];
  assignee?: { name?: string; contact?: string };
}

export interface TipsInteractions {
  dismissed: string[]; // tip ids
}

export function defaultItemKey(categoryId: KitCategoryId, name: string): string {
  return `${categoryId}::${name}`;
}
