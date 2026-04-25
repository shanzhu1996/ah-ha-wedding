"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, Printer, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  SECTION_KEYS,
  SECTION_META,
  type SectionKey,
} from "./types";

// ── Pill bar ─────────────────────────────────────────────────────────
// Pills are the UI navigation unit. Most map 1:1 to a SectionKey, but
// "dancing" is a virtual pill that shares `reception` data — it renders
// ReceptionSection with phaseFilter="dancing".
type PillKey = SectionKey | "dancing";

const PILL_KEYS: readonly PillKey[] = [
  "schedule",
  "getting_ready",
  "ceremony",
  "cocktail",
  "reception",
  "dancing",
  "photos",
  "logistics",
];

const PILL_META: Record<PillKey, { label: string; shortLabel: string }> = {
  ...SECTION_META,
  dancing: { label: "Dancing", shortLabel: "Dancing" },
};

/** The underlying section (for storage + completion) for a given pill. */
function sectionKeyForPill(pill: PillKey): SectionKey {
  return pill === "dancing" ? "reception" : pill;
}

// Lazy-load sections to avoid one giant bundle
import { ScheduleSection } from "./schedule-section";
import { GettingReadySection } from "./getting-ready-section";
import { CeremonySection } from "./ceremony-section";
import { CocktailSection } from "./cocktail-section";
import { ReceptionSection } from "./reception-section";
import { PhotoShotList } from "./photo-shot-list";
import { LogisticsSection } from "./logistics-section";

// ── Types ──────────────────────────────────────────────────────────────

export interface WeddingSong {
  phase: string;
  song_title: string;
  artist: string | null;
  sort_order: number;
  is_do_not_play: boolean;
}

interface DayStepperProps {
  weddingId: string;
  initialData: Record<string, unknown>;
  songs: WeddingSong[];
  /** Flag-gated cultural moment (A4). When true, CeremonySection renders
   *  the Tea Ceremony card and ScheduleSection shows a suggestion chip. */
  hasTeaCeremony: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function DayStepper({ weddingId, initialData, songs: initialSongs, hasTeaCeremony }: DayStepperProps) {
  const [activePill, setActivePill] = useState<PillKey>("schedule");
  const activeSection = sectionKeyForPill(activePill);
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [songs, setSongs] = useState<WeddingSong[]>(initialSongs);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillBarRef = useRef<HTMLDivElement>(null);

  // Refetch songs on mount and whenever the tab regains focus. The Music
  // tab is a separate page, so when the couple adds songs there and comes
  // back, we need to pick up the new list. (The server snapshot passed
  // as `initialSongs` goes stale.)
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function refetch() {
      const { data } = await supabase
        .from("music_selections")
        .select("phase, song_title, artist, sort_order, is_do_not_play")
        .eq("wedding_id", weddingId);
      if (!cancelled && data) setSongs(data as WeddingSong[]);
    }
    refetch();
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", refetch);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", refetch);
    };
  }, [weddingId]);

  // Auto-save with debounce
  const saveSection = useCallback(
    (section: string, sectionData: unknown) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      setSaving(true);

      saveTimeout.current = setTimeout(async () => {
        const supabase = createClient();
        await supabase.from("wedding_day_details").upsert(
          {
            wedding_id: weddingId,
            section,
            data: sectionData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "wedding_id,section" }
        );
        setSaving(false);
        setLastSavedAt(new Date());
      }, 800);
    },
    [weddingId]
  );

  function handleChange(section: SectionKey, sectionData: unknown) {
    setData((prev) => ({ ...prev, [section]: sectionData }));
    saveSection(section, sectionData);
  }

  // Scroll active pill into view on mobile
  function handlePillClick(key: PillKey) {
    setActivePill(key);
    const pill = document.getElementById(`pill-${key}`);
    pill?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  // Convenience for sibling calls — e.g., ScheduleSection navigating to a
  // section. All callers only need to know SectionKeys, not virtual pills.
  function handleSectionClick(key: SectionKey) {
    handlePillClick(key);
  }

  const activeIndex = PILL_KEYS.indexOf(activePill);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
            Day-of Details
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Plan every moment of your wedding day — from getting ready to the grand exit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saving ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </span>
          ) : lastSavedAt ? (
            <span
              className="text-xs text-muted-foreground/70 tabular-nums"
              title={lastSavedAt.toLocaleString()}
            >
              Saved ·{" "}
              {lastSavedAt.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          ) : null}
          <Link
            href="/day-of-details/print"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Open a printable day-of brief"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Link>
        </div>
      </div>

      {/* Stepper pill bar — uniform 4×2 grid at every viewport. The 4×2
          shape gives each pill equal width (no more 3-3-2 raggedness) and
          fits inside the side-nav layout at desktop without horizontal
          scrolling. xl+ flips to 8×1 once there's room for everyone. */}
      <div className="relative">
        <div
          ref={pillBarRef}
          className="grid grid-cols-4 gap-1.5 xl:grid-cols-8"
        >
          {PILL_KEYS.map((pill) => {
            const isActive = pill === activePill;
            const meta = PILL_META[pill];
            return (
              <button
                key={pill}
                id={`pill-${pill}`}
                onClick={() => handlePillClick(pill)}
                className={cn(
                  "w-full rounded-full font-medium transition-all duration-200 inline-flex items-center justify-center",
                  "px-2 py-2 text-xs sm:px-4 sm:text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(196,168,130,0.25)]"
                    : "bg-primary/8 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                )}
                title={meta.label}
              >
                {/* Always shortLabel — full label shown in the section
                    indicator below + on hover (title). Keeps every pill
                    on a single line at every viewport. */}
                <span className="whitespace-nowrap">{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Section indicator — hidden on mobile (the active pill already
            signals position, and "Step X of Y" creates a pressure-y
            "quiz" feel. Desktop keeps it for wider-canvas orientation. */}
        <p className="hidden sm:block text-xs text-muted-foreground/70 mt-2">
          Step {activeIndex + 1} of {PILL_KEYS.length} · {PILL_META[activePill].label}
        </p>
      </div>

      {/* Soft prerequisite hint — ceremony time powers the schedule */}
      {activeSection !== "schedule" &&
        !((data.schedule as any)?.ceremony_time || "").trim() && (
          <button
            type="button"
            onClick={() => handleSectionClick("schedule")}
            className="w-full flex items-center gap-2 text-left text-xs px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              <span className="font-medium">Tip:</span> set a ceremony time in
              Schedule — everything else builds around it.
            </span>
          </button>
        )}

      {/* Active section content */}
      <div className="min-h-[400px]">
        {activeSection === "schedule" && (
          <ScheduleSection
            data={(data.schedule || {}) as any}
            onChange={(d) => handleChange("schedule", d)}
            onNavigate={(section) => handleSectionClick(section)}
            enrichment={{
              reception: (data.reception || undefined) as any,
              ceremony: (data.ceremony || undefined) as any,
              getting_ready: (data.getting_ready || undefined) as any,
            }}
            hasTeaCeremony={hasTeaCeremony}
          />
        )}
        {activeSection === "getting_ready" && (
          <GettingReadySection
            data={(data.getting_ready || {}) as any}
            onChange={(d) => handleChange("getting_ready", d)}
            scheduleData={(data.schedule || undefined) as any}
            onNavigateToSchedule={() => handleSectionClick("schedule")}
          />
        )}
        {activeSection === "ceremony" && (
          <CeremonySection
            data={(data.ceremony || {}) as any}
            onChange={(d) => handleChange("ceremony", d)}
            songs={songs}
            hasTeaCeremony={hasTeaCeremony}
            teaCeremonyData={(data.tea_ceremony || undefined) as any}
            onTeaCeremonyChange={(d) => handleChange("tea_ceremony", d)}
          />
        )}
        {activeSection === "cocktail" && (
          <CocktailSection
            data={(data.cocktail || {}) as any}
            onChange={(d) => handleChange("cocktail", d)}
            songs={songs}
          />
        )}
        {(activePill === "reception" || activePill === "dancing") && (
          <ReceptionSection
            key={activePill}
            data={(data.reception || {}) as any}
            onChange={(d) => handleChange("reception", d)}
            scheduleData={(data.schedule || undefined) as any}
            onScheduleChange={(d) => handleChange("schedule", d)}
            onNavigateToSchedule={() => handleSectionClick("schedule")}
            logisticsData={(data.logistics || undefined) as any}
            onNavigateToLogistics={() => handleSectionClick("logistics")}
            songs={songs}
            phaseFilter={activePill === "dancing" ? "dancing" : "reception"}
          />
        )}
        {activeSection === "photos" && (
          <PhotoShotList
            data={(data.photos || {}) as any}
            onChange={(d) => handleChange("photos", d)}
          />
        )}
        {activeSection === "logistics" && (
          <LogisticsSection
            data={(data.logistics || {}) as any}
            onChange={(d) => handleChange("logistics", d)}
          />
        )}
      </div>
    </div>
  );
}
