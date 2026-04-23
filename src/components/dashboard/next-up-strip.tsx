import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  Users,
  ClipboardList,
  Clock,
  Palette,
  Music,
  CheckCircle,
  CalendarDays,
  MapPin,
} from "lucide-react";

interface NextUpItem {
  key: string;
  label: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Stats {
  vendorCount: number;
  rsvpCounts: { total: number; pending: number };
  upcomingTasks: Array<{ title: string; event_date: string | null }>;
}

interface Props {
  wedding: {
    budget_total: number | null;
    wedding_date: string | null;
    venue_name: string | null;
  };
  stats: Stats;
  daysUntil: number | null;
}

/**
 * "Next up for you" — 1-3 concrete suggestions based on which foundations
 * are still missing or which time-sensitive nudges apply. Falls back to an
 * "on track" callout linking to Timeline when there's nothing to flag.
 *
 * Order is deliberate: foundations (budget/vendors/guests/date/venue) first,
 * then timing-pressured actions (RSVP chase near the wedding date). We cap
 * at 3 so the strip stays scannable.
 */
export function NextUpStrip({ wedding, stats, daysUntil }: Props) {
  const items: NextUpItem[] = [];

  // Foundations — everything downstream needs these.
  if (!wedding.wedding_date) {
    items.push({
      key: "wedding_date",
      label: "Pick your wedding date",
      hint: "The anchor for every timeline and reminder.",
      href: "/settings",
      icon: CalendarDays,
    });
  }
  if (!wedding.budget_total) {
    items.push({
      key: "budget",
      label: "Set your budget",
      hint: "It's fine to estimate — you can change it anytime.",
      href: "/budget",
      icon: Wallet,
    });
  }
  if (stats.vendorCount === 0) {
    items.push({
      key: "vendors",
      label: "Add your first vendor",
      hint: "Photographer, venue, caterer — start anywhere.",
      href: "/vendors",
      icon: ClipboardList,
    });
  }
  if (stats.rsvpCounts.total === 0) {
    items.push({
      key: "guests",
      label: "Add your guests",
      hint: "Start with immediate family and grow from there.",
      href: "/guests",
      icon: Users,
    });
  }
  if (!wedding.venue_name) {
    items.push({
      key: "venue",
      label: "Name your venue",
      hint: "Where is this happening?",
      href: "/settings",
      icon: MapPin,
    });
  }

  // Once foundations are in, surface vision-setting next
  if (items.length === 0 && stats.vendorCount >= 1 && daysUntil !== null && daysUntil > 120) {
    items.push({
      key: "moodboard",
      label: "Build a moodboard",
      hint: "Pin inspiration so vendors see your vibe in one shot.",
      href: "/moodboard",
      icon: Palette,
    });
  }

  // Timing-pressured nudges — only once foundations are in.
  if (daysUntil !== null) {
    if (daysUntil <= 60 && daysUntil > 7 && stats.rsvpCounts.pending > 10) {
      items.push({
        key: "rsvps",
        label: `Chase ${stats.rsvpCounts.pending} pending RSVPs`,
        hint: "Final headcount drives catering + seating.",
        href: "/guests",
        icon: Users,
      });
    }
    if (daysUntil <= 90 && daysUntil > 30) {
      items.push({
        key: "music",
        label: "Pick your key songs",
        hint: "First dance, processional, parent dance — decide now, tweak later.",
        href: "/music",
        icon: Music,
      });
    }
    if (daysUntil <= 30 && daysUntil > 7) {
      items.push({
        key: "day_of",
        label: "Lock the day-of timeline",
        hint: "Vendors need your ceremony time in writing.",
        href: "/day-of-details",
        icon: Clock,
      });
    }
  }

  const show = items.slice(0, 3);

  // "On track" fallback when nothing is pending.
  if (show.length === 0) {
    const taskCount = stats.upcomingTasks.length;
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            You&apos;re on track.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {taskCount > 0
              ? `${taskCount} upcoming task${taskCount === 1 ? "" : "s"} on your timeline.`
              : "Review your timeline to stay ahead."}
          </p>
        </div>
        <Link
          href="/timeline"
          className="text-xs font-medium text-primary hover:underline shrink-0"
        >
          Review
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
        Next up
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {show.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group bg-card rounded-xl border hover:border-primary/40 p-4 flex items-start gap-3 transition-colors"
          >
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                {item.hint}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
