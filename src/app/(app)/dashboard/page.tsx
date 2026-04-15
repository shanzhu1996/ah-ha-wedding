import { redirect } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays, differenceInCalendarDays, isAfter, addDays } from "date-fns";
import { Heart, ArrowRight, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentWedding, getWeddingStats, getCompletedFeatures } from "@/lib/supabase/queries";
import { PlanningMap } from "@/components/layout/planning-map";

// Smart "next step" recommendations
const NEXT_STEPS: {
  key: string;
  title: string;
  description: string;
  href: string;
}[] = [
  {
    key: "vendors",
    title: "Add your vendors",
    description:
      "Save their contact info so everything's in one place. You'll need this for booklets and coordination later.",
    href: "/vendors",
  },
  {
    key: "guests",
    title: "Start your guest list",
    description:
      "You'll need this for invitations, seating, and your caterer's headcount.",
    href: "/guests",
  },
  {
    key: "moodboard",
    title: "Create your moodboard",
    description:
      "Collect visual inspiration and share it with your florist, photographer, and stationer.",
    href: "/moodboard",
  },
  {
    key: "timeline",
    title: "Generate your timeline",
    description:
      "We'll build a smart checklist based on your wedding date — what to do and when.",
    href: "/timeline",
  },
  {
    key: "shopping",
    title: "Check your shopping list",
    description:
      "84 items organized by category, ready to customize. Don't forget the emergency kit!",
    href: "/shopping",
  },
  {
    key: "music",
    title: "Plan your music",
    description:
      "Your DJ needs a must-play list, a do-not-play list, and songs for every moment.",
    href: "/music",
  },
  {
    key: "seating",
    title: "Start your seating chart",
    description:
      "The puzzle every couple dreads — but it's easier when you do it early.",
    href: "/seating",
  },
];

function getNextStep(completedFeatures: Set<string>) {
  for (const step of NEXT_STEPS) {
    if (!completedFeatures.has(step.key)) {
      return step;
    }
  }
  return {
    key: "done",
    title: "Looking great!",
    description:
      "You've touched every part of your plan. Review your vendor booklets or finalize your packing list.",
    href: "/booklets",
  };
}

export default async function DashboardPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) return redirect("/onboarding");

  const [stats, completedFeatures] = await Promise.all([
    getWeddingStats(wedding.id),
    getCompletedFeatures(wedding.id),
  ]);

  const weddingDate = wedding.wedding_date
    ? new Date(wedding.wedding_date + "T00:00:00")
    : null;
  const daysUntil = weddingDate
    ? differenceInDays(weddingDate, new Date())
    : null;

  const nextStep = getNextStep(completedFeatures);

  // Count tasks due this week
  const today = new Date();
  const oneWeekOut = addDays(today, 7);
  const tasksDueThisWeek = (stats.upcomingTasks || []).filter((t) => {
    if (!t.event_date) return false;
    const d = new Date(t.event_date + "T00:00:00");
    return !isAfter(d, oneWeekOut);
  }).length;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div>
        <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)]">
          {wedding.partner1_name} & {wedding.partner2_name}
        </h1>
        <div className="flex items-center gap-3 mt-2 text-muted-foreground">
          {weddingDate && (
            <span>{format(weddingDate, "MMMM d, yyyy")}</span>
          )}
          {wedding.venue_name && (
            <>
              <span>·</span>
              <span>{wedding.venue_name}</span>
            </>
          )}
          {daysUntil !== null && daysUntil > 0 && (
            <>
              <span>·</span>
              <Badge variant="secondary" className="gap-1">
                <Heart className="h-3 w-3 fill-primary text-primary animate-heartbeat" />
                {daysUntil} days to go
              </Badge>
            </>
          )}
        </div>
        {daysUntil !== null && (
          <p className="text-sm italic text-muted-foreground mt-1">
            {daysUntil > 365
              ? "You've got plenty of time \u2014 enjoy the journey!"
              : daysUntil >= 180
              ? "The countdown is on! Let's make it magical."
              : daysUntil >= 60
              ? "Things are getting real \u2014 you've got this!"
              : daysUntil >= 30
              ? "Almost there! The best day is just around the corner."
              : daysUntil >= 7
              ? "So close! Take a deep breath and enjoy every moment."
              : daysUntil >= 0
              ? "This is it! Your dream day is here."
              : "Congratulations! Hope it was everything you dreamed of."}
          </p>
        )}
      </div>

      {/* Warm intro */}
      <div className="space-y-2">
        <p className="text-foreground leading-relaxed">
          Wedding planning is simpler than it looks. It&apos;s really just four stages: <strong>set up the basics</strong> (who&apos;s helping and who&apos;s coming), <strong>define your vibe</strong> (what it looks, sounds, and feels like), <strong>handle the money and shopping</strong>, and <strong>pull it all together</strong> in the final weeks.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Follow the steps below at your own pace. You don&apos;t have to do everything at once — just start at the top and work your way down.
        </p>
      </div>

      {/* Tasks due this week — one line */}
      {tasksDueThisWeek > 0 && (
        <Link
          href="/timeline"
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-200 transition-colors group"
        >
          <CalendarDays className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800 flex-1">
            You have <span className="font-semibold">{tasksDueThisWeek} task{tasksDueThisWeek !== 1 ? "s" : ""}</span> due this week
          </span>
          <ArrowRight className="h-4 w-4 text-amber-400 group-hover:text-amber-600 transition-colors" />
        </Link>
      )}

      {/* Visual Planning Map */}
      <PlanningMap weddingDate={wedding.wedding_date} />

      {/* Next Step Card */}
      <div className="rounded-xl border-2 border-primary/15 bg-primary/[0.02] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
              Next up
            </p>
            <h3 className="text-lg font-semibold font-[family-name:var(--font-heading)]">
              {nextStep.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              {nextStep.description}
            </p>
          </div>
          <Link href={nextStep.href}>
            <Button className="gap-2 shrink-0">
              Go
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
