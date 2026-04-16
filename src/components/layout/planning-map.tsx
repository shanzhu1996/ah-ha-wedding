"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Users,
  ClipboardList,
  Palette,
  CalendarDays,
  Music,
  Layout,
  Globe,
  Wallet,
  CheckSquare,
  Sparkles,
  BookOpen,
  Package,
  Share2,
  Heart,
  PartyPopper,
  ArrowRight,
  LayoutGrid,
  ClipboardCheck,
} from "lucide-react";

interface Tool {
  label: string;
  tagline: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}

interface Step {
  number: number;
  question: string;
  description: string;
  tools: Tool[];
}

const STEPS: Step[] = [
  {
    number: 1,
    question: "Who's involved?",
    description:
      "Before you plan anything, know two things: who's helping you and who's celebrating with you.",
    tools: [
      { label: "Vendors", tagline: "Who's helping you?", href: "/vendors", icon: Users },
      { label: "Guests", tagline: "Who's coming?", href: "/guests", icon: ClipboardList },
    ],
  },
  {
    number: 2,
    question: "What's your vision?",
    description:
      "What does it look like, feel like, sound like? Don't worry about logistics yet — just dream.",
    tools: [
      { label: "Moodboard", tagline: "What does it feel like?", href: "/moodboard", icon: Palette },
      { label: "Music", tagline: "What does it sound like?", href: "/music", icon: Music },
    ],
  },
  {
    number: 3,
    question: "How does it all come together?",
    description:
      "You have a vision — now make it real. The timeline is your master checklist.",
    tools: [
      { label: "Timeline", tagline: "Your planning to-do list", href: "/timeline", icon: CalendarDays },
      { label: "Budget", tagline: "Where is the money going?", href: "/budget", icon: Wallet },
      { label: "Day-of Details", tagline: "Ceremony, reception, photos & logistics", href: "/day-of-details", icon: ClipboardCheck, highlight: true },
      { label: "Shopping", tagline: "What do you need?", href: "/shopping", icon: CheckSquare },
      { label: "Layout", tagline: "Where does everything go?", href: "/layout-guide", icon: LayoutGrid },
      { label: "Seating", tagline: "Who sits where?", href: "/seating", icon: Layout },
      { label: "Website", tagline: "Where do guests find info?", href: "/website", icon: Globe },
    ],
  },
  {
    number: 4,
    question: "Is everything ready?",
    description:
      "Last few weeks. Make sure everyone knows the plan.",
    tools: [
      { label: "Tips", tagline: "Advice from experience", href: "/tips", icon: Sparkles },
      { label: "Booklets", tagline: "Brief your vendors", href: "/booklets", icon: BookOpen },
      { label: "Packing", tagline: "What goes where?", href: "/packing", icon: Package },
      { label: "Share", tagline: "Brief your party", href: "/share", icon: Share2 },
    ],
  },
];

interface PlanningMapProps {
  weddingDate: string | null;
  completedFeatures?: string[];
}

function StepSection({
  step,
  index,
  isActive,
  onActivate,
  isLast,
}: {
  step: Step;
  index: number;
  isActive: boolean;
  onActivate: () => void;
  isLast: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative flex gap-5 sm:gap-8 group/step"
      onMouseEnter={onActivate}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`,
      }}
    >
      {/* Left column: number + vertical line */}
      <div className="flex flex-col items-center shrink-0">
        {/* Step number circle */}
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-[family-name:var(--font-heading)] shrink-0 transition-all duration-300 ${
            isActive
              ? "bg-primary text-primary-foreground shadow-[0_2px_16px_rgba(196,168,130,0.3)]"
              : "bg-primary/15 text-primary"
          }`}
        >
          {step.number}
        </div>
        {/* Vertical connector line */}
        {!isLast && (
          <div className="w-px flex-1 mt-2 min-h-[2rem] bg-primary/25" />
        )}
      </div>

      {/* Right column: content */}
      <div className="pb-10 min-w-0 flex-1">
        {/* Question */}
        <h3 className="text-xl sm:text-2xl font-[family-name:var(--font-heading)] tracking-tight mb-2 text-foreground">
          {step.question}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-lg">
          {step.description}
        </p>

        {/* Tool cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {step.tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`group relative p-3.5 rounded-xl border transition-all duration-300 hover:shadow-[0_4px_20px_rgba(196,168,130,0.12)] ${
                  tool.highlight
                    ? "border-primary/40 bg-primary/[0.04] hover:border-primary shadow-[0_2px_12px_rgba(196,168,130,0.12)]"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="relative flex items-start justify-between mb-2.5">
                  <Icon className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors duration-300" />
                  <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-300 -translate-x-1 group-hover:translate-x-0" />
                </div>
                <div className="relative">
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
    </div>
  );
}

export function PlanningMap({ weddingDate }: PlanningMapProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [endVisible, setEndVisible] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEndVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const weddingDateFormatted = weddingDate
    ? new Date(weddingDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setActiveStep(null)}
    >
      {STEPS.map((step, i) => (
        <StepSection
          key={step.number}
          step={step}
          index={i}
          isActive={activeStep === i}
          onActivate={() => setActiveStep(i)}
          isLast={i === STEPS.length - 1}
        />
      ))}

      {/* Wedding Day */}
      <div
        ref={endRef}
        className="relative flex gap-5 sm:gap-8"
        style={{
          opacity: endVisible ? 1 : 0,
          transform: endVisible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s",
        }}
      >
        {/* Left column: heart icon */}
        <div className="flex flex-col items-center shrink-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-primary/15 shrink-0 shadow-[0_2px_12px_rgba(196,168,130,0.15)]">
            <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-primary fill-primary" />
          </div>
        </div>

        {/* Right column */}
        <div className="pt-1.5 pb-8">
          <h3 className="text-xl sm:text-2xl font-[family-name:var(--font-heading)] text-primary">
            Wedding Day
          </h3>
          {weddingDateFormatted && (
            <p className="text-sm font-medium text-muted-foreground mt-0.5">
              {weddingDateFormatted}
            </p>
          )}
          <Link
            href="/postwedding"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <PartyPopper className="h-3 w-3" />
            Then: Post-Wedding
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
