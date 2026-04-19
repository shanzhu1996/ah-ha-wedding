"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ephemeral "Saved" indicator that pulses when `value` changes and then
 * fades. Designed for autosaving inputs that appear conditionally
 * (e.g., "Custom" duration, "Different area" detail) — couples often
 * expect an explicit submit action for revealed fields, so this gives
 * silent reassurance on every keystroke.
 *
 * Safe with Strict Mode double-invoke: the initial ref.current === value
 * compare skips on mount; only real value changes trigger the pulse.
 */
export function AutosaveIndicator({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;
    // Debounce: stay hidden while the couple is actively editing. Only
    // after they pause ~500ms does "Saved" appear and linger for 2s.
    setVisible(false);
    const show = setTimeout(() => setVisible(true), 500);
    const hide = setTimeout(() => setVisible(false), 2500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [value]);

  return (
    <span
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-primary/70 shrink-0 transition-opacity duration-300 motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <Check className="h-3 w-3" />
      Saved
    </span>
  );
}
