"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
    >
      <Printer className="h-4 w-4" />
      Print
    </button>
  );
}
