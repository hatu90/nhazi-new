import { formatDate, formatMoney, todayIso } from "@/client/lib/format";

/** Lease facts any Text block can use as {{key}}. Everything else in an agreement is a form field (TextInput). */
export interface LeaseFacts {
  propertyName: string;
  unitName: string;
  tenantNames: string[];
  startDate: string;
  endDate: string | null;
  rent: number | null;
  deposit: number;
  billingDay: number;
}

export const buildVars = (f: LeaseFacts, words: { openEnded: string; billingDay: (n: number) => string }): Record<string, string> => ({
  propertyName: f.propertyName,
  unitName: f.unitName,
  tenantNames: f.tenantNames.join(", "),
  startDate: formatDate(f.startDate),
  endDate: f.endDate ? formatDate(f.endDate) : words.openEnded,
  rent: formatMoney(f.rent),
  deposit: formatMoney(f.deposit),
  billingDay: words.billingDay(f.billingDay),
  today: formatDate(todayIso()),
});

/** Replaces known {{keys}}; unknown ones stay visible so a typo is obvious. */
export const fillText = (text: string, vars: Record<string, string>) => text.replace(/\{\{\s*([A-Za-z]\w*)\s*\}\}/g, (m, key: string) => vars[key] ?? m);
