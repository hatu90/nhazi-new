"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/client/lib/format";
import type { IMonthBreakdown } from "@/client/lib/types";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];
const monthLabel = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
const compact = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

/** Stacked bars of the recent 3-5 months: how what was invoiced in each month splits into deposit, rent, electric, water ... */
export function MonthChart({ months }: { months: IMonthBreakdown[] }) {
  const keys: { key: string; label: string }[] = [];
  for (const p of months) for (const s of p.segments) if (!keys.some((k) => k.key === s.key)) keys.push({ key: s.key, label: s.label });
  const data = months.map((p) => ({ name: monthLabel(p.month), ...Object.fromEntries(p.segments.map((s) => [s.key, s.amount])) }));

  return (
    <div role="img" aria-label="Invoiced amounts per month" style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.15} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} />
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
