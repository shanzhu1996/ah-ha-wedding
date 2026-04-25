import { redirect } from "next/navigation";
import { getCurrentWedding } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "../emergency-kit/print-button";
import {
  HANDOUT_ROLE_RE,
  parseHandoutsSettings,
} from "@/app/(app)/handouts/page";
import type { TeaCeremonyData } from "@/components/day-of-details/types";

export const metadata = { title: "Handouts — Printable" };

interface TimelineEvent {
  id: string;
  event_time: string | null;
  title: string;
  assigned_to: string | null;
  sort_order: number;
}

interface DelegationTask {
  id: string;
  task: string;
  assigned_to: string;
  notes: string | null;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

function matchesMember(assignedTo: string | null, memberName: string) {
  if (!assignedTo) return false;
  const a = assignedTo.toLowerCase();
  const m = memberName.toLowerCase();
  if (a === m || a.includes(m) || m.includes(a)) return true;
  const firstName = memberName.split(/\s+/)[0]?.toLowerCase();
  return !!firstName && firstName.length >= 3 && a.includes(firstName);
}

export default async function HandoutsPrintPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) redirect("/onboarding");

  const supabase = await createClient();
  const [
    { data: timelineEvents },
    { data: delegationTasks },
    { data: guests },
    { data: settingsRow },
    { data: teaCeremonyRow },
  ] = await Promise.all([
    supabase
      .from("timeline_events")
      .select("id, event_time, title, assigned_to, sort_order")
      .eq("wedding_id", wedding.id)
      .eq("type", "day_of")
      .order("sort_order", { ascending: true }),
    supabase
      .from("delegation_tasks")
      .select("id, task, assigned_to, notes")
      .eq("wedding_id", wedding.id),
    supabase
      .from("guests")
      .select("id, first_name, last_name, relationship_tag")
      .eq("wedding_id", wedding.id)
      .not("relationship_tag", "is", null),
    supabase
      .from("wedding_day_details")
      .select("data")
      .eq("wedding_id", wedding.id)
      .eq("section", "handouts")
      .maybeSingle(),
    // Tea ceremony details — fetched only to surface on parents' handouts.
    // The block is fully gated on weddings.has_tea_ceremony below.
    supabase
      .from("wedding_day_details")
      .select("data")
      .eq("wedding_id", wedding.id)
      .eq("section", "tea_ceremony")
      .maybeSingle(),
  ]);

  const settings = parseHandoutsSettings(settingsRow?.data);
  const events: TimelineEvent[] = timelineEvents || [];
  const tasks: DelegationTask[] = delegationTasks || [];

  // Tea ceremony block — shown on handouts ONLY when:
  //   1. weddings.has_tea_ceremony is on, AND
  //   2. the recipient's relationship_tag matches a parent role
  // Parents are directly involved (being served, doing the bowing) so
  // they need the elder serving order at hand. Other party members can
  // get the time from the day-of timeline; no need to clutter their sheets.
  const hasTeaCeremony = wedding.has_tea_ceremony ?? false;
  const teaCeremony =
    (teaCeremonyRow?.data as TeaCeremonyData | null) ?? null;
  const PARENT_ROLE_RE = /\bmother\b|\bfather\b|\bmom\b|\bdad\b|\bparent\b/i;

  const partyMembers = (guests || [])
    .filter(
      (g) => g.relationship_tag && HANDOUT_ROLE_RE.test(g.relationship_tag)
    )
    .map((g) => ({
      id: g.id,
      name: `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim(),
      role: g.relationship_tag!.trim(),
    }))
    .filter((m) => m.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const weddingDate = formatDate(wedding.wedding_date);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          @page { margin: 0.6in; }
          .no-print { display: none !important; }
          .person-page { page-break-after: always; }
          .person-page:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Handouts — one page per wedding-party member
        </span>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10 text-gray-900">
        {partyMembers.length === 0 ? (
          <p className="text-sm text-gray-500 italic py-12 text-center">
            No wedding-party members tagged yet. Go to Guests and tag people with
            a Role / Relationship.
          </p>
        ) : (
          partyMembers.map((m) => {
            const personalEvents = events.filter((e) =>
              matchesMember(e.assigned_to, m.name)
            );
            const personalTasks = tasks.filter((t) =>
              matchesMember(t.assigned_to, m.name)
            );

            return (
              <section key={m.id} className="person-page mb-10">
                <div className="border-b-2 border-gray-900 pb-4 mb-6">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-1">
                    Handout
                  </p>
                  <h1 className="text-3xl font-serif">{m.name}</h1>
                  <p className="text-sm text-gray-600 mt-0.5 italic">{m.role}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {wedding.partner1_name} &amp; {wedding.partner2_name}
                    {weddingDate ? ` · ${weddingDate}` : ""}
                  </p>
                </div>

                <div className="mb-6">
                  <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Venue
                  </h2>
                  <p className="text-sm">{wedding.venue_name || "TBD"}</p>
                  {wedding.venue_address && (
                    <p className="text-xs text-gray-600">
                      {wedding.venue_address}
                    </p>
                  )}
                </div>

                {personalEvents.length > 0 && (
                  <div className="mb-6 break-inside-avoid">
                    <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Your Cues
                    </h2>
                    <div className="space-y-1">
                      {personalEvents.map((e) => (
                        <div key={e.id} className="flex gap-3 text-sm">
                          <span className="font-medium min-w-[80px] text-right tabular-nums">
                            {formatTime(e.event_time) || "—"}
                          </span>
                          <span>{e.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {personalTasks.length > 0 && (
                  <div className="mb-6 break-inside-avoid">
                    <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Your Tasks
                    </h2>
                    <ul className="space-y-2 text-sm">
                      {personalTasks.map((t) => (
                        <li key={t.id}>
                          <span className="font-medium">{t.task}</span>
                          {t.notes && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              {t.notes}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tea Ceremony — gated on the cultural flag AND the
                    recipient being a parent. Envelope amounts are
                    intentionally not rendered. */}
                {hasTeaCeremony &&
                  teaCeremony &&
                  PARENT_ROLE_RE.test(m.role) && (
                    <div className="mb-6 break-inside-avoid">
                      <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                        Tea Ceremony · 茶礼
                      </h2>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
                        {teaCeremony.location?.trim() && (
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-gray-500 mr-1">
                              Location:
                            </span>
                            {teaCeremony.location}
                          </div>
                        )}
                        {teaCeremony.host?.trim() && (
                          <div>
                            <span className="text-[11px] uppercase tracking-wider text-gray-500 mr-1">
                              Host:
                            </span>
                            {teaCeremony.host}
                          </div>
                        )}
                      </div>
                      {(teaCeremony.elders || []).filter(
                        (e) => e.relation?.trim() || e.name?.trim()
                      ).length > 0 && (
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                            Serving order
                          </p>
                          <ol className="list-decimal list-inside space-y-0.5 text-sm">
                            {teaCeremony.elders
                              .filter(
                                (e) => e.relation?.trim() || e.name?.trim()
                              )
                              .map((e) => (
                                <li key={e.id}>
                                  {e.relation || "(relation)"}
                                  {e.name?.trim() && (
                                    <span className="text-gray-600">
                                      {" "}
                                      — {e.name}
                                    </span>
                                  )}
                                </li>
                              ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                <div className="mb-6 break-inside-avoid">
                  <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                    Day-of Timeline
                  </h2>
                  {events.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      No day-of events listed.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {events.map((e) => (
                        <div key={e.id} className="flex gap-3 text-sm">
                          <span className="font-medium min-w-[80px] text-right tabular-nums text-gray-600">
                            {formatTime(e.event_time) || "—"}
                          </span>
                          <span>{e.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {settings.dress_code && (
                  <div className="mb-6 break-inside-avoid">
                    <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Dress Code
                    </h2>
                    <p className="text-sm whitespace-pre-line">
                      {settings.dress_code}
                    </p>
                  </div>
                )}

                {settings.emergency_contacts && (
                  <div className="mb-6 break-inside-avoid">
                    <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                      Emergency Contacts
                    </h2>
                    <p className="text-sm whitespace-pre-line">
                      {settings.emergency_contacts}
                    </p>
                  </div>
                )}

                <div className="mt-8 pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex items-center justify-between">
                  <span>Keep this with you on the wedding day.</span>
                  <span>Printed {new Date().toLocaleDateString()}</span>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
