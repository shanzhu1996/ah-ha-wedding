"use client";

import { useState, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  SECTION_KEYS,
  SECTION_META,
  type SectionKey,
  type AllSectionData,
} from "./types";

// Lazy-load sections to avoid one giant bundle
import { ScheduleSection } from "./schedule-section";
import { GettingReadySection } from "./getting-ready-section";
import { CeremonySection } from "./ceremony-section";
import { CocktailSection } from "./cocktail-section";
import { ReceptionSection } from "./reception-section";
import { PhotoShotList } from "./photo-shot-list";
import { LogisticsSection } from "./logistics-section";

// ── Types ──────────────────────────────────────────────────────────────

interface DayStepperProps {
  weddingId: string;
  initialData: Record<string, unknown>;
}

// ── Component ──────────────────────────────────────────────────────────

export function DayStepper({ weddingId, initialData }: DayStepperProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("schedule");
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillBarRef = useRef<HTMLDivElement>(null);

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
      }, 800);
    },
    [weddingId]
  );

  function handleChange(section: SectionKey, sectionData: unknown) {
    setData((prev) => ({ ...prev, [section]: sectionData }));
    saveSection(section, sectionData);
  }

  // Scroll active pill into view on mobile
  function handleSectionClick(key: SectionKey) {
    setActiveSection(key);
    // Scroll the pill into view in the pill bar
    const pill = document.getElementById(`pill-${key}`);
    pill?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  const activeIndex = SECTION_KEYS.indexOf(activeSection);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
            Day-of Details
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan every moment of your wedding day — from getting ready to the grand exit.
          </p>
        </div>
        {saving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
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
          {SECTION_KEYS.map((key) => {
            const isActive = key === activeSection;
            const meta = SECTION_META[key];
            return (
              <button
                key={key}
                id={`pill-${key}`}
                onClick={() => handleSectionClick(key)}
                className={cn(
                  "shrink-0 snap-start px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(196,168,130,0.25)]"
                    : "bg-primary/8 text-muted-foreground hover:bg-primary/15 hover:text-foreground"
                )}
              >
                <span className="hidden sm:inline">{meta.label}</span>
                <span className="sm:hidden">{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile: section indicator */}
        <p className="text-xs text-muted-foreground/70 mt-2 sm:hidden">
          {SECTION_META[activeSection].label} · {activeIndex + 1} of {SECTION_KEYS.length}
        </p>
      </div>

      {/* Active section content */}
      <div className="min-h-[400px]">
        {activeSection === "schedule" && (
          <ScheduleSection
            data={(data.schedule || {}) as any}
            onChange={(d) => handleChange("schedule", d)}
            onNavigate={(section) => handleSectionClick(section)}
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
        {activeSection === "reception" && (
          <ReceptionSection
            data={(data.reception || {}) as any}
            onChange={(d) => handleChange("reception", d)}
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
