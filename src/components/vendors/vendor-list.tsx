"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Camera,
  Video,
  Disc3,
  Music2,
  UtensilsCrossed,
  Flower2,
  Cake,
  Scissors,
  BookHeart,
  Warehouse,
  Building,
  Car,
  ClipboardList,
  Image,
  MoreHorizontal,
  Phone,
  Mail,
  DollarSign,
  Clock,
  Trash2,
  Edit,
  Users,
  ChevronDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { TimePicker } from "@/components/ui/time-picker";
import type { VendorType } from "@/types/database";

const vendorTypeConfig: Record<
  VendorType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  photographer: { label: "Photographer", icon: Camera },
  videographer: { label: "Videographer", icon: Video },
  dj: { label: "DJ", icon: Disc3 },
  band: { label: "Band", icon: Music2 },
  caterer: { label: "Caterer", icon: UtensilsCrossed },
  florist: { label: "Florist", icon: Flower2 },
  baker: { label: "Baker / Dessert", icon: Cake },
  hair_makeup: { label: "Hair & Makeup", icon: Scissors },
  officiant: { label: "Officiant", icon: BookHeart },
  rentals: { label: "Rentals", icon: Warehouse },
  venue: { label: "Venue", icon: Building },
  transportation: { label: "Transportation", icon: Car },
  coordinator: { label: "Coordinator", icon: ClipboardList },
  photo_booth: { label: "Photo Booth", icon: Image },
  other: { label: "Other", icon: MoreHorizontal },
};

interface Vendor {
  id: string;
  type: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  contract_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  balance_due_date: string | null;
  arrival_time: string | null;
  setup_time_minutes: number | null;
  setup_location: string | null;
  breakdown_time: string | null;
  meals_needed: number | null;
  notes: string | null;
  extra_details: Record<string, unknown> | null;
}

interface VendorListProps {
  vendors: Vendor[];
  weddingId: string;
}

export function VendorList({ vendors: initialVendors, weddingId }: VendorListProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [type, setType] = useState<VendorType>("photographer");
  const [customTypeName, setCustomTypeName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPaid, setDepositPaid] = useState(false);
  const [balanceDueDate, setBalanceDueDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [setupMinutes, setSetupMinutes] = useState("");
  const [setupLocation, setSetupLocation] = useState("");
  const [breakdownTime, setBreakdownTime] = useState("");
  const [mealsNeeded, setMealsNeeded] = useState("");
  const [notes, setNotes] = useState("");
  const [showContract, setShowContract] = useState(false);
  const [showLogistics, setShowLogistics] = useState(false);

  function resetForm() {
    setType("photographer");
    setCustomTypeName("");
    setCompanyName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setContractAmount("");
    setDepositAmount("");
    setDepositPaid(false);
    setBalanceDueDate("");
    setArrivalTime("");
    setSetupMinutes("");
    setSetupLocation("");
    setBreakdownTime("");
    setMealsNeeded("");
    setNotes("");
    setEditingVendor(null);
    setShowContract(false);
    setShowLogistics(false);
  }

  function openEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setType(vendor.type as VendorType);
    const extras = vendor.extra_details as Record<string, string> | null;
    setCustomTypeName(extras?.custom_type_name || "");
    setCompanyName(vendor.company_name);
    setContactName(vendor.contact_name || "");
    setPhone(vendor.phone || "");
    setEmail(vendor.email || "");
    setContractAmount(vendor.contract_amount?.toString() || "");
    setDepositAmount(vendor.deposit_amount?.toString() || "");
    setDepositPaid(vendor.deposit_paid);
    setBalanceDueDate(vendor.balance_due_date || "");
    setArrivalTime(vendor.arrival_time || "");
    setSetupMinutes(vendor.setup_time_minutes?.toString() || "");
    setSetupLocation(vendor.setup_location || "");
    setBreakdownTime(vendor.breakdown_time || "");
    setMealsNeeded(vendor.meals_needed?.toString() || "");
    setNotes(vendor.notes || "");
    setShowContract(!!(vendor.contract_amount || vendor.deposit_amount || vendor.balance_due_date));
    setShowLogistics(!!(vendor.arrival_time || vendor.setup_location || vendor.breakdown_time));
    setShowDialog(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const payload = {
      wedding_id: weddingId,
      type,
      company_name: companyName,
      contact_name: contactName || null,
      phone: phone || null,
      email: email || null,
      contract_amount: contractAmount ? parseFloat(contractAmount) : null,
      deposit_amount: depositAmount ? parseFloat(depositAmount) : null,
      deposit_paid: depositPaid,
      balance_due_date: balanceDueDate || null,
      arrival_time: arrivalTime || null,
      setup_time_minutes: setupMinutes ? parseInt(setupMinutes) : null,
      setup_location: setupLocation || null,
      breakdown_time: breakdownTime || null,
      meals_needed: mealsNeeded ? parseInt(mealsNeeded) : null,
      notes: notes || null,
      extra_details: type === "other" && customTypeName ? { custom_type_name: customTypeName } : null,
    };

    if (editingVendor) {
      await supabase
        .from("vendors")
        .update(payload)
        .eq("id", editingVendor.id);
    } else {
      await supabase.from("vendors").insert(payload);
    }

    setSaving(false);
    setShowDialog(false);
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("vendors").delete().eq("id", id);
    router.refresh();
  }

  // Map vendors by type for quick lookup (standard types only, not "other")
  const vendorsByType = new Map<string, Vendor>();
  const customVendors: Vendor[] = [];
  initialVendors.forEach((v) => {
    if (v.type === "other") {
      customVendors.push(v);
    } else {
      vendorsByType.set(v.type, v);
    }
  });

  // Standard types (exclude "other" — it becomes the "+" button)
  const standardTypes = Object.entries(vendorTypeConfig).filter(([key]) => key !== "other");

  return (
    <>
      {/* Unified vendor icon grid */}
      {initialVendors.length === 0 && (
        <p className="text-muted-foreground mb-1">
          Tap a vendor to add their details.
        </p>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {standardTypes.map(([key, config]) => {
          const Icon = config.icon;
          const vendor = vendorsByType.get(key);
          const isAdded = !!vendor;

          return (
            <button
              key={key}
              onClick={() => {
                if (isAdded) {
                  openEdit(vendor);
                } else {
                  resetForm();
                  setType(key as VendorType);
                  setShowDialog(true);
                }
              }}
              className="relative flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all group"
            >
              {isAdded && (
                <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                  <Check className="h-3 w-3 text-white" />
                </span>
              )}
              {isAdded && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(vendor.id);
                  }}
                  className="absolute top-2 left-2 h-5 w-5 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </span>
              )}

              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon className="h-5 w-5 text-primary" />
              </div>

              {isAdded ? (
                <div className="text-center min-w-0 w-full">
                  <span className="text-xs font-semibold text-foreground block truncate">
                    {vendor.company_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {config.label}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                  {config.label}
                </span>
              )}
            </button>
          );
        })}

        {/* "+ Add Custom" button — always visible */}
        <button
          onClick={() => {
            resetForm();
            setType("other" as VendorType);
            setShowDialog(true);
          }}
          className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-card hover:shadow-md hover:border-primary/30 transition-all group"
        >
          <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
            Add Custom
          </span>
        </button>
      </div>

      {/* Custom vendors list */}
      {customVendors.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Custom Vendors</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {customVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => openEdit(vendor)}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MoreHorizontal className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block truncate">{vendor.company_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(vendor.extra_details as Record<string, string> | null)?.custom_type_name || "Custom Vendor"}
                  </span>
                </div>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(vendor.id);
                  }}
                  className="h-7 w-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {/* Header with vendor type icon */}
          {(() => {
            const config = vendorTypeConfig[type] || vendorTypeConfig.other;
            const TypeIcon = config.icon;
            return (
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TypeIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogHeader>
                    <DialogTitle className="text-left">
                      {editingVendor ? `Edit ${config.label}` : `Add ${config.label}`}
                    </DialogTitle>
                  </DialogHeader>
                  <p className="text-xs text-muted-foreground">
                    {editingVendor ? "Update their details below." : "Start with the basics — you can add more later."}
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="space-y-4 pt-2">
            {/* Custom vendor type name */}
            {type === "other" && (
              <div className="space-y-2">
                <Label>What kind of vendor? *</Label>
                <Input
                  value={customTypeName}
                  onChange={(e) => setCustomTypeName(e.target.value)}
                  placeholder="Live Painter, Harpist, Calligrapher…"
                  autoFocus
                  required
                />
              </div>
            )}

            {/* Essentials */}
            <div className="space-y-2">
              <Label>Company / Name *</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Studio Name LLC"
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendor@email.com"
              />
            </div>

            {/* Contract & Payment */}
            <div className="rounded-xl bg-muted/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowContract(!showContract)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center">
                    <DollarSign className="h-3.5 w-3.5 text-amber-700" />
                  </span>
                  <span>
                    <span className="block text-left">Contract & Payment</span>
                    {!showContract && contractAmount && (
                      <span className="block text-[11px] text-muted-foreground font-normal">
                        ${Number(contractAmount).toLocaleString()}{depositPaid ? " · Deposit paid" : ""}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showContract ? "rotate-180" : ""}`} />
              </button>
              {showContract && (
                <div className="px-4 pb-4 pt-1 space-y-3 animate-fade-in-up">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Contract Amount ($)</Label>
                      <Input
                        type="number"
                        value={contractAmount}
                        onChange={(e) => setContractAmount(e.target.value)}
                        placeholder="3,000"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Deposit ($)</Label>
                      <Input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="500"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="depositPaid"
                      checked={depositPaid}
                      onCheckedChange={(v) => setDepositPaid(!!v)}
                    />
                    <Label htmlFor="depositPaid" className="font-normal text-xs">
                      Deposit paid
                    </Label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Balance Due Date</Label>
                    <Input
                      type="date"
                      value={balanceDueDate}
                      onChange={(e) => setBalanceDueDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Day-of Logistics */}
            <div className="rounded-xl bg-muted/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowLogistics(!showLogistics)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="h-3.5 w-3.5 text-blue-700" />
                  </span>
                  <span>
                    <span className="block text-left">Day-of Logistics</span>
                    {!showLogistics && arrivalTime && (
                      <span className="block text-[11px] text-muted-foreground font-normal">
                        Arrives {arrivalTime}{setupLocation ? ` · ${setupLocation}` : ""}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${showLogistics ? "rotate-180" : ""}`} />
              </button>
              {showLogistics && (
                <div className="px-4 pb-4 pt-1 space-y-3 animate-fade-in-up">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Arrival Time</Label>
                    <TimePicker
                      value={arrivalTime}
                      onChange={setArrivalTime}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Setup Location</Label>
                    <Input
                      value={setupLocation}
                      onChange={(e) => setSetupLocation(e.target.value)}
                      placeholder="Main ballroom"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Breakdown Time</Label>
                    <TimePicker
                      value={breakdownTime}
                      onChange={setBreakdownTime}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Vendor Meals Needed</Label>
                    <Input
                      type="number"
                      value={mealsNeeded}
                      onChange={(e) => setMealsNeeded(e.target.value)}
                      placeholder="2"
                      className="h-9"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Shot lists, playlists, special requirements…"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !companyName}
              >
                {saving ? "Saving..." : editingVendor ? "Update" : `Add ${vendorTypeConfig[type]?.label || "Vendor"}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
