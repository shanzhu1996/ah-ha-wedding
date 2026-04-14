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
  // Parse HH:MM (24h) value into 12h components
  const [hour12, setHour12] = useState("12");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("PM");

  useEffect(() => {
    if (!value) return;
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

  function update(newH12: string, newMin: string, newPeriod: string) {
    let h = parseInt(newH12);
    if (newPeriod === "AM" && h === 12) h = 0;
    if (newPeriod === "PM" && h !== 12) h += 12;
    const result = `${String(h).padStart(2, "0")}:${newMin}`;
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
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
