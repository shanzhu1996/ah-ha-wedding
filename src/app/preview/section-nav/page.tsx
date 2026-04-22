"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Home,
  Users,
  ClipboardList,
  Palette,
  Music,
  CalendarDays,
  Wallet,
  ClipboardCheck,
  CheckSquare,
  LayoutGrid,
  Layout,
  Globe,
  Sparkles,
  BookOpen,
  Package,
  FileText,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tool {
  href: string;
  label: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Mock: pretend the user has visited this tool */
  visited?: boolean;
}

interface Section {
  key: "home" | "people" | "vision" | "plan" | "ready";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  question?: string;
  description?: string;
  tools?: Tool[];
}

const SECTIONS: Section[] = [
  {
    key: "home",
    label: "Home",
    icon: Home,
  },
  {
    key: "people",
    label: "People",
    icon: Users,
    question: "Who's involved?",
    description:
      "Before you plan anything, know two things: who's helping you and who's celebrating with you.",
    tools: [
      { href: "/vendors", label: "Vendors", tagline: "Who's helping you?", icon: Users },
      { href: "/guests", label: "Guests", tagline: "Who's coming?", icon: ClipboardList },
    ],
  },
  {
    key: "vision",
    label: "Vision",
    icon: Palette,
    question: "What's your vision?",
    description:
      "What does it look like, feel like, sound like? Don't worry about logistics yet — just dream.",
    tools: [
      { href: "/moodboard", label: "Moodboard", tagline: "What does it feel like?", icon: Palette, visited: true },
      { href: "/music", label: "Music", tagline: "What does it sound like?", icon: Music, visited: true },
    ],
  },
  {
    key: "plan",
    label: "Plan",
    icon: CalendarDays,
    question: "How does it all come together?",
    description:
      "You have a vision — now make it real. The timeline is your master checklist.",
    tools: [
      { href: "/timeline", label: "Timeline", tagline: "Your planning to-do list", icon: CalendarDays },
      { href: "/budget", label: "Budget", tagline: "Where is the money going?", icon: Wallet },
      { href: "/day-of-details", label: "Day-of", tagline: "Ceremony, reception, photos", icon: ClipboardCheck },
      { href: "/shopping", label: "Shopping", tagline: "What do you need?", icon: CheckSquare },
      { href: "/layout-guide", label: "Layout", tagline: "Where does everything go?", icon: LayoutGrid },
      { href: "/seating", label: "Seating", tagline: "Who sits where?", icon: Layout },
      { href: "/website", label: "Website", tagline: "Where guests find info", icon: Globe },
    ],
  },
  {
    key: "ready",
    label: "Ready",
    icon: Sparkles,
    question: "Is everything ready?",
    description: "Last few weeks. Make sure everyone knows the plan.",
    tools: [
      { href: "/tips", label: "Tips", tagline: "Advice from experience", icon: Sparkles },
      { href: "/booklets", label: "Booklets", tagline: "Brief your vendors", icon: BookOpen },
      { href: "/packing", label: "Packing", tagline: "What goes where?", icon: Package },
      { href: "/handouts", label: "Handouts", tagline: "Brief your party", icon: FileText },
    ],
  },
];

function HomeView({
  onSectionClick,
}: {
  onSectionClick: (key: Section["key"]) => void;
}) {
  return (
    <div className="p-5 space-y-6">
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-heading)] tracking-tight flex items-baseline gap-2 flex-wrap">
          <span>Shan</span>
          <span className="text-primary font-normal italic">&amp;</span>
          <span>Richie</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1 ml-1">
            <Heart className="h-2.5 w-2.5 fill-primary text-primary" />
            <span className="font-medium text-foreground/80">185</span> days
          </span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          October 25, 2026 · Arrow Park
        </p>
      </div>

      <div>
        <h2 className="text-xl font-[family-name:var(--font-heading)] leading-tight max-w-xs">
          Wedding planning is really just answering four questions.
        </h2>
      </div>

      {/* Mini Planning Map with section shortcuts */}
      <div className="space-y-2.5">
        {SECTIONS.filter((s) => s.key !== "home").map((section, i) => {
          const total = section.tools?.length ?? 0;
          const visited = section.tools?.filter((t) => t.visited).length ?? 0;
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              onClick={() => onSectionClick(section.key)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/15 text-primary text-sm font-[family-name:var(--font-heading)] shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{section.question}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {visited}/{total} explored
                </p>
              </div>
              <Icon className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionView({ section }: { section: Section }) {
  const tools = section.tools ?? [];
  const visited = tools.filter((t) => t.visited).length;
  const total = tools.length;
  const allExplored = visited === total;

  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
          Step {SECTIONS.findIndex((s) => s.key === section.key)} of 4
        </p>
        <h1 className="text-2xl font-[family-name:var(--font-heading)] tracking-tight mt-1">
          {section.question}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {section.description}
        </p>

        <span
          className={cn(
            "inline-flex items-center gap-1 mt-3 text-[11px] px-2 py-0.5 rounded-full tabular-nums",
            allExplored
              ? "bg-primary/10 text-primary font-medium"
              : "bg-muted text-muted-foreground/70"
          )}
        >
          {allExplored ? (
            <>
              <Check className="h-3 w-3" strokeWidth={3} />
              All {total} explored
            </>
          ) : (
            <>
              {visited}/{total} explored
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="group relative p-3.5 rounded-xl border border-border hover:border-primary/40 transition-all"
            >
              {tool.visited && (
                <span
                  aria-label="Visited"
                  className="absolute top-2 right-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary"
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
              <div className="flex items-start justify-between mb-2.5">
                <Icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
                <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all -translate-x-1 group-hover:translate-x-0" />
              </div>
              <div>
                <span className="text-sm font-semibold block">{tool.label}</span>
                <span className="text-[11px] text-muted-foreground block mt-0.5 leading-snug">
                  {tool.tagline}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function SectionNavPreviewPage() {
  const [activeKey, setActiveKey] = useState<Section["key"]>("home");
  const active = SECTIONS.find((s) => s.key === activeKey)!;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      {/* Desktop header / context */}
      <div className="max-w-2xl mx-auto mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-[family-name:var(--font-heading)] tracking-tight mb-1">
          Section-first nav prototype
        </h1>
        <p className="text-sm text-muted-foreground">
          Click the 5 tabs below. Section tabs open a hub showing that
          question&rsquo;s tools + progress. Real tool links (Moodboard, Timeline
          etc.) are live — tap to jump to the real app.
        </p>
      </div>

      {/* Phone frame — mobile-sized viewport regardless of device */}
      <div className="max-w-[375px] mx-auto">
        <div className="relative bg-background rounded-[2rem] border-[10px] border-foreground/80 shadow-2xl overflow-hidden">
          {/* Top bar (mock) — logo taps back to Home */}
          <header className="border-b bg-card">
            <div className="flex items-center justify-between h-12 px-4">
              <button
                onClick={() => setActiveKey("home")}
                className="flex items-center gap-1.5 text-foreground"
                aria-label="Home"
              >
                <Heart className="h-4 w-4 text-primary fill-primary" />
                <span className="text-sm font-bold font-[family-name:var(--font-heading)]">
                  Ah-Ha!
                </span>
              </button>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium tabular-nums">
                <Heart className="h-2.5 w-2.5 fill-primary text-primary" />
                185 days
              </span>
            </div>
          </header>

          {/* Content */}
          <div className="min-h-[560px] max-h-[640px] overflow-y-auto">
            {activeKey === "home" ? (
              <HomeView onSectionClick={setActiveKey} />
            ) : (
              <SectionView section={active} />
            )}
          </div>

          {/* Bottom tab bar — 5 section tabs */}
          <nav className="border-t bg-card">
            <div className="flex items-center justify-around h-16">
              {SECTIONS.map((section) => {
                const isActive = section.key === activeKey;
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveKey(section.key)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[11px] transition-colors",
                      isActive
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Notes below */}
        <div className="mt-6 p-4 rounded-lg border border-border/60 bg-background text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">What this changes</p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            <li>
              Bottom tabs are now <strong>journey sections</strong> instead of
              specific tools
            </li>
            <li>
              Each section tab opens a <strong>hub page</strong> with the
              question, description, progress + tool cards
            </li>
            <li>
              Muscle memory cost: Timeline / Budget / Day-of are now 2-tap
              (Plan → tool)
            </li>
            <li>
              Narrative win: the 4-question framework is the primary nav —
              not a Dashboard afterthought
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
