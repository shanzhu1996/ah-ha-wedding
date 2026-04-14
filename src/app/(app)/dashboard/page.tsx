import { redirect } from "next/navigation";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Heart,
  Layout,
  Music,
  Package,
  Users,
  Wallet,
  BookOpen,
  Share2,
  Globe,
  Sparkles,
  PartyPopper,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getCurrentWedding, getWeddingStats } from "@/lib/supabase/queries";
import { GettingStartedGuide } from "@/components/layout/getting-started-guide";

const moduleCards = [
  { href: "/vendors", icon: Users, label: "Vendors", description: "Manage vendor contacts and contracts" },
  { href: "/guests", icon: ClipboardList, label: "Guests", description: "Guest list and RSVP tracking" },
  { href: "/timeline", icon: CalendarDays, label: "Timeline", description: "Pre-wedding and day-of schedule" },
  { href: "/shopping", icon: CheckSquare, label: "Shopping", description: "Items to buy and rent" },
  { href: "/budget", icon: Wallet, label: "Budget", description: "Track spending and payments" },
  { href: "/seating", icon: Layout, label: "Seating", description: "Drag-and-drop seating chart" },
  { href: "/music", icon: Music, label: "Music", description: "Plan ceremony and reception music" },
  { href: "/tips", icon: Sparkles, label: "Tips", description: "Budget hacks and pro tips" },
  { href: "/booklets", icon: BookOpen, label: "Booklets", description: "Generate vendor booklets" },
  { href: "/packing", icon: Package, label: "Packing", description: "Organize packing boxes" },
  { href: "/share", icon: Share2, label: "Share", description: "Share with wedding party" },
  { href: "/website", icon: Globe, label: "Website", description: "Build your wedding website" },
  { href: "/postwedding", icon: PartyPopper, label: "Post-Wedding", description: "Thank-yous and name change" },
];

export default async function DashboardPage() {
  const wedding = await getCurrentWedding();
  if (!wedding) return redirect("/onboarding");

  const stats = await getWeddingStats(wedding.id);

  const weddingDate = wedding.wedding_date
    ? new Date(wedding.wedding_date + "T00:00:00")
    : null;
  const daysUntil = weddingDate
    ? differenceInDays(weddingDate, new Date())
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
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

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Guests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.rsvpCounts.confirmed}
              <span className="text-base text-muted-foreground font-normal">
                {" "}
                / {stats.rsvpCounts.total}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.rsvpCounts.pending} pending ·{" "}
              {stats.rsvpCounts.declined} declined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vendors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vendorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              vendors tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Shopping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shoppingProgress}%</div>
            <Progress value={stats.shoppingProgress} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.budgetSpent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {wedding.budget_total
                ? `of $${Number(wedding.budget_total).toLocaleString()} budget`
                : "no budget set"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      {stats.upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcomingTasks.map((task) => (
                <div
                  key={task.title + task.event_date}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{task.title}</span>
                  {task.event_date && (
                    <Badge variant="outline" className="text-xs">
                      {format(
                        new Date(task.event_date + "T00:00:00"),
                        "MMM d"
                      )}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Getting Started Guide (new users) */}
      {stats.vendorCount === 0 &&
        stats.rsvpCounts.total === 0 &&
        stats.timelineEventCount === 0 && (
          <GettingStartedGuide
            vendorCount={stats.vendorCount}
            guestCount={stats.rsvpCounts.total}
            timelineEventCount={stats.timelineEventCount}
            shoppingItemCount={stats.shoppingItemCount}
          />
        )}

      {/* Module Grid */}
      <div id="planning-tools">
        <h2 className="text-lg font-semibold mb-4">Planning Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {moduleCards.map((module) => (
            <Link key={module.href} href={module.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <module.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{module.label}</h3>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {module.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
