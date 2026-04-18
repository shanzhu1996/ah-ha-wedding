"use client";

import { useState } from "react";
import {
  Users2,
  Sparkles,
  Camera,
  Eye,
  Flame,
  MapPin,
  Clock,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { GettingReadyData, GettingReadyGroup } from "./types";
import { DEFAULT_DETAIL_SHOTS } from "./types";
import { InlineChip, InlineRow } from "./moment-uniform-fields";

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

  // Optional section open states — chip-first unless there's already content.
  const [shotsOpen, setShotsOpen] = useState(false);
  const [firstLookOpen, setFirstLookOpen] = useState(false);
  const [culturalOpen, setCulturalOpen] = useState(false);

  const shotsPreview =
    data.detail_shots.length > 0
      ? `${data.detail_shots.length} shot${data.detail_shots.length > 1 ? "s" : ""}`
      : "";
  const firstLookPreview = data.first_look
    ? [data.first_look_time, data.first_look_location]
        .filter((s) => s.trim())
        .join(" · ") || "yes, planned"
    : "";
  const culturalPreview = data.cultural_notes.trim();

  function clearShots() {
    update({ detail_shots: [] });
    setShotsOpen(false);
  }
  function clearFirstLook() {
    update({ first_look: false, first_look_time: "", first_look_location: "" });
    setFirstLookOpen(false);
  }
  function clearCultural() {
    update({ cultural_notes: "" });
    setCulturalOpen(false);
  }

  return (
    <div className="space-y-8">
      {/* Primary: Getting Ready Groups */}
      <PrimaryField
        icon={<Users2 className="h-4 w-4 text-primary/80" />}
        label="Getting ready groups"
        hint="where each group is — so the photographer knows where to be"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["group_1", "group_2"] as const).map((key) => (
            <div
              key={key}
              className="rounded-xl border border-border/50 p-4 space-y-3"
            >
              <Input
                value={data[key].label}
                onChange={(e) => updateGroup(key, { label: e.target.value })}
                placeholder="e.g., Bride's suite"
                className="text-sm font-medium"
              />
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <Input
                  value={data[key].location}
                  onChange={(e) => updateGroup(key, { location: e.target.value })}
                  placeholder="Location"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                <Input
                  value={data[key].time}
                  onChange={(e) => updateGroup(key, { time: e.target.value })}
                  placeholder="Start time, e.g., 9:00 AM"
                  className="h-9 text-sm tabular-nums"
                />
              </div>
              <Textarea
                value={data[key].who}
                onChange={(e) => updateGroup(key, { who: e.target.value })}
                placeholder="Bridesmaids, mom, hair stylist…"
                rows={2}
                className="text-sm"
              />
            </div>
          ))}
        </div>
      </PrimaryField>

      {/* Primary: Hair & makeup */}
      <PrimaryField
        icon={<Sparkles className="h-4 w-4 text-primary/80" />}
        label="Hair & makeup"
        hint="order, timing, any special requests"
      >
        <Textarea
          value={data.hair_makeup_notes}
          onChange={(e) => update({ hair_makeup_notes: e.target.value })}
          placeholder="Schedule notes, order of people, etc."
          rows={3}
          className="text-sm"
        />
      </PrimaryField>

      {/* Optional chips — hierarchy break */}
      <div className="border-t border-border/40 pt-6 space-y-3">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/60">
          Optional · click to add or edit
        </p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!shotsOpen && (
            <InlineChip
              icon={<Camera />}
              label="Detail shots"
              value={shotsPreview}
              onClick={() => setShotsOpen(true)}
            />
          )}
          {!firstLookOpen && (
            <InlineChip
              icon={<Eye />}
              label="First look"
              value={firstLookPreview}
              typical
              onClick={() => setFirstLookOpen(true)}
            />
          )}
          {!culturalOpen && (
            <InlineChip
              icon={<Flame />}
              label="Cultural or religious prep"
              value={culturalPreview}
              onClick={() => setCulturalOpen(true)}
            />
          )}
        </div>

        {shotsOpen && (
          <InlineRow
            icon={<Camera />}
            label="Detail shots"
            hint="what the photographer captures before the ceremony"
            onDone={() => setShotsOpen(false)}
            onClear={clearShots}
            canClear={data.detail_shots.length > 0}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_DETAIL_SHOTS.map((shot) => (
                <label
                  key={shot}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={data.detail_shots.includes(shot)}
                    onCheckedChange={() => toggleDetailShot(shot)}
                  />
                  <span
                    className={cn(
                      !data.detail_shots.includes(shot) &&
                        "text-muted-foreground"
                    )}
                  >
                    {shot}
                  </span>
                </label>
              ))}
            </div>
          </InlineRow>
        )}

        {firstLookOpen && (
          <InlineRow
            icon={<Eye />}
            label="First look"
            hint="private moment before the ceremony — saves ~90 min of photos"
            onDone={() => setFirstLookOpen(false)}
            onClear={clearFirstLook}
            canClear={data.first_look || !!data.first_look_time || !!data.first_look_location}
          >
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={data.first_look}
                onCheckedChange={(checked) =>
                  update({ first_look: checked === true })
                }
              />
              <span
                className={cn(!data.first_look && "text-muted-foreground")}
              >
                Planning a first look
              </span>
            </label>
            {data.first_look && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Input
                  value={data.first_look_time}
                  onChange={(e) => update({ first_look_time: e.target.value })}
                  placeholder="Time"
                  className="h-9 text-sm tabular-nums"
                />
                <Input
                  value={data.first_look_location}
                  onChange={(e) =>
                    update({ first_look_location: e.target.value })
                  }
                  placeholder="Location"
                  className="h-9 text-sm"
                />
              </div>
            )}
          </InlineRow>
        )}

        {culturalOpen && (
          <InlineRow
            icon={<Flame />}
            label="Cultural or religious prep"
            hint="traditions or rituals during getting-ready"
            onDone={() => setCulturalOpen(false)}
            onClear={clearCultural}
            canClear={!!data.cultural_notes.trim()}
          >
            <Textarea
              autoFocus={!data.cultural_notes}
              value={data.cultural_notes}
              onChange={(e) => update({ cultural_notes: e.target.value })}
              placeholder="e.g., Henna application, prayer before ceremony, tea ceremony prep…"
              rows={3}
              className="text-sm"
            />
          </InlineRow>
        )}
      </div>
    </div>
  );
}

// ── Primary-field layout (mirrored from reception-section) ───────────────
function PrimaryField({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="flex items-center self-center [&>svg]:!h-[18px] [&>svg]:!w-[18px] [&>svg]:!text-primary">
          {icon}
        </span>
        <label className="text-[15px] font-semibold text-foreground leading-none">
          {label}
        </label>
        {hint && (
          <span className="text-[13px] text-muted-foreground">— {hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}
