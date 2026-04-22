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
import { PreviewCarousel } from "./preview-carousel";

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
          "Pre-wedding checklist plus a moment-by-moment day-of schedule.",
      },
      {
        icon: Wallet,
        title: "Budget",
        description:
          "Budget vs spent, per-vendor schedule, and deposit tracking.",
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
          "Venue, schedule, dress code, registry, and FAQs — one site guests bookmark.",
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
      <section className="sm:min-h-[85vh] flex items-center py-14 sm:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-6">
            <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-primary" />
            Built by someone who survived their own wedding
          </div>
          <h1 className="text-4xl sm:text-7xl font-bold font-[family-name:var(--font-heading)] tracking-tight leading-tight mb-6">
            Wedding planning is simpler
            <br />
            <span className="text-primary">than they said.</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            From the first vendor call to the last dance —
            <br className="hidden sm:block" />
            everything they forgot to mention, we didn&apos;t.
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

      {/* Preview Showcase — editorial proof of real printed + mobile outputs */}
      <section className="py-20 sm:py-28 px-4 border-y bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <p className="text-xs font-semibold text-primary uppercase tracking-[0.2em] mb-4">
              Real outputs · not just a dashboard
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-4 tracking-tight">
              From your first checklist
              <br />
              to your last dance.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              A 51-step plan from today to the wedding, a booklet tailored to
              each vendor, and a personalized handout for everyone helping you
              pull it off.
            </p>
          </div>

          <PreviewCarousel>
            {/* Pre-wedding Timeline mockup — auto-seeded checklist from today until the wedding */}
            <div className="flex flex-col items-center w-[82vw] shrink-0 md:w-auto snap-start">
              <div className="aspect-[3/4] w-full rounded-md border bg-white shadow-md p-5 flex flex-col relative">
                <div className="border-b pb-3 mb-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
                    Your Pre-Wedding Timeline
                  </p>
                  <p className="font-[family-name:var(--font-heading)] text-base leading-tight">
                    From today until April 2026
                  </p>
                </div>
                <div className="space-y-2 text-xs flex-1">
                  <div className="flex gap-3 items-start">
                    <span className="text-foreground/40 w-14 shrink-0 text-[10px] uppercase tracking-wider pt-0.5">
                      12 mo
                    </span>
                    <span className="flex items-start gap-2 text-foreground/50 line-through">
                      <span className="text-primary shrink-0 no-underline">
                        ✓
                      </span>
                      Set your wedding budget
                    </span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-foreground/40 w-14 shrink-0 text-[10px] uppercase tracking-wider pt-0.5">
                      10 mo
                    </span>
                    <span className="flex items-start gap-2 text-foreground/50 line-through">
                      <span className="text-primary shrink-0 no-underline">
                        ✓
                      </span>
                      Finalize guest list
                    </span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-foreground/40 w-14 shrink-0 text-[10px] uppercase tracking-wider pt-0.5">
                      8 mo
                    </span>
                    <span className="flex items-start gap-2 text-foreground/50 line-through">
                      <span className="text-primary shrink-0 no-underline">
                        ✓
                      </span>
                      Send save-the-dates
                    </span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-primary w-14 shrink-0 text-[10px] uppercase tracking-wider pt-0.5 font-semibold">
                      6 mo
                    </span>
                    <span className="flex items-start gap-2 text-foreground/85 font-medium">
                      <span className="text-primary/40 shrink-0">○</span>
                      Book wedding-party attire
                    </span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-foreground/40 w-14 shrink-0 text-[10px] uppercase tracking-wider pt-0.5">
                      4 mo
                    </span>
                    <span className="flex items-start gap-2 text-foreground/70">
                      <span className="text-foreground/25 shrink-0">○</span>
                      Brainstorm your vows
                    </span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="text-foreground/40 w-14 shrink-0 text-[10px] uppercase tracking-wider pt-0.5">
                      21 d
                    </span>
                    <span className="flex items-start gap-2 text-foreground/70">
                      <span className="text-foreground/25 shrink-0">○</span>
                      Final headcount to caterer
                    </span>
                  </div>
                  <div className="flex gap-3 items-start opacity-60">
                    <span className="text-foreground/40 w-14 shrink-0 text-[10px] uppercase tracking-wider pt-0.5">
                      —
                    </span>
                    <span className="text-foreground/60">+ 45 more steps</span>
                  </div>
                </div>
                <div className="text-[9px] text-foreground/40 text-center border-t pt-2 mt-3 tracking-wider">
                  51 items · auto-seeded once
                </div>
              </div>
              <div className="mt-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm">Pre-Wedding Checklist</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Every step from budget to rehearsal
                </p>
              </div>
            </div>

            {/* Vendor Booklet mockup — DJ copy shown; caption + page marker convey per-vendor variants */}
            <div className="flex flex-col items-center w-[82vw] shrink-0 md:w-auto snap-start">
              <div className="aspect-[3/4] w-full rounded-md border bg-gradient-to-br from-[#F5EFE4] to-[#EDE4D3] shadow-md p-5 flex flex-col relative">
                <div className="border-b border-foreground/15 pb-3 mb-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
                    For the DJ
                  </p>
                  <p className="font-[family-name:var(--font-heading)] text-base leading-tight">
                    Sarah &amp; Michael&rsquo;s Wedding
                  </p>
                </div>
                <div className="flex-1 flex flex-col text-xs">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-foreground/40 font-semibold mb-1.5">
                    Key Reception Moments
                  </p>
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-[10px] text-primary font-semibold leading-tight">
                        First Dance
                      </p>
                      <p className="text-foreground/70 leading-snug text-[11px]">
                        <em>Perfect</em> · Ed Sheeran
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-primary font-semibold leading-tight">
                        Parent Dance
                      </p>
                      <p className="text-foreground/70 leading-snug text-[11px]">
                        My Girl · The Temptations
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-primary font-semibold leading-tight">
                        Cake Cutting
                      </p>
                      <p className="text-foreground/70 leading-snug text-[11px]">
                        Sugar · Maroon 5
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-primary font-semibold leading-tight">
                        Last Dance
                      </p>
                      <p className="text-foreground/70 leading-snug text-[11px]">
                        <em>At Last</em> · Etta James
                      </p>
                    </div>
                    <div className="opacity-60 pt-0.5">
                      <p className="text-[11px] text-foreground/60">
                        + phase playlists · do-not-play list
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-foreground/40 text-center border-t border-foreground/15 pt-2 mt-3 tracking-wider">
                  1 of 7 · Tailored per vendor
                </div>
              </div>
              <div className="mt-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm">Vendor Booklets</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  DJ gets the playlist · photographer gets the shot list
                </p>
              </div>
            </div>

            {/* Handouts mockup — one per wedding-party member, with tasks + cues */}
            <div className="flex flex-col items-center w-[82vw] shrink-0 md:w-auto snap-start">
              <div className="aspect-[3/4] w-full rounded-md border bg-white shadow-md p-5 flex flex-col relative">
                <div className="border-b pb-3 mb-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">
                    For the Maid of Honor
                  </p>
                  <p className="font-[family-name:var(--font-heading)] text-lg leading-tight">
                    Jessica Chen
                  </p>
                </div>
                <div className="flex-1 flex flex-col text-xs">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-foreground/40 font-semibold mb-1.5">
                    Your Tasks
                  </p>
                  <div className="space-y-1 mb-3">
                    <div className="flex gap-2">
                      <span className="text-primary/70 shrink-0">·</span>
                      <span className="text-foreground/75">
                        Hold the rings until exchange
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-primary/70 shrink-0">·</span>
                      <span className="text-foreground/75">
                        Bustle dress after ceremony
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-primary/70 shrink-0">·</span>
                      <span className="text-foreground/75">
                        3-min toast at 18:30
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.18em] text-foreground/40 font-semibold mb-1.5">
                    Your Cues
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex gap-3">
                      <span className="text-primary font-semibold w-10 shrink-0">
                        9:00
                      </span>
                      <span className="text-foreground/70">
                        Hair &amp; makeup
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-primary font-semibold w-10 shrink-0">
                        11:30
                      </span>
                      <span className="text-foreground/70">First look</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-primary font-semibold w-10 shrink-0">
                        14:00
                      </span>
                      <span className="text-foreground/70">
                        Ceremony walk-in
                      </span>
                    </div>
                    <div className="flex gap-3 opacity-50">
                      <span className="text-foreground/40 w-10 shrink-0">—</span>
                      <span className="text-foreground/60">
                        + more moments
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] text-foreground/40 text-center border-t pt-2 mt-3 tracking-wider">
                  Page 1 · Personalized
                </div>
              </div>
              <div className="mt-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="font-semibold text-sm">Guest Handouts</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tasks + cues · one per party member
                </p>
              </div>
            </div>
          </PreviewCarousel>
        </div>
      </section>

      {/* Social Proof — beta tester quote + honest founder note */}
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <blockquote>
            <p className="font-[family-name:var(--font-heading)] text-xl sm:text-2xl leading-relaxed text-foreground/90 mb-5">
              &ldquo;I really wish I&rsquo;d had this when I planned my
              wedding&nbsp;— so detailed and considerate.&rdquo;
            </p>
            <footer className="font-[family-name:var(--font-heading)] italic text-base sm:text-lg text-foreground/55 mt-5">
              — Lily
            </footer>
          </blockquote>
          <p className="mt-10 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
            From one beloved couple — to every couple planning theirs.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-20 bg-muted/50 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-4">
              Everything you actually need
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Not a spreadsheet. Not a group chat. Just one plan.
            </p>
          </div>
          <div className="space-y-10">
            {/* First two groups (The People + Your Vision) — paired side-by-side on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-10">
              {featureGroups.slice(0, 2).map((group) => (
                <div key={group.title}>
                  <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-baseline sm:gap-3 border-b pb-3">
                    <h3 className="text-lg sm:text-xl font-semibold font-[family-name:var(--font-heading)]">
                      {group.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.tagline}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {group.features.map((feature) => (
                      <div
                        key={feature.title}
                        className="bg-card rounded-lg border p-4 hover:shadow-sm transition-shadow flex items-center gap-3 sm:block"
                      >
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 sm:mb-3">
                          <feature.icon className="h-4 w-4 text-primary" />
                        </div>
                        <h4 className="font-semibold text-sm sm:mb-1">
                          {feature.title}
                        </h4>
                        <p className="hidden sm:block text-muted-foreground text-xs leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Larger groups — full-width 4-col grid */}
            {featureGroups.slice(2).map((group) => (
              <div key={group.title}>
                <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-baseline sm:gap-3 border-b pb-3">
                  <h3 className="text-lg sm:text-xl font-semibold font-[family-name:var(--font-heading)]">
                    {group.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {group.tagline}
                  </p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {group.features.map((feature) => (
                    <div
                      key={feature.title}
                      className="bg-card rounded-lg border p-4 hover:shadow-sm transition-shadow flex items-center gap-3 sm:block"
                    >
                      <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 sm:mb-3">
                        <feature.icon className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="font-semibold text-sm sm:mb-1">
                        {feature.title}
                      </h4>
                      <p className="hidden sm:block text-muted-foreground text-xs leading-relaxed">
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
      <section className="py-14 sm:py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] mb-4">
            Less planning. More wedding.
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Everything you need — plus everything no one told you you&rsquo;d
            need.
          </p>
          <Link href="/login?signup=true">
            <Button size="lg" className="text-base px-8 gap-2">
              Start Planning
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
          <p>Fewer spreadsheets. More memories.</p>
        </div>
      </footer>
    </div>
  );
}
