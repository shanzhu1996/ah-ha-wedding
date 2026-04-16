"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GettingReadyData, GettingReadyGroup } from "./types";
import { DEFAULT_DETAIL_SHOTS } from "./types";

interface GettingReadySectionProps {
  data: GettingReadyData;
  onChange: (data: GettingReadyData) => void;
}

export function GettingReadySection({ data, onChange }: GettingReadySectionProps) {
  function update(patch: Partial<GettingReadyData>) {
    onChange({ ...data, ...patch });
  }

  function updateGroup(key: "group_1" | "group_2", patch: Partial<GettingReadyGroup>) {
    update({ [key]: { ...data[key], ...patch } });
  }

  function toggleDetailShot(shot: string) {
    const current = data.detail_shots;
    const next = current.includes(shot)
      ? current.filter((s) => s !== shot)
      : [...current, shot];
    update({ detail_shots: next });
  }

  return (
    <div className="space-y-8">
      {/* Getting Ready Groups */}
      <div>
        <h4 className="text-sm font-medium mb-1">Getting Ready Groups</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Where is each group getting ready? Add names so your photographer knows where to be.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["group_1", "group_2"] as const).map((key) => (
            <div key={key} className="rounded-xl border border-border/50 p-4 space-y-3">
              <Input
                value={data[key].label}
                onChange={(e) => updateGroup(key, { label: e.target.value })}
                placeholder="e.g., Bride's Suite"
                className="text-sm font-medium"
              />
              <Input
                value={data[key].location}
                onChange={(e) => updateGroup(key, { location: e.target.value })}
                placeholder="Location"
              />
              <Input
                value={data[key].time}
                onChange={(e) => updateGroup(key, { time: e.target.value })}
                placeholder="Start time, e.g., 9:00 AM"
              />
              <Textarea
                value={data[key].who}
                onChange={(e) => updateGroup(key, { who: e.target.value })}
                placeholder="Bridesmaids, mom, hair stylist..."
                rows={2}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Hair & Makeup Notes */}
      <div>
        <h4 className="text-sm font-medium mb-1">Hair &amp; Makeup Notes</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Note the order of people, timing, and any special requests.
        </p>
        <Textarea
          value={data.hair_makeup_notes}
          onChange={(e) => update({ hair_makeup_notes: e.target.value })}
          placeholder="Schedule notes, order of people, etc."
          rows={3}
        />
      </div>

      {/* Detail Shots */}
      <div>
        <h4 className="text-sm font-medium mb-1">Detail Shots</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Check the items you want your photographer to capture before the ceremony.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEFAULT_DETAIL_SHOTS.map((shot) => (
            <label
              key={shot}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={data.detail_shots.includes(shot)}
                onCheckedChange={() => toggleDetailShot(shot)}
              />
              <span className="text-sm">{shot}</span>
            </label>
          ))}
        </div>
      </div>

      {/* First Look */}
      <div>
        <h4 className="text-sm font-medium mb-1">First Look</h4>
        <p className="text-xs text-muted-foreground mb-3">
          A private moment before the ceremony where you see each other for the first time.
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={data.first_look}
            onCheckedChange={(checked) =>
              update({ first_look: checked === true })
            }
          />
          <span className="text-sm">Planning a first look?</span>
        </label>
        {data.first_look && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input
              value={data.first_look_time}
              onChange={(e) => update({ first_look_time: e.target.value })}
              placeholder="Time"
            />
            <Input
              value={data.first_look_location}
              onChange={(e) => update({ first_look_location: e.target.value })}
              placeholder="Location"
            />
          </div>
        )}
      </div>

      {/* Cultural / Religious Prep */}
      <div>
        <h4 className="text-sm font-medium mb-1">Cultural / Religious Prep</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Any traditions or rituals that happen during the getting-ready time.
        </p>
        <Textarea
          value={data.cultural_notes}
          onChange={(e) => update({ cultural_notes: e.target.value })}
          placeholder="e.g., Henna application, prayer before ceremony, tea ceremony prep..."
          rows={3}
        />
      </div>
    </div>
  );
}
