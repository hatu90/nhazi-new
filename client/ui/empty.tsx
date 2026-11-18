"use client";

import { EmptyState } from "@astryxdesign/core/EmptyState";
import type { ReactNode } from "react";

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return <EmptyState title={title} description={hint} actions={action} isCompact />;
}
