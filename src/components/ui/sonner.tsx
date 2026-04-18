"use client";

import { Toaster as SonnerToaster } from "sonner";

// Minimal shadcn-style wrapper around Sonner with sensible defaults.
// Used app-wide via the root layout.
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      richColors
      toastOptions={{
        className: "font-sans",
        duration: 4000,
      }}
    />
  );
}
