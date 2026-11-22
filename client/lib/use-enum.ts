"use client";

import { useTranslations } from "next-intl";

export type EnumGroup = "status" | "role" | "category" | "invoiceKind" | "itemKind" | "refundKind" | "paymentMethod" | "requestType" | "priority" | "usageBase" | "condition" | "verificationStatus" | "criterionStatus";

const humanize = (v: string) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Translated label for an enum value: `const en = useEnum(); en("role", member.role)`. Unknown values fall back to a humanized form. */
export function useEnum() {
  const t = useTranslations("Enums");
  return (group: EnumGroup, value: string) => {
    const key = `${group}.${value}` as never;
    return t.has(key) ? t(key) : humanize(value);
  };
}

/** `{ value, label }` options for a select, in the given order. */
export function useEnumOptions() {
  const en = useEnum();
  return (group: EnumGroup, values: readonly string[]) => values.map((v) => ({ value: v, label: en(group, v) }));
}
