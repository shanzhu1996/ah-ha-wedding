import { redirect } from "next/navigation";
import { format, differenceInDays } from "date-fns";
import { getCurrentWedding, getWeddingStats } from "@/lib/supabase/queries";
import { PlanningMap } from "@/components/layout/planning-map";
import { NextUpStrip } from "@/components/dashboard/next-up-strip";
import { DueThisWeekCard } from "@/components/dashboard/due-this-week-card";

export default async function DashboardPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) return redirect("/onboarding");

  const stats = await getWeddingStats(wedding.id);
  const visits: Record<string, string> =
    (wedding.tool_visits as Record<string, string>) ?? {};

  const weddingDate = wedding.wedding_date
    ? new Date(wedding.wedding_date + "T00:00:00")
    : null;
  const daysUntil = weddingDate
    ? differenceInDays(weddingDate, new Date())
    : null;

  const upcomingTasks = stats.upcomingTasks || [];

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight mb-1">
          {wedding.partner1_name} <span className="text-primary font-normal italic">&</span> {wedding.partner2_name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {weddingDate && format(weddingDate, "MMMM d, yyyy")}
          {wedding.venue_name && ` · ${wedding.venue_name}`}
        </p>
      </div>

      {/* Due — adaptive window based on daysUntil (this week / next 3 days / today) */}
      <DueThisWeekCard tasks={upcomingTasks} daysUntil={daysUntil} />

      {/* Next up — concrete actions based on what's missing / time-sensitive */}
      <NextUpStrip
        wedding={{
          budget_total: wedding.budget_total,
          wedding_date: wedding.wedding_date,
          venue_name: wedding.venue_name,
        }}
        stats={{
          vendorCount: stats.vendorCount,
          rsvpCounts: stats.rsvpCounts,
          upcomingTasks: stats.upcomingTasks,
        }}
        daysUntil={daysUntil}
      />

      {/* THE hero statement */}
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-[2.5rem] font-[family-name:var(--font-heading)] tracking-tight leading-[1.2] max-w-lg">
          Wedding planning is really just answering four questions.
        </h2>
      </div>

      {/* The 4-step planning map */}
      <PlanningMap weddingDate={wedding.wedding_date} visits={visits} />
    </div>
  );
}
