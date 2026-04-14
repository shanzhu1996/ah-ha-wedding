"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Gift,
  Search,
  Filter,
  Check,
  Star,
  ClipboardList,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";

// --- Types ---

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  rsvp_status: string;
  gift_description: string | null;
  thank_you_sent: boolean;
}

interface Vendor {
  id: string;
  type: string;
  company_name: string;
  contact_name: string | null;
}

interface PostWeddingManagerProps {
  guests: Guest[];
  vendors: Vendor[];
  weddingId: string;
}

// --- Static checklist data ---

const NAME_CHANGE_ITEMS = [
  "Social Security Administration (SSA)",
  "Driver's license / State ID (DMV)",
  "Passport",
  "Bank accounts",
  "Credit cards",
  "Employer / HR",
  "Insurance (health, auto, home)",
  "Voter registration",
  "Post office / mail forwarding",
  "Utilities",
  "Subscriptions & online accounts",
  "Professional licenses",
  "Vehicle registration/title",
];

const WRAPUP_ITEMS = [
  "Return rental items",
  "Preserve wedding dress (within 1-2 months)",
  "Order prints from photographer",
  "Send final vendor payments",
  "Write reviews for all vendors",
  "Update social media name (if applicable)",
  "Send change-of-address notices",
  "File marriage certificate",
];

const REVIEW_PLATFORMS = ["Google", "Yelp", "The Knot", "WeddingWire"];

const VENDOR_TYPE_LABELS: Record<string, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  dj: "DJ",
  band: "Band",
  caterer: "Caterer",
  florist: "Florist",
  baker: "Baker / Dessert",
  hair_makeup: "Hair & Makeup",
  officiant: "Officiant",
  rentals: "Rentals",
  venue: "Venue",
  transportation: "Transportation",
  coordinator: "Coordinator",
  photo_booth: "Photo Booth",
  other: "Other",
};

// --- Helpers for localStorage checklists ---

function loadChecklist(key: string, items: string[]): Record<string, boolean> {
  if (typeof window === "undefined") {
    return Object.fromEntries(items.map((i) => [i, false]));
  }
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return Object.fromEntries(items.map((i) => [i, false]));
}

function saveChecklist(key: string, state: Record<string, boolean>) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function loadVendorReviews(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem("postwedding-vendor-reviews");
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return {};
}

function saveVendorReviews(state: Record<string, boolean>) {
  try {
    localStorage.setItem("postwedding-vendor-reviews", JSON.stringify(state));
  } catch {
    // ignore
  }
}

// --- Component ---

export function PostWeddingManager({
  guests: initialGuests,
  vendors,
  weddingId,
}: PostWeddingManagerProps) {
  const router = useRouter();

  // Thank-you tracker state
  const [search, setSearch] = useState("");
  const [thankYouFilter, setThankYouFilter] = useState<string>("all");
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [editingGiftValue, setEditingGiftValue] = useState("");

  // Name change checklist
  const [nameChangeState, setNameChangeState] = useState<Record<string, boolean>>(() =>
    loadChecklist("postwedding-namechange", NAME_CHANGE_ITEMS)
  );

  // Wrap-up checklist
  const [wrapUpState, setWrapUpState] = useState<Record<string, boolean>>(() =>
    loadChecklist("postwedding-wrapup", WRAPUP_ITEMS)
  );

  // Vendor reviews
  const [vendorReviewState, setVendorReviewState] = useState<Record<string, boolean>>(() =>
    loadVendorReviews()
  );

  // Persist localStorage on change
  useEffect(() => {
    saveChecklist("postwedding-namechange", nameChangeState);
  }, [nameChangeState]);

  useEffect(() => {
    saveChecklist("postwedding-wrapup", wrapUpState);
  }, [wrapUpState]);

  useEffect(() => {
    saveVendorReviews(vendorReviewState);
  }, [vendorReviewState]);

  // Guests eligible for thank-you tracking
  const thankYouGuests = initialGuests.filter(
    (g) => g.gift_description !== null || g.rsvp_status === "confirmed"
  );

  const filteredGuests = thankYouGuests.filter((g) => {
    const matchesSearch = `${g.first_name} ${g.last_name}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      thankYouFilter === "all" ||
      (thankYouFilter === "sent" && g.thank_you_sent) ||
      (thankYouFilter === "not_sent" && !g.thank_you_sent);
    return matchesSearch && matchesFilter;
  });

  const sentCount = thankYouGuests.filter((g) => g.thank_you_sent).length;
  const totalCount = thankYouGuests.length;
  const progressPercent = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  // Handlers
  const toggleThankYou = useCallback(
    async (guestId: string, currentValue: boolean) => {
      const supabase = createClient();
      await supabase
        .from("guests")
        .update({ thank_you_sent: !currentValue })
        .eq("id", guestId);
      router.refresh();
    },
    [router]
  );

  const saveGiftDescription = useCallback(
    async (guestId: string, description: string) => {
      const supabase = createClient();
      await supabase
        .from("guests")
        .update({ gift_description: description || null })
        .eq("id", guestId);
      setEditingGiftId(null);
      setEditingGiftValue("");
      router.refresh();
    },
    [router]
  );

  function toggleNameChange(item: string) {
    setNameChangeState((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  function toggleWrapUp(item: string) {
    setWrapUpState((prev) => ({ ...prev, [item]: !prev[item] }));
  }

  function toggleVendorReview(vendorId: string) {
    setVendorReviewState((prev) => ({ ...prev, [vendorId]: !prev[vendorId] }));
  }

  const nameChangeDone = Object.values(nameChangeState).filter(Boolean).length;
  const wrapUpDone = Object.values(wrapUpState).filter(Boolean).length;

  return (
    <Tabs defaultValue="thankyou">
      <TabsList>
        <TabsTrigger value="thankyou" className="gap-1.5">
          <Gift className="h-3.5 w-3.5" />
          Thank-Yous
        </TabsTrigger>
        <TabsTrigger value="namechange" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Name Change
        </TabsTrigger>
        <TabsTrigger value="reviews" className="gap-1.5">
          <Star className="h-3.5 w-3.5" />
          Vendor Reviews
        </TabsTrigger>
        <TabsTrigger value="wrapup" className="gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          Wrap-Up
        </TabsTrigger>
      </TabsList>

      {/* Tab 1: Thank-You Tracker */}
      <TabsContent value="thankyou" className="mt-6 space-y-4">
        <Card>
          <CardContent className="p-4">
            <Progress value={progressPercent}>
              <ProgressLabel>Thank-Yous Sent</ProgressLabel>
              <ProgressValue>
                {() => `${sentCount} of ${totalCount}`}
              </ProgressValue>
            </Progress>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={thankYouFilter}
            onValueChange={(v) => setThankYouFilter(v ?? "all")}
          >
            <SelectTrigger className="w-36">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="not_sent">Not Sent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredGuests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {thankYouGuests.length === 0
                ? "No guests with confirmed RSVPs or gifts recorded yet."
                : "No guests match your filter."}
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Gift</th>
                  <th className="text-center px-4 py-3 font-medium w-32">
                    Thank You Sent
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {guest.first_name} {guest.last_name}
                    </td>
                    <td className="px-4 py-3">
                      {editingGiftId === guest.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingGiftValue}
                            onChange={(e) => setEditingGiftValue(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Describe the gift..."
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveGiftDescription(guest.id, editingGiftValue);
                              }
                              if (e.key === "Escape") {
                                setEditingGiftId(null);
                              }
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() =>
                              saveGiftDescription(guest.id, editingGiftValue)
                            }
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-left text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          onClick={() => {
                            setEditingGiftId(guest.id);
                            setEditingGiftValue(guest.gift_description || "");
                          }}
                        >
                          {guest.gift_description || "Click to add gift..."}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={guest.thank_you_sent}
                          onCheckedChange={() =>
                            toggleThankYou(guest.id, guest.thank_you_sent)
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      {/* Tab 2: Name Change Checklist */}
      <TabsContent value="namechange" className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Name Change Checklist
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {nameChangeDone} of {NAME_CHANGE_ITEMS.length} completed
            </p>
          </CardHeader>
          <CardContent>
            <Progress
              value={
                NAME_CHANGE_ITEMS.length > 0
                  ? Math.round((nameChangeDone / NAME_CHANGE_ITEMS.length) * 100)
                  : 0
              }
              className="mb-4"
            >
              <ProgressValue>
                {() => `${Math.round((nameChangeDone / NAME_CHANGE_ITEMS.length) * 100)}%`}
              </ProgressValue>
            </Progress>
            <div className="space-y-3">
              {NAME_CHANGE_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Checkbox
                    checked={nameChangeState[item] || false}
                    onCheckedChange={() => toggleNameChange(item)}
                    id={`nc-${item}`}
                  />
                  <label
                    htmlFor={`nc-${item}`}
                    className={`text-sm cursor-pointer ${
                      nameChangeState[item]
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 3: Vendor Reviews */}
      <TabsContent value="reviews" className="mt-6 space-y-4">
        {vendors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No vendors added yet. Add vendors on the Vendors page first.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {vendors.map((vendor) => {
              const reviewed = vendorReviewState[vendor.id] || false;
              return (
                <Card key={vendor.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={reviewed}
                          onCheckedChange={() => toggleVendorReview(vendor.id)}
                        />
                        <div>
                          <h3
                            className={`font-semibold ${
                              reviewed ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {vendor.company_name}
                          </h3>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {VENDOR_TYPE_LABELS[vendor.type] || vendor.type}
                          </Badge>
                          {reviewed && (
                            <Badge className="ml-2 text-xs bg-green-100 text-green-800">
                              Review Written
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {REVIEW_PLATFORMS.map((platform) => (
                          <Badge
                            key={platform}
                            variant="outline"
                            className="text-xs cursor-default"
                          >
                            <ExternalLink className="h-2.5 w-2.5 mr-1" />
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* Tab 4: Wrap-Up */}
      <TabsContent value="wrapup" className="mt-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Wedding Wrap-Up
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {wrapUpDone} of {WRAPUP_ITEMS.length} completed
            </p>
          </CardHeader>
          <CardContent>
            <Progress
              value={
                WRAPUP_ITEMS.length > 0
                  ? Math.round((wrapUpDone / WRAPUP_ITEMS.length) * 100)
                  : 0
              }
              className="mb-4"
            >
              <ProgressValue>
                {() => `${Math.round((wrapUpDone / WRAPUP_ITEMS.length) * 100)}%`}
              </ProgressValue>
            </Progress>
            <div className="space-y-3">
              {WRAPUP_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Checkbox
                    checked={wrapUpState[item] || false}
                    onCheckedChange={() => toggleWrapUp(item)}
                    id={`wu-${item}`}
                  />
                  <label
                    htmlFor={`wu-${item}`}
                    className={`text-sm cursor-pointer ${
                      wrapUpState[item]
                        ? "line-through text-muted-foreground"
                        : ""
                    }`}
                  >
                    {item}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
