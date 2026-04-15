"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Printer,
  Trash2,
  Edit,
  Users,
  Calendar,
  MapPin,
  Clock,
  Phone,
  AlertCircle,
  Shirt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

interface Wedding {
  id: string;
  partner1_name: string;
  partner2_name: string;
  wedding_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_indoor_outdoor: string | null;
  ceremony_style: string | null;
  style: string | null;
}

interface TimelineEvent {
  id: string;
  type: string;
  event_date: string | null;
  event_time: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  sort_order: number;
  completed: boolean;
}

interface DelegationTask {
  id: string;
  wedding_id: string;
  task: string;
  assigned_to: string;
  contact: string | null;
  notes: string | null;
  created_at: string;
}

interface ShareManagerProps {
  wedding: Wedding;
  timelineEvents: TimelineEvent[];
  delegationTasks: DelegationTask[];
}

const ROLE_OPTIONS = [
  "Best Man",
  "Maid of Honor",
  "Honor Attendant",
  "Bridesmaid",
  "Groomsman",
  "Usher",
  "Reader",
  "Flower Girl",
  "Ring Bearer",
  "Officiant",
  "MC / Emcee",
  "Day-of Coordinator",
  "Other",
];

export function ShareManager({
  wedding,
  timelineEvents,
  delegationTasks: initialTasks,
}: ShareManagerProps) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<DelegationTask | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [role, setRole] = useState("Honor Attendant");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");

  // Preview state
  const [previewRole, setPreviewRole] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState("");
  const [dressCode, setDressCode] = useState("");

  function resetForm() {
    setName("");
    setRole("Honor Attendant");
    setContact("");
    setNotes("");
    setEditingTask(null);
  }

  function openEdit(task: DelegationTask) {
    setEditingTask(task);
    setName(task.assigned_to);
    setRole(task.task);
    setContact(task.contact || "");
    setNotes(task.notes || "");
    setShowDialog(true);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const payload = {
      wedding_id: wedding.id,
      task: role,
      assigned_to: name,
      contact: contact || null,
      notes: notes || null,
    };

    if (editingTask) {
      await supabase
        .from("delegation_tasks")
        .update(payload)
        .eq("id", editingTask.id);
    } else {
      await supabase.from("delegation_tasks").insert(payload);
    }

    setSaving(false);
    setShowDialog(false);
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    await supabase.from("delegation_tasks").delete().eq("id", id);
    router.refresh();
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "TBD";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }

  function handlePrint() {
    const keyEvents = timelineEvents.filter((e) => {
      const title = e.title.toLowerCase();
      return (
        title.includes("ceremony") ||
        title.includes("cocktail") ||
        title.includes("reception") ||
        title.includes("dinner") ||
        title.includes("first dance") ||
        title.includes("cake") ||
        title.includes("send-off") ||
        title.includes("photos") ||
        title.includes("wedding party") ||
        title.includes("getting ready") ||
        title.includes("welcome") ||
        title.includes("toast") ||
        title.includes("bouquet") ||
        title.includes("last dance") ||
        timelineEvents.length <= 10
      );
    });

    const eventsToShow = keyEvents.length > 0 ? keyEvents : timelineEvents.slice(0, 10);

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Wedding Info - ${wedding.partner1_name} & ${wedding.partner2_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 24px; }
    h1 { font-size: 28px; text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 32px; }
    h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 2px; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 28px 0 14px; }
    .info-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; font-size: 14px; }
    .info-label { font-weight: bold; min-width: 80px; }
    .timeline-item { display: flex; gap: 12px; margin-bottom: 8px; font-size: 14px; }
    .timeline-time { font-weight: bold; min-width: 80px; text-align: right; }
    .timeline-title { flex: 1; }
    .role-box { background: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .role-name { font-weight: bold; font-size: 15px; }
    .role-title { color: #666; font-size: 13px; }
    .contacts { font-size: 13px; line-height: 1.8; }
    .dress-code { font-size: 14px; line-height: 1.6; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <h1>${wedding.partner1_name} & ${wedding.partner2_name}</h1>
  <p class="subtitle">${formatDate(wedding.wedding_date)}</p>

  <h2>Venue</h2>
  <div class="info-row"><span class="info-label">Venue:</span> ${wedding.venue_name || "TBD"}</div>
  ${wedding.venue_address ? `<div class="info-row"><span class="info-label">Address:</span> ${wedding.venue_address}</div>` : ""}

  <h2>Day-of Timeline</h2>
  ${eventsToShow.length === 0 ? "<p style='font-size:14px;color:#888;'>No day-of events added yet.</p>" : eventsToShow.map((e) => `<div class="timeline-item"><span class="timeline-time">${formatTime(e.event_time)}</span><span class="timeline-title">${e.title}</span></div>`).join("")}

  ${previewRole ? `<h2>Your Role</h2><div class="role-box"><div class="role-name">${previewRole}</div></div>` : ""}

  ${emergencyContacts ? `<h2>Emergency Contacts</h2><div class="contacts">${emergencyContacts.replace(/\n/g, "<br/>")}</div>` : ""}

  ${dressCode ? `<h2>Dress Code</h2><div class="dress-code">${dressCode.replace(/\n/g, "<br/>")}</div>` : ""}
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }

  return (
    <>
      {/* Wedding Party Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Wedding Party
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowDialog(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </CardHeader>
        <CardContent>
          {initialTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No wedding party members added yet. Click &ldquo;Add Member&rdquo; to get started.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialTasks.map((task) => (
                <Card key={task.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{task.assigned_to}</h3>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {task.task}
                        </Badge>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(task)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {task.contact && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {task.contact}
                      </p>
                    )}
                    {task.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shareable Page Preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-5 w-5" />
            Shareable Page Preview
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Customize the info below, then print or save as PDF to share with your wedding party.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Shirt className="h-3.5 w-3.5" />
                Dress Code
              </Label>
              <Textarea
                value={dressCode}
                onChange={(e) => setDressCode(e.target.value)}
                placeholder="Black tie, cocktail attire, etc."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Emergency Contacts
              </Label>
              <Textarea
                value={emergencyContacts}
                onChange={(e) => setEmergencyContacts(e.target.value)}
                placeholder={"Coordinator: Jane (555) 123-4567\nBest Man: John (555) 987-6543"}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Your Role (preview)
              </Label>
              <Input
                value={previewRole}
                onChange={(e) => setPreviewRole(e.target.value)}
                placeholder="e.g. Honor Attendant"
              />
            </div>
          </div>

          <Separator />

          {/* Preview card */}
          <div className="border rounded-lg p-6 bg-muted/30 space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold font-[family-name:var(--font-heading)]">
                {wedding.partner1_name} & {wedding.partner2_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatDate(wedding.wedding_date)}
              </p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Venue
              </h3>
              <p className="text-sm">{wedding.venue_name || "TBD"}</p>
              {wedding.venue_address && (
                <p className="text-xs text-muted-foreground">{wedding.venue_address}</p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Day-of Timeline
              </h3>
              {timelineEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No day-of events yet.</p>
              ) : (
                <div className="space-y-1">
                  {timelineEvents.slice(0, 10).map((evt) => (
                    <div key={evt.id} className="flex gap-3 text-sm">
                      <span className="font-medium min-w-[70px] text-right">
                        {formatTime(evt.event_time)}
                      </span>
                      <span>{evt.title}</span>
                    </div>
                  ))}
                  {timelineEvents.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      +{timelineEvents.length - 10} more events
                    </p>
                  )}
                </div>
              )}
            </div>

            {previewRole && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Your Role
                </h3>
                <p className="text-sm">{previewRole}</p>
              </div>
            )}

            {emergencyContacts && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Emergency Contacts
                </h3>
                <p className="text-sm whitespace-pre-line">{emergencyContacts}</p>
              </div>
            )}

            {dressCode && (
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Shirt className="h-3.5 w-3.5" />
                  Dress Code
                </h3>
                <p className="text-sm">{dressCode}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Member Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Party Member" : "Add Party Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={role} onValueChange={(v) => setRole(v ?? "Honor Attendant")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contact (phone or email)</Label>
              <Input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="(555) 123-4567 or email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Tasks / Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hold the rings, give a toast, coordinate vendors..."
                rows={3}
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
              <Button onClick={handleSave} disabled={saving || !name}>
                {saving ? "Saving..." : editingTask ? "Update" : "Add Member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
