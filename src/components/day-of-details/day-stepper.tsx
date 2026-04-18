"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Loader2, Printer, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  SECTION_KEYS,
  SECTION_META,
  getSectionCompletion,
  type SectionKey,
  type AllSectionData,
  type CompletionState,
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
}

// ── Completion dot ─────────────────────────────────────────────────────

function CompletionDot({ state, active }: { state: CompletionState; active: boolean }) {
  if (state === "none" || state === "empty") return null;
  const color =
    state === "done"
      ? active
        ? "bg-emerald-200"
        : "bg-emerald-500"
      : active
        ? "bg-amber-200"
        : "bg-amber-500";
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", color)} aria-hidden />;
}

function completionTitle(label: string, state: CompletionState): string {
  if (state === "done") return `${label} — complete`;
  if (state === "partial") return `${label} — in progress`;
  return label;
}

// ── Component ──────────────────────────────────────────────────────────

export function DayStepper({ weddingId, initialData, songs: initialSongs }: DayStepperProps) {
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
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
            Day-of Details
          </h1>
          <p className="text-muted-foreground mt-1">
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
            Print brief
          </Link>
        </div>
      </div>

      {/* Stepper pill bar */}
      <div className="relative">
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none sm:hidden" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none sm:hidden" />

        <div
          ref={pillBarRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide px-1 py-1 -mx-1 snap-x"
        >
          {PILL_KEYS.map((pill) => {
            const isActive = pill === activePill;
            const meta = PILL_META[pill];
            const sKey = sectionKeyForPill(pill);
            const completion = getSectionCompletion(
              sKey,
              (data[sKey] ?? {}) as AllSectionData[typeof sKey]
            );
            return (
              <button
                key={pill}
                id={`pill-${pill}`}
                onClick={() => handlePillClick(pill)}
                className={cn(
                  "shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 inline-flex items-center gap-1.5",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(196,168,130,0.25)]"
                    : "bg-primary/8 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                )}
                title={completionTitle(meta.label, completion)}
              >
                <span className="hidden sm:inline">{meta.label}</span>
                <span className="sm:hidden">{meta.shortLabel}</span>
                <CompletionDot state={completion} active={isActive} />
              </button>
            );
          })}
        </div>

        {/* Mobile: section indicator */}
        <p className="text-xs text-muted-foreground/70 mt-2 sm:hidden">
          {PILL_META[activePill].label} · {activeIndex + 1} of {PILL_KEYS.length}
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
          />
        )}
        {activeSection === "getting_ready" && (
          <GettingReadySection
            data={(data.getting_ready || {}) as any}
            onChange={(d) => handleChange("getting_ready", d)}
          />
        )}
        {activeSection === "ceremony" && (
          <CeremonySection
            data={(data.ceremony || {}) as any}
            onChange={(d) => handleChange("ceremony", d)}
          />
        )}
        {activeSection === "cocktail" && (
          <CocktailSection
            data={(data.cocktail || {}) as any}
            onChange={(d) => handleChange("cocktail", d)}
          />
        )}
        {(activePill === "reception" || activePill === "dancing") && (
          <ReceptionSection
            key={activePill}
            data={(data.reception || {}) as any}
            onChange={(d) => handleChange("reception", d)}
            scheduleData={(data.schedule || undefined) as any}
            onNavigateToSchedule={() => handleSectionClick("schedule")}
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
