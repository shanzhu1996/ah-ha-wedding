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
} from "lucide-react";

interface MapNode {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MapStep {
  number: number;
  title: string;
  description: string;
  nodes: MapNode[];
  accent: string;
  dotColor: string;
}

const STEPS: MapStep[] = [
  {
    number: 1,
    title: "Get Started",
    description:
      "Set up the basics — who's helping you on the big day and who's celebrating with you.",
    nodes: [
      { key: "vendors", label: "Vendors", href: "/vendors", icon: Users },
      { key: "guests", label: "Guests", href: "/guests", icon: ClipboardList },
    ],
    accent: "from-rose-100 to-rose-50",
    dotColor: "bg-rose-400",
  },
  {
    number: 2,
    title: "Set the Vibe",
    description:
      "Define what your wedding looks, sounds, and feels like. This is the creative part — collect inspiration and plan the details.",
    nodes: [
      { key: "moodboard", label: "Moodboard", href: "/moodboard", icon: Palette },
      { key: "timeline", label: "Timeline", href: "/timeline", icon: CalendarDays },
      { key: "music", label: "Music", href: "/music", icon: Music },
      { key: "seating", label: "Seating", href: "/seating", icon: Layout },
      { key: "website", label: "Website", href: "/website", icon: Globe },
    ],
    accent: "from-amber-100 to-amber-50",
    dotColor: "bg-amber-400",
  },
  {
    number: 3,
    title: "Money & Shopping",
    description:
      "Track your budget and check off everything you need to buy or rent. We've pre-filled 84 items so you don't forget anything.",
    nodes: [
      { key: "budget", label: "Budget", href: "/budget", icon: Wallet },
      { key: "shopping", label: "Shopping", href: "/shopping", icon: CheckSquare },
    ],
    accent: "from-emerald-100 to-emerald-50",
    dotColor: "bg-emerald-400",
  },
  {
    number: 4,
    title: "Final Prep",
    description:
      "The last stretch — generate vendor booklets, pack your boxes, share the plan with your wedding party, and review day-of tips.",
    nodes: [
      { key: "tips", label: "Tips & Emergency Kit", href: "/tips", icon: Sparkles },
      { key: "booklets", label: "Vendor Booklets", href: "/booklets", icon: BookOpen },
      { key: "packing", label: "Packing", href: "/packing", icon: Package },
      { key: "share", label: "Share with Party", href: "/share", icon: Share2 },
    ],
    accent: "from-violet-100 to-violet-50",
    dotColor: "bg-violet-400",
  },
];

interface PlanningMapProps {
  weddingDate: string | null;
}

function StepCard({
  step,
  index,
  isLeft,
}: {
  step: MapStep;
  index: number;
  isLeft?: boolean;
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
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative flex items-start gap-5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0)"
          : `translateY(30px)`,
        transition: `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`,
      }}
    >
      {/* Timeline dot — left side */}
      <div className="flex items-start shrink-0">
        <div
          className={`h-9 w-9 rounded-full ${step.dotColor} flex items-center justify-center text-white font-bold text-sm shadow-lg`}
          style={{
            boxShadow: visible
              ? `0 0 16px ${step.dotColor.includes("rose") ? "rgba(244,63,94,0.25)" : step.dotColor.includes("amber") ? "rgba(245,158,11,0.25)" : step.dotColor.includes("emerald") ? "rgba(16,185,129,0.25)" : "rgba(139,92,246,0.25)"}`
              : "none",
            transition: "box-shadow 0.8s ease",
          }}
        >
          {step.number}
        </div>
      </div>

      {/* Card */}
      <div className="flex-1">
        <div
          className={`rounded-2xl bg-gradient-to-br ${step.accent} border border-white/60 p-5 shadow-sm hover:shadow-md transition-shadow`}
        >
          <h3 className="text-lg font-bold font-[family-name:var(--font-heading)]">
            {step.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {step.description}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {step.nodes.map((node) => {
              const Icon = node.icon;
              return (
                <Link
                  key={node.key}
                  href={node.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/70 border border-white text-xs font-medium text-foreground hover:bg-white hover:shadow-sm transition-all group"
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  {node.label}
                  <ArrowRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-primary/60 transition-all -ml-1 group-hover:ml-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

export function PlanningMap({ weddingDate }: PlanningMapProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [endVisible, setEndVisible] = useState(false);

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
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-200 via-amber-200 via-emerald-200 to-violet-200" />

      {/* Steps */}
      <div className="space-y-8 md:space-y-12 relative">
        {STEPS.map((step, i) => (
          <StepCard
            key={step.number}
            step={step}
            index={i}
            isLeft={i % 2 === 0}
          />
        ))}

        {/* Wedding Day endpoint */}
        <div
          ref={endRef}
          className="relative flex items-start gap-5"
          style={{
            opacity: endVisible ? 1 : 0,
            transform: endVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
            transition: "opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s",
          }}
        >
          <div className="shrink-0">
            <div
              className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-lg"
              style={{
                boxShadow: endVisible
                  ? "0 0 24px rgba(200,100,100,0.35)"
                  : "none",
                transition: "box-shadow 1s ease",
              }}
            >
              <Heart className="h-4.5 w-4.5 text-white fill-white" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold font-[family-name:var(--font-heading)] text-primary">
              Wedding Day!
            </h3>
            {weddingDateFormatted && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {weddingDateFormatted}
              </p>
            )}
            <Link
              href="/postwedding"
              className="inline-flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <PartyPopper className="h-3.5 w-3.5" />
              Then: Post-Wedding tasks
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
