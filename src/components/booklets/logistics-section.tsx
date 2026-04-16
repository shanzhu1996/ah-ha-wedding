"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LogisticsData, GettingReadyGroup } from "./day-planner-types";
export type { LogisticsData } from "./day-planner-types";
export { getDefaultLogisticsData } from "./day-planner-types";

// ── Component ─────────────────────────────────────────────────────────

interface LogisticsSectionProps {
  data: LogisticsData;
  onChange: (data: LogisticsData) => void;
}

export function LogisticsSection({ data, onChange }: LogisticsSectionProps) {
  function update(patch: Partial<LogisticsData>) {
    onChange({ ...data, ...patch });
  }

  function updateGroup(
    key: "getting_ready_1" | "getting_ready_2",
    patch: Partial<GettingReadyGroup>,
  ) {
    onChange({ ...data, [key]: { ...data[key], ...patch } });
  }

  return (
    <div className="space-y-8">
      {/* ── Getting Ready ──────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-medium mb-3">Getting Ready</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Where will each group get ready? Rename the labels to fit your
          wedding party.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["getting_ready_1", "getting_ready_2"] as const).map((key) => (
            <div
              key={key}
              className="rounded-xl border border-border/50 p-4 space-y-3"
            >
              <Input
                value={data[key].label}
                onChange={(e) => updateGroup(key, { label: e.target.value })}
                placeholder="Group name"
                className="font-medium"
              />
              <div>
                <label className="text-xs text-muted-foreground">
                  Location
                </label>
                <Input
                  value={data[key].location}
                  onChange={(e) =>
                    updateGroup(key, { location: e.target.value })
                  }
                  placeholder="Hotel suite, home, salon..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Time</label>
                <Input
                  value={data[key].time}
                  onChange={(e) => updateGroup(key, { time: e.target.value })}
                  placeholder="9:00 AM"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Who&rsquo;s there
                </label>
                <Textarea
                  value={data[key].who}
                  onChange={(e) => updateGroup(key, { who: e.target.value })}
                  placeholder="Bridesmaids, hair stylist, photographer..."
                  rows={2}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── First Look ─────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-medium mb-3">First Look</h4>

        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={data.first_look}
            onClick={() => update({ first_look: !data.first_look })}
            className={`
              relative inline-flex h-5 w-9 shrink-0 items-center rounded-full
              border border-border transition-colors
              ${data.first_look ? "bg-primary" : "bg-muted"}
            `}
          >
            <span
              className={`
                pointer-events-none block h-4 w-4 rounded-full bg-background
                shadow-sm transition-transform
                ${data.first_look ? "translate-x-4" : "translate-x-0.5"}
              `}
            />
          </button>
          <span className="text-sm">Doing a first look?</span>
        </label>

        {data.first_look && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <div>
              <label className="text-xs text-muted-foreground">Time</label>
              <Input
                value={data.first_look_time}
                onChange={(e) => update({ first_look_time: e.target.value })}
                placeholder="2:00 PM"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Location</label>
              <Input
                value={data.first_look_location}
                onChange={(e) =>
                  update({ first_look_location: e.target.value })
                }
                placeholder="Garden courtyard, hotel lobby..."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Transportation ─────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-medium mb-3">Transportation</h4>
        <p className="text-xs text-muted-foreground mb-3">
          How is everyone getting between locations? Note shuttle times, parking
          info, etc.
        </p>
        <Textarea
          value={data.transportation}
          onChange={(e) => update({ transportation: e.target.value })}
          placeholder="Shuttle departs hotel at 3:30 PM, parking lot is behind the venue..."
          rows={3}
        />
      </div>

      {/* ── Rain Plan ──────────────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-medium mb-3">Rain Plan</h4>
        <p className="text-xs text-muted-foreground mb-3">
          If your ceremony or cocktail hour is outdoors, what&rsquo;s the
          backup? Check with your venue.
        </p>
        <Textarea
          value={data.rain_plan}
          onChange={(e) => update({ rain_plan: e.target.value })}
          placeholder="Ceremony moves to the covered pavilion, cocktail hour stays in the ballroom foyer..."
          rows={3}
        />
      </div>

      {/* ── Emergency Contact ──────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-medium mb-3">Emergency Contact</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Who&rsquo;s the go-to person if something goes wrong? (Usually the
          coordinator or a trusted friend)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={data.emergency_contact_name}
              onChange={(e) =>
                update({ emergency_contact_name: e.target.value })
              }
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phone</label>
            <Input
              value={data.emergency_contact_phone}
              onChange={(e) =>
                update({ emergency_contact_phone: e.target.value })
              }
              placeholder="(555) 123-4567"
            />
          </div>
        </div>
      </div>

      {/* ── Additional Notes ───────────────────────────────────────── */}
      <div>
        <h4 className="text-sm font-medium mb-3">Additional Notes</h4>
        <Textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Anything else the team should know about the day-of logistics..."
          rows={3}
        />
      </div>
    </div>
  );
}
