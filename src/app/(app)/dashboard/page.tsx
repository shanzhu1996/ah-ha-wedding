import { redirect } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays, isAfter, addDays } from "date-fns";
import { Heart, CalendarDays } from "lucide-react";
import { getCurrentWedding, getWeddingStats } from "@/lib/supabase/queries";
import { PlanningMap } from "@/components/layout/planning-map";

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

  // Count tasks due this week
  const today = new Date();
  const oneWeekOut = addDays(today, 7);
  const tasksDueThisWeek = (stats.upcomingTasks || []).filter((t) => {
    if (!t.event_date) return false;
    const d = new Date(t.event_date + "T00:00:00");
    return !isAfter(d, oneWeekOut);
  }).length;

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
            {wedding.partner1_name} <span className="text-primary font-normal italic">&</span> {wedding.partner2_name}
          </h1>
          {daysUntil !== null && daysUntil > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
              <Heart className="h-2.5 w-2.5 fill-primary text-primary animate-heartbeat" />
              <span className="font-medium text-foreground/80">{daysUntil}</span> days
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">
            {weddingDate && format(weddingDate, "MMMM d, yyyy")}
            {wedding.venue_name && ` · ${wedding.venue_name}`}
          </p>
          {tasksDueThisWeek > 0 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <Link
                href="/timeline"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline transition-colors"
              >
                <CalendarDays className="h-3 w-3" />
                {tasksDueThisWeek} task{tasksDueThisWeek !== 1 ? "s" : ""} due this week
              </Link>
            </>
          )}
        </div>
      </div>

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
