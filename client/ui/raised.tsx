"use client";

import type { ReactNode } from "react";

/**
 * A borderless raised surface for items that sit inside a Section (comments, list rows). Section itself is a muted
 * surface, so these take the lighter card background instead of drawing a second border.
 */
export function Raised({ children }: { children: ReactNode }) {
  return <div className="min-w-0 rounded-[var(--radius-container)] bg-[var(--color-background-card)] p-3">{children}</div>;
}
