"use client";

import { useEffect, useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Droplets,
  Cross,
  Wrench,
  Shirt,
  Scissors as ScissorsIcon,
  Sparkles,
  Sun,
  Apple,
} from "lucide-react";

const STORAGE_KEY = "wedding-emergency-kit-checked";

type KitCategory = {
  name: string;
  icon: React.ElementType;
  color: string;
  items: string[];
};

const categories: KitCategory[] = [
  {
    name: "Hygiene",
    icon: Droplets,
    color:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    items: [
      "Deodorant",
      "Breath mints",
      "Floss",
      "Mouthwash",
      "Tissues",
      "Hand sanitizer",
      "Wet wipes",
      "Blotting papers",
      "Static guard",
      "Wrinkle release spray",
      "Lint roller",
    ],
  },
  {
    name: "First Aid",
    icon: Cross,
    color:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    items: [
      "Band-aids (+ blister-specific)",
      "Ibuprofen",
      "Acetaminophen",
      "Antacid",
      "Allergy medicine",
      "Eye drops",
      "Sunscreen",
      "Bug spray",
    ],
  },
  {
    name: "Tools",
    icon: Wrench,
    color:
      "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
    items: [
      "Scissors",
      "Box cutter",
      "Clear tape",
      "Double-sided tape",
      "Duct tape",
      "Super glue",
      "Zip ties",
      "Safety pins",
      "Rubber bands",
      "Sharpie",
      "Pen",
      "Extra batteries",
      "Phone charger + cable",
      "Extension cord",
      "Lighter",
    ],
  },
  {
    name: "Wardrobe",
    icon: Shirt,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    items: [
      "Sewing kit",
      "Fashion tape",
      "Hem tape",
      "Extra buttons",
      "Stain remover pen",
      "White chalk",
      "Clear nail polish",
      "Shoe insoles",
      "Moleskin",
    ],
  },
  {
    name: "Hair",
    icon: ScissorsIcon,
    color:
      "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    items: [
      "Bobby pins",
      "Hair ties",
      "Hair spray",
      "Dry shampoo",
      "Small brush/comb",
      "Hair clips",
    ],
  },
  {
    name: "Makeup",
    icon: Sparkles,
    color:
      "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    items: [
      "Pressed powder",
      "Lipstick / lip color (your shade)",
      "Makeup wipes",
      "Cotton swabs",
      "Setting spray",
      "Concealer",
      "Blotting papers",
    ],
  },
  {
    name: "Outdoor",
    icon: Sun,
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    items: [
      "Umbrella (clear bubble)",
      "Bug spray",
      "Sunscreen",
      "Pashminas/blankets",
      "Hand fans",
    ],
  },
  {
    name: "Sustenance",
    icon: Apple,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    items: [
      "Water bottles",
      "Protein bars",
      "Mints",
      "Crackers",
      "Electrolyte packets",
      "Straws",
    ],
  },
];

const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

export function EmergencyKitChecklist() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCheckedItems(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setMounted(true);
  }, []);

  const toggleItem = useCallback(
    (key: string) => {
      setCheckedItems((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        // Clean up unchecked items
        if (!next[key]) delete next[key];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // storage full, ignore
        }
        return next;
      });
    },
    []
  );

  const checkedCount = Object.keys(checkedItems).length;
  const progressPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <Card size="sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Kit progress</span>
            <Badge variant={checkedCount === totalItems ? "default" : "secondary"}>
              {mounted ? checkedCount : 0} / {totalItems} items
            </Badge>
          </div>
          <div className="flex items-center gap-3 min-w-[200px] flex-1 max-w-sm">
            <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: mounted ? `${progressPct}%` : "0%" }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
              {mounted ? progressPct : 0}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Categories grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => {
          const Icon = category.icon;
          const catChecked = category.items.filter(
            (item) => checkedItems[`${category.name}::${item}`]
          ).length;
          return (
            <Card key={category.name}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${category.color}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    {category.name}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground tabular-nums">
                    {mounted ? catChecked : 0}/{category.items.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {category.items.map((item) => {
                    const key = `${category.name}::${item}`;
                    const isChecked = !!checkedItems[key];
                    return (
                      <li key={key}>
                        <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleItem(key)}
                          />
                          <span
                            className={
                              isChecked
                                ? "text-muted-foreground line-through"
                                : ""
                            }
                          >
                            {item}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
