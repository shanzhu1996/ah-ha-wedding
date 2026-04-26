"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Upload,
  Search,
  Trash2,
  Edit,
  Filter,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  UtensilsCrossed,
  X,
  Lightbulb,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  meal_choice: string | null;
  dietary_restrictions: string | null;
  plus_one: boolean;
  plus_one_name: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  relationship_tag: string | null;
  notes: string | null;
}

interface GuestManagerProps {
  guests: Guest[];
  weddingId: string;
  receptionFormat: string | null;
  vendorMealsTotal: number;
  vendorsWithoutMeals: number;
}

const rsvpColors: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  declined: "bg-red-50 text-red-700 border border-red-200",
  pending: "bg-amber-50 text-amber-800 border border-amber-200",
  no_response: "bg-muted text-muted-foreground border border-border/60",
};

const rsvpCycle: Record<string, string> = {
  pending: "confirmed",
  confirmed: "declined",
  declined: "pending",
  no_response: "pending",
};

const NON_PLATED_FORMATS = ["buffet", "cocktail", "family-style"];

export function GuestManager({ guests: initialGuests, weddingId, receptionFormat, vendorMealsTotal, vendorsWithoutMeals }: GuestManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterRsvp, setFilterRsvp] = useState<string>("all");
  const [filterDietary, setFilterDietary] = useState<boolean>(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSuccessCount, setBulkSuccessCount] = useState<number | null>(null);
  // IDs of the most recent bulk-add, for a ~30s "Undo" affordance.
  const [lastBulkIds, setLastBulkIds] = useState<string[]>([]);
  // Multi-select mode — lets the couple tick several guests and delete them
  // in one action (e.g., removing RSVP decliners).
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showContactSection, setShowContactSection] = useState(false);
  const [rsvpTipDismissed, setRsvpTipDismissed] = useState(true);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState("pending");
  const [mealChoice, setMealChoice] = useState("");
  const [dietary, setDietary] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [address, setAddress] = useState("");
  const [relationshipTag, setRelationshipTag] = useState("");
  const [notes, setNotes] = useState("");

  const showMealChoice = !NON_PLATED_FORMATS.includes(receptionFormat ?? "");

  // Check localStorage for RSVP tip dismissal
  useEffect(() => {
    setRsvpTipDismissed(localStorage.getItem("ahha-rsvp-tip-dismissed") === "true");
  }, []);

  // Stats
  const confirmed = initialGuests.filter((g) => g.rsvp_status === "confirmed").length;
  const declined = initialGuests.filter((g) => g.rsvp_status === "declined").length;
  const pending = initialGuests.filter(
    (g) => g.rsvp_status === "pending" || g.rsvp_status === "no_response"
  ).length;

  // Caterer count: confirmed guests + their plus-ones + vendor meals.
  // Vendors eating on-site (photographer, DJ, videographer) need plates too,
  // and couples routinely forget to add them to the caterer's final count.
  const confirmedGuests = initialGuests.filter((g) => g.rsvp_status === "confirmed");
  const confirmedPlusOnes = confirmedGuests.filter((g) => g.plus_one).length;
  const catererGuestHeadcount = confirmed + confirmedPlusOnes;
  const catererCount = catererGuestHeadcount + vendorMealsTotal;

  // Count of guests with dietary restrictions
  const dietaryCount = initialGuests.filter((g) => g.dietary_restrictions && g.dietary_restrictions.trim()).length;

  // Hide the Meal/Dietary column entirely when nobody has data yet — the
  // pre-RSVP state has 60 guests of "—" which wastes a third of the table.
  // Once any guest has a meal_choice or dietary entry, the column reappears.
  const hasAnyMealOrDietary = initialGuests.some(
    (g) => (g.meal_choice && g.meal_choice.trim()) || (g.dietary_restrictions && g.dietary_restrictions.trim())
  );

  // Filtered guests
  const filtered = initialGuests
    .filter((g) => {
      const matchesSearch =
        `${g.first_name} ${g.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        g.relationship_tag?.toLowerCase().includes(search.toLowerCase());
      const matchesRsvp = filterRsvp === "all" || g.rsvp_status === filterRsvp;
      const matchesDietary = !filterDietary || (g.dietary_restrictions && g.dietary_restrictions.trim());
      return matchesSearch && matchesRsvp && matchesDietary;
    })
    .sort((a, b) => {
      // Smart order — pending first so the couple sees who still needs to be
      // chased, then alphabetical within each status group. No user-facing
      // sort control: filter handles narrowing, smart order handles ordering.
      const priority: Record<string, number> = {
        pending: 0,
        no_response: 1,
        confirmed: 2,
        declined: 3,
      };
      const aP = priority[a.rsvp_status] ?? 4;
      const bP = priority[b.rsvp_status] ?? 4;
      if (aP !== bP) return aP - bP;
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
    });

  function resetForm() {
    setFirstName("");
    setLastName("");
    setRsvpStatus("pending");
    setMealChoice("");
    setDietary("");
    setPlusOne(false);
    setPlusOneName("");
    setGuestEmail("");
    setGuestPhone("");
    setAddress("");
    setRelationshipTag("");
    setNotes("");
    setEditingGuest(null);
    setShowContactSection(false);
  }

  function openEdit(guest: Guest) {
    setEditingGuest(guest);
    setFirstName(guest.first_name);
    setLastName(guest.last_name);
    setRsvpStatus(guest.rsvp_status);
    setMealChoice(guest.meal_choice || "");
    setDietary(guest.dietary_restrictions || "");
    setPlusOne(guest.plus_one);
    setPlusOneName(guest.plus_one_name || "");
    setGuestEmail(guest.email || "");
    setGuestPhone(guest.phone || "");
    setAddress(guest.address || "");
    setRelationshipTag(guest.relationship_tag || "");
    setNotes(guest.notes || "");
    // Expand contact section if any contact data exists
    const hasContactData = !!(guest.email || guest.phone || guest.address || guest.notes || guest.relationship_tag);
    setShowContactSection(hasContactData);
    setShowDialog(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const payload = {
      wedding_id: weddingId,
      first_name: firstName,
      last_name: lastName,
      rsvp_status: rsvpStatus,
      meal_choice: mealChoice || null,
      dietary_restrictions: dietary || null,
      plus_one: plusOne,
      plus_one_name: plusOneName || null,
      email: guestEmail || null,
      phone: guestPhone || null,
      address: address || null,
      relationship_tag: relationshipTag || null,
      notes: notes || null,
    };

    const isEdit = !!editingGuest;
    const { error } = isEdit
      ? await supabase.from("guests").update(payload).eq("id", editingGuest.id)
      : await supabase.from("guests").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Could not save guest", { description: error.message });
      return;
    }
    toast.success(isEdit ? "Guest updated" : "Guest added");
    setShowDialog(false);
    resetForm();
    router.refresh();
  }

  async function quickRsvpUpdate(id: string, newStatus: string) {
    const supabase = createClient();
    await supabase.from("guests").update({ rsvp_status: newStatus }).eq("id", id);
    router.refresh();
  }

  async function handleBulkAdd() {
    setSaving(true);
    const supabase = createClient();
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const guests = lines.map((line) => {
      // Split by tab or comma first (Excel/Google Sheets use tab, CSV uses comma).
      // If the row has 2+ fields, treat them as first + last. Otherwise fall
      // back to splitting by whitespace (handles "John Smith" plain-paste).
      const parts = line.split(/[\t,]+/).map((p) => p.trim()).filter(Boolean);
      let firstName = "";
      let lastName = "";
      if (parts.length >= 2) {
        firstName = parts[0];
        lastName = parts.slice(1).join(" ");
      } else {
        const nameParts = (parts[0] || "").split(/\s+/);
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
      }
      return {
        wedding_id: weddingId,
        first_name: firstName,
        last_name: lastName,
        rsvp_status: "pending" as const,
        plus_one: false,
        thank_you_sent: false,
      };
    });

    if (guests.length > 0) {
      const { data } = await supabase.from("guests").insert(guests).select("id");
      const ids = (data || []).map((r) => r.id as string);
      setBulkSuccessCount(guests.length);
      setLastBulkIds(ids);
      // Banner self-hides after 30s; the undo window closes with it so a
      // later "Undo" click can't accidentally nuke newer unrelated guests.
      setTimeout(() => {
        setBulkSuccessCount(null);
        setLastBulkIds([]);
      }, 30000);
    }

    setSaving(false);
    setShowBulkDialog(false);
    setBulkText("");
    router.refresh();
  }

  async function handleUndoBulk() {
    if (lastBulkIds.length === 0) return;
    const supabase = createClient();
    const count = lastBulkIds.length;
    await supabase.from("guests").delete().in("id", lastBulkIds);
    setLastBulkIds([]);
    setBulkSuccessCount(null);
    toast.success(`Removed ${count} guest${count !== 1 ? "s" : ""}`);
    router.refresh();
  }

  function enterSelectMode() {
    setSelectMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(visibleIds: string[]) {
    setSelectedIds((prev) => {
      const allSelected = visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Delete ${count} guest${count !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    const supabase = createClient();
    await supabase.from("guests").delete().in("id", Array.from(selectedIds));
    setBulkDeleting(false);
    toast.success(`Deleted ${count} guest${count !== 1 ? "s" : ""}`);
    exitSelectMode();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("guests").delete().eq("id", id);
    router.refresh();
  }

  function dismissRsvpTip() {
    localStorage.setItem("ahha-rsvp-tip-dismissed", "true");
    setRsvpTipDismissed(true);
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
      {/* Header — identity + summary only */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-[family-name:var(--font-heading)] tracking-tight">
          Guests
        </h1>
        {initialGuests.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mt-2">
              Who&apos;s celebrating with you. Track invites, RSVPs, meals, and seating from one place.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-medium text-foreground/80">{initialGuests.length}</span> invited
              <span className="text-muted-foreground/50"> · </span>
              <span className="font-medium text-emerald-700">{confirmed}</span> confirmed
              {pending > 0 && (
                <>
                  <span className="text-muted-foreground/50"> · </span>
                  <span className="font-medium text-amber-700">{pending}</span> pending
                </>
              )}
              {declined > 0 && (
                <>
                  <span className="text-muted-foreground/50"> · </span>
                  <span className="font-medium text-red-700">{declined}</span> declined
                </>
              )}
              {catererCount > 0 && (
                <>
                  <span className="text-muted-foreground/50"> · </span>
                  <span className="inline-flex items-center gap-1">
                    <UtensilsCrossed className="h-3 w-3" />
                    {catererGuestHeadcount === 0 ? (
                      <>
                        <span className="font-medium text-foreground/80">{vendorMealsTotal}</span> vendor meal{vendorMealsTotal === 1 ? "" : "s"} for caterer
                      </>
                    ) : vendorMealsTotal === 0 ? (
                      <>
                        <span className="font-medium text-foreground/80">{catererGuestHeadcount}</span> for caterer
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-foreground/80">{catererGuestHeadcount}</span> guest + <span className="font-medium text-foreground/80">{vendorMealsTotal}</span> vendor for caterer
                      </>
                    )}
                  </span>
                </>
              )}
            </p>
            {vendorsWithoutMeals > 0 && (
              <Link
                href="/vendors"
                className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
              >
                {vendorsWithoutMeals} vendor{vendorsWithoutMeals === 1 ? "" : "s"} missing meal count &rarr;
              </Link>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            Build your guest list. It feeds seating, catering, and thank-you cards.
          </p>
        )}
      </div>

      {/* RSVP Connection Tip — understated, warm palette */}
      {!rsvpTipDismissed && initialGuests.length > 0 && (
        <div className="flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md bg-primary/[0.04] border border-primary/15 text-sm">
          <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-xs text-foreground/80 flex-1">
            Want guests to RSVP online? Add a form to your wedding website.
          </p>
          <Link
            href="/website"
            className="text-xs font-medium text-primary hover:underline whitespace-nowrap"
          >
            Build it &rarr;
          </Link>
          <button
            type="button"
            onClick={dismissRsvpTip}
            className="text-muted-foreground/60 hover:text-foreground transition-colors p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Bulk Add Success + Undo */}
      {bulkSuccessCount !== null && (
        <div className="animate-fade-in-up flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-sm">
          <span className="text-emerald-600">&#10024;</span>
          <p className="text-xs font-medium text-emerald-800 flex-1">
            {bulkSuccessCount} guest{bulkSuccessCount !== 1 ? "s" : ""} added. Your list is growing.
          </p>
          {lastBulkIds.length > 0 && (
            <button
              type="button"
              onClick={handleUndoBulk}
              className="text-xs font-medium text-emerald-800 hover:underline px-2 py-1"
            >
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => { setBulkSuccessCount(null); setLastBulkIds([]); }}
            className="text-emerald-700/60 hover:text-emerald-900 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Toolbar: search + sort + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guests..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {initialGuests.length > 0 && !selectMode && (
            <Button
              variant="outline"
              onClick={enterSelectMode}
              size="sm"
              className="gap-1.5 text-xs h-9"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Select
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowBulkDialog(true)}
            size="sm"
            className="gap-1.5 text-xs h-9"
          >
            <Upload className="h-3.5 w-3.5" />
            Bulk Add
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            size="sm"
            className="gap-1.5 text-xs h-9"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Guest
          </Button>
        </div>
      </div>

      {/* Select-mode action bar */}
      {selectMode && (
        <div className="animate-fade-in-up flex items-center gap-2 pl-3 pr-2 py-2 rounded-md bg-primary/[0.05] border border-primary/20 text-sm">
          <p className="text-xs font-medium text-foreground flex-1">
            {selectedIds.size === 0
              ? "Tap rows to select them, or use the checkbox in the header to select all."
              : `${selectedIds.size} selected`}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0 || bulkDeleting}
            className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            {bulkDeleting ? "Deleting..." : `Delete ${selectedIds.size || ""}`}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitSelectMode}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Guest Table */}
      {filtered.length === 0 ? (
        initialGuests.length === 0 ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center text-center">
              <ClipboardList className="h-12 w-12 text-primary/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Everyone&apos;s invited</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Import your guest list in seconds — paste names, upload a spreadsheet, or add one by one. Track RSVPs, meals, and dietary needs all in one place.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    resetForm();
                    setShowDialog(true);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Guest
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkDialog(true)}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Bulk Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No guests match your search.
            </CardContent>
          </Card>
        )
      ) : (
        <div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {selectMode && (
                  <th className="w-10 px-3 py-2.5">
                    <Checkbox
                      checked={
                        filtered.length > 0 &&
                        filtered.every((g) => selectedIds.has(g.id))
                      }
                      onCheckedChange={() =>
                        toggleSelectAll(filtered.map((g) => g.id))
                      }
                      aria-label="Select all"
                    />
                  </th>
                )}
                <th className="text-left px-3 py-2.5 text-xs font-semibold tracking-[0.1em] uppercase text-foreground/80">Guest</th>

                {/* RSVP column header with filter */}
                <th className="text-left px-3 py-2.5 w-36">
                  <DropdownMenu>
                    <DropdownMenuTrigger className={`inline-flex items-center gap-1 text-xs font-semibold tracking-[0.1em] uppercase transition-colors group ${filterRsvp !== "all" ? "text-primary" : "text-foreground/80 hover:text-foreground"}`}>
                      RSVP
                      <ChevronDown className={`h-3 w-3 transition-opacity ${filterRsvp !== "all" ? "opacity-80" : "opacity-40 group-hover:opacity-80"}`} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => setFilterRsvp("all")} className="flex justify-between">
                        <span>All</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{initialGuests.length}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterRsvp("pending")} className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Pending
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{pending}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterRsvp("confirmed")} className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Confirmed
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{confirmed}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterRsvp("declined")} className="flex justify-between">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Declined
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{declined}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </th>

                {/* Dietary column header with filter — hidden until any guest has data */}
                {hasAnyMealOrDietary && (
                  <th className="text-left px-3 py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={`inline-flex items-center gap-1 text-xs font-semibold tracking-[0.1em] uppercase transition-colors group ${filterDietary ? "text-primary" : "text-foreground/80 hover:text-foreground"}`}>
                        {showMealChoice ? "Meal / Dietary" : "Dietary"}
                        <ChevronDown className={`h-3 w-3 transition-opacity ${filterDietary ? "opacity-80" : "opacity-40 group-hover:opacity-80"}`} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuItem onClick={() => setFilterDietary(false)} className="flex justify-between">
                          <span>All</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{initialGuests.length}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterDietary(true)} className="flex justify-between">
                          <span className="flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            Has dietary needs
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{dietaryCount}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </th>
                )}

                <th className="text-right px-3 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => (
                <tr
                  key={guest.id}
                  className={`border-b border-border/30 group transition-colors ${
                    selectMode && selectedIds.has(guest.id)
                      ? "bg-primary/[0.04]"
                      : "hover:bg-muted/20"
                  }`}
                >
                  {selectMode && (
                    <td
                      className="w-10 px-3 py-3 cursor-pointer"
                      onClick={() => toggleSelect(guest.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(guest.id)}
                        onCheckedChange={() => toggleSelect(guest.id)}
                        aria-label={`Select ${guest.first_name} ${guest.last_name}`}
                      />
                    </td>
                  )}
                  {/* Name + plus-one inline */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {guest.first_name} {guest.last_name}
                      </span>
                      {guest.plus_one && (
                        <span className="text-xs text-muted-foreground">
                          {guest.plus_one_name ? `+ ${guest.plus_one_name}` : "+1"}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* RSVP */}
                  <td className="px-3 py-3">
                    <Select
                      value={guest.rsvp_status}
                      onValueChange={(v) => v && quickRsvpUpdate(guest.id, v)}
                    >
                      <SelectTrigger className={`h-auto py-1 px-2.5 w-auto text-[11px] font-semibold rounded-full shadow-none cursor-pointer hover:opacity-80 transition-all [&>svg]:hidden ${rsvpColors[guest.rsvp_status] || ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectItem value="pending">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        </SelectItem>
                        <SelectItem value="confirmed">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Confirmed
                          </span>
                        </SelectItem>
                        <SelectItem value="declined">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Declined
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Meal + Dietary merged — column hidden until any guest has data */}
                  {hasAnyMealOrDietary && (
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {showMealChoice && guest.meal_choice && (
                          <span className="text-sm text-foreground/80 capitalize">
                            {guest.meal_choice}
                          </span>
                        )}
                        {guest.dietary_restrictions && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {guest.dietary_restrictions}
                          </span>
                        )}
                        {!guest.meal_choice && !guest.dietary_restrictions && (
                          <span className="text-muted-foreground/40 text-sm">—</span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-3 py-3 text-right">
                    <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(guest)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(guest.id)}
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Add/Edit Guest Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? "Edit Guest" : "Add Guest"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Names side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Plus One */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="plusOne"
                checked={plusOne}
                onCheckedChange={(v) => setPlusOne(!!v)}
              />
              <Label htmlFor="plusOne" className="font-normal">
                Has a plus one
              </Label>
            </div>
            {plusOne && (
              <div className="space-y-2">
                <Label>Plus One Name</Label>
                <Input
                  value={plusOneName}
                  onChange={(e) => setPlusOneName(e.target.value)}
                />
              </div>
            )}

            {/* RSVP Status — only when editing */}
            {editingGuest && (
              <div className="space-y-2">
                <Label>RSVP Status</Label>
                <Select value={rsvpStatus} onValueChange={(v) => setRsvpStatus(v ?? "pending")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="no_response">No Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dietary restrictions - always visible */}
            <div className="space-y-2">
              <Label>Dietary restrictions / allergies</Label>
              <Input
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="e.g., gluten-free, nut allergy, vegan"
              />
            </div>

            {/* Meal Choice - only for plated dinners */}
            {showMealChoice && (
              <div className="space-y-2">
                <Label>Meal Choice</Label>
                <Select value={mealChoice} onValueChange={(v) => setMealChoice(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meat">Meat</SelectItem>
                    <SelectItem value="fish">Fish</SelectItem>
                    <SelectItem value="vegetarian">Vegetarian</SelectItem>
                    <SelectItem value="vegan">Vegan</SelectItem>
                    <SelectItem value="kids">Kids</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Collapsible Contact & Address section */}
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowContactSection(!showContactSection)}
            >
              {showContactSection ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {showContactSection ? "Hide details" : "More details"}
            </button>

            {showContactSection && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="For invitation & thank-you cards"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role / Relationship</Label>
                  {(() => {
                    const presetTags = [
                      "Maid of honor",
                      "Best man",
                      "Bridesmaid",
                      "Groomsman",
                      "Parent",
                      "Grandparent",
                      "Sibling",
                      "Family",
                      "Friend",
                      "Colleague",
                      "Plus one",
                    ];
                    const normalized = relationshipTag.trim();
                    const matchesPreset = presetTags.some(
                      (t) => t.toLowerCase() === normalized.toLowerCase()
                    );
                    const selectValue = !normalized
                      ? ""
                      : matchesPreset
                        ? presetTags.find(
                            (t) =>
                              t.toLowerCase() === normalized.toLowerCase()
                          )!
                        : "__custom__";
                    return (
                      <>
                        <Select
                          value={selectValue}
                          onValueChange={(v) => {
                            const next = v ?? "";
                            if (next === "__custom__") {
                              // Keep existing custom value; if none, clear so
                              // the free-text input starts blank.
                              if (matchesPreset) setRelationshipTag("");
                            } else if (next === "") {
                              setRelationshipTag("");
                            } else {
                              setRelationshipTag(next);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="None">
                              {(v) =>
                                !v
                                  ? "None"
                                  : v === "__custom__"
                                    ? "Custom…"
                                    : (v as string)
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {presetTags.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                            <SelectItem value="__custom__">
                              Custom…
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {selectValue === "__custom__" && (
                          <Input
                            value={relationshipTag}
                            onChange={(e) =>
                              setRelationshipTag(e.target.value)
                            }
                            placeholder="Type a role (e.g. Officiant's partner, Niece)"
                            className="mt-2"
                          />
                        )}
                      </>
                    );
                  })()}
                  <p className="text-[11px] text-muted-foreground">
                    Tagging your wedding party auto-generates their Handout
                    and helps Packing, Seating, and Day-of Details suggest
                    the right people.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !firstName || !lastName}>
                {saving ? "Saving..." : editingGuest ? "Update" : "Add Guest"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-h-[85vh] flex flex-col gap-3">
          <DialogHeader>
            <DialogTitle>Bulk Add Guests</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste your guest list — one name per line. Copy from Google Sheets, Excel, your Notes app, or anywhere else. You can edit details after adding.
          </p>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`John Smith\nJane Doe\nBob Johnson`}
            rows={10}
            className="resize-none flex-1 min-h-[240px] overflow-y-auto"
          />
          <div className="flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAdd} disabled={saving || !bulkText.trim()}>
              {saving ? "Adding..." : `Add ${bulkText.split("\n").filter((l) => l.trim()).length} Guests`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
