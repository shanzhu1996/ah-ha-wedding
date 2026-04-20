import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Layout,
  LayoutGrid,
  Music,
  Package,
  Palette,
  Users,
  Wallet,
  BookOpen,
  FileText,
  Globe,
  Heart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const featureGroups = [
  {
    title: "The People",
    tagline: "Who's coming, who's helping.",
    features: [
      {
        icon: Users,
        title: "Vendors",
        description:
          "Contacts, contracts, payment schedule, and notes for every vendor.",
      },
      {
        icon: ClipboardList,
        title: "Guests",
        description:
          "Import your list, track RSVPs, meals, dietary needs, and wedding-party roles.",
      },
    ],
  },
  {
    title: "Your Vision",
    tagline: "What it looks and sounds like.",
    features: [
      {
        icon: Palette,
        title: "Moodboard",
        description:
          "Pin inspiration, lock in your palette, and share the vibe with vendors.",
      },
      {
        icon: Music,
        title: "Music",
        description:
          "Organize songs by ceremony, cocktail hour, and reception phases.",
      },
    ],
  },
  {
    title: "Making It Happen",
    tagline: "Every moving piece, one plan.",
    features: [
      {
        icon: CalendarDays,
        title: "Timeline",
        description:
          "Auto-generated pre-wedding checklist, plus a day-of schedule you fill in moment by moment.",
      },
      {
        icon: Wallet,
        title: "Budget",
        description:
          "Live dashboard — budget vs spent, per-vendor payment schedule, and deposit tracking.",
      },
      {
        icon: ClipboardCheck,
        title: "Day-of Details",
        description:
          "Capture every ceremony, cocktail, and reception detail before the big day.",
      },
      {
        icon: CheckSquare,
        title: "Shopping",
        description:
          "Categorized items with search suggestions — nothing forgotten.",
      },
      {
        icon: LayoutGrid,
        title: "Layout Guide",
        description:
          "Plan welcome, ceremony, cocktail, reception, and vendor-station layouts.",
      },
      {
        icon: Layout,
        title: "Seating",
        description:
          "Drag-and-drop guests between tables with a visual floor plan.",
      },
      {
        icon: Globe,
        title: "Website",
        description:
          "Beautiful site guests bookmark — venue, schedule, dress code, registry, FAQs, and travel info.",
      },
    ],
  },
  {
    title: "Wrapping Up",
    tagline: "Final week, zero surprises.",
    features: [
      {
        icon: Sparkles,
        title: "Tips",
        description:
          "Budget hacks, emergency kit, and what-if scenarios from real weddings.",
      },
      {
        icon: BookOpen,
        title: "Booklets",
        description:
          "One-click PDFs with timeline and details for each vendor.",
      },
      {
        icon: Package,
        title: "Packing",
        description:
          "Organize items into labeled boxes with a packing manifest.",
      },
      {
        icon: FileText,
        title: "Handouts",
        description:
          "One info sheet per wedding-party member — dress code, cues, contacts.",
      },
    ],
  },
];

const totalTools = featureGroups.reduce((n, g) => n + g.features.length, 0);

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
            <Heart className="h-3.5 w-3.5 fill-primary" />
            Built by someone who survived their own wedding
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold font-[family-name:var(--font-heading)] tracking-tight leading-tight mb-6">
            Wedding planning is simpler
            <br />
            <span className="text-primary">than they said.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            From the first vendor call to the last dance — budget, vendors,
            timeline, seating, handouts, and every detail you didn&apos;t
            know you needed. One place, no more spreadsheets.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login?signup=true">
              <Button size="lg" className="text-base px-8 gap-2">
                Start Planning
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28 bg-muted/50 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-4">
              Everything you actually need
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {featureGroups.length} sections. {totalTools} tools. Zero
              spreadsheets.
            </p>
          </div>
          <div className="space-y-14">
            {featureGroups.map((group) => (
              <div key={group.title}>
                <div className="mb-6 flex items-baseline gap-3 border-b pb-3">
                  <h3 className="text-xl sm:text-2xl font-semibold font-[family-name:var(--font-heading)]">
                    {group.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {group.tagline}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.features.map((feature) => (
                    <div
                      key={feature.title}
                      className="bg-card rounded-xl border p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <feature.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h4 className="font-semibold text-lg mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
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
              Get Started
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
