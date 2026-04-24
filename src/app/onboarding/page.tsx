"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { WeddingStyle } from "@/types/database";

const weddingStyles: { value: WeddingStyle; label: string; emoji: string }[] = [
  { value: "rustic", label: "Rustic", emoji: "🌾" },
  { value: "modern", label: "Modern", emoji: "🏙" },
  { value: "classic", label: "Classic", emoji: "🏛" },
  { value: "bohemian", label: "Bohemian", emoji: "🌿" },
  { value: "minimalist", label: "Minimalist", emoji: "◻" },
  { value: "glam", label: "Glam", emoji: "✨" },
  { value: "cultural", label: "Cultural", emoji: "🎎" },
  { value: "other", label: "Other", emoji: "💫" },
];

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Step 1
  const [partner1Name, setPartner1Name] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueType, setVenueType] = useState<string>("");

  // Step 2
  const [guestCount, setGuestCount] = useState("");
  const [budget, setBudget] = useState("");
  const [style, setStyle] = useState<WeddingStyle | "">("");
  const [weddingPartySize, setWeddingPartySize] = useState("");
  const [partner1Attire, setPartner1Attire] = useState("undecided");
  const [partner2Attire, setPartner2Attire] = useState("undecided");

  // Step 3 — Sub-events only. Palette, curfew, cultural elements, honeymoon
  // timing are gathered later (Moodboard / Settings / Post-Wedding).
  // Sub-events
  const [hasEngagementParty, setHasEngagementParty] = useState(false);
  const [hasRehearsalDinner, setHasRehearsalDinner] = useState(false);
  const [hasBridalShower, setHasBridalShower] = useState(false);
  const [hasBachelorBachelorette, setHasBachelorBachelorette] = useState(false);
  const [hasHoneymoon, setHasHoneymoon] = useState(false);

  async function handleFinish() {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Use RPC function to atomically create wedding + add user as owner.
    // Palette / cultural / curfew / honeymoon are left NULL here and set later
    // via Settings or the relevant tool page.
    const { data: weddingId, error } = await supabase.rpc(
      "create_wedding_with_owner",
      {
        p_partner1_name: partner1Name,
        p_partner2_name: partner2Name,
        p_wedding_date: weddingDate || null,
        p_venue_name: venueName || null,
        p_venue_address: venueAddress || null,
        p_venue_indoor_outdoor: (venueType as "indoor" | "outdoor" | "mixed") || null,
        p_guest_count_estimate: guestCount ? parseInt(guestCount) : null,
        p_budget_total: budget ? parseFloat(budget) : null,
        p_style: (style as WeddingStyle) || null,
        p_color_palette: null,
        p_bridal_party_size: weddingPartySize ? parseInt(weddingPartySize) : null,
        p_partner1_attire: partner1Attire !== "undecided" ? partner1Attire : null,
        p_partner2_attire: partner2Attire !== "undecided" ? partner2Attire : null,
        p_ceremony_style: null,
        p_reception_format: null,
        p_cultural_elements: null,
        p_venue_curfew: null,
        p_honeymoon_departure: null,
      }
    );

    if (error || !weddingId) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Persist sub-event flags to the weddings row so downstream tools
    // (Tips / Timeline / Day-of Details) can react. These used to live
    // in localStorage, which never reached the DB and left the flags
    // unusable outside the browser that ran onboarding.
    await supabase
      .from("weddings")
      .update({
        has_engagement_party: hasEngagementParty,
        has_rehearsal_dinner: hasRehearsalDinner,
        has_bridal_shower: hasBridalShower,
        has_bachelor_bachelorette: hasBachelorBachelorette,
        has_honeymoon: hasHoneymoon,
      })
      .eq("id", weddingId);

    setShowCelebration(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  }

  if (showCelebration) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/30">
        <div className="text-center animate-fade-in-up">
          <Heart className="h-16 w-16 text-primary fill-primary mx-auto mb-4 animate-heartbeat" />
          <h1 className="text-3xl font-bold font-[family-name:var(--font-heading)] mb-2">
            You&apos;re all set!
          </h1>
          <p className="text-muted-foreground text-lg">
            Let&apos;s plan the most beautiful day of your life.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-muted/30">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Heart className="h-8 w-8 text-primary fill-primary mx-auto mb-2" />
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
            Let&apos;s set up your wedding
          </h1>
          <p className="text-muted-foreground mt-1">
            Step {step} of {TOTAL_STEPS}
          </p>
          {/* Progress */}
          <div className="flex gap-2 justify-center mt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-12 rounded-full transition-colors ${
                  i < step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {/* Step 1: The Essentials */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4">The Essentials</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="p1">Partner 1</Label>
                  <Input
                    id="p1"
                    placeholder="First name"
                    value={partner1Name}
                    onChange={(e) => setPartner1Name(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p2">Partner 2</Label>
                  <Input
                    id="p2"
                    placeholder="First name"
                    value={partner2Name}
                    onChange={(e) => setPartner2Name(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Wedding Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={weddingDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue Name</Label>
                <Input
                  id="venue"
                  placeholder="The Grand Ballroom"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venueAddr">Venue Address</Label>
                <Input
                  id="venueAddr"
                  placeholder="123 Wedding Lane, City, State"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Indoor / Outdoor</Label>
                <Select value={venueType} onValueChange={(v) => setVenueType(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Indoor</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Style & Structure */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4">Style & Structure</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guests">Guest Count (est.)</Label>
                  <Input
                    id="guests"
                    type="number"
                    placeholder="150"
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="30000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Wedding Style</Label>
                <div className="grid grid-cols-4 gap-2">
                  {weddingStyles.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStyle(s.value)}
                      className={`border rounded-lg p-3 text-center text-sm transition-colors hover:border-primary ${
                        style === s.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : ""
                      }`}
                    >
                      <div className="text-xl mb-1">{s.emoji}</div>
                      <div className="font-medium">{s.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="partySize">Wedding Party Size</Label>
                <Input
                  id="partySize"
                  type="number"
                  placeholder="6"
                  value={weddingPartySize}
                  onChange={(e) => setWeddingPartySize(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>What will {partner1Name || "Partner 1"} be wearing?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "dress", label: "Dress / Gown", emoji: "\uD83D\uDC57" },
                    { value: "suit", label: "Suit / Tux", emoji: "\uD83E\uDD35" },
                    { value: "undecided", label: "Not sure yet", emoji: "\uD83E\uDD37" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPartner1Attire(opt.value)}
                      className={`border rounded-lg p-3 text-center text-sm transition-colors hover:border-primary ${
                        partner1Attire === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : ""
                      }`}
                    >
                      <div className="text-xl mb-1">{opt.emoji}</div>
                      <div className="font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>What will {partner2Name || "Partner 2"} be wearing?</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "dress", label: "Dress / Gown", emoji: "\uD83D\uDC57" },
                    { value: "suit", label: "Suit / Tux", emoji: "\uD83E\uDD35" },
                    { value: "undecided", label: "Not sure yet", emoji: "\uD83E\uDD37" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPartner2Attire(opt.value)}
                      className={`border rounded-lg p-3 text-center text-sm transition-colors hover:border-primary ${
                        partner2Attire === opt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : ""
                      }`}
                    >
                      <div className="text-xl mb-1">{opt.emoji}</div>
                      <div className="font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preferences */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4">Final Details</h2>
              <div className="space-y-3">
                <Label>What else are you planning?</Label>
                <p className="text-xs text-muted-foreground -mt-1">We&apos;ll add relevant tasks to your timeline.</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Checkbox id="engagement" checked={hasEngagementParty} onCheckedChange={(v) => setHasEngagementParty(!!v)} />
                    <Label htmlFor="engagement" className="font-normal text-sm">Engagement party</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="rehearsal" checked={hasRehearsalDinner} onCheckedChange={(v) => setHasRehearsalDinner(!!v)} />
                    <Label htmlFor="rehearsal" className="font-normal text-sm">Rehearsal dinner</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="shower" checked={hasBridalShower} onCheckedChange={(v) => setHasBridalShower(!!v)} />
                    <Label htmlFor="shower" className="font-normal text-sm">Wedding shower</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="bachelor" checked={hasBachelorBachelorette} onCheckedChange={(v) => setHasBachelorBachelorette(!!v)} />
                    <Label htmlFor="bachelor" className="font-normal text-sm">Bachelor / bachelorette</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="honeymoonPlan" checked={hasHoneymoon} onCheckedChange={(v) => setHasHoneymoon(!!v)} />
                    <Label htmlFor="honeymoonPlan" className="font-normal text-sm">Honeymoon</Label>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                You can set color palette, curfew, honeymoon details, and cultural traditions later from Settings or the relevant page.
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            {step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className="gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < TOTAL_STEPS ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!partner1Name || !partner2Name)}
                className="gap-1"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={loading}
                className="gap-1"
              >
                {loading ? (
                  "Creating..."
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Start Planning
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Skip */}
        <p className="text-center mt-4">
          <button
            onClick={() => {
              if (step < TOTAL_STEPS) setStep(step + 1);
              else handleFinish();
            }}
            className="text-sm text-muted-foreground hover:underline"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
