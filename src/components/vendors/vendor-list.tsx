"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Camera,
  Video,
  Disc3,
  Music2,
  Mic,
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
  Trash2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { VendorType } from "@/types/database";

const vendorTypeConfig: Record<
  VendorType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  photographer: { label: "Photographer", icon: Camera },
  videographer: { label: "Videographer", icon: Video },
  dj: { label: "DJ", icon: Disc3 },
  band: { label: "Band", icon: Music2 },
  mc: { label: "MC / Host", icon: Mic },
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

interface PaymentRow {
  id: string;
  vendor_id: string | null;
  paid: boolean;
  item_type: string;
}

interface VendorListProps {
  vendors: Vendor[];
  weddingId: string;
  paymentsByVendor?: Record<string, PaymentRow[]>;
}

// Inline payment progress — dots paired with "{paid}/{total} paid" so the
// signal is readable without needing to learn the dot legend. Tips excluded.
function PaymentDots({ items }: { items: PaymentRow[] }) {
  if (!items || items.length === 0) return null;
  const contractItems = items.filter((i) => i.item_type !== "tip");
  if (contractItems.length === 0) return null;
  const paidCount = contractItems.filter((i) => i.paid).length;
  return (
    <span className="mt-1 inline-flex items-center gap-1">
      <span className="flex items-center gap-0.5">
        {contractItems.map((i) => (
          <span
            key={i.id}
            className={`inline-block h-1.5 w-1.5 rounded-sm ${
              i.paid ? "bg-emerald-600" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </span>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {paidCount}/{contractItems.length} paid
      </span>
    </span>
  );
}

export function VendorList({ vendors: initialVendors, weddingId, paymentsByVendor = {} }: VendorListProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customTypeName, setCustomTypeName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  function resetForm() {
    setCustomTypeName("");
    setCompanyName("");
    setContactName("");
    setPhone("");
    setEmail("");
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("vendors")
      .insert({
        wedding_id: weddingId,
        type: "other",
        company_name: companyName,
        contact_name: contactName || null,
        phone: phone || null,
        email: email || null,
        extra_details: customTypeName ? { custom_type_name: customTypeName } : null,
      })
      .select("id")
      .single();
    // Scaffold payment schedule (Deposit + Final balance placeholders)
    if (data) {
      await supabase.from("budget_items").insert([
        {
          wedding_id: weddingId,
          category: "Other",
          description: "Deposit",
          amount: 0,
          due_date: null,
          paid: false,
          paid_at: null,
          item_type: "deposit",
          vendor_id: data.id,
          shopping_item_id: null,
        },
        {
          wedding_id: weddingId,
          category: "Other",
          description: "Final balance",
          amount: 0,
          due_date: null,
          paid: false,
          paid_at: null,
          item_type: "balance",
          vendor_id: data.id,
          shopping_item_id: null,
        },
      ]);
    }
    setSaving(false);
    setShowDialog(false);
    resetForm();
    if (data) router.push(`/vendors/${data.id}`);
    else router.refresh();
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const supabase = createClient();
    await supabase.from("vendors").delete().eq("id", id);
    router.refresh();
  }

  const bookedStandard = initialVendors.filter((v) => v.type !== "other");
  const bookedCustom = initialVendors.filter((v) => v.type === "other");
  const bookedTypes = new Set(bookedStandard.map((v) => v.type));
  const standardTypes = Object.entries(vendorTypeConfig).filter(([key]) => key !== "other");
  const unbookedTypes = standardTypes.filter(([key]) => !bookedTypes.has(key));

  return (
    <>
      {/* ===== BOOKED VENDORS ===== */}
      {(bookedStandard.length > 0 || bookedCustom.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Booked Vendors
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {bookedStandard.map((vendor) => {
              const config = vendorTypeConfig[vendor.type as VendorType] || vendorTypeConfig.other;
              const Icon = config.icon;
              return (
                <button
                  key={vendor.id}
                  onClick={() => router.push(`/vendors/${vendor.id}`)}
                  className="relative flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                    <Check className="h-3 w-3 text-white" />
                  </span>
                  <span
                    onClick={(e) => handleDelete(vendor.id, e)}
                    className="absolute top-2 left-2 h-5 w-5 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </span>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <span className="text-xs font-semibold text-foreground block truncate">
                      {vendor.company_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {config.label}
                    </span>
                    <span className="flex justify-center">
                      <PaymentDots items={paymentsByVendor[vendor.id] ?? []} />
                    </span>
                  </div>
                </button>
              );
            })}

            {bookedCustom.map((vendor) => (
              <button
                key={vendor.id}
                onClick={() => router.push(`/vendors/${vendor.id}`)}
                className="relative flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                  <Check className="h-3 w-3 text-white" />
                </span>
                <span
                  onClick={(e) => handleDelete(vendor.id, e)}
                  className="absolute top-2 left-2 h-5 w-5 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </span>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MoreHorizontal className="h-5 w-5 text-primary" />
                </div>
                <div className="text-center min-w-0 w-full">
                  <span className="text-xs font-semibold text-foreground block truncate">
                    {vendor.company_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {(vendor.extra_details as Record<string, string> | null)?.custom_type_name || "Custom"}
                  </span>
                  <span className="flex justify-center">
                    <PaymentDots items={paymentsByVendor[vendor.id] ?? []} />
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* + Custom vendor link */}
          <button
            onClick={() => { resetForm(); setShowDialog(true); }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            Add custom vendor
          </button>
        </div>
      )}

      {/* ===== OTHER VENDORS (unbooked) ===== */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {initialVendors.length > 0 ? "Other Vendors" : "Get Started — Tap any vendor to see what to ask and when to communicate"}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {unbookedTypes.map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => router.push(`/vendors/${key}`)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                  {config.label}
                </span>
              </button>
            );
          })}

          {/* + Custom vendor (in unbooked section too, for first-time users) */}
          {initialVendors.length === 0 && (
            <button
              onClick={() => { resetForm(); setShowDialog(true); }}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-card hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">
                Custom
              </span>
            </button>
          )}
        </div>

        {unbookedTypes.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-lg">
            All vendor types covered!
          </div>
        )}
      </div>

      {/* ===== Custom Vendor Dialog ===== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-left">Add Custom Vendor</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground">
                For vendors not in the standard list.
              </p>
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>What kind of vendor? *</Label>
              <Input value={customTypeName} onChange={(e) => setCustomTypeName(e.target.value)} placeholder="Live Painter, Harpist…" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Company / Name *</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Studio Name LLC" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@email.com" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !companyName}>{saving ? "Saving..." : "Add Vendor"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
