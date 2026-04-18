"use client";

import { useState } from "react";
import {
  ChevronDown,
  GripVertical,
  Mic,
  Users2,
  StickyNote,
  Clock,
  ArrowRight,
  Music,
  UtensilsCrossed,
  Plus,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────
// Prototype page — three design directions for the Dinner moment card.
// Standalone, no data persistence — purely visual comparison.
// ─────────────────────────────────────────────────────────────────────

export default function PrototypePage() {
  return (
    <div className="space-y-12">
      <header className="space-y-2 border-b border-border/50 pb-6">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
          UX Prototype · Day-of Details
        </p>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Three directions for the moment card
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Same content (Dinner service), three different layouts. Click chips,
          toggle checkboxes, resize the window. Pick the one that feels like
          the app you want to build.
        </p>
      </header>

      <Variant
        letter="A"
        name="Primary + optional chips"
        pitch="Big decisions first. Optional fields hide behind chips — click to add."
      >
        <VariantA />
      </Variant>

      <Variant
        letter="B"
        name="Two-column editorial grid"
        pitch="Primary fields on the left, universal fields on a narrow right rail. Collapses to single column on mobile."
      >
        <VariantB />
      </Variant>

      <Variant
        letter="C"
        name="Unified rows + accent bar"
        pitch="Every field follows the same row shape. Primary rows have a salmon left-accent. Smallest change, most incremental."
      >
        <VariantC />
      </Variant>

      <Variant
        letter="A+"
        name="Variant A with stronger hierarchy (proposed)"
        pitch="Four fixes: (1) all optional chips start collapsed — filled chips show a preview dot + value. (2) Primary labels scale up to sub-heading. (3) Visible divider before OPTIONAL. (4) Expanded optional is an inline row (no mini-card)."
      >
        <VariantAPlus />
      </Variant>
    </div>
  );
}

// ── Shared chrome (the outer pill + expanded container) ───────────────

function Variant({
  letter,
  name,
  pitch,
  children,
}: {
  letter: string;
  name: string;
  pitch: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-semibold tracking-[0.14em] uppercase text-primary">
          Variant {letter}
        </span>
        <h2 className="text-xl font-[family-name:var(--font-heading)]">
          {name}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground max-w-2xl">{pitch}</p>
      <div className="pt-2">{children}</div>
    </section>
  );
}

function MockPillHeader({
  summary,
}: {
  summary: { label: string; tone?: "accent" | "neutral" | "muted" }[];
}) {
  return (
    <div className="flex items-stretch border-b border-border/50">
      <button
        type="button"
        aria-label="Drag"
        className="px-1.5 flex items-center text-muted-foreground/40 cursor-grab"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 flex items-center gap-3 px-2 py-2.5 min-w-0">
        <span className="text-xs tabular-nums shrink-0 w-16 font-medium text-muted-foreground">
          5:15 PM
        </span>
        <span className="text-sm font-medium shrink-0">Dinner service</span>
        <div className="flex-1 flex items-center gap-1.5 flex-wrap min-w-0">
          {summary.map((c, i) => (
            <span
              key={i}
              className={cn(
                "text-[11px] px-1.5 py-0.5 rounded-md truncate max-w-[220px]",
                c.tone === "accent" && "bg-primary/10 text-primary font-medium",
                c.tone === "muted" && "bg-muted text-muted-foreground/70",
                (!c.tone || c.tone === "neutral") &&
                  "bg-muted/60 text-foreground/70"
              )}
            >
              {c.label}
            </span>
          ))}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground/60 rotate-180" />
      </div>
      <button
        type="button"
        className="px-2 text-muted-foreground/40 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant A — Primary + optional chips
// ─────────────────────────────────────────────────────────────────────

function VariantA() {
  const [vendorMeals, setVendorMeals] = useState("");
  const [music, setMusic] = useState("");
  const [skipMusic, setSkipMusic] = useState(false);

  // Each optional field is either "idle" (chip visible) or "open" (inline editor)
  const [mcOpen, setMcOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const [mcLine, setMcLine] = useState("");
  const [guestAction, setGuestAction] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm">
      <MockPillHeader
        summary={[
          { label: "music: low-volume jazz", tone: "accent" },
          { label: "vendor meals noted", tone: "neutral" },
        ]}
      />

      <div className="px-5 py-5 space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
          Timing and flow of dinner, including when vendors eat.
        </p>

        {/* Primary block: Music — the main creative decision */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary/80" />
            <label className="text-sm font-medium text-foreground">
              Dinner music
            </label>
            <span className="text-xs text-muted-foreground">
              — what the DJ plays
            </span>
          </div>
          <div className={cn(skipMusic && "opacity-40 pointer-events-none")}>
            <Input
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              placeholder='e.g., "low-volume jazz playlist", "acoustic cover set"'
              className="h-10 text-sm bg-background"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Checkbox
              checked={skipMusic}
              onCheckedChange={(v) => setSkipMusic(!!v)}
            />
            No music during dinner
            <span className="text-muted-foreground/50">
              · silence is intentional
            </span>
          </label>
        </div>

        {/* Primary block: Vendor meals — the planner-wisdom decision */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary/80" />
            <label className="text-sm font-medium text-foreground">
              Vendor meals
            </label>
            <span className="text-xs text-muted-foreground">
              — when they eat
            </span>
          </div>
          <Textarea
            value={vendorMeals}
            onChange={(e) => setVendorMeals(e.target.value)}
            placeholder="e.g., Vendors eat during speeches. DJ eats first, then photographer."
            className="text-sm min-h-[60px] bg-background"
          />
        </div>

        {/* Optional fields — chips, only show inputs when opened */}
        <div className="border-t border-border/50 pt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
              Optional
            </span>
            {!mcOpen && !mcLine && (
              <ChipButton icon={<Mic />} onClick={() => setMcOpen(true)}>
                MC announcement
              </ChipButton>
            )}
            {!guestsOpen && !guestAction && (
              <ChipButton
                icon={<Users2 />}
                onClick={() => setGuestsOpen(true)}
              >
                Guest action
              </ChipButton>
            )}
            {!notesOpen && !notes && (
              <ChipButton
                icon={<StickyNote />}
                onClick={() => setNotesOpen(true)}
              >
                Notes
              </ChipButton>
            )}
            {!mcOpen && !guestsOpen && !notesOpen && !mcLine && !guestAction && !notes && (
              <span className="text-xs text-muted-foreground/60 italic">
                · skip these if they don&apos;t apply
              </span>
            )}
          </div>

          {(mcOpen || mcLine) && (
            <OptionalField
              icon={<Mic />}
              label="MC announcement"
              onClear={() => {
                setMcOpen(false);
                setMcLine("");
              }}
            >
              <Textarea
                value={mcLine}
                onChange={(e) => setMcLine(e.target.value)}
                placeholder="What the MC says — e.g., &ldquo;Please enjoy your meal. The bar is open.&rdquo;"
                className="text-sm min-h-[52px] bg-background"
                rows={2}
              />
            </OptionalField>
          )}

          {(guestsOpen || guestAction) && (
            <OptionalField
              icon={<Users2 />}
              label="Guest action"
              onClear={() => {
                setGuestsOpen(false);
                setGuestAction("");
              }}
            >
              <Input
                value={guestAction}
                onChange={(e) => setGuestAction(e.target.value)}
                placeholder='e.g., "everyone stand", "applaud"'
                className="h-9 text-sm bg-background max-w-sm"
              />
            </OptionalField>
          )}

          {(notesOpen || notes) && (
            <OptionalField
              icon={<StickyNote />}
              label="Notes"
              onClear={() => {
                setNotesOpen(false);
                setNotes("");
              }}
            >
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else for this moment"
                className="text-sm min-h-[44px] bg-background"
                rows={2}
              />
            </OptionalField>
          )}
        </div>

        {/* Schedule link footer */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pt-1 border-t border-border/30">
          <Clock className="h-3 w-3" />
          <span>Time set in Schedule tab.</span>
          <button className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary">
            Open Schedule <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipButton({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border/80 bg-background hover:border-primary/40 hover:text-primary transition-colors text-foreground/70"
    >
      <Plus className="h-3 w-3" />
      <span className="[&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground/60">
        {icon}
      </span>
      {children}
    </button>
  );
}

function OptionalField({
  icon,
  label,
  onClear,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-muted/30 border border-border/40 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-muted-foreground/70">
            {icon}
          </span>
          {label}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground/50 hover:text-destructive transition-colors"
          title="Remove"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant B — Two-column editorial grid
// ─────────────────────────────────────────────────────────────────────

function VariantB() {
  const [vendorMeals, setVendorMeals] = useState("");
  const [music, setMusic] = useState("");
  const [skipMusic, setSkipMusic] = useState(false);
  const [mcNeeded, setMcNeeded] = useState(false);
  const [mcLine, setMcLine] = useState("");
  const [guestAction, setGuestAction] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm">
      <MockPillHeader
        summary={[{ label: "music: low-volume jazz", tone: "accent" }]}
      />

      <div className="px-5 py-5">
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          Timing and flow of dinner, including when vendors eat.
        </p>

        <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
          {/* LEFT: primary decisions */}
          <div className="space-y-5">
            <FieldBlock
              icon={<Music className="h-4 w-4 text-primary/80" />}
              label="Dinner music"
              hint="What the DJ plays during the meal"
            >
              <div
                className={cn(skipMusic && "opacity-40 pointer-events-none")}
              >
                <Input
                  value={music}
                  onChange={(e) => setMusic(e.target.value)}
                  placeholder='e.g., "low-volume jazz playlist"'
                  className="h-10 text-sm bg-background"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-2">
                <Checkbox
                  checked={skipMusic}
                  onCheckedChange={(v) => setSkipMusic(!!v)}
                />
                No music during dinner
              </label>
            </FieldBlock>

            <FieldBlock
              icon={<UtensilsCrossed className="h-4 w-4 text-primary/80" />}
              label="Vendor meals"
              hint="When should vendors eat? Usually during speeches or between courses."
            >
              <Textarea
                value={vendorMeals}
                onChange={(e) => setVendorMeals(e.target.value)}
                placeholder="e.g., Vendors eat during speeches. DJ eats first."
                className="text-sm min-h-[70px] bg-background"
              />
            </FieldBlock>
          </div>

          {/* RIGHT: universal fields, narrow rail */}
          <div className="md:border-l md:border-border/50 md:pl-6 space-y-4">
            <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
              Universal
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                <Mic className="h-3.5 w-3.5 text-muted-foreground/60" />
                MC
              </div>
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox
                  checked={mcNeeded}
                  onCheckedChange={(v) => setMcNeeded(!!v)}
                />
                <span className={cn(!mcNeeded && "text-muted-foreground")}>
                  MC announces
                </span>
              </label>
              {mcNeeded && (
                <Textarea
                  value={mcLine}
                  onChange={(e) => setMcLine(e.target.value)}
                  placeholder="What the MC says"
                  className="text-xs min-h-[44px] bg-background"
                  rows={2}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                <Users2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                Guests
              </div>
              <Input
                value={guestAction}
                onChange={(e) => setGuestAction(e.target.value)}
                placeholder='e.g., "stand"'
                className="h-8 text-xs bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                <StickyNote className="h-3.5 w-3.5 text-muted-foreground/60" />
                Notes
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else"
                className="text-xs min-h-[44px] bg-background"
                rows={2}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pt-5 mt-5 border-t border-border/30">
          <Clock className="h-3 w-3" />
          <span>Time set in Schedule tab.</span>
          <button className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary">
            Open Schedule <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldBlock({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <label className="text-sm font-medium text-foreground">{label}</label>
      </div>
      {hint && (
        <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>
      )}
      <div>{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant C — Unified rows + accent bar
// ─────────────────────────────────────────────────────────────────────

function VariantC() {
  const [vendorMeals, setVendorMeals] = useState("");
  const [music, setMusic] = useState("");
  const [skipMusic, setSkipMusic] = useState(false);
  const [mcNeeded, setMcNeeded] = useState(false);
  const [mcLine, setMcLine] = useState("");
  const [guestAction, setGuestAction] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm">
      <MockPillHeader
        summary={[{ label: "music: low-volume jazz", tone: "accent" }]}
      />

      <div className="px-5 py-5 space-y-1">
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Timing and flow of dinner, including when vendors eat.
        </p>

        <UnifiedRow
          icon={<Music className="h-3.5 w-3.5" />}
          label="Music"
          primary
        >
          <div
            className={cn(
              "space-y-1.5",
              skipMusic && "opacity-40 pointer-events-none"
            )}
          >
            <Input
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              placeholder='e.g., "low-volume jazz playlist"'
              className="h-9 text-sm bg-background"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-1.5">
            <Checkbox
              checked={skipMusic}
              onCheckedChange={(v) => setSkipMusic(!!v)}
            />
            No music during dinner
          </label>
        </UnifiedRow>

        <UnifiedRow
          icon={<UtensilsCrossed className="h-3.5 w-3.5" />}
          label="Vendor meals"
          primary
        >
          <Textarea
            value={vendorMeals}
            onChange={(e) => setVendorMeals(e.target.value)}
            placeholder="e.g., Vendors eat during speeches. DJ eats first."
            className="text-sm min-h-[56px] bg-background"
          />
        </UnifiedRow>

        <div className="border-t border-border/40 my-3" />

        <UnifiedRow icon={<Mic className="h-3.5 w-3.5" />} label="MC">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={mcNeeded}
              onCheckedChange={(v) => setMcNeeded(!!v)}
            />
            <span className={cn(!mcNeeded && "text-muted-foreground")}>
              MC announces this moment
            </span>
          </label>
          {mcNeeded && (
            <Textarea
              value={mcLine}
              onChange={(e) => setMcLine(e.target.value)}
              placeholder="What the MC says"
              className="text-sm min-h-[44px] bg-background mt-2"
              rows={2}
            />
          )}
        </UnifiedRow>

        <UnifiedRow icon={<Users2 className="h-3.5 w-3.5" />} label="Guests">
          <Input
            value={guestAction}
            onChange={(e) => setGuestAction(e.target.value)}
            placeholder='e.g., "everyone stand"'
            className="h-8 text-sm bg-background max-w-sm"
          />
        </UnifiedRow>

        <UnifiedRow icon={<StickyNote className="h-3.5 w-3.5" />} label="Notes">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else for this moment"
            className="text-sm min-h-[44px] bg-background"
            rows={2}
          />
        </UnifiedRow>

        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pt-3 mt-2 border-t border-border/30">
          <Clock className="h-3 w-3" />
          <span>Time set in Schedule tab.</span>
          <button className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary">
            Open Schedule <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function UnifiedRow({
  icon,
  label,
  primary,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-2.5 pl-3 rounded-md -mx-1",
        primary && "border-l-2 border-primary/60 bg-primary/[0.03]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 w-24 shrink-0 text-xs font-medium pt-2",
          primary ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span
          className={cn(
            "[&>svg]:h-3.5 [&>svg]:w-3.5",
            primary ? "text-primary/80" : "text-muted-foreground/60"
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Variant A+ — Variant A with stronger hierarchy
//   (1) All optional chips start collapsed — even when filled. Filled chips
//       show a salmon dot + inline preview.
//   (2) Primary labels scaled up: text-base font-semibold, bigger icons.
//   (3) Visible divider + OPTIONAL uppercase label.
//   (4) Expanded optional is an inline row (no mini-card).
// ─────────────────────────────────────────────────────────────────────

function VariantAPlus() {
  const [vendorMeals, setVendorMeals] = useState("");
  const [music, setMusic] = useState("");
  const [skipMusic, setSkipMusic] = useState(false);

  // Seed MC with data to demo the "filled chip" state.
  const [mcLine, setMcLine] = useState(
    "Dinner is served — please join us at your tables."
  );
  const [guestAction, setGuestAction] = useState("");
  const [notes, setNotes] = useState("");

  // Chip-first for all: NEVER auto-expand, even when filled.
  const [mcOpen, setMcOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/80 bg-card shadow-sm">
      <MockPillHeader
        summary={[
          { label: "music: low-volume jazz", tone: "accent" },
          { label: "needs MC", tone: "accent" },
        ]}
      />

      <div className="px-5 py-5 space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">
          Timing and flow of dinner, including when vendors eat.
        </p>

        {/* Primary: Music — larger label (text-base semibold), bigger icon */}
        <PrimaryBlock
          icon={<Music className="h-[18px] w-[18px] text-primary" />}
          label="Dinner music"
          hint="what the DJ plays"
        >
          <div className={cn(skipMusic && "opacity-40 pointer-events-none")}>
            <Input
              value={music}
              onChange={(e) => setMusic(e.target.value)}
              placeholder='e.g., "low-volume jazz playlist", "acoustic cover set"'
              className="h-10 text-sm bg-background"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-2">
            <Checkbox
              checked={skipMusic}
              onCheckedChange={(v) => setSkipMusic(!!v)}
            />
            No music during dinner
            <span className="text-muted-foreground/50">
              · silence is intentional
            </span>
          </label>
        </PrimaryBlock>

        {/* Primary: Vendor meals */}
        <PrimaryBlock
          icon={<UtensilsCrossed className="h-[18px] w-[18px] text-primary" />}
          label="Vendor meals"
          hint="when vendors eat, usually during speeches"
        >
          <Textarea
            value={vendorMeals}
            onChange={(e) => setVendorMeals(e.target.value)}
            placeholder="e.g., Vendors eat during speeches. DJ eats first, then photographer."
            className="text-sm min-h-[60px] bg-background"
          />
        </PrimaryBlock>

        {/* Divider + OPTIONAL label → clear hierarchy break */}
        <div className="border-t border-border/40 -mx-5" />
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/60">
            Optional · click to add or edit
          </p>

          {/* Chips row: all three chips, each shows preview when filled */}
          {!mcOpen && (
            <InlineChip
              icon={<Mic />}
              label="MC announcement"
              value={mcLine}
              typical
              onClick={() => setMcOpen(true)}
            />
          )}
          {mcOpen && (
            <InlineRow
              icon={<Mic />}
              label="MC announcement"
              onDone={() => setMcOpen(false)}
              onClear={() => {
                setMcLine("");
                setMcOpen(false);
              }}
            >
              <Textarea
                autoFocus
                value={mcLine}
                onChange={(e) => setMcLine(e.target.value)}
                placeholder="What the MC says"
                className="text-sm min-h-[48px] bg-background"
                rows={2}
              />
            </InlineRow>
          )}

          {!guestsOpen && (
            <InlineChip
              icon={<Users2 />}
              label="Guest action"
              value={guestAction}
              onClick={() => setGuestsOpen(true)}
            />
          )}
          {guestsOpen && (
            <InlineRow
              icon={<Users2 />}
              label="Guest action"
              onDone={() => setGuestsOpen(false)}
              onClear={() => {
                setGuestAction("");
                setGuestsOpen(false);
              }}
            >
              <Input
                autoFocus
                value={guestAction}
                onChange={(e) => setGuestAction(e.target.value)}
                placeholder='e.g., "everyone stand"'
                className="h-9 text-sm bg-background"
              />
            </InlineRow>
          )}

          {!notesOpen && (
            <InlineChip
              icon={<StickyNote />}
              label="Notes"
              value={notes}
              onClick={() => setNotesOpen(true)}
            />
          )}
          {notesOpen && (
            <InlineRow
              icon={<StickyNote />}
              label="Notes"
              onDone={() => setNotesOpen(false)}
              onClear={() => {
                setNotes("");
                setNotesOpen(false);
              }}
            >
              <Textarea
                autoFocus
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else"
                className="text-sm min-h-[48px] bg-background"
                rows={2}
              />
            </InlineRow>
          )}
        </div>

        {/* Schedule link footer */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pt-1 border-t border-border/30">
          <Clock className="h-3 w-3" />
          <span>Time set in Schedule tab.</span>
          <button className="inline-flex items-center gap-0.5 text-primary/70 hover:text-primary">
            Open Schedule <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Primary block used in Variant A+ — heavier label + bigger icon so it
// visually outranks the optional chips below.
function PrimaryBlock({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="flex items-center self-center">{icon}</span>
        <label className="text-[15px] font-semibold text-foreground leading-none">
          {label}
        </label>
        {hint && (
          <span className="text-[13px] text-muted-foreground">— {hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// Chip that shows "empty" (plain + icon) OR "filled" (salmon dot + preview)
// based on whether `value` has content.
function InlineChip({
  icon,
  label,
  value,
  typical,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  typical?: boolean;
  onClick: () => void;
}) {
  const hasValue = !!(value && value.trim());
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors mr-1.5 mb-1.5",
        hasValue
          ? "border-primary/40 bg-primary/5 text-foreground/80 hover:border-primary/70"
          : typical
          ? "border-primary/30 bg-primary/[0.04] text-foreground/70 hover:border-primary/60"
          : "border-border/80 bg-background text-foreground/70 hover:border-primary/40"
      )}
    >
      {hasValue ? (
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
      ) : (
        <Plus className="h-3 w-3" />
      )}
      <span
        className={cn(
          "[&>svg]:h-3 [&>svg]:w-3",
          hasValue || typical
            ? "[&>svg]:text-primary/70"
            : "[&>svg]:text-muted-foreground/60"
        )}
      >
        {icon}
      </span>
      <span className="font-medium">{label}</span>
      {hasValue ? (
        <>
          <span className="text-muted-foreground/60">:</span>
          <span className="text-muted-foreground/80 truncate max-w-[220px]">
            {value}
          </span>
        </>
      ) : typical ? (
        <span className="text-[10px] text-primary/70 font-medium">typical</span>
      ) : null}
    </button>
  );
}

// Inline row for an expanded optional field — no border, no bg.
// Looks like it belongs to the OPTIONAL group, not a stand-alone card.
function InlineRow({
  icon,
  label,
  onDone,
  onClear,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  onDone: () => void;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="pl-1 py-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
          <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-primary/70">
            {icon}
          </span>
          {label}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDone}
            className="text-[11px] text-primary hover:text-primary/80 font-medium"
          >
            Done
          </button>
          <span className="text-muted-foreground/30">·</span>
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-muted-foreground/60 hover:text-destructive transition-colors"
            title="Clear and collapse"
          >
            Clear
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}


