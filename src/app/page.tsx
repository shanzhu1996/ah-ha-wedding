import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Layout,
  Music,
  Package,
  Users,
  Wallet,
  BookOpen,
  Share2,
  Globe,
  Heart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "Vendor Hub",
    description: "All your vendor contacts, contracts, and schedules in one place.",
  },
  {
    icon: CalendarDays,
    title: "Smart Timeline",
    description: "Auto-generated pre-wedding checklist and hour-by-hour day-of schedule.",
  },
  {
    icon: CheckSquare,
    title: "Shopping Lists",
    description: "Categorized items with search suggestions — nothing forgotten.",
  },
  {
    icon: Wallet,
    title: "Budget Tracker",
    description: "Live dashboard with payment calendar and vendor tip calculator.",
  },
  {
    icon: Layout,
    title: "Seating Chart",
    description: "Drag-and-drop guests between tables with a visual floor plan.",
  },
  {
    icon: ClipboardList,
    title: "Guest Management",
    description: "Import your list, track RSVPs, meal choices, and dietary needs.",
  },
  {
    icon: Music,
    title: "Music Planner",
    description: "Organize songs by ceremony, cocktail hour, and reception phases.",
  },
  {
    icon: Sparkles,
    title: "Pro Tips",
    description: "Budget hacks, emergency kit, and what-if scenarios from real weddings.",
  },
  {
    icon: BookOpen,
    title: "Vendor Booklets",
    description: "One-click PDF with timeline and details for each vendor.",
  },
  {
    icon: Package,
    title: "Packing Lists",
    description: "Organize items into labeled boxes with a packing manifest.",
  },
  {
    icon: Share2,
    title: "Party Sharing",
    description: "Shareable pages with roles and timelines for your wedding party.",
  },
  {
    icon: Globe,
    title: "Wedding Website",
    description: "Beautiful site with built-in RSVP form — no coding needed.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary fill-primary" />
            <span className="text-xl font-bold font-[family-name:var(--font-heading)]">
              Ah-Ha!
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/login?signup=true">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-20 sm:py-32 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered wedding logistics
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold font-[family-name:var(--font-heading)] tracking-tight leading-tight mb-6">
            Vendors booked.
            <br />
            <span className="text-primary">Now plan the rest.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Ah-Ha! picks up where vendor booking ends. Timelines, seating
            charts, shopping lists, vendor booklets, and every detail you
            didn&apos;t know you needed — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?signup=true">
              <Button size="lg" className="text-base px-8 gap-2">
                Start Planning Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Free to use. Premium features available.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28 bg-muted/50 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-4">
              Everything after &ldquo;I booked it&rdquo;
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              13 tools that turn wedding chaos into a plan. Use them all or just
              the ones you need.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card rounded-xl border p-6 hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Heart className="h-10 w-10 text-primary fill-primary mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-4">
            Ready to plan your dream wedding?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join couples who turned overwhelming logistics into organized joy.
          </p>
          <Link href="/login?signup=true">
            <Button size="lg" className="text-base px-8 gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary fill-primary" />
            <span>Ah-Ha! Wedding Planner</span>
          </div>
          <p>Made with love by someone who survived their own wedding planning.</p>
        </div>
      </footer>
    </div>
  );
}
