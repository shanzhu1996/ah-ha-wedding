"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TableVisual } from "./table-visual";
import {
  TABLE_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
  type TableShape,
} from "./table-templates";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: {
    shape: TableShape;
    capacity: number;
    name: string | null;
  }) => Promise<void> | void;
}

export function AddTableDialog({ open, onOpenChange, onCreate }: Props) {
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID);
  const [customShape, setCustomShape] = useState<TableShape>("round");
  const [customCapacity, setCustomCapacity] = useState("10");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setMode("template");
    setTemplateId(DEFAULT_TEMPLATE_ID);
    setCustomShape("round");
    setCustomCapacity("10");
    setName("");
  }

  async function handleCreate() {
    setSaving(true);
    try {
      if (mode === "template") {
        const tpl = TABLE_TEMPLATES.find((t) => t.id === templateId);
        if (!tpl) return;
        await onCreate({
          shape: tpl.shape,
          capacity: tpl.capacity,
          name: name.trim() || null,
        });
      } else {
        const cap = parseInt(customCapacity);
        if (isNaN(cap) || cap < 1 || cap > 20) return;
        await onCreate({
          shape: customShape,
          capacity: cap,
          name: name.trim() || null,
        });
      }
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  // Preview
  const preview =
    mode === "template"
      ? TABLE_TEMPLATES.find((t) => t.id === templateId)
      : { shape: customShape, capacity: parseInt(customCapacity) || 0 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a table</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template tiles */}
          <div className="grid grid-cols-4 gap-2">
            {TABLE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setMode("template");
                  setTemplateId(tpl.id);
                }}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors",
                  mode === "template" && templateId === tpl.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <TableVisual
                  shape={tpl.shape}
                  capacity={tpl.capacity}
                  assigned={{}}
                  size="sm"
                />
                <span className="font-medium">{tpl.label}</span>
              </button>
            ))}

            {/* Custom tile */}
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors min-h-[160px] justify-center",
                mode === "custom"
                  ? "border-primary bg-primary/5"
                  : "border-border border-dashed hover:bg-muted/40"
              )}
            >
              <Plus className="h-6 w-6 text-muted-foreground" />
              <span className="font-medium">Custom</span>
            </button>
          </div>

          {/* Custom fields */}
          {mode === "custom" && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs">Shape</Label>
                <Select
                  value={customShape}
                  onValueChange={(v) => setCustomShape(v as TableShape)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round">Round</SelectItem>
                    <SelectItem value="rectangle">Rectangle</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="sweetheart">Sweetheart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Capacity</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={customCapacity}
                  onChange={(e) => setCustomCapacity(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          )}

          {/* Optional name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Name (optional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bride's family, Head table"
              className="h-9"
            />
          </div>

          {/* Preview caption */}
          {preview && "capacity" in preview && preview.capacity > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {preview.shape} · {preview.capacity} seat
              {preview.capacity === 1 ? "" : "s"}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Adding..." : "Add table"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
