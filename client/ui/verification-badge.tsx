"use client";

import { Badge, type BadgeVariant } from "@astryxdesign/core/Badge";
import { useEnum } from "@/client/lib/use-enum";
import type { VerificationStatus } from "@/client/lib/types";

export const verificationTone: Record<string, BadgeVariant> = { none: "neutral", registered: "info", verified: "success" };

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const en = useEnum();
  return <Badge variant={verificationTone[status] ?? "neutral"} label={en("verificationStatus", status)} />;
}
