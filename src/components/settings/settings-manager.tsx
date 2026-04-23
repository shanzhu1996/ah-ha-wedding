"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, LogOut, Trash2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { Database, WeddingStyle } from "@/types/database";

type Wedding = Database["public"]["Tables"]["weddings"]["Row"];

const weddingStyles: { value: WeddingStyle; label: string }[] = [
  { value: "rustic", label: "Rustic" },
  { value: "modern", label: "Modern" },
  { value: "classic", label: "Classic" },
  { value: "bohemian", label: "Bohemian" },
  { value: "minimalist", label: "Minimalist" },
  { value: "glam", label: "Glam" },
  { value: "cultural", label: "Cultural" },
  { value: "other", label: "Other" },
];

interface SettingsManagerProps {
  wedding: Wedding;
  userEmail: string;
}

export function SettingsManager({ wedding, userEmail }: SettingsManagerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Date-shift dialog state — pops after save when wedding_date changed,
  // so the couple can ask us to move all pre-wedding tasks by the same delta
  // instead of leaving them anchored to the old date.
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftContext, setShiftContext] = useState<{
    deltaDays: number;
    oldDate: string;
    newDate: string;
    affectedCount: number;
  } | null>(null);
  const [shifting, setShifting] = useState(false);

  // Wedding form state
  const [partner1Name, setPartner1Name] = useState(wedding.partner1_name);
  const [partner2Name, setPartner2Name] = useState(wedding.partner2_name);
  const [weddingDate, setWeddingDate] = useState(wedding.wedding_date ?? "");
  const [venueName, setVenueName] = useState(wedding.venue_name ?? "");
  const [venueAddress, setVenueAddress] = useState(
    wedding.venue_address ?? ""
  );
  const [venueIndoorOutdoor, setVenueIndoorOutdoor] = useState(
    wedding.venue_indoor_outdoor ?? ""
  );
  const [guestCount, setGuestCount] = useState(
    wedding.guest_count_estimate?.toString() ?? ""
  );
  const [budgetTotal, setBudgetTotal] = useState(
    wedding.budget_total?.toString() ?? ""
  );
  const [style, setStyle] = useState<string>(wedding.style ?? "");
  const [bridalPartySize, setBridalPartySize] = useState(
    wedding.bridal_party_size?.toString() ?? ""
  );
  const [partner1Attire, setPartner1Attire] = useState(
    wedding.partner1_attire ?? "undecided"
  );
  const [partner2Attire, setPartner2Attire] = useState(
    wedding.partner2_attire ?? "undecided"
  );
  const [ceremonyStyle, setCeremonyStyle] = useState(
    wedding.ceremony_style ?? ""
  );
  const [receptionFormat, setReceptionFormat] = useState(
    wedding.reception_format ?? ""
  );
  const [colorPalette, setColorPalette] = useState(
    wedding.color_palette?.join(", ") ?? ""
  );
  const [culturalElements, setCulturalElements] = useState(
    wedding.cultural_elements ?? ""
  );
  const [venueCurfew, setVenueCurfew] = useState(wedding.venue_curfew ?? "");
  const [honeymoonDeparture, setHoneymoonDeparture] = useState(
    wedding.honeymoon_departure ?? ""
  );

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();

    const colors = colorPalette
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("weddings")
      .update({
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        wedding_date: weddingDate || null,
        venue_name: venueName || null,
        venue_address: venueAddress || null,
        venue_indoor_outdoor:
          (venueIndoorOutdoor as "indoor" | "outdoor" | "mixed") || null,
        guest_count_estimate: guestCount ? parseInt(guestCount) : null,
        budget_total: budgetTotal ? parseFloat(budgetTotal) : null,
        style: (style as WeddingStyle) || null,
        bridal_party_size: bridalPartySize ? parseInt(bridalPartySize) : null,
        partner1_attire:
          (partner1Attire as "dress" | "suit" | "undecided") !== "undecided"
            ? (partner1Attire as "dress" | "suit")
            : null,
        partner2_attire:
          (partner2Attire as "dress" | "suit" | "undecided") !== "undecided"
            ? (partner2Attire as "dress" | "suit")
            : null,
        ceremony_style: ceremonyStyle || null,
        reception_format: receptionFormat || null,
        color_palette: colors.length > 0 ? colors : null,
        cultural_elements: culturalElements || null,
        venue_curfew: venueCurfew || null,
        honeymoon_departure: honeymoonDeparture || null,
      })
      .eq("id", wedding.id);

    setSaving(false);

    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);

      // If the wedding date changed, offer to shift pre-wedding timeline
      // tasks by the same delta. We only prompt when there are actually
      // tasks that would be affected — no point showing an empty dialog.
      const oldDate = wedding.wedding_date;
      const newDate = weddingDate || null;
      if (oldDate && newDate && oldDate !== newDate) {
        const { data: preTasks } = await supabase
          .from("timeline_events")
          .select("id")
          .eq("wedding_id", wedding.id)
          .eq("type", "pre_wedding")
          .not("event_date", "is", null);
        const affected = preTasks?.length ?? 0;
        if (affected > 0) {
          const oldMs = new Date(oldDate + "T00:00:00").getTime();
          const newMs = new Date(newDate + "T00:00:00").getTime();
          const deltaDays = Math.round((newMs - oldMs) / 86_400_000);
          if (deltaDays !== 0) {
            setShiftContext({ deltaDays, oldDate, newDate, affectedCount: affected });
            setShiftDialogOpen(true);
          }
        }
      }
    }
  }

  async function handleShiftTimeline() {
    if (!shiftContext) return;
    setShifting(true);
    const supabase = createClient();

    // Pull dates, shift in JS, write back. (Postgres' date arithmetic would
    // be faster, but this keeps us on the client SDK we already use here.)
    const { data: tasks } = await supabase
      .from("timeline_events")
      .select("id, event_date")
      .eq("wedding_id", wedding.id)
      .eq("type", "pre_wedding")
      .not("event_date", "is", null);

    if (tasks && tasks.length > 0) {
      const ms = 86_400_000 * shiftContext.deltaDays;
      await Promise.all(
        tasks.map((t) => {
          if (!t.event_date) return Promise.resolve();
          const shifted = new Date(new Date(t.event_date + "T00:00:00").getTime() + ms)
            .toISOString()
            .slice(0, 10);
          return supabase
            .from("timeline_events")
            .update({ event_date: shifted })
            .eq("id", t.id);
        })
      );
    }

    setShifting(false);
    setShiftDialogOpen(false);
    setShiftContext(null);
    router.refresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleDeleteWedding() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("weddings")
      .delete()
      .eq("id", wedding.id);

    if (!error) {
      router.push("/onboarding");
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Wedding Details */}
      <Card>
        <CardHeader>
          <CardTitle>Wedding Details</CardTitle>
          <CardDescription>
            Update your wedding information. Changes will reflect across all
            modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Partners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partner1">Partner 1 Name</Label>
              <Input
                id="partner1"
                value={partner1Name}
                onChange={(e) => setPartner1Name(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner2">Partner 2 Name</Label>
              <Input
                id="partner2"
                value={partner2Name}
                onChange={(e) => setPartner2Name(e.target.value)}
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="weddingDate">Wedding Date</Label>
            <Input
              id="weddingDate"
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
            />
          </div>

          {/* Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venueName">Venue Name</Label>
              <Input
                id="venueName"
                placeholder="The Grand Ballroom"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venueAddress">Venue Address</Label>
              <Input
                id="venueAddress"
                placeholder="123 Wedding Lane, City, State"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Indoor/Outdoor */}
          <div className="space-y-2">
            <Label>Indoor / Outdoor</Label>
            <Select
              value={venueIndoorOutdoor}
              onValueChange={(v) => setVenueIndoorOutdoor(v ?? "")}
            >
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

          {/* Guest Count & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestCount">Guest Count Estimate</Label>
              <Input
                id="guestCount"
                type="number"
                placeholder="150"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budgetTotal">Budget Total ($)</Label>
              <Input
                id="budgetTotal"
                type="number"
                placeholder="30000"
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
              />
            </div>
          </div>

          {/* Wedding Style */}
          <div className="space-y-2">
            <Label>Wedding Style</Label>
            <Select
              value={style}
              onValueChange={(v) => setStyle(v ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a style..." />
              </SelectTrigger>
              <SelectContent>
                {weddingStyles.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Wedding Party Size */}
          <div className="space-y-2">
            <Label htmlFor="bridalPartySize">Wedding Party Size</Label>
            <Input
              id="bridalPartySize"
              type="number"
              placeholder="6"
              value={bridalPartySize}
              onChange={(e) => setBridalPartySize(e.target.value)}
            />
          </div>

          {/* Attire */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Ceremony & Reception */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ceremony Style</Label>
              <Select
                value={ceremonyStyle}
                onValueChange={(v) => setCeremonyStyle(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="religious">Religious</SelectItem>
                  <SelectItem value="secular">Secular</SelectItem>
                  <SelectItem value="non-traditional">
                    Non-traditional
                  </SelectItem>
                  <SelectItem value="cultural">Cultural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reception Format</Label>
              <Select
                value={receptionFormat}
                onValueChange={(v) => setReceptionFormat(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sit-down">Sit-down Dinner</SelectItem>
                  <SelectItem value="buffet">Buffet</SelectItem>
                  <SelectItem value="cocktail">Cocktail Style</SelectItem>
                  <SelectItem value="family-style">Family Style</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Palette */}
          <div className="space-y-2">
            <Label htmlFor="colorPalette">Color Palette</Label>
            <Input
              id="colorPalette"
              placeholder="Dusty rose, sage green, gold (comma separated)"
              value={colorPalette}
              onChange={(e) => setColorPalette(e.target.value)}
            />
          </div>

          {/* Cultural Elements */}
          <div className="space-y-2">
            <Label htmlFor="culturalElements">Cultural Elements</Label>
            <Textarea
              id="culturalElements"
              placeholder="Hora, tea ceremony, jumping the broom, etc."
              value={culturalElements}
              onChange={(e) => setCulturalElements(e.target.value)}
              rows={3}
            />
          </div>

          {/* Curfew & Honeymoon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venueCurfew">Venue Curfew</Label>
              <Input
                id="venueCurfew"
                type="time"
                value={venueCurfew}
                onChange={(e) => setVenueCurfew(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Honeymoon Departure</Label>
              <Select
                value={honeymoonDeparture}
                onValueChange={(v) => setHoneymoonDeparture(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same-night">Same night</SelectItem>
                  <SelectItem value="next-morning">Next morning</SelectItem>
                  <SelectItem value="few-days">Few days later</SelectItem>
                  <SelectItem value="no-honeymoon">
                    No honeymoon yet
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saved && (
              <span className="text-sm text-muted-foreground">
                Changes saved successfully.
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details and session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={userEmail} readOnly className="bg-muted" />
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your wedding and all associated data. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger
              render={
                <Button variant="destructive" className="gap-1.5" />
              }
            >
              <Trash2 className="h-4 w-4" />
              Delete Wedding
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This will permanently delete your wedding and all related data
                  including guests, vendors, budget items, timeline events, and
                  more. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline" />}
                >
                  Cancel
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDeleteWedding}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Yes, delete everything"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Timeline-shift prompt — shown after save when wedding date changed
          and there are pre-wedding tasks that would benefit from moving. */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Move your timeline with the new date?
            </DialogTitle>
            <DialogDescription>
              {shiftContext && (
                <>
                  You moved the wedding{" "}
                  <span className="font-medium text-foreground/80">
                    {shiftContext.deltaDays > 0
                      ? `+${shiftContext.deltaDays}`
                      : shiftContext.deltaDays}{" "}
                    {Math.abs(shiftContext.deltaDays) === 1 ? "day" : "days"}
                  </span>
                  . We can shift all {shiftContext.affectedCount} pre-wedding
                  task{shiftContext.affectedCount === 1 ? "" : "s"} by the same
                  amount so deadlines stay relative to the new date.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Keep dates as-is
            </DialogClose>
            <Button onClick={handleShiftTimeline} disabled={shifting}>
              {shifting ? "Shifting..." : "Shift timeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
