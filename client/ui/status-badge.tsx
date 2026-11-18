"use client";

import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";

const statusVariant: Record<string, BadgeVariant> = {
  active: "success", paid: "success", confirmed: "success", resolved: "success", accepted: "success",
  upcoming: "info", open: "info",
  in_progress: "warning", partial: "warning", pending: "warning", high: "warning",
  rejected: "error", declined: "error", urgent: "error", overdue: "error",
};
export const StatusBadge = ({ status }: { status: string }) => <Badge variant={statusVariant[status] ?? "neutral"} label={status.replace(/_/g, " ")} />;
