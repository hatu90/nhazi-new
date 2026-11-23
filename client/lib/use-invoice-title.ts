"use client";

import { useTranslations } from "next-intl";
import { localizeTitle } from "@/lib/billing/generated-title";

/** Titles the system writes itself (stored in English) are shown in the UI language; titles typed by people pass through. */
export function useInvoiceTitle() {
  const t = useTranslations("Invoices.generated");
  return (title: string) => localizeTitle(title, (key, params) => t(key, params));
}
