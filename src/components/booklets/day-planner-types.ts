// Shared types and defaults for day planner sections
// This file has NO "use client" directive so it can be imported from server components

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
  order: number;
}

export interface ReceptionData {
  grand_entrance: boolean;
  grand_entrance_song: string;
  first_dance_song: string;
  first_dance_artist: string;
  first_dance_notes: string;
  parent_dances: ParentDance[];
  speeches: SpeechEntry[];
  bouquet_toss: boolean;
  garter_toss: boolean;
  cake_cutting: boolean;
  cake_cutting_song: string;
  last_dance_song: string;
  last_dance_artist: string;
  exit_style: "none" | "sparklers" | "bubbles" | "confetti" | "ribbon_wands" | "other" | "";
  exit_song: string;
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
    bouquet_toss: false,
    garter_toss: false,
    cake_cutting: true,
    cake_cutting_song: "",
    last_dance_song: "",
    last_dance_artist: "",
    exit_style: "",
    exit_song: "",
  };
}

// ── Logistics ──────────────────────────────────────────────────────────

export interface GettingReadyGroup {
  label: string;
  location: string;
  time: string;
  who: string;
}

export interface LogisticsData {
  getting_ready_1: GettingReadyGroup;
  getting_ready_2: GettingReadyGroup;
  first_look: boolean;
  first_look_time: string;
  first_look_location: string;
  transportation: string;
  rain_plan: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  notes: string;
}

export function getDefaultLogisticsData(): LogisticsData {
  return {
    getting_ready_1: { label: "Group 1", location: "", time: "", who: "" },
    getting_ready_2: { label: "Group 2", location: "", time: "", who: "" },
    first_look: false,
    first_look_time: "",
    first_look_location: "",
    transportation: "",
    rain_plan: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    notes: "",
  };
}
