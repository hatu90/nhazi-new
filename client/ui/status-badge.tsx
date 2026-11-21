"use client";

import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";
import { useEnum } from "@/client/lib/use-enum";

const statusVariant: Record<string, BadgeVariant> = {
  active: "success", paid: "success", confirmed: "success", resolved: "success", accepted: "success",
  upcoming: "info", open: "info",
  in_progress: "warning", partial: "warning", pending: "warning", high: "warning",
  rejected: "error", declined: "error", urgent: "error", overdue: "error",
};
export function StatusBadge({ status }: { status: string }) {
  const en = useEnum();
  return <Badge variant={statusVariant[status] ?? "neutral"} label={en("status", status)} />;
}
