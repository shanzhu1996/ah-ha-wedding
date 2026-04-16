"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { LogisticsData } from "./types";

interface LogisticsSectionProps {
  data: LogisticsData;
  onChange: (data: LogisticsData) => void;
}

export function LogisticsSection({ data, onChange }: LogisticsSectionProps) {
  function update(patch: Partial<LogisticsData>) {
    onChange({ ...data, ...patch });
  }

  return (
    <div className="space-y-8">
      {/* Transportation */}
      <div>
        <h4 className="text-sm font-medium mb-1">Transportation</h4>
        <p className="text-xs text-muted-foreground mb-3">
          How is everyone getting between venues? Include timing and logistics.
        </p>
        <Textarea
          value={data.transportation}
          onChange={(e) => update({ transportation: e.target.value })}
          placeholder="How is everyone getting between locations? Shuttle times, parking info, Uber/Lyft notes..."
          rows={3}
        />
      </div>

      {/* Rain Plan */}
      <div>
        <h4 className="text-sm font-medium mb-1">Rain Plan</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Always have a backup, even if it probably won't rain.
        </p>
        <Textarea
          value={data.rain_plan}
          onChange={(e) => update({ rain_plan: e.target.value })}
          placeholder="If your ceremony or cocktail hour is outdoors, what's the backup? Check with your venue."
          rows={3}
        />
      </div>

      {/* Emergency Contact */}
      <div>
        <h4 className="text-sm font-medium mb-1">Emergency Contact</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Who&apos;s the go-to person if something goes wrong? Usually the coordinator or a trusted friend.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            value={data.emergency_contact_name}
            onChange={(e) => update({ emergency_contact_name: e.target.value })}
            placeholder="Name"
          />
          <Input
            value={data.emergency_contact_phone}
            onChange={(e) => update({ emergency_contact_phone: e.target.value })}
            placeholder="Phone"
          />
        </div>
      </div>

      {/* Vendor Meals */}
      <div>
        <h4 className="text-sm font-medium mb-1">Vendor Meals</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Your vendors work long hours -- make sure they're fed!
        </p>
        <Textarea
          value={data.vendor_meals_timing}
          onChange={(e) => update({ vendor_meals_timing: e.target.value })}
          placeholder="When should vendors eat? Usually during speeches or between courses. Note any dietary restrictions for vendor meals."
          rows={3}
        />
      </div>

      {/* Cultural / Religious Logistics */}
      <div>
        <h4 className="text-sm font-medium mb-1">Cultural / Religious Logistics</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Special setup, timing, or participants for cultural or religious elements.
        </p>
        <Textarea
          value={data.cultural_notes}
          onChange={(e) => update({ cultural_notes: e.target.value })}
          placeholder="Any cultural or religious logistics to coordinate? Special setup, timing, participants..."
          rows={3}
        />
      </div>

      {/* Additional Notes */}
      <div>
        <h4 className="text-sm font-medium mb-1">Additional Notes</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Anything else your team should know on the day of.
        </p>
        <Textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Any other logistics notes..."
          rows={3}
        />
      </div>
    </div>
  );
}
