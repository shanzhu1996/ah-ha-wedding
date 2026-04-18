"use client";

import { useState, useRef } from "react";
import {
  Camera,
  Video,
  Disc3,
  Music2,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DAY_OF_ROLE_META,
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

// ── Main component ─────────────────────────────────────────────────────

export function BookletGenerator({
  vendors,
  wedding,
  timelineEvents,
  musicSelections,
  guests,
  delegationTasks,
  dayOfDetails,
}: BookletGeneratorProps) {
  const ceremonyDayOf = dayOfDetails?.ceremony;
  const receptionDayOf = dayOfDetails?.reception;
  const photosDayOf = dayOfDetails?.photos;
  const gettingReadyDayOf = dayOfDetails?.getting_ready;
  const cocktailDayOf = dayOfDetails?.cocktail;
  const logisticsDayOf = dayOfDetails?.logistics;

  const hasText = (s?: string | null) => !!s && s.trim().length > 0;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<Vendor[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  const dayOfEvents = timelineEvents
    .filter((e) => e.type === "day_of")
    .sort((a, b) => {
      if (a.event_time && b.event_time) return a.event_time.localeCompare(b.event_time);
      return a.sort_order - b.sort_order;
    });

  const coordinator = vendors.find((v) => v.type === "coordinator");

  function openSingleBooklet(vendor: Vendor) {
    setSelectedVendors([vendor]);
    setPreviewOpen(true);
  }

  function openAllBooklets() {
    setSelectedVendors(vendors);
    setPreviewOpen(true);
  }

  function handlePrint() {
    window.print();
  }

  // ── Addendum content by vendor type ────────────────────────────────

  function renderAddendum(vendor: Vendor) {
    switch (vendor.type) {
      case "photographer": {
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
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Shot List &amp; Family Groupings</h4>
            {hasShotList ? (
              includedSections.map(([label, list]) => {
                const picked = list.filter((s) => s.included);
                if (picked.length === 0) return null;
                return (
                  <div key={label}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      {label}
                    </p>
                    <ul className="text-sm space-y-0.5 list-disc list-inside">
                      {picked.map((s, i) => (
                        <li key={i}>
                          {(s as { label?: string }).label || "(shot)"}
                          {hasText(s.notes) && (
                            <span className="text-muted-foreground text-xs"> · {s.notes}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                Include your shot list and family groupings here.
              </p>
            )}
            {gettingReadyDayOf?.first_look && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
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
            {vendor.notes && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );
      }

      case "dj":
      case "band":
        const mustPlay = musicSelections.filter((s) => !s.is_do_not_play);
        const doNotPlay = musicSelections.filter((s) => s.is_do_not_play);
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Music Selections</h4>
            {mustPlay.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Must-Play List
                </p>
                <ul className="text-sm space-y-1">
                  {mustPlay.map((s) => (
                    <li key={s.id} className="flex justify-between">
                      <span className="font-medium">{s.song_title}</span>
                      <span className="text-muted-foreground">
                        {s.artist || "Unknown artist"} &mdash; {s.phase}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {doNotPlay.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">
                  Do-Not-Play List
                </p>
                <ul className="text-sm space-y-1">
                  {doNotPlay.map((s) => (
                    <li key={s.id} className="flex justify-between">
                      <span className="font-medium">{s.song_title}</span>
                      <span className="text-muted-foreground">
                        {s.artist || "Unknown artist"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {mustPlay.length === 0 && doNotPlay.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No music selections have been added yet.
              </p>
            )}
            {receptionDayOf && (
              <div className="pt-2 border-t border-dashed">
                <h4 className="font-semibold text-sm mb-2">Reception Program</h4>
                <dl className="text-sm space-y-1">
                  {hasText(receptionDayOf.grand_entrance_song) && (
                    <div>
                      <dt className="inline font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        Grand entrance:{" "}
                      </dt>
                      <dd className="inline">{receptionDayOf.grand_entrance_song}</dd>
                    </div>
                  )}
                  {hasText(receptionDayOf.first_dance_song) && (
                    <div>
                      <dt className="inline font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        First dance:{" "}
                      </dt>
                      <dd className="inline">
                        {receptionDayOf.first_dance_song}
                        {hasText(receptionDayOf.first_dance_artist) &&
                          ` · ${receptionDayOf.first_dance_artist}`}
                      </dd>
                    </div>
                  )}
                  {(receptionDayOf.parent_dances || [])
                    .filter((d) => hasText(d.who) || hasText(d.song))
                    .map((d) => (
                      <div key={d.id}>
                        <dt className="inline font-medium text-xs uppercase tracking-wide text-muted-foreground">
                          Parent dance:{" "}
                        </dt>
                        <dd className="inline">
                          {d.who || "(who)"}
                          {hasText(d.song) && (
                            <>
                              {" — "}
                              {d.song}
                              {hasText(d.artist) && ` · ${d.artist}`}
                            </>
                          )}
                        </dd>
                      </div>
                    ))}
                  {hasText(receptionDayOf.cake_cutting_song) && (
                    <div>
                      <dt className="inline font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        Cake cutting:{" "}
                      </dt>
                      <dd className="inline">{receptionDayOf.cake_cutting_song}</dd>
                    </div>
                  )}
                  {hasText(receptionDayOf.last_dance_song) && (
                    <div>
                      <dt className="inline font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        Last dance:{" "}
                      </dt>
                      <dd className="inline">
                        {receptionDayOf.last_dance_song}
                        {hasText(receptionDayOf.last_dance_artist) &&
                          ` · ${receptionDayOf.last_dance_artist}`}
                      </dd>
                    </div>
                  )}
                  {receptionDayOf.exit_style && receptionDayOf.exit_style !== "none" && (
                    <div>
                      <dt className="inline font-medium text-xs uppercase tracking-wide text-muted-foreground">
                        Exit:{" "}
                      </dt>
                      <dd className="inline">
                        {receptionDayOf.exit_style.replace(/_/g, " ")}
                        {hasText(receptionDayOf.exit_song) &&
                          ` · ${receptionDayOf.exit_song}`}
                      </dd>
                    </div>
                  )}
                </dl>
                {(receptionDayOf.speeches || []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Speeches ({speechesTotalMinutes(receptionDayOf.speeches)} min total) — MC script
                    </p>
                    <ol className="text-sm space-y-1">
                      {receptionDayOf.speeches.map((s, i) => (
                        <li key={s.id}>
                          <span className="text-muted-foreground mr-1 tabular-nums">
                            {i + 1}.
                          </span>
                          <span className="font-medium">
                            {hasText(s.speaker) ? s.speaker : "(speaker)"}
                          </span>
                          {hasText(s.role) && (
                            <span className="text-muted-foreground"> — {s.role}</span>
                          )}
                          <span className="text-muted-foreground ml-1">
                            ~{s.estimated_minutes ?? 3} min
                          </span>
                          <div className="text-xs italic text-muted-foreground pl-5">
                            &ldquo;{mcIntroFor(s)}&rdquo;
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {(receptionDayOf.custom_moments || []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                      Custom moments
                    </p>
                    <ul className="text-sm space-y-1">
                      {(receptionDayOf.custom_moments || []).map((m) => (
                        <li key={m.id}>
                          {hasText(m.time) && (
                            <span className="text-muted-foreground tabular-nums mr-2">
                              {m.time}
                            </span>
                          )}
                          <span className="font-medium">{m.title || "(untitled)"}</span>
                          {m.mc_needed && hasText(m.mc_line) && (
                            <div className="text-xs italic text-muted-foreground pl-4">
                              &ldquo;{m.mc_line!.trim()}&rdquo;
                            </div>
                          )}
                          {hasText(m.notes) && (
                            <div className="text-xs text-muted-foreground pl-4">
                              {m.notes}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Moment announcements the MC needs to make (built-in moments with mc_line) */}
                {receptionDayOf.moment_extras &&
                  Object.entries(receptionDayOf.moment_extras)
                    .filter(
                      ([, e]) => e && e.mc_needed && hasText(e.mc_line)
                    ).length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        MC announcements
                      </p>
                      <ul className="text-sm space-y-1">
                        {Object.entries(receptionDayOf.moment_extras)
                          .filter(
                            ([, e]) => e && e.mc_needed && hasText(e.mc_line)
                          )
                          .map(([id, e]) => (
                            <li key={id}>
                              <span className="font-medium capitalize">
                                {id.replace(/_/g, " ")}:
                              </span>
                              <span className="italic text-muted-foreground ml-1">
                                &ldquo;{e!.mc_line!.trim()}&rdquo;
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
            {vendor.notes && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Additional notes
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );

      case "caterer":
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
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-sm">Guest Meal Breakdown</h4>
            <div className="text-sm">
              <p className="mb-2">
                Total guests: <strong>{guests.length}</strong>
              </p>
              {Object.keys(mealCounts).length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 font-medium">Meal Choice</th>
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
                <p className="text-muted-foreground">
                  No meal choices have been submitted yet.
                </p>
              )}
            </div>
            {restrictions.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
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
              hasText(receptionDayOf?.vendor_meals_note) ||
              hasText(cocktailDayOf?.catering_notes)) && (
              <div className="pt-2 border-t border-dashed space-y-2">
                <h4 className="font-semibold text-sm">From Day-of Details</h4>
                {hasText(cocktailDayOf?.catering_notes) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Cocktail hour
                    </p>
                    <p className="text-sm">{cocktailDayOf!.catering_notes}</p>
                  </div>
                )}
                {hasText(logisticsDayOf?.vendor_meals_timing) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Vendor meals timing
                    </p>
                    <p className="text-sm">{logisticsDayOf!.vendor_meals_timing}</p>
                  </div>
                )}
                {hasText(receptionDayOf?.vendor_meals_note) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Reception notes
                    </p>
                    <p className="text-sm">{receptionDayOf!.vendor_meals_note}</p>
                  </div>
                )}
              </div>
            )}
            {vendor.notes && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Additional notes
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );

      case "florist":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Floral Setup Details</h4>
            {vendor.setup_location && (
              <p className="text-sm">
                <strong>Setup location:</strong> {vendor.setup_location}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Note any double-duty arrangements (e.g., ceremony arch pieces
              moved to reception centerpieces) and confirm breakdown logistics
              for items that need to be relocated between spaces.
            </p>
            {vendor.notes && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );

      case "hair_makeup":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Hair &amp; Makeup Schedule</h4>
            <p className="text-sm text-muted-foreground">
              Please coordinate the hair and makeup schedule with the wedding
              party. Allow time for each person and build in buffer for touch-ups
              before the first look or ceremony.
            </p>
            {vendor.arrival_time && (
              <p className="text-sm">
                <strong>Start time:</strong> {formatTime(vendor.arrival_time)}
              </p>
            )}
            {gettingReadyDayOf && (
              <div className="space-y-2 pt-2 border-t border-dashed">
                {[gettingReadyDayOf.group_1, gettingReadyDayOf.group_2].map((g, i) => {
                  if (!g || (!hasText(g.time) && !hasText(g.location) && !hasText(g.who))) {
                    return null;
                  }
                  return (
                    <div key={i}>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {g.label || `Group ${i + 1}`}
                      </p>
                      <p className="text-sm">
                        {[g.time, g.location, g.who]
                          .filter(hasText)
                          .join(" · ")}
                      </p>
                    </div>
                  );
                })}
                {hasText(gettingReadyDayOf.hair_makeup_notes) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Hair &amp; makeup notes
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {gettingReadyDayOf.hair_makeup_notes}
                    </p>
                  </div>
                )}
              </div>
            )}
            {vendor.notes && (
              <div className="mt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes from the couple
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{vendor.notes}</p>
              </div>
            )}
          </div>
        );

      case "officiant":
        return (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Ceremony Details</h4>
            {ceremonyDayOf ? (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Vows
                    </p>
                    <p>{ceremonyDayOf.vows_style || "not yet decided"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Recessional
                    </p>
                    <p>
                      {ceremonyDayOf.recessional_style?.replace(/_/g, " ") ||
                        "not yet decided"}
                    </p>
                  </div>
                </div>
                {ceremonyDayOf.unity_ceremony &&
                  ceremonyDayOf.unity_ceremony !== "none" && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Notes from the couple
                    </p>
                    <p className="whitespace-pre-wrap">
                      {ceremonyDayOf.officiant_notes}
                    </p>
                  </div>
                )}
                {hasText(ceremonyDayOf.cultural_notes) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Cultural / religious elements
                    </p>
                    <p className="whitespace-pre-wrap">
                      {ceremonyDayOf.cultural_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : vendor.notes ? (
              <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ceremony details pending.
              </p>
            )}
          </div>
        );

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
                {(hasText(logisticsDayOf.emergency_contact_name) ||
                  hasText(logisticsDayOf.emergency_contact_phone)) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Emergency contact
                    </p>
                    <p>
                      {logisticsDayOf.emergency_contact_name}
                      {hasText(logisticsDayOf.emergency_contact_phone) &&
                        ` · ${logisticsDayOf.emergency_contact_phone}`}
                    </p>
                  </div>
                )}
                {logisticsDayOf.roles &&
                  DAY_OF_ROLE_META.some(({ key }) =>
                    hasText(logisticsDayOf.roles?.[key])
                  ) && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Day-of roles
                      </p>
                      <ul className="list-disc list-inside">
                        {DAY_OF_ROLE_META.map(({ key, label }) => {
                          const name = logisticsDayOf.roles?.[key];
                          if (!hasText(name)) return null;
                          return (
                            <li key={key}>
                              <strong>{label}:</strong> {name}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
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

        {/* Page 2: Full Timeline */}
        <div className="booklet-page rounded-lg border bg-card p-8 mt-4 print:border-none print:rounded-none print:p-12 print:mt-0 print:break-before-page">
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] mb-4">
            Day-of Timeline
          </h2>
          {dayOfEvents.length > 0 ? (
            <div className="space-y-2">
              {dayOfEvents.map((event) => (
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
              No day-of timeline events have been added yet.
            </p>
          )}
        </div>

        {/* Page 3: Vendor Details */}
        <div className="booklet-page rounded-lg border bg-card p-8 mt-4 print:border-none print:rounded-none print:p-12 print:mt-0 print:break-before-page">
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] mb-4">
            Your Details &mdash; {vendor.company_name}
          </h2>
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
        <Button onClick={openAllBooklets} disabled={vendors.length === 0}>
          <BookOpen className="h-4 w-4 mr-1.5" />
          Generate All Booklets
        </Button>
      </div>

      {/* Vendor cards */}
      {vendors.length === 0 ? (
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
          {vendors.map((vendor) => {
            const config =
              vendorTypeConfig[vendor.type] || vendorTypeConfig.other;
            const Icon = config.icon;
            return (
              <Card key={vendor.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{vendor.company_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {config.label}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm text-muted-foreground">
                    {vendor.contact_name && <p>{vendor.contact_name}</p>}
                    {vendor.arrival_time && (
                      <p>Arrives {formatTime(vendor.arrival_time)}</p>
                    )}
                  </div>
                  <div className="mt-4">
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
              {selectedVendors.length === 1
                ? `Booklet Preview: ${selectedVendors[0].company_name}`
                : `All Vendor Booklets (${selectedVendors.length})`}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-4 px-4 max-h-[calc(90vh-10rem)] overflow-y-auto">
            <div ref={printRef} className="booklet-print-area space-y-6 pb-4">
              {selectedVendors.map((vendor, i) => renderBooklet(vendor, i))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
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
