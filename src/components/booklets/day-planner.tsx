"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, CalendarHeart, ChevronDown, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CeremonySection } from "./ceremony-section";
import { ReceptionSection } from "./reception-section";
import { LogisticsSection } from "./logistics-section";
import type { CeremonyData, ReceptionData, LogisticsData } from "./day-planner-types";
import { BookletGenerator } from "./booklet-generator";
import type { VendorType } from "@/types/database";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

interface DayPlannerProps {
  weddingId: string;
  vendors: Array<{
    id: string;
    type: VendorType;
    company_name: string;
    contact_name: string | null;
    phone: string | null;
    email: string | null;
    contract_amount: number | null;
    arrival_time: string | null;
    setup_time_minutes: number | null;
    setup_location: string | null;
    breakdown_time: string | null;
    meals_needed: number | null;
    notes: string | null;
    extra_details: unknown;
  }>;
  wedding: {
    partner1_name: string;
    partner2_name: string;
    wedding_date: string | null;
    venue_name: string | null;
    venue_address: string | null;
  };
  timelineEvents: Array<{
    id: string;
    type: "pre_wedding" | "day_of";
    event_time: string | null;
    title: string;
    description: string | null;
    sort_order: number;
  }>;
  musicSelections: Array<{
    id: string;
    phase: string;
    song_title: string;
    artist: string | null;
    is_do_not_play: boolean;
  }>;
  guests: Array<{
    id: string;
    first_name: string;
    last_name: string;
    rsvp_status: string;
    meal_choice: string | null;
    dietary_restrictions: string | null;
  }>;
  delegationTasks: Array<{
    id: string;
    task: string;
    assigned_to: string;
    contact: string | null;
    notes: string | null;
  }>;
  initialData: {
    ceremony: CeremonyData;
    reception: ReceptionData;
    logistics: LogisticsData;
  };
}

// ── Collapsible Section ────────────────────────────────────────────────

function PlanSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
      >
        <div>
          <h3 className="text-lg font-[family-name:var(--font-heading)]">{title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="px-5 pb-6 pt-2 border-t border-border/30">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export function DayPlanner({
  weddingId,
  vendors,
  wedding,
  timelineEvents,
  musicSelections,
  guests,
  delegationTasks,
  initialData,
}: DayPlannerProps) {
  const [ceremony, setCeremony] = useState<CeremonyData>(initialData.ceremony);
  const [reception, setReception] = useState<ReceptionData>(initialData.reception);
  const [logistics, setLogistics] = useState<LogisticsData>(initialData.logistics);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save with debounce
  const saveSection = useCallback(
    async (section: string, data: Record<string, unknown>) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      setSaving(true);

      saveTimeout.current = setTimeout(async () => {
        const supabase = createClient();
        await supabase.from("wedding_day_details").upsert(
          {
            wedding_id: weddingId,
            section,
            data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "wedding_id,section" }
        );
        setSaving(false);
      }, 800);
    },
    [weddingId]
  );

  // Save handlers
  const handleCeremonyChange = useCallback(
    (data: CeremonyData) => {
      setCeremony(data);
      saveSection("ceremony", data as unknown as Record<string, unknown>);
    },
    [saveSection]
  );

  const handleReceptionChange = useCallback(
    (data: ReceptionData) => {
      setReception(data);
      saveSection("reception", data as unknown as Record<string, unknown>);
    },
    [saveSection]
  );

  const handleLogisticsChange = useCallback(
    (data: LogisticsData) => {
      setLogistics(data);
      saveSection("logistics", data as unknown as Record<string, unknown>);
    },
    [saveSection]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
            Wedding Day
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan your ceremony, reception, and logistics — then generate booklets for your team.
          </p>
        </div>
        {saving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
      </div>

      <Tabs defaultValue="plan" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="plan" className="gap-2">
            <CalendarHeart className="h-4 w-4" />
            Plan Your Day
          </TabsTrigger>
          <TabsTrigger value="booklets" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Generate Booklets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-6 space-y-4">
          <PlanSection
            title="Ceremony"
            description="Processional, readings, vows, and unity ceremony"
            defaultOpen={true}
          >
            <CeremonySection data={ceremony} onChange={handleCeremonyChange} />
          </PlanSection>

          <PlanSection
            title="Reception"
            description="First dance, speeches, activities, and send-off"
          >
            <ReceptionSection data={reception} onChange={handleReceptionChange} />
          </PlanSection>

          <PlanSection
            title="Logistics"
            description="Getting ready, transportation, rain plan, and emergency contacts"
          >
            <LogisticsSection data={logistics} onChange={handleLogisticsChange} />
          </PlanSection>
        </TabsContent>

        <TabsContent value="booklets" className="mt-6">
          <BookletGenerator
            vendors={vendors}
            wedding={wedding}
            timelineEvents={timelineEvents}
            musicSelections={musicSelections}
            guests={guests}
            delegationTasks={delegationTasks}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
