// Canonical table templates for quick creation.
// `shape` must match the DB check constraint on public.tables.shape.

export type TableShape = "round" | "rectangle" | "square" | "sweetheart";

export interface TableTemplate {
  id: string;
  label: string;
  shape: TableShape;
  capacity: number;
  description?: string;
}

export const TABLE_TEMPLATES: TableTemplate[] = [
  { id: "round-8", label: "Round (8)", shape: "round", capacity: 8 },
  { id: "round-10", label: "Round (10)", shape: "round", capacity: 10 },
  { id: "round-12", label: "Round (12)", shape: "round", capacity: 12 },
  { id: "rect-6", label: "Rectangle (6)", shape: "rectangle", capacity: 6 },
  { id: "rect-8", label: "Rectangle (8)", shape: "rectangle", capacity: 8 },
  { id: "rect-10", label: "Rectangle (10)", shape: "rectangle", capacity: 10 },
  {
    id: "sweetheart-2",
    label: "Sweetheart (2)",
    shape: "sweetheart",
    capacity: 2,
    description: "Just the couple",
  },
];

// Recommend "Round 10" as the default when the couple hits "+ Add Table"
export const DEFAULT_TEMPLATE_ID = "round-10";
