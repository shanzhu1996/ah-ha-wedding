"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Props {
  /** Rendered above the checkbox — the moment's primary song/music inputs. */
  children: React.ReactNode;
  /** "Skip music" state + toggle. */
  skip: boolean;
  onSkipChange: (skip: boolean) => void;
  /** Slightly different copy for moments like Dinner where it's more "mood" than "song". */
  label?: string;
}

/**
 * Primary music block for a reception moment. Shows the moment's song input(s)
 * followed by an explicit "Skip music" opt-out. Three states the DJ cares about:
 *   - Blank + skip unchecked: "not planned yet"
 *   - Song filled: music is planned
 *   - Skip music checked: silence is intentional
 */
export function MomentMusicBlock({
  children,
  skip,
  onSkipChange,
  label = "Skip music for this moment",
}: Props) {
  return (
    <div className="space-y-2">
      <div className={cn(skip && "opacity-50 pointer-events-none")}>
        {children}
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
        <Checkbox
          checked={skip}
          onCheckedChange={(v) => onSkipChange(!!v)}
          className="pointer-events-auto"
        />
        {label}
        <span className="text-muted-foreground/50">
          · silence is intentional, vendors will know
        </span>
      </label>
    </div>
  );
}
