import { redirect } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import {
  SECTION_KEYS,
  getDefaultSectionData,
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
  type MomentExtras,
} from "@/components/day-of-details/types";
import { enrichScheduleEntry } from "@/components/day-of-details/schedule-enrichment";
import {
  resolveReceptionMoments,
  type ResolvedMoment,
} from "@/components/day-of-details/reception-moments";

// Small helpers kept local — this page is the only consumer.

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function empty(label = "Not filled in") {
  return <span className="italic text-neutral-400">({label})</span>;
}

function hasText(s: string | null | undefined): boolean {
  return !!s && s.trim().length > 0;
}

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Extras row rendered beneath any moment's primary content.
function renderMomentExtras(extras: MomentExtras | undefined) {
  if (!extras) return null;
  const bits: React.ReactNode[] = [];
  if (extras.mc_needed && extras.mc_line?.trim()) {
    bits.push(
      <p key="mc" className="text-xs italic text-neutral-500 pl-4">
        &ldquo;{extras.mc_line.trim()}&rdquo;
      </p>
    );
  }
  if (extras.guest_action?.trim()) {
    bits.push(
      <p key="ga" className="text-xs text-neutral-500 pl-4">
        <span className="font-semibold uppercase tracking-wider mr-1">
          Guests:
        </span>
        {extras.guest_action.trim()}
      </p>
    );
  }
  if (extras.notes?.trim()) {
    bits.push(
      <p key="nt" className="text-xs text-neutral-500 pl-4">
        <span className="font-semibold uppercase tracking-wider mr-1">
          Notes:
        </span>
        {extras.notes.trim()}
      </p>
    );
  }
  return bits.length > 0 ? <>{bits}</> : null;
}

function hasTextLocal(s: string | null | undefined): boolean {
  return !!s && s.trim().length > 0;
}

function renderReceptionMoment(m: ResolvedMoment, reception: ReceptionData) {
  // Title line with time prefix
  const header = (
    <div>
      {m.time && (
        <span className="font-medium tabular-nums text-neutral-700 mr-2">
          {m.time}
        </span>
      )}
      <span className="font-medium">{m.title}</span>
    </div>
  );

  let primary: React.ReactNode = null;
  switch (m.id) {
    case "grand_entrance":
      if (reception.grand_entrance) {
        primary = (
          <div className="pl-4 text-neutral-700">
            {hasTextLocal(reception.grand_entrance_song)
              ? reception.grand_entrance_song
              : "Grand entrance (no song noted)"}
          </div>
        );
      } else {
        primary = <div className="pl-4 text-neutral-400 italic">(skipping)</div>;
      }
      break;
    case "first_dance": {
      const bits = [reception.first_dance_song, reception.first_dance_artist]
        .filter(hasTextLocal)
        .join(" · ");
      primary = bits ? (
        <div className="pl-4 text-neutral-700">
          {bits}
          {hasTextLocal(reception.first_dance_notes) && (
            <span className="text-xs text-neutral-500"> · {reception.first_dance_notes}</span>
          )}
        </div>
      ) : null;
      break;
    }
    case "dinner":
      primary = hasTextLocal(reception.vendor_meals_note) ? (
        <div className="pl-4 text-neutral-700">
          <span className="font-semibold text-xs uppercase tracking-wider mr-1">
            Vendor meals:
          </span>
          {reception.vendor_meals_note}
        </div>
      ) : null;
      break;
    case "parent_dances": {
      const filled = (reception.parent_dances || []).filter(
        (d) => hasTextLocal(d.who) || hasTextLocal(d.song)
      );
      primary =
        filled.length > 0 ? (
          <ul className="pl-4 space-y-0.5 text-neutral-700">
            {filled.map((d) => (
              <li key={d.id}>
                {d.who || "(who)"}
                {hasTextLocal(d.song) && (
                  <span className="text-neutral-600">
                    {" — "}
                    {d.song}
                    {hasTextLocal(d.artist) && ` · ${d.artist}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null;
      break;
    }
    case "speeches":
      primary =
        (reception.speeches || []).length > 0 ? (
          <div className="pl-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {reception.speeches.length} speakers · {speechesTotalMinutes(reception.speeches)} min total — MC script
            </p>
            <ol className="mt-1 space-y-1">
              {reception.speeches.map((s, i) => (
                <li key={s.id}>
                  <span className="text-neutral-500 mr-1 tabular-nums">{i + 1}.</span>
                  <span className="font-medium">
                    {hasTextLocal(s.speaker) ? s.speaker : "(speaker)"}
                  </span>
                  {hasTextLocal(s.role) && (
                    <span className="text-neutral-600"> — {s.role}</span>
                  )}
                  <span className="text-neutral-500 ml-2">
                    ~{s.estimated_minutes ?? 3} min
                  </span>
                  <div className="text-xs italic text-neutral-500 pl-5">
                    &ldquo;{mcIntroFor(s)}&rdquo;
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null;
      break;
    case "cake_cutting":
      primary = hasTextLocal(reception.cake_cutting_song) ? (
        <div className="pl-4 text-neutral-700">{reception.cake_cutting_song}</div>
      ) : null;
      break;
    case "last_dance": {
      const bits = [reception.last_dance_song, reception.last_dance_artist]
        .filter(hasTextLocal)
        .join(" · ");
      primary = bits ? <div className="pl-4 text-neutral-700">{bits}</div> : null;
      break;
    }
    case "exit":
      if (reception.exit_style && reception.exit_style !== "none") {
        primary = (
          <div className="pl-4 text-neutral-700">
            {reception.exit_style.replace(/_/g, " ")}
            {hasTextLocal(reception.exit_song) && ` · ${reception.exit_song}`}
            {reception.exit_plan && (
              <div className="mt-1 text-xs text-neutral-500 space-y-0.5">
                {reception.exit_plan.venue_policy_confirmed && (
                  <div>✓ Venue policy confirmed</div>
                )}
                {hasTextLocal(reception.exit_plan.point_person) && (
                  <div>
                    <span className="font-semibold uppercase tracking-wider mr-1">
                      Point person:
                    </span>
                    {reception.exit_plan.point_person}
                  </div>
                )}
                {hasTextLocal(reception.exit_plan.rain_backup) && (
                  <div>
                    <span className="font-semibold uppercase tracking-wider mr-1">
                      Rain plan:
                    </span>
                    {reception.exit_plan.rain_backup}
                  </div>
                )}
                {hasTextLocal(reception.exit_plan.notes) && (
                  <div>
                    <span className="font-semibold uppercase tracking-wider mr-1">
                      Notes:
                    </span>
                    {reception.exit_plan.notes}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
      break;
  }

  // If custom moment and no primary, show a placeholder so it's visible
  if (m.isCustom && !primary) {
    primary = null; // custom moments only have extras as content
  }

  return (
    <li key={m.id}>
      {header}
      {primary}
      {renderMomentExtras(m.extras)}
    </li>
  );
}

export default async function DayOfPrintPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const { data: savedSections } = await supabase
    .from("wedding_day_details")
    .select("section, data")
    .eq("wedding_id", wedding.id);

  const saved = new Map((savedSections || []).map((r) => [r.section, r.data]));
  const sections = Object.fromEntries(
    SECTION_KEYS.map((k) => [k, saved.get(k) ?? getDefaultSectionData(k)])
  ) as Record<(typeof SECTION_KEYS)[number], unknown>;

  const schedule = sections.schedule as ScheduleData;
  const gettingReady = sections.getting_ready as GettingReadyData;
  const ceremony = sections.ceremony as CeremonyData;
  const cocktail = sections.cocktail as CocktailData;
  const reception = sections.reception as ReceptionData;
  const photos = sections.photos as PhotoShotListData;
  const logistics = sections.logistics as LogisticsData;

  const coupleNames =
    [wedding.partner1_name, wedding.partner2_name].filter(Boolean).join(" & ") ||
    "The Couple";
  const dateFormatted = formatDate(wedding.wedding_date);

  return (
    <>
      {/* Print-only CSS — only the `.print-root` prints. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body > * { visibility: hidden !important; }
              .print-root, .print-root * { visibility: visible !important; }
              .print-root {
                position: absolute !important;
                left: 0; top: 0; width: 100%;
                margin: 0; padding: 24pt 32pt;
                background: white !important;
                color: #111 !important;
                font-family: Georgia, 'Times New Roman', serif;
                font-size: 11pt;
                line-height: 1.5;
              }
              .print-root .print-no { display: none !important; }
              .print-root h1 { font-size: 20pt; }
              .print-root h2 { font-size: 13pt; margin-top: 14pt; }
              .print-root h3 { font-size: 11pt; font-weight: 600; }
              .print-root section { break-inside: avoid; margin-bottom: 10pt; }
              .print-root .section-head {
                border-bottom: 1pt solid #999;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                font-size: 9pt;
                padding-bottom: 2pt;
                margin-bottom: 6pt;
              }
              @page { margin: 0.5in; }
            }
          `,
        }}
      />

      {/* Screen-only toolbar */}
      <div className="print-no flex items-center justify-between mb-6 sticky top-0 bg-background/80 backdrop-blur-sm py-2 -mx-2 px-2 z-10">
        <Link
          href="/day-of-details"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Day-of Details
        </Link>
        <form action="javascript:window.print()">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </form>
      </div>

      <article className="print-root max-w-3xl mx-auto space-y-8 font-[family-name:var(--font-heading)]-adjacent">
        {/* Header */}
        <header className="text-center pb-6 border-b border-neutral-300">
          <h1 className="text-3xl tracking-tight">{coupleNames}</h1>
          {dateFormatted && (
            <p className="mt-2 text-base text-neutral-600">{dateFormatted}</p>
          )}
          {hasText(wedding.venue_name) && (
            <p className="mt-1 text-sm text-neutral-500">
              {wedding.venue_name}
              {hasText(wedding.venue_address) && ` · ${wedding.venue_address}`}
            </p>
          )}
          <p className="mt-3 text-xs uppercase tracking-widest text-neutral-400">
            Day-of Brief
          </p>
        </header>

        {/* Schedule */}
        <section>
          <h2 className="section-head">Schedule</h2>
          {schedule.entries?.length ? (
            <ul className="space-y-1.5 mt-2">
              {schedule.entries.map((e) => {
                const enriched = enrichScheduleEntry(e, {
                  reception,
                  ceremony,
                  getting_ready: gettingReady,
                });
                return (
                  <li key={e.id} className="flex gap-3">
                    <span className="w-20 text-sm font-medium tabular-nums shrink-0 text-neutral-700">
                      {e.time || "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{e.title || "(untitled)"}</div>
                      {enriched && (
                        <div className="text-xs text-neutral-500 italic">{enriched}</div>
                      )}
                      {e.notes && (
                        <div className="text-xs text-neutral-500">{e.notes}</div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm">{empty()}</p>
          )}
        </section>

        {/* Getting Ready */}
        <section>
          <h2 className="section-head">Getting Ready</h2>
          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
            {[gettingReady.group_1, gettingReady.group_2].map((g, i) => (
              <div key={i}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1">
                  {g?.label || `Group ${i + 1}`}
                </h3>
                <div>{hasText(g?.time) ? g!.time : empty("time")}</div>
                <div>{hasText(g?.location) ? g!.location : empty("location")}</div>
                <div className="text-neutral-600">
                  {hasText(g?.who) ? g!.who : empty("people")}
                </div>
              </div>
            ))}
          </div>
          {hasText(gettingReady.hair_makeup_notes) && (
            <p className="mt-3 text-sm text-neutral-700">
              <span className="text-xs font-semibold uppercase tracking-wider mr-2">
                Hair & makeup:
              </span>
              {gettingReady.hair_makeup_notes}
            </p>
          )}
          {(gettingReady.detail_shots || []).length > 0 && (
            <p className="mt-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider mr-2">
                Detail shots:
              </span>
              {gettingReady.detail_shots.join(" · ")}
            </p>
          )}
          {gettingReady.first_look && (
            <p className="mt-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider mr-2">
                First look:
              </span>
              {[gettingReady.first_look_time, gettingReady.first_look_location]
                .filter(hasText)
                .join(" · ") || "yes"}
            </p>
          )}
          {hasText(gettingReady.cultural_notes) && (
            <p className="mt-3 text-sm text-neutral-700">
              <span className="text-xs font-semibold uppercase tracking-wider mr-2">
                Cultural:
              </span>
              {gettingReady.cultural_notes}
            </p>
          )}
        </section>

        {/* Ceremony */}
        <section>
          <h2 className="section-head">Ceremony</h2>
          <div className="mt-2 space-y-2 text-sm">
            {(ceremony.processional || []).filter((p) => hasText(p.name) || hasText(p.role)).length >
              0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Processional
                </h3>
                <ol className="list-decimal list-inside mt-1">
                  {ceremony.processional
                    .filter((p) => hasText(p.name) || hasText(p.role))
                    .map((p) => (
                      <li key={p.id}>
                        {p.role}
                        {hasText(p.name) && <span className="text-neutral-600"> — {p.name}</span>}
                      </li>
                    ))}
                </ol>
              </div>
            )}
            {(ceremony.readings || []).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Readings
                </h3>
                <ul className="mt-1 space-y-0.5">
                  {ceremony.readings.map((r) => (
                    <li key={r.id}>
                      {r.title || "(untitled)"}
                      {hasText(r.reader) && (
                        <span className="text-neutral-600"> — {r.reader}</span>
                      )}
                      {hasText(r.notes) && (
                        <span className="text-neutral-500 text-xs"> · {r.notes}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Vows:
                </span>
                {ceremony.vows_style ? titleCase(ceremony.vows_style) : empty()}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Recessional:
                </span>
                {ceremony.recessional_style
                  ? titleCase(ceremony.recessional_style)
                  : empty()}
              </div>
            </div>
            {ceremony.unity_ceremony && ceremony.unity_ceremony !== "none" && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Unity ceremony:
                </span>
                {titleCase(ceremony.unity_ceremony)}
                {hasText(ceremony.unity_notes) && ` · ${ceremony.unity_notes}`}
              </div>
            )}
            {hasText(ceremony.officiant_notes) && (
              <p>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Officiant:
                </span>
                {ceremony.officiant_notes}
              </p>
            )}
            {hasText(ceremony.cultural_notes) && (
              <p>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Cultural:
                </span>
                {ceremony.cultural_notes}
              </p>
            )}
          </div>
        </section>

        {/* Cocktail */}
        <section>
          <h2 className="section-head">Cocktail Hour</h2>
          <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                Location:
              </span>
              {cocktail.location ? titleCase(cocktail.location) : empty()}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                Duration:
              </span>
              {cocktail.duration ? `${cocktail.duration} min` : empty()}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                Music:
              </span>
              {cocktail.music_mood ? titleCase(cocktail.music_mood) : empty()}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                Activities:
              </span>
              {[
                cocktail.activities_lawn_games && "Lawn games",
                cocktail.activities_photo_booth && "Photo booth",
                cocktail.activities_live_music && "Live music",
              ]
                .filter(Boolean)
                .join(", ") || empty("none selected")}
            </div>
          </div>
          {hasText(cocktail.catering_notes) && (
            <p className="mt-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                Catering:
              </span>
              {cocktail.catering_notes}
            </p>
          )}
        </section>

        {/* Reception — rendered as a chronological moment timeline */}
        <section>
          <h2 className="section-head">Reception</h2>
          <ol className="mt-2 space-y-3 text-sm">
            {resolveReceptionMoments(reception).map((m) =>
              renderReceptionMoment(m, reception)
            )}
          </ol>
          {hasText(reception.cultural_notes) && (
            <p className="mt-3 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                Cultural:
              </span>
              {reception.cultural_notes}
            </p>
          )}
        </section>

        {/* Photos */}
        <section>
          <h2 className="section-head">Photo Shot List</h2>
          {([
            ["Pre-ceremony", photos.pre_ceremony],
            ["Ceremony & family", photos.ceremony_family],
            ["Reception", photos.reception],
          ] as const).map(([label, list]) => {
            const included = (list || []).filter((s) => s.included);
            if (included.length === 0) return null;
            return (
              <div key={label} className="mt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  {label}
                </h3>
                <ul className="list-disc list-inside mt-1 text-sm">
                  {included.map((s) => (
                    <li key={s.id}>
                      {s.label}
                      {hasText(s.notes) && (
                        <span className="text-neutral-500 text-xs"> · {s.notes}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        {/* Logistics */}
        <section>
          <h2 className="section-head">Logistics</h2>
          <div className="mt-2 space-y-2 text-sm">
            {hasText(logistics.transportation) && (
              <p>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Transportation:
                </span>
                {logistics.transportation}
              </p>
            )}
            {hasText(logistics.rain_plan) && (
              <p>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Rain plan:
                </span>
                {logistics.rain_plan}
              </p>
            )}
            {(hasText(logistics.emergency_contact_name) ||
              hasText(logistics.emergency_contact_phone)) && (
              <p>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Emergency contact:
                </span>
                {logistics.emergency_contact_name}
                {hasText(logistics.emergency_contact_phone) && ` · ${logistics.emergency_contact_phone}`}
              </p>
            )}
            {logistics.roles &&
              DAY_OF_ROLE_META.some(
                ({ key }) => hasText(logistics.roles?.[key])
              ) && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-3">
                    Day-of roles
                  </h3>
                  <ul className="mt-1 space-y-0.5">
                    {DAY_OF_ROLE_META.map(({ key, label }) => {
                      const name = logistics.roles?.[key];
                      if (!hasText(name)) return null;
                      return (
                        <li key={key}>
                          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                            {label}:
                          </span>
                          {name}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            {reception.exit_plan &&
              (hasText(reception.exit_plan.point_person) ||
                hasText(reception.exit_plan.rain_backup) ||
                hasText(reception.exit_plan.notes) ||
                reception.exit_plan.venue_policy_confirmed) &&
              reception.exit_style &&
              reception.exit_style !== "none" && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-3">
                    Exit plan
                  </h3>
                  <ul className="mt-1 space-y-0.5">
                    {reception.exit_plan.venue_policy_confirmed && (
                      <li className="text-neutral-600">
                        ✓ Venue policy confirmed
                      </li>
                    )}
                    {hasText(reception.exit_plan.point_person) && (
                      <li>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                          Point person:
                        </span>
                        {reception.exit_plan.point_person}
                      </li>
                    )}
                    {hasText(reception.exit_plan.rain_backup) && (
                      <li>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                          Rain backup:
                        </span>
                        {reception.exit_plan.rain_backup}
                      </li>
                    )}
                    {hasText(reception.exit_plan.notes) && (
                      <li>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                          Notes:
                        </span>
                        {reception.exit_plan.notes}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            {hasText(logistics.vendor_meals_timing) && (
              <p>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Vendor meals timing:
                </span>
                {logistics.vendor_meals_timing}
              </p>
            )}
            {hasText(logistics.cultural_notes) && (
              <p>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Cultural:
                </span>
                {logistics.cultural_notes}
              </p>
            )}
            {hasText(logistics.notes) && (
              <p>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mr-2">
                  Notes:
                </span>
                {logistics.notes}
              </p>
            )}
          </div>
        </section>

        <footer className="text-center text-xs text-neutral-400 pt-6 border-t border-neutral-200">
          Generated from Day-of Details
        </footer>
      </article>
    </>
  );
}
