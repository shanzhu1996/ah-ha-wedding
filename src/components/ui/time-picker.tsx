"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  // Parse HH:MM (24h) value into 12h components.
  // Unset value → all three undefined so Selects render their placeholders
  // ("Hr", "Min", "—"). This prevents the confusion where "12:00 PM" looked
  // committed to the couple but DB value was still null.
  const [hour12, setHour12] = useState<string | undefined>(undefined);
  const [minute, setMinute] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!value) {
      setHour12(undefined);
      setMinute(undefined);
      setPeriod(undefined);
      return;
    }
    const [hStr, mStr] = value.split(":");
    const h = parseInt(hStr);
    const m = parseInt(mStr);
    if (isNaN(h) || isNaN(m)) return;

    const p = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    setHour12(String(h12));
    setMinute(String(m).padStart(2, "0"));
    setPeriod(p);
  }, [value]);

  // Commit a time as soon as the user picks any of the three selects —
  // missing pieces fall back to sensible defaults (minute "00", period "PM").
  // The user's explicit action (picking anything) counts as intent to set a
  // time, so we persist immediately rather than waiting for all three.
  function update(
    newH12: string | undefined,
    newMin: string | undefined,
    newPeriod: string | undefined
  ) {
    const h12 = newH12 ?? hour12 ?? "12";
    const mm = newMin ?? minute ?? "00";
    const p = newPeriod ?? period ?? "PM";
    let h = parseInt(h12);
    if (p === "AM" && h === 12) h = 0;
    if (p === "PM" && h !== 12) h += 12;
    const result = `${String(h).padStart(2, "0")}:${mm}`;
    onChange(result);
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  return (
    <div className={`flex items-center gap-1.5 ${className || ""}`}>
      <Select
        value={hour12}
        onValueChange={(v) => {
          const h = v ?? hour12;
          setHour12(h);
          update(h, minute, period);
        }}
      >
        <SelectTrigger className="h-9 w-[4.2rem] text-center text-sm px-2">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground font-medium">:</span>

      <Select
        value={minute}
        onValueChange={(v) => {
          const m = v ?? minute;
          setMinute(m);
          update(hour12, m, period);
        }}
      >
        <SelectTrigger className="h-9 w-[4.2rem] text-center text-sm px-2">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={period}
        onValueChange={(v) => {
          const p = v ?? period;
          setPeriod(p);
          update(hour12, minute, p);
        }}
      >
        <SelectTrigger className="h-9 w-[4.2rem] text-center text-sm px-2">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
