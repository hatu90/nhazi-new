"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/client/lib/format";
import type { IMonthBreakdown } from "@/client/lib/types";

const COLORS = ["#357d9d", "#10b981", "#f59e0b", "#7cc4e0", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];
const monthLabel = (ym: string, locale: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const compact = (n: number, locale: string) => new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Stacked bars of the recent 3-5 months: how what was invoiced in each month splits into deposit, rent, electric, water ... */
export function MonthChart({ months }: { months: IMonthBreakdown[] }) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  // The server sends English labels for the fixed segments; service segments carry the service's own name.
  const fixed: Record<string, string> = { deposit: t("segmentDeposit"), rent: t("segmentRent"), other: t("segmentOther") };
  const keys: { key: string; label: string }[] = [];
  for (const p of months) for (const s of p.segments) if (!keys.some((k) => k.key === s.key)) keys.push({ key: s.key, label: fixed[s.key] ?? s.label });
  const data = months.map((p) => ({ name: monthLabel(p.month, locale), ...Object.fromEntries(p.segments.map((s) => [s.key, s.amount])) }));

  return (
    <div role="img" aria-label={t("chartLabel")} style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(n: number) => compact(n, locale)} tickLine={false} axisLine={false} width={48} />
          <Tooltip formatter={(v, name) => [formatMoney(Number(v)), name]} contentStyle={{ borderRadius: 8 }} cursor={{ fillOpacity: 0.08 }} />
          <Legend />
          {keys.map((k, i) => (
            <Bar key={k.key} dataKey={k.key} name={k.label} stackId="cost" fill={COLORS[i % COLORS.length]} maxBarSize={72} radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
