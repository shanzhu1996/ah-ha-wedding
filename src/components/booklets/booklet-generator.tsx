"use client";

import { useState, useRef, useCallback } from "react";
import {
  Camera,
  Video,
  Disc3,
  Music2,
  Mic,
  UtensilsCrossed,
  Flower2,
  Cake,
  Scissors,
  BookHeart,
  Warehouse,
  Building,
  Car,
  ClipboardList,
  Image,
  MoreHorizontal,
  Printer,
  FileText,
  BookOpen,
  FileDown,
  Phone as PhoneIcon,
  Pencil,
  Check,
  X as XIcon,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { VendorType } from "@/types/database";
import {
  speechesTotalMinutes,
  mcIntroFor,
  effectiveEmergencyContacts,
  effectiveRoles,
  type ScheduleData,
  type GettingReadyData,
  type CeremonyData,
  type CocktailData,
  type ReceptionData,
  type PhotoShotListData,
  type LogisticsData,
} from "@/components/day-of-details/types";

// ── Types ──────────────────────────────────────────────────────────────

interface Vendor {
  id: string;
  type: VendorType;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  contract_amount: number | null;
  arrival_time: string | null;
  setup_time_minutes: number | null;
  setup_location: string | null;
  breakdown_time: string | null;
  meals_needed: number | null;
  notes: string | null;
  extra_details: unknown;
}

interface Wedding {
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
}

interface TimelineEvent {
  id: string;
  type: "pre_wedding" | "day_of";
  event_time: string | null;
  title: string;
  description: string | null;
  sort_order: number;
}

interface MusicSelection {
  id: string;
  phase: string;
  song_title: string;
  artist: string | null;
  is_do_not_play: boolean;
}

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  relationship_tag: string | null;
}

interface DelegationTask {
  id: string;
  task: string;
  assigned_to: string;
  contact: string | null;
}

export interface DayOfDetailsBundle {
  schedule?: ScheduleData;
  getting_ready?: GettingReadyData;
  ceremony?: CeremonyData;
  cocktail?: CocktailData;
  reception?: ReceptionData;
  photos?: PhotoShotListData;
  logistics?: LogisticsData;
}

interface BookletGeneratorProps {
  vendors: Vendor[];
  wedding: Wedding;
  timelineEvents: TimelineEvent[];
  musicSelections: MusicSelection[];
  guests: Guest[];
  delegationTasks: DelegationTask[];
  /** Day-of Details content used to enrich per-vendor addendums. */
  dayOfDetails?: DayOfDetailsBundle;
  /** Phase → vendor_id map from Music page. Used to filter songs per
   * vendor when the couple has ≥2 music vendors. Empty when unused. */
  phaseAssignments?: Record<string, string>;
}

// ── Vendor type config ─────────────────────────────────────────────────

const vendorTypeConfig: Record<
  VendorType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  photographer: { label: "Photographer", icon: Camera },
  videographer: { label: "Videographer", icon: Video },
  dj: { label: "DJ", icon: Disc3 },
  band: { label: "Band", icon: Music2 },
  mc: { label: "MC / Host", icon: Mic },
  caterer: { label: "Caterer", icon: UtensilsCrossed },
  florist: { label: "Florist", icon: Flower2 },
  baker: { label: "Baker / Dessert", icon: Cake },
  hair_makeup: { label: "Hair & Makeup", icon: Scissors },
  officiant: { label: "Officiant", icon: BookHeart },
  rentals: { label: "Rentals", icon: Warehouse },
  venue: { label: "Venue", icon: Building },
  transportation: { label: "Transportation", icon: Car },
  coordinator: { label: "Coordinator", icon: ClipboardList },
  photo_booth: { label: "Photo Booth", icon: Image },
  other: { label: "Other", icon: MoreHorizontal },
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── Per-vendor timeline filter ─────────────────────────────────────────
// DJ doesn't care that hair & makeup starts at 8am; florist doesn't need
// to know about the last dance. Each vendor sees only the beats that
// intersect their job. Coordinator + venue see everything.

const timelineKeepPatterns: Partial<Record<VendorType, RegExp[]>> = {
  photographer: [
    /hair\s*&?\s*makeup|first look|detail shots?|wedding party photos?|family (formal )?photos?|ceremony|cocktail|grand entrance|first dance|cake|toast|last dance|send[-\s]?off|exit/i,
  ],
  videographer: [
    /first look|ceremony|grand entrance|first dance|toast|cake|last dance|send[-\s]?off|exit/i,
  ],
  dj: [
    /guests? (begin )?arriv|ceremony begins?|cocktail|reception|grand entrance|first dance|dinner|toast|parent dance|cake cut|bouquet|garter|dance floor|last dance|send[-\s]?off|exit/i,
  ],
  band: [
    /guests? (begin )?arriv|ceremony begins?|cocktail|reception|grand entrance|first dance|dinner|toast|parent dance|cake cut|bouquet|garter|dance floor|last dance|send[-\s]?off|exit/i,
  ],
  mc: [
    /guests? (begin )?arriv|ceremony begins?|cocktail|reception|grand entrance|first dance|dinner|toast|speech|welcome|parent dance|cake cut|bouquet|garter|dance floor|last dance|send[-\s]?off|exit/i,
  ],
  caterer: [
    /cocktail|guests? seated|grand entrance|dinner|toast|cake cut|champagne|vendor meal|last dance/i,
  ],
  florist: [
    /florist|bouquet|ceremony begins?|cocktail|reception begins?|guests? seated/i,
  ],
  baker: [/cake (delivery|cut|arrive)|dessert|baker/i],
  hair_makeup: [
    /hair|makeup|bride (begin|ready)|groom (begin|ready)|bridesmaids?|dress|detail shots?|first look/i,
  ],
  officiant: [
    /ceremony|officiant|marriage license|sign|processional|recessional|rehearsal/i,
  ],
  rentals: [/rental|setup|breakdown|vendor (arriv|breakdown)/i],
  transportation: [
    /transport|shuttle|arrive|depart|send[-\s]?off|exit/i,
  ],
  photo_booth: [/photo booth|cocktail|reception|dance/i],
};

function filterTimelineForVendor(
  events: TimelineEvent[],
  vendorType: VendorType
): TimelineEvent[] {
  // Coordinator + venue see everything — they run the show.
  if (vendorType === "coordinator" || vendorType === "venue") return events;
  const patterns = timelineKeepPatterns[vendorType];
  // Unknown types ("other") get a slim reception-onwards view.
  if (!patterns) {
    return events.filter((e) =>
      /ceremony|cocktail|reception|dinner|dance|exit|send[-\s]?off/i.test(
        e.title
      )
    );
  }
  return events.filter((e) => patterns.some((p) => p.test(e.title)));
}

// ── Day-of handoff contact ─────────────────────────────────────────────
// Every booklet tells the vendor who to find when they arrive. For baker
// especially: "hand the cake to X." Falls through coordinator → caterer
// → delegation task → couple as last resort.

interface HandoffContact {
  name: string;
  role: string;
  phone?: string | null;
  blurb?: string;
}

function computeHandoffContact(
  vendorType: VendorType,
  coordinator: Vendor | undefined,
  caterer: Vendor | undefined,
  delegationTasks: DelegationTask[],
  wedding: Wedding
): HandoffContact | null {
  // Baker-specific handoff: the cake handler. Cake cutting is typically
  // handled by coordinator or caterer — baker just delivers and leaves.
  if (vendorType === "baker") {
    const cakeHandler = delegationTasks.find((t) =>
      /cake/i.test(t.task)
    );
    if (cakeHandler) {
      return {
        name: cakeHandler.assigned_to,
        role: "Cake handler",
        phone: cakeHandler.contact,
        blurb:
          "Deliver the cake to this person. They'll handle display, cutting, and any leftover packaging.",
      };
    }
    if (coordinator) {
      return {
        name: coordinator.contact_name || coordinator.company_name,
        role: "Day-of coordinator",
        phone: coordinator.phone,
        blurb:
          "Deliver the cake to the coordinator. They'll handle display and cutting.",
      };
    }
    if (caterer) {
      return {
        name: caterer.contact_name || caterer.company_name,
        role: "Caterer",
        phone: caterer.phone,
        blurb:
          "Deliver the cake to the caterer — they coordinate serving at the reception.",
      };
    }
  }

  // Everyone else: coordinator is the standard on-site contact.
  if (coordinator && vendorType !== "coordinator") {
    return {
      name: coordinator.contact_name || coordinator.company_name,
      role: "Day-of coordinator",
      phone: coordinator.phone,
    };
  }

  // No coordinator — fall back to couple.
  return {
    name: `${wedding.partner1_name} & ${wedding.partner2_name}`,
    role: "The couple (no coordinator)",
  };
}

// ── DJ / Band addendum ──────────────────────────────────────────────────
// Groups music by phase (ceremony → reception), folds in the reception-specific
// songs (first dance, parent dances, cake, last dance), lists do-not-play,
// then consolidates every MC cue into one script. Name pronunciations pulled
// from couple + speakers + parent dance "who".

const MUSIC_PHASE_ORDER: { id: string; label: string; match: RegExp }[] = [
  { id: "pre_ceremony", label: "Pre-ceremony", match: /pre[-\s_]?cere/i },
  { id: "processional", label: "Processional", match: /processional|aisle/i },
  { id: "ceremony", label: "Ceremony", match: /^cere(mony)?$|interlude|unity/i },
  { id: "recessional", label: "Recessional", match: /recess/i },
  { id: "cocktail", label: "Cocktail hour", match: /cocktail/i },
  { id: "dinner", label: "Dinner", match: /dinner/i },
  {
    id: "reception",
    label: "Reception / dancing",
    match: /reception|dance|party/i,
  },
];

function groupMusicByPhase(music: MusicSelection[]): {
  id: string;
  label: string;
  songs: MusicSelection[];
}[] {
  const mustPlay = music.filter((s) => !s.is_do_not_play);
  const groups = MUSIC_PHASE_ORDER.map((p) => ({
    id: p.id,
    label: p.label,
    songs: mustPlay.filter((s) => p.match.test(s.phase)),
  }));
  // Anything that didn't match a canonical phase
  const matchedIds = new Set<string>();
  MUSIC_PHASE_ORDER.forEach((p) => {
    mustPlay.forEach((s) => {
      if (p.match.test(s.phase)) matchedIds.add(s.id);
    });
  });
  const leftover = mustPlay.filter((s) => !matchedIds.has(s.id));
  if (leftover.length > 0) {
    groups.push({ id: "other", label: "Other", songs: leftover });
  }
  return groups.filter((g) => g.songs.length > 0);
}

// ── Entertainment role inference ────────────────────────────────────────
// DJ/Band/MC is a SYSTEM decision — not per-vendor. Couples rarely pick it
// explicitly; we infer from the vendor list. Safe defaults for 95% of real
// configurations. Couple can override via vendor.extra_details.is_mc.

type McRole = "mc_vendor" | "dj" | "bandleader" | "couple";

function inferMcRole(vendors: Vendor[]): {
  role: McRole;
  source: "explicit" | "inferred";
  vendor?: Vendor;
} {
  // Dedicated MC vendor always wins — it's an explicit hire.
  const mcVendor = vendors.find((v) => v.type === "mc");
  if (mcVendor) {
    return { role: "mc_vendor", source: "explicit", vendor: mcVendor };
  }
  // Explicit override via extra_details.is_mc on another vendor.
  const explicitMc = vendors.find(
    (v) =>
      (v.extra_details as { is_mc?: boolean } | null)?.is_mc === true
  );
  if (explicitMc) {
    return {
      role: explicitMc.type === "band" ? "bandleader" : "dj",
      source: "explicit",
      vendor: explicitMc,
    };
  }
  // Standard inference: DJ → bandleader → couple.
  const dj = vendors.find((v) => v.type === "dj");
  if (dj) return { role: "dj", source: "inferred", vendor: dj };
  const band = vendors.find((v) => v.type === "band");
  if (band) return { role: "bandleader", source: "inferred", vendor: band };
  return { role: "couple", source: "inferred" };
}

// The entertainment "partner" for a given vendor — the other live-music
// vendor on the same wedding. When both DJ and band are hired, each one's
// booklet links to the other with a neutral handoff prompt (we don't assume
// which direction the split runs).
function getEntertainmentPartner(
  vendor: Vendor,
  vendors: Vendor[]
): Vendor | null {
  if (vendor.type === "dj") {
    return vendors.find((v) => v.type === "band") ?? null;
  }
  if (vendor.type === "band") {
    return vendors.find((v) => v.type === "dj") ?? null;
  }
  return null;
}

function PartnerVendorBlock({
  partner,
  formatTimeFn,
}: {
  partner: Vendor;
  formatTimeFn: (t: string | null) => string;
}) {
  const partnerConfig =
    vendorTypeConfig[partner.type] || vendorTypeConfig.other;
  return (
    <div className="avoid-break rounded-md border bg-muted/30 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        ⚡ Working with
      </p>
      <p className="text-sm font-semibold">
        {partnerConfig.label} — {partner.company_name}
      </p>
      <p className="text-xs text-muted-foreground">
        {[partner.contact_name, partner.phone, partner.email]
          .filter(Boolean)
          .join(" · ")}
        {partner.arrival_time &&
          ` · arrives ${formatTimeFn(partner.arrival_time)}`}
      </p>
      <p className="text-xs mt-2 leading-relaxed">
        Coordinate handoffs in advance: confirm who plays what phase
        (ceremony / cocktail / reception / breaks) and when the baton
        passes. Check in at least a week before the wedding.
      </p>
    </div>
  );
}

// Shared: key reception songs. Used by both DJ and Band.
function getKeyReceptionSongs(
  receptionDayOf: ReceptionData | undefined,
  hasText: (s?: string | null) => boolean
) {
  const out: {
    label: string;
    title: string;
    artist?: string | null;
  }[] = [];
  if (!receptionDayOf) return out;
  if (hasText(receptionDayOf.grand_entrance_song))
    out.push({
      label: "Grand entrance",
      title: receptionDayOf.grand_entrance_song,
    });
  if (hasText(receptionDayOf.first_dance_song))
    out.push({
      label: "First dance",
      title: receptionDayOf.first_dance_song,
      artist: receptionDayOf.first_dance_artist,
    });
  (receptionDayOf.parent_dances || [])
    .filter((d) => hasText(d.song) || hasText(d.who))
    .forEach((d) =>
      out.push({
        label: `Parent dance · ${d.who || "(who)"}`,
        title: d.song || "(song)",
        artist: d.artist,
      })
    );
  if (hasText(receptionDayOf.cake_cutting_song))
    out.push({
      label: "Cake cutting",
      title: receptionDayOf.cake_cutting_song,
    });
  if (hasText(receptionDayOf.last_dance_song))
    out.push({
      label: "Last dance",
      title: receptionDayOf.last_dance_song,
      artist: receptionDayOf.last_dance_artist,
    });
  if (
    receptionDayOf.exit_style &&
    receptionDayOf.exit_style !== "none" &&
    hasText(receptionDayOf.exit_song)
  )
    out.push({
      label: `Send-off (${receptionDayOf.exit_style.replace(/_/g, " ")})`,
      title: receptionDayOf.exit_song,
    });
  return out;
}

// Shared: name pronunciations — couple + speakers + parent-dance "who".
function getPronunciations(
  wedding: Wedding,
  receptionDayOf: ReceptionData | undefined,
  hasText: (s?: string | null) => boolean
) {
  const out: { name: string; context: string }[] = [
    { name: wedding.partner1_name, context: "Partner 1" },
    { name: wedding.partner2_name, context: "Partner 2" },
  ];
  receptionDayOf?.speeches?.forEach((s) => {
    if (hasText(s.speaker))
      out.push({ name: s.speaker, context: s.role || "Speaker" });
  });
  receptionDayOf?.parent_dances?.forEach((d) => {
    if (hasText(d.who))
      out.push({ name: d.who, context: "Parent dance" });
  });
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = p.name.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function PronunciationsTable({
  entries,
  intro,
}: {
  entries: { name: string; context: string }[];
  intro: string;
}) {
  if (entries.length === 0) return null;
  return (
    <div className="avoid-break">
      <h4 className="font-semibold text-sm mb-2">Name Pronunciations</h4>
      <p className="text-[11px] text-muted-foreground mb-1.5 italic">{intro}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <th className="text-left py-1 font-normal">Name</th>
            <th className="text-left py-1 font-normal">Role</th>
            <th className="text-left py-1 font-normal">Phonetic</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((p, i) => (
            <tr key={i} className="border-b border-dashed border-border/40">
              <td className="py-1 font-medium">{p.name}</td>
              <td className="py-1 text-muted-foreground text-xs">
                {p.context}
              </td>
              <td className="py-1 text-muted-foreground text-xs italic">
                _______________
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MusicByPhaseBlock({
  phaseGroups,
  keyReceptionSongs,
  emptyMessage,
  heading,
}: {
  phaseGroups: { id: string; label: string; songs: MusicSelection[] }[];
  keyReceptionSongs: { label: string; title: string; artist?: string | null }[];
  emptyMessage: string;
  heading: string;
}) {
  if (phaseGroups.length === 0 && keyReceptionSongs.length === 0) {
    return (
      <div className="avoid-break">
        <h4 className="font-semibold text-sm mb-2">{heading}</h4>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="avoid-break">
      <h4 className="font-semibold text-sm mb-2">{heading}</h4>
      <div className="space-y-3">
        {phaseGroups.map((g) => (
          <div key={g.id}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              {g.label}
            </p>
            <ul className="text-sm space-y-0.5">
              {g.songs.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between gap-3 py-0.5 border-b border-dashed border-border/40 last:border-0"
                >
                  <span className="font-medium">{s.song_title}</span>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {s.artist || "(artist)"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {keyReceptionSongs.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Key reception moments
            </p>
            <ul className="text-sm space-y-0.5">
              {keyReceptionSongs.map((k, i) => (
                <li
                  key={i}
                  className="flex justify-between gap-3 py-0.5 border-b border-dashed border-border/40 last:border-0"
                >
                  <span>
                    <span className="text-muted-foreground text-xs">
                      {k.label}:
                    </span>{" "}
                    <span className="font-medium">{k.title}</span>
                  </span>
                  {k.artist ? (
                    <span className="text-muted-foreground text-xs shrink-0">
                      {k.artist}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function DoNotPlayBlock({ songs }: { songs: MusicSelection[] }) {
  if (songs.length === 0) return null;
  return (
    <div className="avoid-break">
      <p className="text-[11px] font-semibold text-destructive uppercase tracking-widest mb-1">
        Do-Not-Play
      </p>
      <ul className="text-sm space-y-0.5">
        {songs.map((s) => (
          <li
            key={s.id}
            className="flex justify-between gap-3 py-0.5 border-b border-dashed border-border/40 last:border-0"
          >
            <span className="font-medium line-through decoration-destructive/60">
              {s.song_title}
            </span>
            <span className="text-muted-foreground text-xs shrink-0">
              {s.artist || ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Phase assignment filters ───────────────────────────────────────────
// When the couple has 2+ music vendors and sets per-phase assignments in
// the Music page, each booklet only shows songs the vendor will play.
// Unassigned phases fall through to all music vendors (safe default).

function filterSongsByAssignment(
  songs: MusicSelection[],
  vendorId: string,
  phaseAssignments: Record<string, string>
): MusicSelection[] {
  // When no assignments exist, show everything (original behavior).
  if (Object.keys(phaseAssignments).length === 0) return songs;
  return songs.filter((s) => {
    if (s.is_do_not_play) return false; // do-not-play is a separate list
    const assigned = phaseAssignments[s.phase];
    // Unassigned phase → include; assigned phase → only this vendor.
    return !assigned || assigned === vendorId;
  });
}

// Maps a reception moment to the phase key used in Music page assignments.
const RECEPTION_MOMENT_TO_PHASE: Record<string, string> = {
  "Grand entrance": "grand_entrance",
  "First dance": "first_dance",
  "Cake cutting": "cake_cutting",
  "Last dance": "last_dance",
};

function filterKeyReceptionSongsByAssignment<
  T extends { label: string }
>(
  songs: T[],
  vendorId: string,
  phaseAssignments: Record<string, string>
): T[] {
  if (Object.keys(phaseAssignments).length === 0) return songs;
  return songs.filter((s) => {
    // Parent dances → parent_dances phase
    const phase = s.label.startsWith("Parent dance")
      ? "parent_dances"
      : s.label.startsWith("Send-off")
        ? "send_off"
        : RECEPTION_MOMENT_TO_PHASE[s.label];
    if (!phase) return true;
    const assigned = phaseAssignments[phase];
    return !assigned || assigned === vendorId;
  });
}

// Unified MC script builder — used by DJ (always) and by Band (only when
// bandleader handles MC). Speeches + MC-tagged reception moments + custom
// moments, in a single flowing list.
function buildMcCues(
  receptionDayOf: ReceptionData | undefined,
  hasText: (s?: string | null) => boolean
): { orderHint: number; label: string; line: string }[] {
  const cues: { orderHint: number; label: string; line: string }[] = [];
  if (!receptionDayOf) return cues;
  if (receptionDayOf.moment_extras) {
    const canonicalOrder: Record<string, number> = {
      grand_entrance: 1,
      first_dance: 2,
      welcome_toast: 3,
      dinner: 4,
      toasts: 5,
      cake_cutting: 6,
      parent_dances: 7,
      bouquet_garter: 8,
      dance_floor: 9,
      last_dance: 10,
    };
    Object.entries(receptionDayOf.moment_extras).forEach(([id, e]) => {
      if (e && e.mc_needed && hasText(e.mc_line)) {
        cues.push({
          orderHint: canonicalOrder[id] ?? 50,
          label: id.replace(/_/g, " "),
          line: e.mc_line!.trim(),
        });
      }
    });
  }
  (receptionDayOf.speeches || []).forEach((s, i) => {
    cues.push({
      orderHint: 5 + i * 0.1,
      label: `Intro speaker: ${hasText(s.speaker) ? s.speaker : "(speaker)"}${hasText(s.role) ? ` — ${s.role}` : ""}`,
      line: mcIntroFor(s),
    });
  });
  (receptionDayOf.custom_moments || []).forEach((m) => {
    if (m.mc_needed && hasText(m.mc_line)) {
      cues.push({
        orderHint: 40,
        label: m.title || "Custom moment",
        line: m.mc_line!.trim(),
      });
    }
  });
  cues.sort((a, b) => a.orderHint - b.orderHint);
  return cues;
}

function McScriptBlock({
  cues,
  speechesTotalMin,
  note,
}: {
  cues: { orderHint: number; label: string; line: string }[];
  speechesTotalMin: number;
  note?: string;
}) {
  if (cues.length === 0) return null;
  return (
    <div className="avoid-break">
      <h4 className="font-semibold text-sm mb-2">MC Script</h4>
      <p className="text-[11px] text-muted-foreground mb-2 italic">
        {note ?? "Read in order. Lines are couple-approved."}
      </p>
      <ol className="space-y-2 text-sm">
        {cues.map((c, i) => (
          <li key={i} className="border-l-2 border-primary/30 pl-3 py-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {c.label}
            </p>
            <p className="italic">&ldquo;{c.line}&rdquo;</p>
          </li>
        ))}
      </ol>
      {speechesTotalMin > 0 && (
        <p className="text-[11px] text-muted-foreground mt-2 italic">
          Total speaking time: ~{speechesTotalMin} minutes
        </p>
      )}
    </div>
  );
}

// ── DJ addendum ─────────────────────────────────────────────────────────
// Continuous music flow + DJ is the default MC. Emphasizes the full MC
// script and the couple's requests policy.

function renderDjAddendum(
  vendor: Vendor,
  musicSelections: MusicSelection[],
  receptionDayOf: ReceptionData | undefined,
  wedding: Wedding,
  hasText: (s?: string | null) => boolean,
  vendorList: Vendor[],
  phaseAssignments: Record<string, string>
): React.ReactNode {
  const myMusicSongs = filterSongsByAssignment(
    musicSelections,
    vendor.id,
    phaseAssignments
  );
  const phaseGroups = groupMusicByPhase(myMusicSongs);
  const doNotPlay = musicSelections.filter((s) => s.is_do_not_play);
  const keyReceptionSongs = filterKeyReceptionSongsByAssignment(
    getKeyReceptionSongs(receptionDayOf, hasText),
    vendor.id,
    phaseAssignments
  );
  const pronunciations = getPronunciations(wedding, receptionDayOf, hasText);
  const mcCues = buildMcCues(receptionDayOf, hasText);
  const extra =
    (vendor.extra_details as { requests_policy?: string } | null) || {};
  const requestsPolicy = extra.requests_policy;
  const mcInference = inferMcRole(vendorList);
  // DJ handles MC unless someone else is explicitly set
  const djIsMc = mcInference.role === "dj";
  const partner = getEntertainmentPartner(vendor, vendorList);

  return (
    <div className="space-y-5">
      {partner ? <PartnerVendorBlock partner={partner} formatTimeFn={formatTime} /> : null}

      <MusicByPhaseBlock
        phaseGroups={phaseGroups}
        keyReceptionSongs={keyReceptionSongs}
        heading="Music by Phase"
        emptyMessage="No music selections added yet. Add songs in Music tab, grouped by phase (pre-ceremony, processional, recessional, cocktail, etc.)."
      />

      <DoNotPlayBlock songs={doNotPlay} />

      {/* Requests policy — DJ-specific. Couples often want to set this
          expectation in writing (they don't want their cousin's 30-min
          Taylor Swift run taking over the dance floor). */}
      <div className="avoid-break">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Requests policy
        </p>
        {requestsPolicy ? (
          <p className="text-sm capitalize">
            {requestsPolicy.replace(/_/g, " ")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Take all guest requests · Couple-approved only · No requests —
            confirm with couple and circle one:
          </p>
        )}
      </div>

      {/* Phase transitions — DJ works continuously, so transitions matter */}
      <div className="avoid-break rounded-md border border-dashed p-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Phase transitions
        </p>
        <p className="text-xs text-muted-foreground italic">
          Keep music continuous through the evening. Flag any hard stops
          below (e.g., &quot;mute during toasts&quot;, &quot;soft cross-fade
          from dinner to dancing&quot;).
        </p>
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="border-b border-dashed border-border/50 h-6"
          />
        ))}
      </div>

      {djIsMc ? (
        <>
          <PronunciationsTable
            entries={pronunciations}
            intro="Please confirm pronunciations with the couple before the event."
          />

          <McScriptBlock
            cues={mcCues}
            speechesTotalMin={
              receptionDayOf?.speeches
                ? speechesTotalMinutes(receptionDayOf.speeches)
                : 0
            }
          />
        </>
      ) : (
        <div className="avoid-break rounded-md border p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
            🎤 MC role
          </p>
          <p className="text-sm">
            MC handled by{" "}
            <strong>
              {mcInference.role === "mc_vendor"
                ? `${mcInference.vendor?.company_name ?? "MC"} (dedicated MC)`
                : mcInference.role === "bandleader"
                  ? `bandleader ${mcInference.vendor ? `at ${mcInference.vendor.company_name}` : ""}`
                  : "the couple / a family member"}
            </strong>
            .
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You&apos;re on music only. Coordinate cues with the MC in
            advance.
          </p>
        </div>
      )}

      {vendor.notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Notes from the couple
          </p>
          <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Band addendum ───────────────────────────────────────────────────────
// Bands play in sets (usually 4 × 45 min), take breaks, work from their
// repertoire. Couple must confirm: break music plan, must-learn songs,
// and who handles MC (band? or separate?). Full tech rider included.

function renderBandAddendum(
  vendor: Vendor,
  musicSelections: MusicSelection[],
  receptionDayOf: ReceptionData | undefined,
  wedding: Wedding,
  hasText: (s?: string | null) => boolean,
  vendorList: Vendor[],
  phaseAssignments: Record<string, string>
): React.ReactNode {
  const myMusicSongs = filterSongsByAssignment(
    musicSelections,
    vendor.id,
    phaseAssignments
  );
  const phaseGroups = groupMusicByPhase(myMusicSongs);
  const doNotPlay = musicSelections.filter((s) => s.is_do_not_play);
  const keyReceptionSongs = filterKeyReceptionSongsByAssignment(
    getKeyReceptionSongs(receptionDayOf, hasText),
    vendor.id,
    phaseAssignments
  );
  const pronunciations = getPronunciations(wedding, receptionDayOf, hasText);
  const mcCues = buildMcCues(receptionDayOf, hasText);

  const extra =
    (vendor.extra_details as {
      break_music_source?: string;
    } | null) || {};

  const mcInference = inferMcRole(vendorList);
  // Bandleader only MCs when no DJ exists. If DJ is here, band is music-only.
  const bandleaderMCs = mcInference.role === "bandleader";
  const partner = getEntertainmentPartner(vendor, vendorList);

  return (
    <div className="space-y-5">
      {partner ? <PartnerVendorBlock partner={partner} formatTimeFn={formatTime} /> : null}

      {/* Set schedule — the band's operating rhythm */}
      <div className="avoid-break">
        <h4 className="font-semibold text-sm mb-2">Set Schedule</h4>
        <p className="text-[11px] text-muted-foreground italic mb-2">
          Typical wedding band structure: 3–4 sets of 45 min, with 15 min
          breaks. Confirm the exact start / end times with the venue curfew.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left py-1 font-normal">Set</th>
              <th className="text-left py-1 font-normal">Start</th>
              <th className="text-left py-1 font-normal">End</th>
              <th className="text-left py-1 font-normal">Vibe / key moments</th>
            </tr>
          </thead>
          <tbody>
            {["Set 1", "Break", "Set 2", "Break", "Set 3", "Break", "Set 4"].map(
              (label, i) => (
                <tr
                  key={i}
                  className={`border-b border-dashed border-border/40 ${
                    label === "Break" ? "bg-muted/30" : ""
                  }`}
                >
                  <td className="py-2 font-medium">{label}</td>
                  <td className="py-2">&nbsp;</td>
                  <td className="py-2">&nbsp;</td>
                  <td className="py-2">&nbsp;</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Music by phase - reframed for band (they play from these) */}
      <MusicByPhaseBlock
        phaseGroups={phaseGroups}
        keyReceptionSongs={keyReceptionSongs}
        heading="Songs to Play (from your repertoire)"
        emptyMessage="No song selections yet. Couple will pick from your repertoire list."
      />

      {/* Break music — a band-specific gap to fill */}
      <div className="avoid-break rounded-md border-2 border-dashed border-primary/30 p-4">
        <h4 className="font-semibold text-sm mb-1">Break Music Plan</h4>
        <p className="text-[11px] text-muted-foreground italic mb-2">
          Bands need breaks — but the dance floor shouldn&apos;t go silent.
          Who covers it?
        </p>
        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground">
            {extra.break_music_source ||
              "Options: band-provided background playlist · couple's Spotify + venue speakers · a separately hired DJ. Confirm one:"}
          </p>
          {!extra.break_music_source &&
            [...Array(2)].map((_, i) => (
              <div
                key={i}
                className="border-b border-dashed border-border/50 h-6"
              />
            ))}
        </div>
      </div>

      {/* Must-learn songs — takes 2-4 weeks notice for a band to prep */}
      <div className="avoid-break">
        <h4 className="font-semibold text-sm mb-2">Must-Learn Songs</h4>
        <p className="text-[11px] text-muted-foreground italic mb-2">
          Songs outside your standard repertoire that the couple wants
          performed. Confirm feasibility and delivery date —{" "}
          <strong>industry norm is 2–4 weeks advance notice.</strong>
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left py-1 font-normal">Song</th>
              <th className="text-left py-1 font-normal">Artist</th>
              <th className="text-left py-1 font-normal">When it plays</th>
              <th className="text-left py-1 font-normal">Confirmed?</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <tr key={i} className="border-b border-dashed border-border/40">
                <td className="py-2">&nbsp;</td>
                <td className="py-2">&nbsp;</td>
                <td className="py-2">&nbsp;</td>
                <td className="py-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DoNotPlayBlock songs={doNotPlay} />

      {/* MC coordination — derived from entertainment vendor list */}
      <div className="avoid-break rounded-md border p-3">
        <h4 className="font-semibold text-sm mb-1">🎤 MC role</h4>
        {bandleaderMCs ? (
          <>
            <p className="text-sm">
              <strong>Bandleader handles MC.</strong> Your MC script &
              pronunciations are below.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Confirm with the couple 1 week out — cue points, speaker
              names, announcements.
            </p>
          </>
        ) : mcInference.role === "mc_vendor" ? (
          <p className="text-sm">
            <strong>
              MC handled by {mcInference.vendor?.company_name} (dedicated
              MC).
            </strong>{" "}
            You&apos;re on live-music only. Coordinate song starts and
            cue-ins with them.
          </p>
        ) : mcInference.role === "dj" && partner ? (
          <p className="text-sm">
            <strong>
              MC handled by DJ at {partner.company_name}.
            </strong>{" "}
            You&apos;re on live-music only. Coordinate song starts and
            cue-ins with them.
          </p>
        ) : (
          <p className="text-sm">
            MC handled by the couple / a family member. You&apos;re on
            live-music only — coordinate cues with them in advance.
          </p>
        )}
      </div>

      {/* MC script — only if bandleader is doing MC */}
      {bandleaderMCs && (
        <McScriptBlock
          cues={mcCues}
          speechesTotalMin={
            receptionDayOf?.speeches
              ? speechesTotalMinutes(receptionDayOf.speeches)
              : 0
          }
          note="You're doing MC duties — read these cues in order."
        />
      )}

      {/* Pronunciations — only if the band is doing MC */}
      {bandleaderMCs && (
        <PronunciationsTable
          entries={pronunciations}
          intro="Bandleader will say these names on the mic. Confirm pronunciations with the couple."
        />
      )}

      {/* Tech rider */}
      <div className="avoid-break">
        <h4 className="font-semibold text-sm mb-2">Tech Rider</h4>
        <p className="text-[11px] text-muted-foreground italic mb-2">
          Confirm with venue before the day. Flag issues ≥2 weeks out.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {[
            "Stage footprint",
            "Power requirements",
            "Sound check time",
            "Green room / load-in",
            "Parking / staging",
            "Venue curfew time",
          ].map((label) => (
            <div key={label}>
              <p className="text-muted-foreground">{label}</p>
              <div className="border-b border-dashed border-border/50 h-5" />
            </div>
          ))}
        </div>
      </div>

      {vendor.notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Notes from the couple
          </p>
          <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Vendor readiness ───────────────────────────────────────────────────

// A vendor's "booklet readiness" = how many critical fields are filled.
// Surfaces on the vendor card so couples spot gaps before handing the
// booklet over. No perfection cliff — partial is fine, minimal means the
// couple should add more before printing.
type Readiness = "ready" | "partial" | "minimal";

// Vendor types that physically set up at the venue. For types NOT in this
// set, the setup_info check is skipped (photographers show up with a
// camera bag; officiants just stand at the front; MCs borrow the mic).
const REQUIRES_SETUP_INFO: ReadonlySet<VendorType> = new Set([
  "dj",
  "band",
  "caterer",
  "florist",
  "baker",
  "hair_makeup",
  "rentals",
  "photo_booth",
]);

function readinessFor(v: Vendor): { level: Readiness; missing: string[] } {
  // Required fields are type-aware. Notes are optional polish — skip.
  const checks: { ok: boolean; label: string }[] = [
    {
      ok: Boolean(v.contact_name || v.phone || v.email),
      label: "day-of contact",
    },
    { ok: Boolean(v.arrival_time), label: "arrival time" },
  ];
  if (REQUIRES_SETUP_INFO.has(v.type)) {
    checks.push({
      ok: Boolean(v.setup_location || v.setup_time_minutes),
      label: "setup info",
    });
  }
  const filled = checks.filter((c) => c.ok).length;
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  let level: Readiness;
  if (filled === checks.length) level = "ready";
  else if (filled >= 1) level = "partial";
  else level = "minimal";
  return { level, missing };
}

const readinessStyle: Record<
  Readiness,
  { dot: string; label: string; tone: string }
> = {
  ready: {
    dot: "bg-emerald-500",
    label: "Ready to send",
    tone: "text-emerald-700 dark:text-emerald-400",
  },
  partial: {
    dot: "bg-amber-500",
    label: "Partial",
    tone: "text-amber-700 dark:text-amber-400",
  },
  minimal: {
    dot: "bg-rose-500",
    label: "Needs info",
    tone: "text-rose-700 dark:text-rose-400",
  },
};

// ── Main component ─────────────────────────────────────────────────────

export function BookletGenerator({
  vendors,
  wedding,
  timelineEvents,
  musicSelections,
  guests,
  delegationTasks,
  dayOfDetails,
  phaseAssignments = {},
}: BookletGeneratorProps) {
  const ceremonyDayOf = dayOfDetails?.ceremony;
  const receptionDayOf = dayOfDetails?.reception;
  const photosDayOf = dayOfDetails?.photos;
  const gettingReadyDayOf = dayOfDetails?.getting_ready;
  const cocktailDayOf = dayOfDetails?.cocktail;
  const logisticsDayOf = dayOfDetails?.logistics;

  const hasText = (s?: string | null) => !!s && s.trim().length > 0;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"booklets" | "emergency">(
    "booklets"
  );
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  // Local override for vendor.notes so edits appear immediately in the
  // card + booklet without a round-trip. Server is the source of truth —
  // we update the prop-backed local copy via optimistic write.
  const [vendorList, setVendorList] = useState<Vendor[]>(vendors);
  const [editingNoteVendorId, setEditingNoteVendorId] = useState<string | null>(
    null
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const dayOfEvents = timelineEvents
    .filter((e) => e.type === "day_of")
    .sort((a, b) => {
      if (a.event_time && b.event_time) return a.event_time.localeCompare(b.event_time);
      return a.sort_order - b.sort_order;
    });

  const coordinator = vendorList.find((v) => v.type === "coordinator");

  function openSingleBooklet(vendor: Vendor) {
    setSelectedVendors([vendor]);
    setPreviewMode("booklets");
    setPreviewOpen(true);
  }

  function openAllBooklets() {
    setSelectedVendors(vendorList);
    setPreviewMode("booklets");
    setPreviewOpen(true);
  }

  function openEmergencyCard() {
    setSelectedVendors(vendorList);
    setPreviewMode("emergency");
    setPreviewOpen(true);
  }

  function handlePrint() {
    window.print();
  }

  const handleDownloadPdf = useCallback(async () => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      // Dynamic import so the 450KB PDF lib only loads when actually used.
      const mod = await import("html2pdf.js");
      const html2pdf = mod.default;
      const nameSlug = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      const coupleSlug = `${nameSlug(wedding.partner1_name)}-${nameSlug(
        wedding.partner2_name
      )}`;
      const filename =
        previewMode === "emergency"
          ? `${coupleSlug}-emergency-contact-card.pdf`
          : selectedVendors.length === 1
            ? `${coupleSlug}-${nameSlug(selectedVendors[0].company_name)}-booklet.pdf`
            : `${coupleSlug}-all-vendor-booklets.pdf`;
      // html2pdf's typings miss `pagebreak`, so widen via unknown cast.
      await (
        html2pdf() as unknown as {
          set: (opts: Record<string, unknown>) => {
            from: (el: HTMLElement) => { save: () => Promise<void> };
          };
        }
      )
        .set({
          margin: [0.5, 0.5, 0.5, 0.5],
          filename,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
          pagebreak: {
            mode: ["css", "legacy"],
            after: ".booklet-page",
            avoid: ".avoid-break",
          },
        })
        .from(printRef.current)
        .save();
    } catch (err) {
      toast.error("Could not generate PDF", {
        description: err instanceof Error ? err.message : "Try Print instead.",
      });
    } finally {
      setDownloadingPdf(false);
    }
  }, [
    previewMode,
    selectedVendors,
    wedding.partner1_name,
    wedding.partner2_name,
  ]);

  // Per-vendor note editor — writes to vendors.notes.
  const startEditNote = useCallback(
    (vendor: Vendor) => {
      setEditingNoteVendorId(vendor.id);
      setNoteDraft(vendor.notes ?? "");
    },
    []
  );
  const cancelEditNote = useCallback(() => {
    setEditingNoteVendorId(null);
    setNoteDraft("");
  }, []);
  const saveNote = useCallback(async () => {
    if (!editingNoteVendorId) return;
    setSavingNote(true);
    const supabase = createClient();
    const trimmed = noteDraft.trim();
    const { error } = await supabase
      .from("vendors")
      .update({ notes: trimmed || null })
      .eq("id", editingNoteVendorId);
    setSavingNote(false);
    if (error) {
      toast.error("Could not save note", { description: error.message });
      return;
    }
    setVendorList((prev) =>
      prev.map((v) =>
        v.id === editingNoteVendorId ? { ...v, notes: trimmed } : v
      )
    );
    setEditingNoteVendorId(null);
    setNoteDraft("");
    toast.success("Note saved");
  }, [editingNoteVendorId, noteDraft]);

  // ── Addendum content by vendor type ────────────────────────────────

  function renderAddendum(vendor: Vendor) {
    switch (vendor.type) {
      case "photographer":
      case "videographer": {
        const includedSections: [string, { included: boolean; label: string; notes: string }[]][] = photosDayOf
          ? [
              ["Pre-ceremony", photosDayOf.pre_ceremony || []],
              ["Ceremony & family", photosDayOf.ceremony_family || []],
              ["Reception", photosDayOf.reception || []],
            ]
          : [];
        const hasShotList = includedSections.some(([, list]) =>
          list.some((s) => s.included)
        );
        // VIP guests — anyone the couple tagged (grandparents, honored
        // family, etc.) so the photographer can seek them out during the
        // event for portraits and candids.
        const vipGuests = guests.filter(
          (g) =>
            g.relationship_tag &&
            g.relationship_tag.trim() &&
            !/general|other/i.test(g.relationship_tag)
        );
        // Reception beats the photographer should stake out.
        const receptionKeyMoments: string[] = [];
        if (receptionDayOf) {
          if (hasText(receptionDayOf.grand_entrance_song))
            receptionKeyMoments.push("Grand entrance");
          if (hasText(receptionDayOf.first_dance_song))
            receptionKeyMoments.push("First dance");
          (receptionDayOf.parent_dances || []).forEach((d) => {
            if (hasText(d.song) || hasText(d.who))
              receptionKeyMoments.push(
                `Parent dance${d.who ? ` · ${d.who}` : ""}`
              );
          });
          if (hasText(receptionDayOf.cake_cutting_song))
            receptionKeyMoments.push("Cake cutting");
          if ((receptionDayOf.speeches || []).length > 0)
            receptionKeyMoments.push(
              `Toasts (${receptionDayOf.speeches.length} speakers)`
            );
          if (hasText(receptionDayOf.last_dance_song))
            receptionKeyMoments.push("Last dance");
          if (
            receptionDayOf.exit_style &&
            receptionDayOf.exit_style !== "none"
          )
            receptionKeyMoments.push(
              `Send-off (${receptionDayOf.exit_style.replace(/_/g, " ")})`
            );
        }
        const isVideo = vendor.type === "videographer";
        return (
          <div className="space-y-5">
            {/* Unplugged ceremony notice (pulled from ceremony day-of if set) */}
            {ceremonyDayOf && /unplugged/i.test(ceremonyDayOf.officiant_notes ?? "") ? (
              <div className="rounded-md border border-dashed p-3 bg-muted/30 avoid-break">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                  Unplugged ceremony
                </p>
                <p className="text-sm">
                  Couple has requested an unplugged ceremony — you&apos;re
                  the only camera in the aisle.
                </p>
              </div>
            ) : null}

            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-2">
                Shot List &amp; Family Groupings
              </h4>
              {hasShotList ? (
                includedSections.map(([label, list]) => {
                  const picked = list.filter((s) => s.included);
                  if (picked.length === 0) return null;
                  return (
                    <div key={label} className="mb-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                        {label}
                      </p>
                      <ul className="text-sm space-y-0.5 list-disc list-inside">
                        {picked.map((s, i) => (
                          <li key={i}>
                            {(s as { label?: string }).label || "(shot)"}
                            {hasText(s.notes) && (
                              <span className="text-muted-foreground text-xs">
                                {" "}
                                · {s.notes}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shot list items selected yet. Add shots in Day-of
                  Details &gt; Photos.
                </p>
              )}
            </div>

            {gettingReadyDayOf?.first_look && (
              <div className="avoid-break">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
                  First Look
                </p>
                <p className="text-sm">
                  {[
                    gettingReadyDayOf.first_look_time,
                    gettingReadyDayOf.first_look_location,
                  ]
                    .filter(hasText)
                    .join(" · ") || "Planned"}
                </p>
              </div>
            )}

            {vipGuests.length > 0 && (
              <div className="avoid-break">
                <h4 className="font-semibold text-sm mb-2">VIP Guests</h4>
                <p className="text-[11px] text-muted-foreground mb-1.5 italic">
                  People to flag for portraits and candids. Ask the couple
                  or coordinator to point them out.
                </p>
                <ul className="text-sm space-y-0.5 grid grid-cols-2 gap-x-6">
                  {vipGuests.map((g) => (
                    <li key={g.id}>
                      <span className="font-medium">
                        {g.first_name} {g.last_name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        · {g.relationship_tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {receptionKeyMoments.length > 0 && (
              <div className="avoid-break">
                <h4 className="font-semibold text-sm mb-2">
                  Reception Key Moments
                </h4>
                <p className="text-[11px] text-muted-foreground mb-1.5 italic">
                  Be positioned and ready at these beats. Timing from the
                  day-of timeline.
                </p>
                <ul className="text-sm space-y-0.5 list-disc list-inside">
                  {receptionKeyMoments.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {isVideo && (
              <div className="avoid-break rounded-md border border-dashed p-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Audio &amp; video-specific
                </p>
                <ul className="text-sm space-y-0.5 list-disc list-inside">
                  <li>
                    Capture clean audio at the officiant, couple&apos;s
                    vows, and toasts microphones.
                  </li>
                  <li>
                    Drone / elevated shots — confirm permission with the
                    venue before the day.
                  </li>
                  <li>
                    Coordinate position with the photographer for the first
                    look, first dance, and send-off.
                  </li>
                </ul>
              </div>
            )}

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {vendor.notes}
                </p>
              </div>
            )}
          </div>
        );
      }

      case "dj":
        return renderDjAddendum(
          vendor,
          musicSelections,
          receptionDayOf,
          wedding,
          hasText,
          vendorList,
          phaseAssignments
        );
      case "band":
        return renderBandAddendum(
          vendor,
          musicSelections,
          receptionDayOf,
          wedding,
          hasText,
          vendorList,
          phaseAssignments
        );

      case "mc": {
        const pronunciations = getPronunciations(
          wedding,
          receptionDayOf,
          hasText
        );
        const mcCues = buildMcCues(receptionDayOf, hasText);
        // Point MC at the music vendor(s) so they know who's starting /
        // stopping music for each cue.
        const musicPartners = vendorList.filter(
          (v) => v.type === "dj" || v.type === "band"
        );
        return (
          <div className="space-y-5">
            {musicPartners.length > 0 ? (
              <div className="avoid-break rounded-md border bg-muted/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  ⚡ Music partners
                </p>
                <ul className="text-sm space-y-0.5">
                  {musicPartners.map((m) => {
                    const cfg =
                      vendorTypeConfig[m.type] || vendorTypeConfig.other;
                    return (
                      <li key={m.id}>
                        <span className="font-medium">{cfg.label}</span> —{" "}
                        {m.company_name}
                        {(m.contact_name || m.phone) && (
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            · {[m.contact_name, m.phone]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="text-xs mt-2 leading-relaxed">
                  Coordinate cue-ins for every announcement — confirm song
                  starts, fade-outs, and mic hand-offs at rehearsal.
                </p>
              </div>
            ) : null}

            <PronunciationsTable
              entries={pronunciations}
              intro="Practice these before the event. Ask the couple to record pronunciations if any are tricky."
            />

            <McScriptBlock
              cues={mcCues}
              speechesTotalMin={
                receptionDayOf?.speeches
                  ? speechesTotalMinutes(receptionDayOf.speeches)
                  : 0
              }
              note="Read in order. Couple-approved script. Adapt tone to the room."
            />

            {/* Rehearsal coordination — MC-specific */}
            <div className="avoid-break rounded-md border p-3">
              <h4 className="font-semibold text-sm mb-1">
                Rehearsal &amp; Mic Check
              </h4>
              <p className="text-xs text-muted-foreground italic mb-2">
                Plan a 15-min walk-through with the couple + music vendor(s)
                before guests arrive.
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">
                    Walk-through time:
                  </span>{" "}
                  <span className="inline-block min-w-[220px] border-b border-dashed border-border">
                    &nbsp;
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mic type:</span>{" "}
                  <span className="inline-block min-w-[220px] border-b border-dashed border-border">
                    &nbsp;
                  </span>
                </div>
              </div>
            </div>

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );
      }

      case "caterer": {
        const confirmedGuests = guests.filter((g) => g.meal_choice);
        const mealCounts: Record<string, number> = {};
        confirmedGuests.forEach((g) => {
          const choice = g.meal_choice || "unspecified";
          mealCounts[choice] = (mealCounts[choice] || 0) + 1;
        });
        const restrictions = guests
          .filter((g) => g.dietary_restrictions)
          .map((g) => ({
            name: `${g.first_name} ${g.last_name}`,
            restriction: g.dietary_restrictions!,
          }));
        const kidsCount = confirmedGuests.filter(
          (g) => g.meal_choice === "kids"
        ).length;
        // Pull service style from vendor.extra_details if present.
        const extra = (vendor.extra_details as { service_style?: string } | null) || {};
        const serviceStyle = extra.service_style;

        return (
          <div className="space-y-5">
            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-2">
                Guest Meal Breakdown
              </h4>
              <div className="text-sm flex items-baseline gap-4 mb-2">
                <span>
                  Total guests: <strong>{guests.length}</strong>
                </span>
                {kidsCount > 0 && (
                  <span className="text-muted-foreground text-xs">
                    Kids: <strong>{kidsCount}</strong>
                  </span>
                )}
                {vendor.meals_needed != null && vendor.meals_needed > 0 && (
                  <span className="text-muted-foreground text-xs">
                    Vendor meals: <strong>{vendor.meals_needed}</strong>
                  </span>
                )}
              </div>
              {Object.keys(mealCounts).length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 font-medium">
                        Meal Choice
                      </th>
                      <th className="text-right py-1 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(mealCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([choice, count]) => (
                        <tr key={choice} className="border-b border-dashed">
                          <td className="py-1 capitalize">{choice}</td>
                          <td className="text-right py-1">{count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No meal choices have been submitted yet.
                </p>
              )}
            </div>

            <div className="avoid-break">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Service style
              </p>
              {serviceStyle ? (
                <p className="text-sm capitalize">
                  {serviceStyle.replace(/_/g, " ")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Plated · Buffet · Family-style · Stations — confirm with
                  couple.
                </p>
              )}
            </div>

            {restrictions.length > 0 && (
              <div className="avoid-break">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  Dietary Restrictions
                </p>
                <ul className="text-sm space-y-1">
                  {restrictions.map((r, i) => (
                    <li key={i}>
                      <strong>{r.name}:</strong> {r.restriction}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(hasText(logisticsDayOf?.vendor_meals_timing) ||
              hasText(cocktailDayOf?.catering_notes) ||
              receptionDayOf?.speeches?.length) && (
              <div className="avoid-break pt-3 border-t border-dashed space-y-2">
                <h4 className="font-semibold text-sm">Service Coordination</h4>
                {hasText(cocktailDayOf?.catering_notes) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Cocktail hour
                    </p>
                    <p className="text-sm">{cocktailDayOf!.catering_notes}</p>
                  </div>
                )}
                {hasText(logisticsDayOf?.vendor_meals_timing) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Vendor meals timing
                    </p>
                    <p className="text-sm">
                      {logisticsDayOf!.vendor_meals_timing}
                    </p>
                  </div>
                )}
                {(receptionDayOf?.speeches?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Champagne / toast timing
                    </p>
                    <p className="text-sm">
                      Champagne poured before toasts begin —{" "}
                      {receptionDayOf!.speeches.length} speaker
                      {receptionDayOf!.speeches.length === 1 ? "" : "s"},{" "}
                      ~{speechesTotalMinutes(receptionDayOf!.speeches)} min
                      total. Coordinate with DJ/MC for cue.
                    </p>
                  </div>
                )}
              </div>
            )}

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Additional notes
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );
      }

      case "florist": {
        // Structured categories — each section is a template with space for
        // the couple's notes. Florists work from per-item counts + locations;
        // this layout mirrors standard florist contracts.
        const categories: { title: string; lines: string[]; prompt: string }[] =
          [
            {
              title: "Personal flowers",
              lines: [],
              prompt:
                "Partner 1 bouquet · Partner 2 boutonniere · MOH / bridesmaid bouquets · Best man / groomsman boutonnieres · Parent/grandparent corsages & boutonnieres",
            },
            {
              title: "Ceremony pieces",
              lines: [],
              prompt:
                "Arch / arbor · Aisle arrangements · Sweetheart / unity table · Petals for flower crew · Welcome sign flowers",
            },
            {
              title: "Reception pieces",
              lines: [],
              prompt:
                "Centerpieces (count + table type) · Head / sweetheart table · Entryway · Bar · Cake flowers · Restroom accents",
            },
            {
              title: "Double-duty plan (ceremony → reception)",
              lines: [],
              prompt:
                "Which ceremony arrangements move to the reception? Who moves them? When? (Coordinator usually handles; confirm with them.)",
            },
            {
              title: "End of night",
              lines: [],
              prompt:
                "Who takes what home? (e.g., both mothers get ceremony arrangements; head table centerpieces to the couple; the rest stays at venue.)",
            },
          ];

        // If the couple has dumped structured notes into vendor.notes, we
        // can't know the shape — so for MVP we present the template blank
        // and let the couple fill via the per-vendor note editor on the
        // Booklets page. The vendor gets a clear framework regardless.
        const vendorNote = vendor.notes?.trim();

        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Floral Delivery &amp; Setup</h4>
            {(vendor.arrival_time || vendor.setup_location) && (
              <div className="grid grid-cols-2 gap-4 text-sm avoid-break">
                {vendor.arrival_time && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Delivery window
                    </p>
                    <p>{formatTime(vendor.arrival_time)}</p>
                  </div>
                )}
                {vendor.setup_location && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Delivery location
                    </p>
                    <p>{vendor.setup_location}</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {categories.map((c) => (
                <div key={c.title} className="avoid-break">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                    {c.title}
                  </p>
                  <p className="text-xs text-muted-foreground italic mb-1">
                    {c.prompt}
                  </p>
                  {/* Empty lines for hand-written counts on the printed page */}
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="border-b border-dashed border-border/50 h-6"
                    />
                  ))}
                </div>
              ))}
            </div>

            {vendorNote && (
              <div className="avoid-break pt-2 border-t border-dashed">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Notes from the couple
                </p>
                <p className="text-sm whitespace-pre-wrap">{vendorNote}</p>
              </div>
            )}
          </div>
        );
      }

      case "hair_makeup": {
        const staysForTouchups = Boolean(
          gettingReadyDayOf?.hair_makeup_stays_for_touchups
        );
        const stations = gettingReadyDayOf?.stations || [];
        // Fall back to the two legacy groups if stations is empty
        const legacyGroups = [
          gettingReadyDayOf?.group_1,
          gettingReadyDayOf?.group_2,
        ].filter(
          (g) =>
            g && (hasText(g.time) || hasText(g.location) || hasText(g.who))
        );
        const touchupSlots =
          gettingReadyDayOf?.touchup_schedule &&
          gettingReadyDayOf.touchup_schedule.length > 0
            ? gettingReadyDayOf.touchup_schedule
            : // Canonical defaults when the couple has opted in but hasn't
              // scheduled specific slots yet.
              [
                { id: "d1", time: "", location: "", who: "Bride · pre-ceremony touch-up", notes: "15–20 min before ceremony" },
                { id: "d2", time: "", location: "", who: "Bride + moms · after family photos", notes: "During cocktail hour" },
                { id: "d3", time: "", location: "", who: "Bride · before grand entrance", notes: "5 min pre-reception" },
              ];

        return (
          <div className="space-y-5">
            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-2">
                Morning Schedule
              </h4>
              {vendor.arrival_time && (
                <p className="text-sm mb-2">
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                    Arrive at venue:{" "}
                  </span>
                  <span className="font-medium">
                    {formatTime(vendor.arrival_time)}
                  </span>
                </p>
              )}
              {stations.length > 0 ? (
                <ul className="text-sm space-y-1.5">
                  {stations.map((s) => (
                    <li
                      key={s.id}
                      className="flex gap-3 py-1 border-b border-dashed border-border/40 last:border-0"
                    >
                      <span className="flex-1">
                        <span className="font-medium">
                          {s.who || "(who)"}
                        </span>
                        {hasText(s.location) && (
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            · {s.location}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : legacyGroups.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {legacyGroups.map((g, i) => (
                    <li key={i}>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {g!.label || `Group ${i + 1}`}:
                      </span>{" "}
                      {[g!.time, g!.location, g!.who]
                        .filter(hasText)
                        .join(" · ")}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add a morning schedule in Day-of Details &gt; Getting Ready.
                </p>
              )}
              {hasText(gettingReadyDayOf?.hair_makeup_notes) && (
                <p className="text-sm mt-2 italic text-muted-foreground whitespace-pre-wrap">
                  {gettingReadyDayOf!.hair_makeup_notes}
                </p>
              )}
            </div>

            {/* Touch-up section — only when the couple has opted in */}
            {staysForTouchups ? (
              <div className="avoid-break rounded-md border-2 border-dashed border-primary/30 p-4">
                <h4 className="font-semibold text-sm mb-1">
                  Touch-up Schedule
                </h4>
                <p className="text-[11px] text-muted-foreground italic mb-2">
                  You&apos;re staying on-site for touch-ups. Please plan to be
                  available for each of these moments.
                </p>
                <ul className="text-sm space-y-2">
                  {touchupSlots.map((t) => (
                    <li
                      key={t.id}
                      className="flex gap-3 py-1 border-b border-dashed border-border/40 last:border-0"
                    >
                      <span className="text-xs tabular-nums w-20 shrink-0 text-muted-foreground">
                        {hasText(t.time) ? t.time : "TBD"}
                      </span>
                      <span className="flex-1">
                        <span className="font-medium">{t.who}</span>
                        {hasText(t.location) && (
                          <span className="text-muted-foreground text-xs">
                            {" "}
                            · {t.location}
                          </span>
                        )}
                        {hasText(t.notes) && (
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {t.notes}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground italic mt-2">
                  Touch-up kit: setting spray, blotting paper, powder, couple&apos;s
                  lip color, bobby pins, mini hairspray.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                Morning service only — no on-site touch-ups scheduled. If
                that changes, let the couple know.
              </p>
            )}

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );
      }

      case "officiant": {
        // Name pronunciations: couple + anyone in recessional with a name.
        const namesForPronunciation: { name: string; context: string }[] = [
          { name: wedding.partner1_name, context: "Partner 1" },
          { name: wedding.partner2_name, context: "Partner 2" },
        ];
        (ceremonyDayOf?.recessional || []).forEach((r) => {
          if (hasText(r.name)) {
            namesForPronunciation.push({
              name: r.name!,
              context: r.role || "Wedding party",
            });
          }
        });
        const seenNames = new Set<string>();
        const uniqueNames = namesForPronunciation.filter((n) => {
          const k = n.name.toLowerCase();
          if (seenNames.has(k)) return false;
          seenNames.add(k);
          return true;
        });

        return (
          <div className="space-y-5">
            {ceremonyDayOf ? (
              <div className="space-y-2 text-sm avoid-break">
                <h4 className="font-semibold text-sm mb-1">Ceremony Flow</h4>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Vows
                  </p>
                  <p>{ceremonyDayOf.vows_style || "not yet decided"}</p>
                </div>
                {(ceremonyDayOf.recessional || []).some(
                  (r) => r.role?.trim() || r.name?.trim()
                ) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Recessional
                    </p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      {ceremonyDayOf.recessional.map((r) => (
                        <li key={r.id}>
                          {r.role || "(role)"}
                          {hasText(r.name) && ` — ${r.name}`}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {ceremonyDayOf.unity_ceremony &&
                  ceremonyDayOf.unity_ceremony !== "none" && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Unity ceremony
                      </p>
                      <p>
                        {ceremonyDayOf.unity_ceremony.replace(/_/g, " ")}
                        {hasText(ceremonyDayOf.unity_notes) &&
                          ` · ${ceremonyDayOf.unity_notes}`}
                      </p>
                    </div>
                  )}
                {(ceremonyDayOf.readings || []).length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Readings
                    </p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {ceremonyDayOf.readings.map((r) => (
                        <li key={r.id}>
                          {r.title || "(untitled)"}
                          {hasText(r.reader) && ` — ${r.reader}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {hasText(ceremonyDayOf.officiant_notes) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Notes from the couple
                    </p>
                    <p className="whitespace-pre-wrap">
                      {ceremonyDayOf.officiant_notes}
                    </p>
                  </div>
                )}
                {hasText(ceremonyDayOf.cultural_notes) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Cultural / religious elements
                    </p>
                    <p className="whitespace-pre-wrap">
                      {ceremonyDayOf.cultural_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Name pronunciations — same pattern as DJ booklet */}
            {uniqueNames.length > 0 && (
              <div className="avoid-break">
                <h4 className="font-semibold text-sm mb-2">
                  Name Pronunciations
                </h4>
                <p className="text-[11px] text-muted-foreground mb-1.5 italic">
                  Please confirm pronunciations with the couple before the
                  ceremony.
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-1 font-normal">Name</th>
                      <th className="text-left py-1 font-normal">Role</th>
                      <th className="text-left py-1 font-normal">Phonetic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniqueNames.map((p, i) => (
                      <tr
                        key={i}
                        className="border-b border-dashed border-border/40"
                      >
                        <td className="py-1 font-medium">{p.name}</td>
                        <td className="py-1 text-muted-foreground text-xs">
                          {p.context}
                        </td>
                        <td className="py-1 text-muted-foreground text-xs italic">
                          _______________
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Marriage license signing */}
            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-1">
                Marriage License Signing
              </h4>
              <p className="text-[11px] text-muted-foreground italic mb-2">
                Two witnesses required (age varies by jurisdiction —
                usually 18+). Sign after the ceremony, before guests leave.
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Witness 1:</span>{" "}
                  <span className="inline-block min-w-[260px] border-b border-dashed border-border">
                    &nbsp;
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Witness 2:</span>{" "}
                  <span className="inline-block min-w-[260px] border-b border-dashed border-border">
                    &nbsp;
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Signing location:
                  </span>{" "}
                  <span className="inline-block min-w-[260px] border-b border-dashed border-border">
                    &nbsp;
                  </span>
                </div>
              </div>
            </div>

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Additional notes
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}

            {!ceremonyDayOf && !vendor.notes && (
              <p className="text-sm text-muted-foreground">
                Ceremony details pending. Fill out Day-of Details &gt;
                Ceremony.
              </p>
            )}
          </div>
        );
      }

      case "coordinator":
      case "venue":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Logistics &amp; Roles</h4>
            {logisticsDayOf ? (
              <div className="space-y-2 text-sm">
                {hasText(logisticsDayOf.rain_plan) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Rain plan
                    </p>
                    <p className="whitespace-pre-wrap">{logisticsDayOf.rain_plan}</p>
                  </div>
                )}
                {hasText(logisticsDayOf.transportation) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Transportation
                    </p>
                    <p className="whitespace-pre-wrap">{logisticsDayOf.transportation}</p>
                  </div>
                )}
                {(() => {
                  const contacts = effectiveEmergencyContacts(logisticsDayOf).filter(
                    (c) => hasText(c.name) || hasText(c.phone)
                  );
                  if (contacts.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Emergency contacts
                      </p>
                      <ul className="list-disc list-inside">
                        {contacts.map((c) => (
                          <li key={c.id}>
                            {c.name}
                            {hasText(c.phone) && ` · ${c.phone}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                {(() => {
                  const roles = effectiveRoles(logisticsDayOf).filter((r) =>
                    hasText(r.assignee)
                  );
                  if (roles.length === 0) return null;
                  return (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Day-of roles
                      </p>
                      <ul className="list-disc list-inside">
                        {roles.map((r) => (
                          <li key={r.id}>
                            <strong>{r.label}:</strong> {r.assignee}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                {hasText(logisticsDayOf.notes) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Additional notes
                    </p>
                    <p className="whitespace-pre-wrap">{logisticsDayOf.notes}</p>
                  </div>
                )}
              </div>
            ) : vendor.notes ? (
              <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Logistics details pending.
              </p>
            )}
          </div>
        );

      case "baker":
        return (
          <div className="space-y-5">
            <div className="avoid-break grid grid-cols-2 gap-4 text-sm">
              {vendor.arrival_time && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Delivery window
                  </p>
                  <p>{formatTime(vendor.arrival_time)}</p>
                </div>
              )}
              {vendor.setup_location && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Delivery location
                  </p>
                  <p>{vendor.setup_location}</p>
                </div>
              )}
              {receptionDayOf && hasText(receptionDayOf.cake_cutting_song) && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Cake cutting song
                  </p>
                  <p>{receptionDayOf.cake_cutting_song}</p>
                </div>
              )}
            </div>

            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-2">Cake Specs</h4>
              <p className="text-xs text-muted-foreground italic mb-2">
                Tiers, flavors per tier, fillings, allergens, topper,
                display stand. Confirm with couple a week before delivery.
              </p>
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="border-b border-dashed border-border/50 h-6"
                />
              ))}
            </div>

            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-2">Dessert Table</h4>
              <p className="text-xs text-muted-foreground italic mb-2">
                If applicable — items, quantities, display notes.
              </p>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="border-b border-dashed border-border/50 h-6"
                />
              ))}
            </div>

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );

      case "rentals":
        return (
          <div className="space-y-5">
            <div className="avoid-break grid grid-cols-2 gap-4 text-sm">
              {vendor.arrival_time && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Delivery time
                  </p>
                  <p>{formatTime(vendor.arrival_time)}</p>
                </div>
              )}
              {vendor.setup_time_minutes != null && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Setup window
                  </p>
                  <p>{vendor.setup_time_minutes} minutes</p>
                </div>
              )}
              {vendor.setup_location && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Setup location
                  </p>
                  <p>{vendor.setup_location}</p>
                </div>
              )}
              {vendor.breakdown_time && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Pickup time
                  </p>
                  <p>{formatTime(vendor.breakdown_time)}</p>
                </div>
              )}
            </div>

            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-2">Item List</h4>
              <p className="text-xs text-muted-foreground italic mb-2">
                Qty · item · setup notes (e.g., "60 chiavari chairs,
                ceremony aisle and reception"). Attach full invoice for
                reference.
              </p>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="border-b border-dashed border-border/50 h-6"
                />
              ))}
            </div>

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );

      case "transportation":
        return (
          <div className="space-y-5">
            <div className="avoid-break grid grid-cols-2 gap-4 text-sm">
              {vendor.arrival_time && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    First pickup
                  </p>
                  <p>{formatTime(vendor.arrival_time)}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Passenger count
                </p>
                <p>{guests.length} guests (est.)</p>
              </div>
            </div>

            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-2">Pickup Schedule</h4>
              <p className="text-xs text-muted-foreground italic mb-2">
                Time · pickup location · passengers · drop-off. Include
                hotel shuttles, wedding party transport, and return trips.
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="text-left py-1 font-normal">Time</th>
                    <th className="text-left py-1 font-normal">Pickup</th>
                    <th className="text-left py-1 font-normal">Pax</th>
                    <th className="text-left py-1 font-normal">Drop-off</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-dashed border-border/40">
                      <td className="py-2">&nbsp;</td>
                      <td className="py-2">&nbsp;</td>
                      <td className="py-2">&nbsp;</td>
                      <td className="py-2">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="avoid-break">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Route notes
              </p>
              <p className="text-xs text-muted-foreground italic">
                Preferred routes, timed photo stops, and where to wait
                during the ceremony.
              </p>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="border-b border-dashed border-border/50 h-6"
                />
              ))}
            </div>

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );

      case "photo_booth":
        return (
          <div className="space-y-5">
            <div className="avoid-break grid grid-cols-2 gap-4 text-sm">
              {vendor.arrival_time && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Setup arrival
                  </p>
                  <p>{formatTime(vendor.arrival_time)}</p>
                </div>
              )}
              {vendor.breakdown_time && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Breakdown
                  </p>
                  <p>{formatTime(vendor.breakdown_time)}</p>
                </div>
              )}
              {vendor.setup_location && (
                <div className="col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Setup location
                  </p>
                  <p>{vendor.setup_location}</p>
                </div>
              )}
            </div>

            <div className="avoid-break">
              <h4 className="font-semibold text-sm mb-2">
                Space &amp; Power Requirements
              </h4>
              <p className="text-xs text-muted-foreground italic mb-2">
                Confirm footprint, clearance, and outlet distance with the
                venue before the day.
              </p>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="border-b border-dashed border-border/50 h-6"
                />
              ))}
            </div>

            <div className="avoid-break">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Template / props
              </p>
              <p className="text-xs text-muted-foreground italic">
                Wedding color palette, custom print template, prop style
                preferences.
              </p>
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="border-b border-dashed border-border/50 h-6"
                />
              ))}
            </div>

            {vendor.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Additional Notes</h4>
            {vendor.notes ? (
              <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No additional notes for this vendor.
              </p>
            )}
          </div>
        );
    }
  }

  // ── Booklet page renderer ──────────────────────────────────────────

  function renderBooklet(vendor: Vendor, index: number) {
    const config =
      vendorTypeConfig[vendor.type] || vendorTypeConfig.other;
    const Icon = config.icon;

    return (
      <div
        key={vendor.id}
        className={`booklet-vendor ${index > 0 ? "mt-8 print:mt-0" : ""}`}
      >
        {/* Page 1: Cover */}
        <div className="booklet-page rounded-lg border bg-card p-8 print:border-none print:rounded-none print:p-12">
          <div className="flex flex-col items-center justify-center min-h-[400px] print:min-h-[600px] text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center print:hidden">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-widest text-muted-foreground">
                The Wedding of
              </p>
              <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)]">
                {wedding.partner1_name} &amp; {wedding.partner2_name}
              </h1>
            </div>
            <Separator className="w-24" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="text-base font-medium text-foreground">
                {formatDate(wedding.wedding_date)}
              </p>
              {wedding.venue_name && <p>{wedding.venue_name}</p>}
              {wedding.venue_address && <p>{wedding.venue_address}</p>}
            </div>
            <Separator className="w-24" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                Prepared for: {vendor.company_name}
              </p>
              <p className="text-xs text-muted-foreground">{config.label}</p>
            </div>
            {coordinator && (
              <div className="mt-4 p-3 rounded-md bg-muted text-sm text-left w-full max-w-xs">
                <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-1">
                  Day-of Coordinator
                </p>
                <p className="font-semibold">{coordinator.company_name}</p>
                {coordinator.contact_name && <p>{coordinator.contact_name}</p>}
                {coordinator.phone && <p>{coordinator.phone}</p>}
                {coordinator.email && <p>{coordinator.email}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Page 2: Timeline (filtered to beats relevant to this vendor) */}
        {(() => {
          const vendorEvents = filterTimelineForVendor(dayOfEvents, vendor.type);
          const isFull =
            vendor.type === "coordinator" || vendor.type === "venue";
          return (
            <div className="booklet-page rounded-lg border bg-card p-8 mt-4 print:border-none print:rounded-none print:p-12 print:mt-0 print:break-before-page">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl font-bold font-[family-name:var(--font-heading)]">
                  {isFull ? "Day-of Timeline" : "Your Day-of Timeline"}
                </h2>
                {!isFull && vendorEvents.length > 0 && (
                  <span className="text-[11px] text-muted-foreground italic">
                    Filtered for {config.label.toLowerCase()} —{" "}
                    {vendorEvents.length} beat
                    {vendorEvents.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {vendorEvents.length > 0 ? (
                <div className="space-y-2">
                  {vendorEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex gap-4 py-2 border-b border-dashed last:border-0"
                    >
                      <span className="text-sm font-mono font-medium w-20 shrink-0">
                        {event.event_time ? formatTime(event.event_time) : "--:--"}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No relevant timeline events for this vendor yet.
                </p>
              )}
            </div>
          );
        })()}

        {/* Page 3: Vendor Details + Day-of point of contact */}
        <div className="booklet-page rounded-lg border bg-card p-8 mt-4 print:border-none print:rounded-none print:p-12 print:mt-0 print:break-before-page">
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] mb-4">
            Your Details &mdash; {vendor.company_name}
          </h2>
          {(() => {
            const caterer = vendorList.find((v) => v.type === "caterer");
            const handoff = computeHandoffContact(
              vendor.type,
              coordinator,
              caterer,
              delegationTasks,
              wedding
            );
            if (!handoff) return null;
            const isBaker = vendor.type === "baker";
            return (
              <div
                className={`mb-5 rounded-md border p-3 avoid-break ${
                  isBaker
                    ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800"
                    : "bg-muted"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  {isBaker ? "🍰 Hand the cake to" : "Day-of point of contact"}
                </p>
                <p className="font-semibold text-sm">{handoff.name}</p>
                <p className="text-xs text-muted-foreground">
                  {handoff.role}
                  {handoff.phone ? ` · ${handoff.phone}` : ""}
                </p>
                {handoff.blurb ? (
                  <p className="text-xs mt-1.5 leading-relaxed">
                    {handoff.blurb}
                  </p>
                ) : null}
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Vendor Type
              </p>
              <p className="mt-0.5">{config.label}</p>
            </div>
            {vendor.contact_name && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Contact
                </p>
                <p className="mt-0.5">{vendor.contact_name}</p>
              </div>
            )}
            {vendor.phone && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Phone
                </p>
                <p className="mt-0.5">{vendor.phone}</p>
              </div>
            )}
            {vendor.email && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </p>
                <p className="mt-0.5">{vendor.email}</p>
              </div>
            )}
            {vendor.arrival_time && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Arrival Time
                </p>
                <p className="mt-0.5">{formatTime(vendor.arrival_time)}</p>
              </div>
            )}
            {vendor.setup_time_minutes != null && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Setup Time
                </p>
                <p className="mt-0.5">{vendor.setup_time_minutes} minutes</p>
              </div>
            )}
            {vendor.setup_location && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Setup Location
                </p>
                <p className="mt-0.5">{vendor.setup_location}</p>
              </div>
            )}
            {vendor.breakdown_time && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Breakdown Time
                </p>
                <p className="mt-0.5">{formatTime(vendor.breakdown_time)}</p>
              </div>
            )}
            {vendor.meals_needed != null && vendor.meals_needed > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Vendor Meals Needed
                </p>
                <p className="mt-0.5">{vendor.meals_needed}</p>
              </div>
            )}
          </div>
          {vendor.notes && (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                General Notes
              </p>
              <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
            </div>
          )}
        </div>

        {/* Page 4: Addendum */}
        <div className="booklet-page rounded-lg border bg-card p-8 mt-4 print:border-none print:rounded-none print:p-12 print:mt-0 print:break-before-page">
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] mb-4">
            Addendum &mdash; {config.label} Details
          </h2>
          {renderAddendum(vendor)}
        </div>
      </div>
    );
  }

  // ── Emergency Contact Card (one-page, all vendors) ─────────────────

  function renderEmergencyCard() {
    const dayOfContacts = [
      coordinator
        ? {
            role: "Day-of Coordinator",
            name: coordinator.contact_name || coordinator.company_name,
            phone: coordinator.phone,
          }
        : null,
      ...delegationTasks.slice(0, 5).map((d) => ({
        role: d.task,
        name: d.assigned_to,
        phone: d.contact,
      })),
    ].filter(
      (c): c is { role: string; name: string; phone: string | null } =>
        c !== null
    );

    const vendorRows = vendorList
      .filter((v) => v.type !== "coordinator") // already highlighted above
      .sort((a, b) => {
        // Earliest arrivals first — matches the order the day actually
        // unfolds, easier for the coordinator to scan.
        if (a.arrival_time && b.arrival_time)
          return a.arrival_time.localeCompare(b.arrival_time);
        if (a.arrival_time) return -1;
        if (b.arrival_time) return 1;
        return a.company_name.localeCompare(b.company_name);
      });

    return (
      <div className="booklet-vendor">
        <div className="booklet-page rounded-lg border bg-card p-8 print:border-none print:rounded-none print:p-10">
          <div className="border-b-2 border-foreground pb-3 mb-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              Wedding Emergency Contact Card
            </p>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              {wedding.partner1_name} &amp; {wedding.partner2_name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(wedding.wedding_date)}
              {wedding.venue_name ? ` · ${wedding.venue_name}` : ""}
            </p>
          </div>

          {dayOfContacts.length > 0 ? (
            <div className="mb-5 avoid-break">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Day-of People
              </h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {dayOfContacts.map((c, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {c.role}
                    </span>
                    <span className="font-medium">{c.name}</span>
                    {c.phone ? (
                      <span className="text-xs text-muted-foreground">
                        {c.phone}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="avoid-break">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Vendors · {vendorRows.length}
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left py-1.5 font-normal w-24">Arrives</th>
                  <th className="text-left py-1.5 font-normal w-28">Role</th>
                  <th className="text-left py-1.5 font-normal">Company</th>
                  <th className="text-left py-1.5 font-normal">Contact</th>
                  <th className="text-left py-1.5 font-normal w-32">Phone</th>
                </tr>
              </thead>
              <tbody>
                {vendorRows.map((v) => {
                  const cfg =
                    vendorTypeConfig[v.type] || vendorTypeConfig.other;
                  return (
                    <tr
                      key={v.id}
                      className="border-b border-dashed border-border/60 align-top"
                    >
                      <td className="py-1.5 font-mono text-xs">
                        {v.arrival_time ? formatTime(v.arrival_time) : "—"}
                      </td>
                      <td className="py-1.5 text-xs text-muted-foreground">
                        {cfg.label}
                      </td>
                      <td className="py-1.5 font-medium">{v.company_name}</td>
                      <td className="py-1.5 text-xs">
                        {v.contact_name || "—"}
                      </td>
                      <td className="py-1.5 font-mono text-xs">
                        {v.phone || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-3 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Keep this card with the day-of coordinator.</span>
            <span>Printed {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .booklet-print-area,
          .booklet-print-area * {
            visibility: visible;
          }
          .booklet-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .booklet-page {
            page-break-after: always;
            box-shadow: none !important;
          }
          .booklet-page:last-child {
            page-break-after: auto;
          }
          .booklet-vendor + .booklet-vendor {
            page-break-before: always;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={openAllBooklets}
          disabled={vendorList.length === 0}
        >
          <BookOpen className="h-4 w-4 mr-1.5" />
          Generate All Booklets
        </Button>
        <Button
          variant="outline"
          onClick={openEmergencyCard}
          disabled={vendorList.length === 0}
          title="A single page with every vendor's contact + arrival — for the coordinator's clipboard"
        >
          <ShieldAlert className="h-4 w-4 mr-1.5" />
          Emergency Contact Card
        </Button>
      </div>

      {/* Vendor cards */}
      {vendorList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>
              No vendors have been added yet. Add vendors on the{" "}
              <a href="/vendors" className="underline underline-offset-2">
                Vendors page
              </a>{" "}
              to generate booklets.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendorList.map((vendor) => {
            const config =
              vendorTypeConfig[vendor.type] || vendorTypeConfig.other;
            const Icon = config.icon;
            const { level, missing } = readinessFor(vendor);
            const style = readinessStyle[level];
            const isEditingNote = editingNoteVendorId === vendor.id;
            return (
              <Card key={vendor.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">
                          {vendor.company_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {config.label}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 text-[11px] shrink-0 ${style.tone}`}
                      title={
                        missing.length > 0
                          ? `Missing: ${missing.join(", ")}`
                          : "All key fields filled"
                      }
                    >
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${style.dot}`}
                      />
                      {style.label}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {vendor.contact_name && <p>{vendor.contact_name}</p>}
                    {vendor.arrival_time && (
                      <p>Arrives {formatTime(vendor.arrival_time)}</p>
                    )}
                    {level !== "ready" && missing.length > 0 ? (
                      <p className="text-[11px] italic text-muted-foreground/70">
                        Missing: {missing.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  {/* Personal note editor */}
                  <div className="mt-3 pt-3 border-t border-border/60">
                    {isEditingNote ? (
                      <div className="space-y-2">
                        <Textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="Anything special for this vendor? e.g. 'Capture Shan's dad walking her in — we have one shot at it.'"
                          rows={3}
                          autoFocus
                          className="text-xs"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditNote}
                            disabled={savingNote}
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveNote}
                            disabled={savingNote}
                          >
                            {savingNote ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : vendor.notes && vendor.notes.trim() ? (
                      <button
                        type="button"
                        onClick={() => startEditNote(vendor)}
                        className="w-full text-left group flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3 w-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="line-clamp-2 italic">
                          {vendor.notes}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditNote(vendor)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                      >
                        <Pencil className="h-3 w-3" />
                        Add note for this vendor
                      </button>
                    )}
                  </div>

                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => openSingleBooklet(vendor)}
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Generate Booklet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {previewMode === "emergency"
                ? "Emergency Contact Card"
                : selectedVendors.length === 1
                  ? `Booklet Preview: ${selectedVendors[0].company_name}`
                  : `All Vendor Booklets (${selectedVendors.length})`}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-4 px-4 max-h-[calc(90vh-10rem)] overflow-y-auto">
            <div ref={printRef} className="booklet-print-area space-y-6 pb-4">
              {previewMode === "emergency"
                ? renderEmergencyCard()
                : selectedVendors.map((vendor, i) => renderBooklet(vendor, i))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              {downloadingPdf ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-1.5" />
              )}
              Download PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
