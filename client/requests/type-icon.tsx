"use client";

import { CalendarCheck, CircleHelp, LogOut, Wrench, type LucideIcon } from "lucide-react";
import type { RequestType } from "@/client/lib/types";

const look: Record<RequestType, { icon: LucideIcon; bg: string; fg: string }> = {
  maintenance: { icon: Wrench, bg: "--color-background-orange", fg: "--color-text-orange" },
  close_lease: { icon: LogOut, bg: "--color-background-red", fg: "--color-text-red" },
  close_period: { icon: CalendarCheck, bg: "--color-background-teal", fg: "--color-text-teal" },
  enquiry: { icon: CircleHelp, bg: "--color-background-blue", fg: "--color-text-blue" },
};

/** A tinted round badge with an icon that identifies the request type at a glance. */
export function RequestTypeIcon({ type, size = 40 }: { type: RequestType; size?: number }) {
  const { icon: Icon, bg, fg } = look[type];
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `var(${bg})`, color: `var(${fg})` }}
    >
      <Icon size={Math.round(size * 0.45)} />
    </span>
  );
}
