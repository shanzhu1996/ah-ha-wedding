import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  Users,
  ClipboardList,
  Clock,
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
 * "Next up for you" — concrete suggestions when foundations are missing
 * or a time-sensitive window is open. If neither applies, we render
 * nothing and let the "X tasks due this week" line under the header
 * carry the load. Aspirational nudges (moodboard / music picks in
 * mid-planning) were removed after user feedback — they overlapped
 * with Timeline tasks and added noise to the dashboard.
 *
 * Cap at 3 so the strip stays scannable.
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

  // Timing-pressured nudges — only when the window is actually open.
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

  // No real gap or pressure → render nothing. The "X tasks due this week"
  // line already hangs under the header for active work.
  if (show.length === 0) return null;

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
