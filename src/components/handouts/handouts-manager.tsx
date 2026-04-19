"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Printer,
  Users,
  MapPin,
  Clock,
  Phone,
  AlertCircle,
  Shirt,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import type { HandoutsSettings } from "@/app/(app)/handouts/page";

interface Wedding {
  id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
}

interface TimelineEvent {
  id: string;
  event_time: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  sort_order: number;
}

interface DelegationTask {
  id: string;
  task: string;
  assigned_to: string;
  contact: string | null;
  notes: string | null;
}

interface PartyMember {
  id: string;
  name: string;
  role: string;
}

interface HandoutsManagerProps {
  wedding: Wedding;
  timelineEvents: TimelineEvent[];
  delegationTasks: DelegationTask[];
  partyMembers: PartyMember[];
  initialSettings: HandoutsSettings;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "TBD";
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

// Match free-text "assigned_to" fields against a party member. We check
// substring (case-insensitive) rather than exact match because users often
// type "Sarah" vs "Sarah Chen" vs "Sarah (MOH)" inconsistently across pages.
function matchesMember(assignedTo: string | null, memberName: string) {
  if (!assignedTo) return false;
  const a = assignedTo.toLowerCase();
  const m = memberName.toLowerCase();
  if (a === m || a.includes(m) || m.includes(a)) return true;
  const firstName = memberName.split(/\s+/)[0]?.toLowerCase();
  return !!firstName && firstName.length >= 3 && a.includes(firstName);
}

export function HandoutsManager({
  wedding,
  timelineEvents,
  delegationTasks,
  partyMembers,
  initialSettings,
}: HandoutsManagerProps) {
  const [settings, setSettings] = useState<HandoutsSettings>(initialSettings);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    partyMembers[0]?.id ?? ""
  );
  const firstSaveSkipped = useRef(false);

  // Autosave dress_code + emergency_contacts to wedding_day_details
  useEffect(() => {
    if (!firstSaveSkipped.current) {
      firstSaveSkipped.current = true;
      return;
    }
    const timeout = setTimeout(async () => {
      const supabase = createClient();
      await supabase
        .from("wedding_day_details")
        .upsert(
          {
            wedding_id: wedding.id,
            section: "handouts",
            data: settings,
          },
          { onConflict: "wedding_id,section" }
        );
    }, 700);
    return () => clearTimeout(timeout);
  }, [settings, wedding.id]);

  const selectedMember = useMemo(
    () => partyMembers.find((m) => m.id === selectedMemberId) ?? null,
    [partyMembers, selectedMemberId]
  );

  const personalEvents = useMemo(
    () =>
      selectedMember
        ? timelineEvents.filter((e) =>
            matchesMember(e.assigned_to, selectedMember.name)
          )
        : [],
    [timelineEvents, selectedMember]
  );

  const personalTasks = useMemo(
    () =>
      selectedMember
        ? delegationTasks.filter((t) =>
            matchesMember(t.assigned_to, selectedMember.name)
          )
        : [],
    [delegationTasks, selectedMember]
  );

  return (
    <>
      {/* Wedding Party — read-only; edited on Guests page */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Wedding Party
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1.5">
              Tagged via <span className="font-medium">Guests → Role / Relationship</span>.
              Each tagged person gets their own handout.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link
              href="/guests"
              className="inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              Manage in Guests
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {partyMembers.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No party members tagged yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Open Guests and set a Role / Relationship on each party member.
              </p>
              <Button size="sm" asChild>
                <Link
                  href="/guests"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  Go to Guests
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {partyMembers.map((m) => (
                <div
                  key={m.id}
                  className="border rounded-lg p-3 flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{m.name}</p>
                    <Badge variant="secondary" className="text-[10px] mt-1 font-normal">
                      {m.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared fields — dress code + emergency contacts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            Info for Every Handout
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1.5">
            Appears on every party member&apos;s sheet. Changes save automatically.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Shirt className="h-3.5 w-3.5" />
                Dress Code
              </Label>
              <Textarea
                value={settings.dress_code}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, dress_code: e.target.value }))
                }
                placeholder="Black tie, cocktail attire, etc."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Emergency Contacts
              </Label>
              <Textarea
                value={settings.emergency_contacts}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    emergency_contacts: e.target.value,
                  }))
                }
                placeholder={
                  "Coordinator: Jane (555) 123-4567\nVenue Manager: (555) 987-6543"
                }
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-person preview + print */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-5 w-5" />
            Preview & Print
          </CardTitle>
          <Button size="sm" variant="outline" asChild disabled={partyMembers.length === 0}>
            <Link
              href="/print/handouts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Printer className="h-4 w-4" />
              Print all ({partyMembers.length})
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {partyMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Tag party members in Guests to preview handouts here.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-w-xs">
                <Label>Previewing handout for</Label>
                <Select
                  value={selectedMemberId}
                  onValueChange={(v) => setSelectedMemberId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(v) => {
                        const m = partyMembers.find((x) => x.id === v);
                        return m ? `${m.name} · ${m.role}` : "Pick a member...";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {partyMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} · {m.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {selectedMember && (
                <div className="border rounded-lg p-6 bg-muted/30 space-y-5">
                  <div className="text-center pb-4 border-b">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                      Handout for
                    </p>
                    <h2 className="text-xl font-bold font-[family-name:var(--font-heading)]">
                      {selectedMember.name}
                    </h2>
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      {selectedMember.role}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-3">
                      {wedding.partner1_name} &amp; {wedding.partner2_name}
                      {wedding.wedding_date
                        ? ` · ${formatDate(wedding.wedding_date)}`
                        : ""}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      Venue
                    </h3>
                    <p className="text-sm">{wedding.venue_name || "TBD"}</p>
                    {wedding.venue_address && (
                      <p className="text-xs text-muted-foreground">
                        {wedding.venue_address}
                      </p>
                    )}
                  </div>

                  {personalEvents.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Your Cues
                      </h3>
                      <div className="space-y-1">
                        {personalEvents.map((evt) => (
                          <div key={evt.id} className="flex gap-3 text-sm">
                            <span className="font-medium min-w-[70px] text-right tabular-nums">
                              {formatTime(evt.event_time) || "—"}
                            </span>
                            <span>{evt.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {personalTasks.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5" />
                        Your Tasks
                      </h3>
                      <ul className="space-y-1.5 text-sm">
                        {personalTasks.map((t) => (
                          <li key={t.id} className="flex flex-col gap-0.5">
                            <span className="font-medium">{t.task}</span>
                            {t.notes && (
                              <span className="text-xs text-muted-foreground">
                                {t.notes}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Day-of Timeline
                    </h3>
                    {timelineEvents.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No day-of events yet.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {timelineEvents.slice(0, 12).map((evt) => (
                          <div key={evt.id} className="flex gap-3 text-sm">
                            <span className="font-medium min-w-[70px] text-right tabular-nums text-muted-foreground">
                              {formatTime(evt.event_time) || "—"}
                            </span>
                            <span>{evt.title}</span>
                          </div>
                        ))}
                        {timelineEvents.length > 12 && (
                          <p className="text-xs text-muted-foreground pt-1">
                            +{timelineEvents.length - 12} more events (full list on print)
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {settings.dress_code && (
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Shirt className="h-3.5 w-3.5" />
                        Dress Code
                      </h3>
                      <p className="text-sm whitespace-pre-line">
                        {settings.dress_code}
                      </p>
                    </div>
                  )}

                  {settings.emergency_contacts && (
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        Emergency Contacts
                      </h3>
                      <p className="text-sm whitespace-pre-line">
                        {settings.emergency_contacts}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
