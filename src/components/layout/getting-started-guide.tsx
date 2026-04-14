"use client";

import Link from "next/link";
import {
  Users,
  ClipboardList,
  CalendarDays,
  CheckSquare,
  Sparkles,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GettingStartedStep {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  ctaLabel: string;
  completed: boolean;
}

interface GettingStartedGuideProps {
  vendorCount: number;
  guestCount: number;
  timelineEventCount: number;
  shoppingItemCount: number;
  onShowTools?: () => void;
}

export function GettingStartedGuide({
  vendorCount,
  guestCount,
  timelineEventCount,
  shoppingItemCount,
}: GettingStartedGuideProps) {
  const steps: GettingStartedStep[] = [
    {
      label: "Add your vendors",
      description:
        "Start by adding the vendors you've already booked. We'll track contacts, contracts, and day-of logistics.",
      icon: Users,
      href: "/vendors",
      ctaLabel: "Add vendors",
      completed: vendorCount > 0,
    },
    {
      label: "Import your guest list",
      description:
        "Add your guests \u2014 paste names, upload a spreadsheet, or add one by one. Track RSVPs and meal choices.",
      icon: ClipboardList,
      href: "/guests",
      ctaLabel: "Add guests",
      completed: guestCount > 0,
    },
    {
      label: "Generate your timeline",
      description:
        "We'll create a smart pre-wedding checklist and hour-by-hour day-of schedule based on your wedding date.",
      icon: CalendarDays,
      href: "/timeline",
      ctaLabel: "Create timeline",
      completed: timelineEventCount > 0,
    },
    {
      label: "Build your shopping list",
      description:
        "Auto-fill 84 essential items organized by category, with search suggestions for each.",
      icon: CheckSquare,
      href: "/shopping",
      ctaLabel: "Start shopping list",
      completed: shoppingItemCount > 0,
    },
    {
      label: "Explore more tools",
      description:
        "Budget tracking, seating charts, music planning, vendor booklets, and more.",
      icon: Sparkles,
      href: "#planning-tools",
      ctaLabel: "See all tools",
      completed: false,
    },
  ];

  // Find the first incomplete step
  const currentStepIndex = steps.findIndex((s) => !s.completed);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Getting Started</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Follow these steps to set up your wedding plan.
      </p>

      <div className="space-y-0">
        {steps.map((step, index) => {
          const isCurrent = index === currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.label} className="flex gap-4">
              {/* Left column: number/check + connecting line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    step.completed
                      ? "border-green-500 bg-green-500 text-white"
                      : isCurrent
                        ? "border-primary bg-primary/10 text-primary animate-pulse"
                        : "border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}
                >
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-6",
                      step.completed
                        ? "bg-green-500"
                        : "bg-muted-foreground/20"
                    )}
                  />
                )}
              </div>

              {/* Right column: content card */}
              <div className={cn("flex-1 pb-6", index === steps.length - 1 && "pb-0")}>
                <Card
                  className={cn(
                    "transition-all",
                    isCurrent && "ring-1 ring-primary/30 shadow-sm",
                    step.completed && "opacity-70"
                  )}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                        step.completed
                          ? "bg-green-500/10"
                          : "bg-primary/10"
                      )}
                    >
                      <StepIcon
                        className={cn(
                          "h-5 w-5",
                          step.completed
                            ? "text-green-600"
                            : "text-primary"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className={cn(
                          "font-medium text-sm",
                          step.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                      {!step.completed && (
                        step.href.startsWith("#") ? (
                          <a
                            href={step.href}
                            className={cn(
                              buttonVariants({
                                size: "sm",
                                variant: isCurrent ? "default" : "outline",
                              }),
                              "mt-3"
                            )}
                          >
                            {step.ctaLabel}
                          </a>
                        ) : (
                          <Link
                            href={step.href}
                            className={cn(
                              buttonVariants({
                                size: "sm",
                                variant: isCurrent ? "default" : "outline",
                              }),
                              "mt-3"
                            )}
                          >
                            {step.ctaLabel}
                          </Link>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
