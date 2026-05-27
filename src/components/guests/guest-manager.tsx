"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Upload,
  Download,
  Loader2,
  Search,
  Trash2,
  Edit,
  Filter,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  UtensilsCrossed,
  X,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
  /** Plus-one's own RSVP. NULL means inherit from primary (default). Lets
   *  the couple capture cases like "Sarah's coming but Mike isn't". */
  plus_one_rsvp: string | null;
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
  partner1Name: string;
  partner2Name: string;
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

// ── Guest list export (XLSX) ─────────────────────────────────────────────
// Couples asked for a "see-it-myself" view. We render to .xlsx (not CSV) so
// the file looks like a real spreadsheet: bold + frozen header row, RSVP
// colour-coded cells, plus-one rows with a subtle gray tint, auto-filter,
// auto-sized columns, and a summary header block. Each plus-one is its own
// row (inheriting the primary's RSVP unless plus_one_rsvp is set), so the
// row count equals the actual head count.

const FRIENDLY_RSVP: Record<string, string> = {
  confirmed: "Attending",
  pending: "Pending",
  no_response: "Pending",
  declined: "Declined",
};

// AARRGGBB hex colors for cell fills + fonts (exceljs uses ARGB ordering).
const RSVP_COLORS: Record<string, { fill: string; text: string }> = {
  confirmed: { fill: "FFDCFCE7", text: "FF166534" }, // green-100 / green-800
  pending: { fill: "FFFEF3C7", text: "FF92400E" }, // amber-100 / amber-800
  no_response: { fill: "FFFEF3C7", text: "FF92400E" },
  declined: { fill: "FFFEE2E2", text: "FF991B1B" }, // red-100 / red-800
};

const HEADER_FILL = "FFE5E7EB"; // gray-200 — bold header row
const TITLE_COLOR = "FF1F2937"; // gray-800
const MUTED_COLOR = "FF6B7280"; // gray-500

function slugForFilename(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitPlusOneName(name: string | null | undefined): {
  first: string;
  last: string;
} {
  const trimmed = name?.trim();
  if (!trimmed) return { first: "", last: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

interface ExportRow {
  firstName: string;
  lastName: string;
  rsvp: string;
  rsvpKey: string;
  meal: string;
  dietary: string;
  plusOneOf: string;
  notes: string;
  isPlusOne: boolean;
}

function buildExportRows(guests: Guest[]): ExportRow[] {
  // Use the guest array as-is — same order the couple sees on /guests
  // (the page query already does `order("last_name", ascending: true)`).
  // Plus-ones are emitted right after their primary, so couples stay
  // adjacent without a separate sort step. If the UI sort changes later
  // (drag-and-drop, insertion order, etc.) the export follows for free.
  // Couples can re-sort however they want in Excel via the auto-filter.
  const rows: ExportRow[] = [];
  for (const g of guests) {
    rows.push({
      firstName: g.first_name,
      lastName: g.last_name,
      rsvp: FRIENDLY_RSVP[g.rsvp_status] ?? g.rsvp_status,
      rsvpKey: g.rsvp_status,
      meal: g.meal_choice ?? "",
      dietary: g.dietary_restrictions ?? "",
      plusOneOf: "",
      notes: g.notes ?? "",
      isPlusOne: false,
    });
    if (g.plus_one) {
      const poRsvp = g.plus_one_rsvp ?? g.rsvp_status;
      const { first, last } = splitPlusOneName(g.plus_one_name);
      rows.push({
        firstName: first || "(unnamed)",
        lastName: last,
        rsvp: FRIENDLY_RSVP[poRsvp] ?? poRsvp,
        rsvpKey: poRsvp,
        meal: "",
        dietary: "",
        plusOneOf: `${g.first_name} ${g.last_name}`.trim(),
        notes: "",
        isPlusOne: true,
      });
    }
  }
  return rows;
}

async function buildGuestXlsx(
  guests: Guest[],
  partner1: string,
  partner2: string
): Promise<Blob> {
  // Dynamic import keeps the ~700KB exceljs lib out of the initial page
  // bundle — only loaded when the couple actually clicks Export.
  const ExcelJS = (await import("exceljs")).default;

  const rows = buildExportRows(guests);

  // Head counts
  let confirmedCount = 0;
  let pendingCount = 0;
  let declinedCount = 0;
  for (const r of rows) {
    if (r.rsvpKey === "confirmed") confirmedCount++;
    else if (r.rsvpKey === "declined") declinedCount++;
    else pendingCount++;
  }

  // Dietary summary
  const dietarySet = new Set<string>();
  for (const g of guests) {
    const d = g.dietary_restrictions?.trim();
    if (d) dietarySet.add(d);
  }
  const dietaryList = Array.from(dietarySet);
  const today = new Date().toISOString().slice(0, 10);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ah-Ha";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Guests", {
    properties: { defaultRowHeight: 18 },
  });

  // Column widths — sized for typical content. exceljs uses character units
  // (~1 char ≈ 7px) so 14 reads as ~98px etc.
  const columns: Array<{ width: number }> = [
    { width: 14 }, // First Name
    { width: 14 }, // Last Name
    { width: 12 }, // RSVP
    { width: 14 }, // Meal
    { width: 22 }, // Dietary
    { width: 20 }, // Plus-One Of
    { width: 34 }, // Notes
  ];
  sheet.columns = columns;

  // ── Summary header block (rows 1-5) ──────────────────────────────────
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `Wedding Guest List — ${partner1} & ${partner2}`;
  titleCell.font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: TITLE_COLOR },
  };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  sheet.getRow(1).height = 28;

  sheet.mergeCells("A2:G2");
  const subCell = sheet.getCell("A2");
  subCell.value = `Generated ${today}`;
  subCell.font = { name: "Calibri", size: 10, color: { argb: MUTED_COLOR } };
  sheet.getRow(2).height = 16;

  sheet.mergeCells("A3:G3");
  const statsCell = sheet.getCell("A3");
  statsCell.value = `${rows.length} total · ${confirmedCount} attending · ${pendingCount} pending · ${declinedCount} declined`;
  statsCell.font = { name: "Calibri", size: 11 };
  sheet.getRow(3).height = 18;

  let headerRowIndex = 5;
  if (dietaryList.length > 0) {
    sheet.mergeCells("A4:G4");
    const dietCell = sheet.getCell("A4");
    const preview = dietaryList.slice(0, 5).join(", ");
    const more = dietaryList.length > 5 ? "…" : "";
    dietCell.value = `${dietaryList.length} with dietary needs (${preview}${more})`;
    dietCell.font = { name: "Calibri", size: 11 };
    sheet.getRow(4).height = 18;
    headerRowIndex = 6;
  }

  // ── Header row ───────────────────────────────────────────────────────
  const headerLabels = [
    "First Name",
    "Last Name",
    "RSVP",
    "Meal",
    "Dietary",
    "Plus-One Of",
    "Notes",
  ];
  const headerRow = sheet.getRow(headerRowIndex);
  headerLabels.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  headerRow.height = 22;
  headerRow.eachCell((cell, col) => {
    if (col > headerLabels.length) return;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: TITLE_COLOR } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL },
    };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF9CA3AF" } },
    };
  });

  // ── Data rows ────────────────────────────────────────────────────────
  rows.forEach((r, i) => {
    const rowIndex = headerRowIndex + 1 + i;
    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = r.firstName;
    row.getCell(2).value = r.lastName;
    row.getCell(3).value = r.rsvp;
    row.getCell(4).value = r.meal;
    row.getCell(5).value = r.dietary;
    row.getCell(6).value = r.plusOneOf;
    row.getCell(7).value = r.notes;

    // Base font + alignment
    row.eachCell((c, col) => {
      if (col > headerLabels.length) return;
      c.font = { name: "Calibri", size: 11 };
      c.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    });

    // RSVP cell colored by status — the only background colour in data rows.
    // Plus-one rows share the same white background as primaries (the
    // "Plus-One Of" column carries the distinction; the bg tint would be
    // redundant signal for "treated the same").
    const palette = RSVP_COLORS[r.rsvpKey];
    if (palette) {
      const rsvpCell = row.getCell(3);
      rsvpCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: palette.fill },
      };
      rsvpCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: palette.text } };
    }
  });

  // Freeze the summary block + header row so they stay visible while
  // scrolling through long guest lists.
  sheet.views = [
    {
      state: "frozen",
      xSplit: 0,
      ySplit: headerRowIndex,
    },
  ];

  // Auto-filter on the data range so couples can sort by RSVP / Dietary etc.
  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: headerRowIndex, column: headerLabels.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function GuestManager({ guests: initialGuests, weddingId, receptionFormat, vendorMealsTotal, vendorsWithoutMeals, partner1Name, partner2Name }: GuestManagerProps) {
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
  const [exporting, setExporting] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState("pending");
  const [mealChoice, setMealChoice] = useState("");
  const [dietary, setDietary] = useState("");
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState("");
  // null = inherit from primary's RSVP
  const [plusOneRsvp, setPlusOneRsvp] = useState<string | null>(null);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [address, setAddress] = useState("");
  const [relationshipTag, setRelationshipTag] = useState("");
  const [notes, setNotes] = useState("");

  const showMealChoice = !NON_PLATED_FORMATS.includes(receptionFormat ?? "");

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
  // A plus-one only counts as a head when they're actually coming.
  // plus_one_rsvp === "declined" means "Sarah's still coming but Mike isn't" —
  // primary still 1 head, plus-one 0. NULL means inherit, so confirmed primary
  // → confirmed plus-one.
  const confirmedPlusOnes = confirmedGuests.filter(
    (g) => g.plus_one && g.plus_one_rsvp !== "declined"
  ).length;
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
    setPlusOneRsvp(null);
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
    setPlusOneRsvp(guest.plus_one_rsvp);
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
      // Clear plus_one_rsvp when there's no plus-one — keeps the column tidy.
      plus_one_rsvp: plusOne ? plusOneRsvp : null,
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

  async function handleExport() {
    if (initialGuests.length === 0) {
      toast.error("No guests to export yet");
      return;
    }
    setExporting(true);
    try {
      const blob = await buildGuestXlsx(initialGuests, partner1Name, partner2Name);
      const today = new Date().toISOString().slice(0, 10);
      const filename = `${slugForFilename(partner1Name)}-${slugForFilename(partner2Name)}-guest-list-${today}.xlsx`;
      downloadBlob(blob, filename);
      toast.success(`Exported ${initialGuests.length} guests`);
    } catch (err) {
      toast.error("Could not generate spreadsheet", {
        description: err instanceof Error ? err.message : "Try again or refresh.",
      });
    } finally {
      setExporting(false);
    }
  }

  async function quickRsvpUpdate(id: string, newStatus: string) {
    const supabase = createClient();
    await supabase.from("guests").update({ rsvp_status: newStatus }).eq("id", id);
    router.refresh();
  }

  // Toggle plus-one's RSVP between Coming (NULL = inherits primary) and
  // Not Coming (= "declined"). Only meaningful when the primary is confirmed
  // — otherwise the plus-one's "own" RSVP doesn't change anything visible.
  async function quickPlusOneToggle(guest: Guest) {
    if (guest.rsvp_status !== "confirmed" || !guest.plus_one) return;
    const supabase = createClient();
    const next = guest.plus_one_rsvp === "declined" ? null : "declined";
    await supabase
      .from("guests")
      .update({ plus_one_rsvp: next })
      .eq("id", guest.id);
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
                {`${vendorsWithoutMeals} ${vendorsWithoutMeals === 1 ? "vendor" : "vendors"} missing meal count →`}
              </Link>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">
            Build your guest list. It feeds seating, catering, and thank-you cards.
          </p>
        )}
      </div>


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
          {initialGuests.length > 0 && (
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              size="sm"
              className="gap-1.5 text-xs h-9"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Export
            </Button>
          )}
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
                      {guest.plus_one &&
                        (() => {
                          // Effectively not coming = primary declined (plus-one
                          // can't come without their host) OR plus_one_rsvp
                          // explicitly declined ("Sarah's coming, Mike isn't").
                          const notComing =
                            guest.rsvp_status === "declined" ||
                            guest.plus_one_rsvp === "declined";
                          // Only togglable when primary is confirmed — that's
                          // the only state where the plus-one's own RSVP can
                          // diverge from the primary's. Other states inherit.
                          const togglable = guest.rsvp_status === "confirmed";
                          const label = guest.plus_one_name
                            ? `+ ${guest.plus_one_name}`
                            : "+1";
                          const inner = (
                            <span
                              className={cn(
                                "text-xs",
                                notComing
                                  ? "text-muted-foreground/60 line-through"
                                  : "text-muted-foreground"
                              )}
                            >
                              {label}
                            </span>
                          );
                          if (!togglable) return inner;
                          return (
                            <button
                              type="button"
                              onClick={() => quickPlusOneToggle(guest)}
                              title={
                                notComing
                                  ? "Mark plus-one as coming"
                                  : "Mark plus-one as not coming"
                              }
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              {inner}
                            </button>
                          );
                        })()}
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
            {/* Plus-one own RSVP — only matters when the primary is confirmed.
                Default ("Coming") stores NULL, which the export reader treats
                as "inherits primary". Explicit "Not coming" flips just the
                plus-one without touching the primary's RSVP. */}
            {plusOne && editingGuest && rsvpStatus === "confirmed" && (
              <div className="space-y-2">
                <Label className="font-normal text-xs text-muted-foreground">
                  Plus-one also coming?
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlusOneRsvp(null)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md border transition-colors",
                      plusOneRsvp !== "declined"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    Coming
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlusOneRsvp("declined")}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md border transition-colors",
                      plusOneRsvp === "declined"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    Not coming
                  </button>
                </div>
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
