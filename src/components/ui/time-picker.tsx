"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Native time picker — wraps `<input type="time" />` so mobile users get
 * the iOS/Android wheel and desktop users get keyboard or spinner input.
 * Value is always HH:MM (24h) in storage; display format follows the
 * user's locale automatically. Replaces the previous 3-dropdown
 * (Hour / Min / AM-PM) UI which felt heavy for one piece of information.
 */
export function TimePicker({ value, onChange, className }: TimePickerProps) {
  return (
    <Input
      type="time"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn("w-[10rem] text-sm tabular-nums", className)}
    />
  );
}
