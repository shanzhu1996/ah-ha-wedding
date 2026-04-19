"use client";

import { useState } from "react";
import {
  Car,
  Umbrella,
  ShieldAlert,
  ClipboardList,
  UtensilsCrossed,
  Flame,
  StickyNote,
  Plus,
  Phone,
  User,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DAY_OF_ROLE_META,
  effectiveEmergencyContacts,
  effectiveRoles,
  type DayOfRole,
  type EmergencyContact,
  type LogisticsData,
} from "./types";
import {
  CollapsibleSection,
  type SectionSummaryChip,
} from "./collapsible-section";

interface LogisticsSectionProps {
  data: LogisticsData;
  onChange: (data: LogisticsData) => void;
}

export function LogisticsSection({ data, onChange }: LogisticsSectionProps) {
  function update(patch: Partial<LogisticsData>) {
    onChange({ ...data, ...patch });
  }

  // ── Normalized shapes (handles legacy records) ────────────────────
  const emergencyContacts = effectiveEmergencyContacts(data);
  const roles = effectiveRoles(data);

  // ── Emergency contact mutators ────────────────────────────────────
  function addEmergencyContact() {
    update({
      emergency_contacts: [
        ...emergencyContacts,
        { id: crypto.randomUUID(), name: "", phone: "" },
      ],
    });
  }
  function updateEmergencyContact(id: string, patch: Partial<EmergencyContact>) {
    update({
      emergency_contacts: emergencyContacts.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    });
  }
  function removeEmergencyContact(id: string) {
    update({
      emergency_contacts: emergencyContacts.filter((c) => c.id !== id),
    });
  }

  // ── Day-of role mutators ──────────────────────────────────────────
  function addCustomRole() {
    update({
      roles_list: [
        ...roles,
        {
          id: crypto.randomUUID(),
          label: "",
          assignee: "",
          isBuiltIn: false,
        },
      ],
    });
  }
  function updateRole(id: string, patch: Partial<DayOfRole>) {
    update({
      roles_list: roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  }
  function removeRole(id: string) {
    update({ roles_list: roles.filter((r) => r.id !== id) });
  }

  // ── Summary chips ─────────────────────────────────────────────────
  const transportChips: SectionSummaryChip[] = data.transportation?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];
  const rainChips: SectionSummaryChip[] = data.rain_plan?.trim()
    ? [{ label: "has plan", tone: "accent" }]
    : [];
  const emergencyChips: SectionSummaryChip[] = (() => {
    const filled = emergencyContacts.filter(
      (c) => c.name?.trim() || c.phone?.trim()
    );
    if (filled.length === 0) return [];
    const first = filled[0];
    const firstLabel =
      first.name?.trim() && first.phone?.trim()
        ? `${first.name.trim()} · ${first.phone.trim()}`
        : first.name?.trim() || first.phone?.trim() || "";
    if (filled.length === 1) {
      return [{ label: firstLabel, tone: "accent" }];
    }
    return [
      { label: `${firstLabel} +${filled.length - 1}`, tone: "accent" },
    ];
  })();
  const assignedRoleCount = roles.filter((r) => r.assignee?.trim()).length;
  const rolesChips: SectionSummaryChip[] =
    assignedRoleCount > 0
      ? [
          {
            label: `${assignedRoleCount} of ${roles.length} assigned`,
            tone: "accent",
          },
        ]
      : [];
  const vendorMealsChips: SectionSummaryChip[] = data.vendor_meals_timing?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];
  const culturalChips: SectionSummaryChip[] = data.cultural_notes?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];
  const notesChips: SectionSummaryChip[] = data.notes?.trim()
    ? [{ label: "has notes", tone: "muted" }]
    : [];

  return (
    <div className="space-y-2">
      {/* 1. Transportation */}
      <CollapsibleSection
        icon={<Car />}
        title="Transportation"
        hint="shuttles, parking, Uber/Lyft between venues"
        summaryChips={transportChips}
      >
        <Textarea
          value={data.transportation}
          onChange={(e) => update({ transportation: e.target.value })}
          placeholder="How is everyone getting between locations? Shuttle times, parking info, Uber/Lyft notes…"
          className="text-sm min-h-[80px]"
        />
      </CollapsibleSection>

      {/* 2. Rain plan */}
      <CollapsibleSection
        icon={<Umbrella />}
        title="Rain plan"
        hint="always have a backup — even if it probably won't rain"
        summaryChips={rainChips}
        emptyLabel="Not planned yet"
      >
        <Textarea
          value={data.rain_plan}
          onChange={(e) => update({ rain_plan: e.target.value })}
          placeholder="If your ceremony or cocktail hour is outdoors, what's the backup? Check with your venue."
          className="text-sm min-h-[80px]"
        />
      </CollapsibleSection>

      {/* 3. Emergency contacts (list) */}
      <CollapsibleSection
        icon={<ShieldAlert />}
        title="Emergency contacts"
        hint="coordinator, backup, family rep — the people your team can call"
        summaryChips={emergencyChips}
        emptyLabel="None added"
      >
        <div className="space-y-2">
          {emergencyContacts.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No contacts yet — add the go-to person (coordinator or a
              trusted friend).
            </p>
          ) : (
            emergencyContacts.map((contact, idx) => (
              <EmergencyContactRow
                key={contact.id}
                contact={contact}
                isPrimary={idx === 0}
                onChange={(patch) => updateEmergencyContact(contact.id, patch)}
                onRemove={() => removeEmergencyContact(contact.id)}
              />
            ))
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={addEmergencyContact}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add contact
          </Button>
        </div>
      </CollapsibleSection>

      {/* 4. Day-of roles (list of built-ins + customs) */}
      <CollapsibleSection
        icon={<ClipboardList />}
        title="Day-of roles"
        hint="the small, critical jobs planners assign"
        summaryChips={rolesChips}
        emptyLabel="None assigned"
      >
        <div className="space-y-2">
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              onChange={(patch) => updateRole(role.id, patch)}
              onRemove={() => removeRole(role.id)}
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addCustomRole}
            className="gap-1.5 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add custom role
          </Button>
        </div>
      </CollapsibleSection>

      {/* 5. Vendor meals — single source of truth (Reception references this) */}
      <CollapsibleSection
        icon={<UtensilsCrossed />}
        title="Vendor meals"
        hint="your vendors work long hours — make sure they're fed"
        summaryChips={vendorMealsChips}
      >
        <Textarea
          value={data.vendor_meals_timing}
          onChange={(e) => update({ vendor_meals_timing: e.target.value })}
          placeholder="When should vendors eat? Usually during speeches or between courses. Note any dietary restrictions for vendor meals."
          className="text-sm min-h-[80px]"
        />
        <p className="text-[11px] text-muted-foreground/70 mt-2">
          Shown under the Dinner moment on the Reception tab.
        </p>
      </CollapsibleSection>

      {/* 6. Cultural / religious logistics */}
      <CollapsibleSection
        icon={<Flame />}
        title="Cultural or religious logistics"
        hint="special setup, timing, or participants for cultural elements"
        summaryChips={culturalChips}
        emptyLabel="None — skip if not applicable"
      >
        <Textarea
          value={data.cultural_notes}
          onChange={(e) => update({ cultural_notes: e.target.value })}
          placeholder="Any cultural or religious logistics to coordinate? Special setup, timing, participants…"
          className="text-sm min-h-[80px]"
        />
      </CollapsibleSection>

      {/* 7. Additional notes */}
      <CollapsibleSection
        icon={<StickyNote />}
        title="Additional notes"
        hint="anything else your team should know on the day of"
        summaryChips={notesChips}
      >
        <Textarea
          value={data.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Any other logistics notes…"
          className="text-sm min-h-[80px]"
        />
      </CollapsibleSection>
    </div>
  );
}

// ── Emergency contact row ───────────────────────────────────────────

function EmergencyContactRow({
  contact,
  isPrimary,
  onChange,
  onRemove,
}: {
  contact: EmergencyContact;
  isPrimary: boolean;
  onChange: (patch: Partial<EmergencyContact>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card">
      <div className="flex items-stretch">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-2 px-3 py-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Input
              value={contact.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={isPrimary ? "Name (primary)" : "Name"}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <Input
              value={contact.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="Phone"
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex items-start shrink-0 pt-1.5 pr-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="More options for contact"
              title="More options"
              className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors data-[popup-open]:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-[160px]">
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// ── Day-of role row ─────────────────────────────────────────────────

function RoleRow({
  role,
  onChange,
  onRemove,
}: {
  role: DayOfRole;
  onChange: (patch: Partial<DayOfRole>) => void;
  onRemove: () => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  return (
    <div className="rounded-lg border border-border/70 bg-card">
      <div className="flex items-stretch">
        <div className="flex-1 px-3 py-2.5 min-w-0 space-y-1">
          {/* Label row — built-ins show the preset label + hint; customs
              render an editable Input for the label. */}
          {role.isBuiltIn ? (
            <div className="text-xs">
              <span className="font-medium text-foreground">{role.label}</span>
              {role.hint && (
                <span className="text-muted-foreground/70">
                  {" · "}
                  {role.hint}
                </span>
              )}
            </div>
          ) : editingLabel || !role.label.trim() ? (
            <Input
              autoFocus={editingLabel}
              value={role.label}
              onChange={(e) => onChange({ label: e.target.value })}
              onBlur={() => setEditingLabel(false)}
              placeholder="Custom role, e.g., Pet handler"
              className={cn(
                "h-8 text-sm font-medium border-transparent focus-visible:border-border shadow-none px-1"
              )}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingLabel(true)}
              className="text-sm font-medium text-foreground hover:text-primary transition-colors text-left"
              title="Rename"
            >
              {role.label}
            </button>
          )}
          <Input
            value={role.assignee}
            onChange={(e) => onChange({ assignee: e.target.value })}
            placeholder="Name & phone (optional)"
            className="h-9 text-sm"
          />
        </div>
        <div className="flex items-start shrink-0 pt-1.5 pr-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`More options for ${role.label || "role"}`}
              title="More options"
              className="p-1 rounded text-muted-foreground/40 hover:text-foreground transition-colors data-[popup-open]:text-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-[160px]">
              <DropdownMenuItem variant="destructive" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove role
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
