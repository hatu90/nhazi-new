import { formatDate, formatMoney } from "@/client/lib/format";

/** Lease facts any Text block can use as {{key}}. Everything else in an agreement is a form field (TextInput). */
export const BUILT_IN_VARS: { key: string; label: string }[] = [
  { key: "propertyName", label: "Property name" },
  { key: "unitName", label: "Unit" },
  { key: "tenantNames", label: "Tenant names" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "rent", label: "Monthly rent" },
  { key: "deposit", label: "Deposit" },
  { key: "billingDay", label: "Billing day" },
  { key: "today", label: "Today's date" },
];

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

export const buildVars = (f: LeaseFacts): Record<string, string> => ({
  propertyName: f.propertyName,
  unitName: f.unitName,
  tenantNames: f.tenantNames.join(", "),
  startDate: formatDate(f.startDate),
  endDate: f.endDate ? formatDate(f.endDate) : "open-ended",
  rent: formatMoney(f.rent),
  deposit: formatMoney(f.deposit),
  billingDay: `day ${f.billingDay} of the month`,
  today: formatDate(new Date().toISOString().slice(0, 10)),
});

/** Replaces known {{keys}}; unknown ones stay visible so a typo is obvious. */
export const fillText = (text: string, vars: Record<string, string>) => text.replace(/\{\{\s*([A-Za-z]\w*)\s*\}\}/g, (m, key: string) => vars[key] ?? m);
