"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Upload,
  Search,
  UserCheck,
  UserX,
  Clock,
  Trash2,
  Edit,
  Filter,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
}

const rsvpColors: Record<string, string> = {
  confirmed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  no_response: "bg-gray-100 text-gray-800",
};

export function GuestManager({ guests: initialGuests, weddingId }: GuestManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterRsvp, setFilterRsvp] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkSuccessCount, setBulkSuccessCount] = useState<number | null>(null);

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

  // Stats
  const confirmed = initialGuests.filter((g) => g.rsvp_status === "confirmed").length;
  const declined = initialGuests.filter((g) => g.rsvp_status === "declined").length;
  const pending = initialGuests.filter(
    (g) => g.rsvp_status === "pending" || g.rsvp_status === "no_response"
  ).length;

  // Filtered guests
  const filtered = initialGuests.filter((g) => {
    const matchesSearch =
      `${g.first_name} ${g.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      g.relationship_tag?.toLowerCase().includes(search.toLowerCase());
    const matchesRsvp = filterRsvp === "all" || g.rsvp_status === filterRsvp;
    return matchesSearch && matchesRsvp;
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

    if (editingGuest) {
      await supabase.from("guests").update(payload).eq("id", editingGuest.id);
    } else {
      await supabase.from("guests").insert(payload);
    }

    setSaving(false);
    setShowDialog(false);
    resetForm();
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
      const parts = line.split(/[\t,]+/).map((p) => p.trim());
      const nameParts = parts[0].split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
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
      await supabase.from("guests").insert(guests);
      setBulkSuccessCount(guests.length);
      setTimeout(() => setBulkSuccessCount(null), 3000);
    }

    setSaving(false);
    setShowBulkDialog(false);
    setBulkText("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("guests").delete().eq("id", id);
    router.refresh();
  }

  return (
    <>
      {/* Bulk Add Success Banner */}
      {bulkSuccessCount !== null && (
        <div className="animate-fade-in-up rounded-lg bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <span className="text-green-600 text-lg">&#10024;</span>
          <p className="text-sm font-medium text-green-800">
            {bulkSuccessCount} guest{bulkSuccessCount !== 1 ? "s" : ""} added successfully! Your guest list is growing.
          </p>
        </div>
      )}

      {/* RSVP Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{initialGuests.length}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{confirmed}</div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{declined}</div>
            <p className="text-xs text-muted-foreground">Declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Guest
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowBulkDialog(true)}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Bulk Add
        </Button>
        <div className="flex-1" />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guests..."
            className="pl-9 w-60"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterRsvp} onValueChange={(v) => setFilterRsvp(v ?? "all")}>
          <SelectTrigger className="w-36">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All RSVPs</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="no_response">No Response</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">RSVP</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Meal</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Group</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Plus One</th>
                <th className="text-right px-4 py-3 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => (
                <tr key={guest.id} className="border-t hover:bg-muted/30 group">
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {guest.first_name} {guest.last_name}
                    </div>
                    {guest.dietary_restrictions && (
                      <span className="text-xs text-muted-foreground">
                        {guest.dietary_restrictions}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${rsvpColors[guest.rsvp_status] || ""}`}
                    >
                      {guest.rsvp_status === "no_response"
                        ? "No response"
                        : guest.rsvp_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {guest.meal_choice || "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {guest.relationship_tag || "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {guest.plus_one
                      ? guest.plus_one_name || "Yes"
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(guest)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDelete(guest.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Guest Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? "Edit Guest" : "Add Guest"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="space-y-2">
              <Label>Dietary Restrictions</Label>
              <Input
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="Gluten-free, nut allergy, etc."
              />
            </div>
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
              <Label>Relationship Group</Label>
              <Input
                value={relationshipTag}
                onChange={(e) => setRelationshipTag(e.target.value)}
                placeholder="Bride's family, Groom's college friends, etc."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Add Guests</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste one guest name per line. You can edit details after adding.
          </p>
          <Textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={`John Smith\nJane Doe\nBob Johnson`}
            rows={10}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAdd} disabled={saving || !bulkText.trim()}>
              {saving ? "Adding..." : `Add ${bulkText.split("\n").filter((l) => l.trim()).length} Guests`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
