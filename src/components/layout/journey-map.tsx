"use client";

import Link from "next/link";
import {
  Users,
  ClipboardList,
  Wallet,
  Palette,
  CalendarDays,
  CheckSquare,
  Layout,
  Music,
  Globe,
  BookOpen,
  Package,
  FileText,
  Sparkles,
  PartyPopper,
  Check,
  ChevronRight,
} from "lucide-react";

interface PhaseFeature {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Phase {
  number: number;
  title: string;
  subtitle: string;
  features: PhaseFeature[];
}

const PHASES: Phase[] = [
  {
    number: 1,
    title: "Foundation",
    subtitle: "Get the basics in place",
    features: [
      { key: "vendors", label: "Vendors", href: "/vendors", icon: Users },
      { key: "guests", label: "Guests", href: "/guests", icon: ClipboardList },
      { key: "budget", label: "Budget", href: "/budget", icon: Wallet },
    ],
  },
  {
    number: 2,
    title: "Design",
    subtitle: "Define your vision",
    features: [
      { key: "moodboard", label: "Moodboard", href: "/moodboard", icon: Palette },
      { key: "timeline", label: "Timeline", href: "/timeline", icon: CalendarDays },
      { key: "shopping", label: "Shopping", href: "/shopping", icon: CheckSquare },
    ],
  },
  {
    number: 3,
    title: "Details",
    subtitle: "Plan every element",
    features: [
      { key: "seating", label: "Seating", href: "/seating", icon: Layout },
      { key: "music", label: "Music", href: "/music", icon: Music },
      { key: "website", label: "Website", href: "/website", icon: Globe },
    ],
  },
  {
    number: 4,
    title: "Coordination",
    subtitle: "Get everyone on the same page",
    features: [
      { key: "booklets", label: "Booklets", href: "/booklets", icon: BookOpen },
      { key: "packing", label: "Packing", href: "/packing", icon: Package },
      { key: "handouts", label: "Handouts", href: "/handouts", icon: FileText },
    ],
  },
  {
    number: 5,
    title: "Celebrate",
    subtitle: "You're ready!",
    features: [
      { key: "tips", label: "Tips", href: "/tips", icon: Sparkles },
      { key: "postwedding", label: "Post-Wedding", href: "/postwedding", icon: PartyPopper },
    ],
  },
];

interface JourneyMapProps {
  completedFeatures: Set<string>;
}

/**
 * Determine which features count as "started" based on data:
 * Pass a Set<string> of feature keys that have data.
 * e.g., { "vendors", "guests", "timeline" }
 */
export function JourneyMap({ completedFeatures }: JourneyMapProps) {
  // Find current phase: the first phase that has incomplete features
  let currentPhaseIndex = 0;
  for (let i = 0; i < PHASES.length; i++) {
    const allDone = PHASES[i].features.every((f) =>
      completedFeatures.has(f.key)
    );
    if (allDone) {
      currentPhaseIndex = i + 1;
    } else {
      break;
    }
  }
  // Clamp
  currentPhaseIndex = Math.min(currentPhaseIndex, PHASES.length - 1);

  const totalFeatures = PHASES.reduce((s, p) => s + p.features.length, 0);
  const completedCount = completedFeatures.size;
  const overallProgress = Math.round((completedCount / totalFeatures) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Your Planning Journey</h2>
        <span className="text-xs text-muted-foreground">
          {completedCount} / {totalFeatures} started
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Phases */}
      <div className="space-y-2">
        {PHASES.map((phase, phaseIdx) => {
          const isCurrentPhase = phaseIdx === currentPhaseIndex;
          const isPastPhase = phaseIdx < currentPhaseIndex;
          const isFuturePhase = phaseIdx > currentPhaseIndex;
          const phaseDone = phase.features.every((f) =>
            completedFeatures.has(f.key)
          );

          return (
            <div
              key={phase.number}
              className={`rounded-xl border p-4 transition-all ${
                isCurrentPhase
                  ? "border-primary/30 bg-primary/[0.03] shadow-sm"
                  : isPastPhase
                  ? "border-green-200 bg-green-50/30"
                  : "border-border bg-card opacity-60"
              }`}
            >
              {/* Phase header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    phaseDone
                      ? "bg-green-500 text-white"
                      : isCurrentPhase
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {phaseDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    phase.number
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {phase.title}
                    </span>
                    {isCurrentPhase && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {phase.subtitle}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="flex gap-2 flex-wrap">
                {phase.features.map((feature) => {
                  const isDone = completedFeatures.has(feature.key);
                  const Icon = feature.icon;
                  return (
                    <Link
                      key={feature.key}
                      href={feature.href}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        isDone
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : isCurrentPhase
                          ? "bg-card border border-primary/20 text-foreground hover:border-primary/40 hover:shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {isDone ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                      {feature.label}
                      {!isDone && isCurrentPhase && (
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
