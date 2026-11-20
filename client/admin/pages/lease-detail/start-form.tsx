"use client";

import { endOfMonthIso, formatDate, formatMoney, label } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IServiceListResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { ErrorBox, Section } from "@/client/ui";
import { num } from "@/client/ui/form";
import { FDate, FormBody, useSubmit } from "@/client/ui/rhf";
import { planMoveIn } from "@/lib/billing/move-in";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useProperty } from "../../property-layout";
import { MeterOpening, StartValues } from "./meter-opening";

/** Start a draft: confirm the first period, choose the opening meter readings, and see the move-in invoice before it is issued. The invoice is calculated here and sent as the amounts to issue. */
export function StartForm({ path, lease, onDone }: { path: string; lease: ITenancyDetailResponse; onDone: () => void }) {
  const { apiPath } = useProperty();
  const services = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 });
  const save = useSend<object>("POST", `${path}/start`, [path, apiPath("/leases"), apiPath("/invoices"), apiPath("/billing-periods")]);
  const form = useForm<StartValues>({ defaultValues: { startDate: lease.startDate, periodEnd: lease.firstPeriodEnd ?? endOfMonthIso(lease.startDate), recordNew: {}, readings: {} } });
  const [startDate, periodEnd] = useWatch({ control: form.control, name: ["startDate", "periodEnd"] });

  const invoice = useMemo(() => {
    if (!services.data) return null;
    const prices = Object.fromEntries(services.data.items.map((s) => [s.id, s.prices]));
    return planMoveIn(lease, prices, startDate, periodEnd);
  }, [lease, services.data, startDate, periodEnd]);

  const submit = useSubmit(
    form,
    save,
    (v) => ({
      startDate: v.startDate,
      periodEnd: v.periodEnd,
      // Only meters ticked "record a new reading" send a value; the others open from their last reading.
      readings: Object.entries(v.readings ?? {}).flatMap(([meterId, x]) => (!v.recordNew?.[meterId] || num(x) === undefined ? [] : [{ meterId, value: num(x)!, readAt: new Date().toISOString() }])),
      overrides: Object.fromEntries((invoice?.lines ?? []).map((l) => [l.key, l.amount])),
    }),
    onDone,
  );

  const live = (s: { startDate: string; endDate: string | null }) => !s.endDate || s.endDate >= (startDate || lease.startDate);
  const fixed = lease.subscriptions.filter((s) => s.usageBase !== "meter" && live(s));
  const metered = lease.subscriptions.filter((s) => s.usageBase === "meter" && s.meterId && live(s));

  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending || !invoice || !!invoice.error} submitLabel="Start lease" onCancel={onDone}>
      <Text color="secondary">Starts the lease, opens its first billing period and issues the move-in invoice.</Text>

      <Section title="Billing period">
        <FDate control={form.control} name="startDate" label="Start date" required max={lease.endDate ?? undefined} hint="Moves the lease start; its first rent, services and people follow." onChange={(v) => { if (v && periodEnd && periodEnd < v) form.setValue("periodEnd", v); }} width="100%" />
        <FDate control={form.control} name="periodEnd" label="First period ends" required min={startDate || lease.startDate} max={lease.endDate ?? undefined} hint="Rent and services are prorated to this date. Pick any date, including next month." width="100%" />
      </Section>

      <Section title="Fixed services">
        <VStack gap={1}>
          <Text size="sm" color="secondary">Billed in advance</Text>
          {fixed.length === 0 ? <Text size="sm">None</Text> : fixed.map((s) => <Text key={s.id} size="sm">{s.serviceName} · {label(s.usageBase)} ×{s.quantity}</Text>)}
        </VStack>
      </Section>

      {metered.length > 0 && startDate && (
        <Section title="Opening meter readings">
          <Text size="sm" color="secondary">Starting values on {formatDate(startDate)} · usage is billed from here when the period closes</Text>
          {metered.map((s) => (
            <MeterOpening key={s.id} form={form} meterId={s.meterId!} name={`${s.serviceName}${s.meterName ? ` · ${s.meterName}` : ""}`} startDate={startDate} />
          ))}
        </Section>
      )}

      <Section title="Move-in invoice">
        {services.error ? <ErrorBox error={services.error} /> : !invoice ? <Text size="sm">Calculating…</Text> : invoice.error ? <ErrorBox error={invoice.error} /> : (
          <VStack gap={1}>
            {invoice.lines.map((ln) => (
              <HStack key={ln.key} justify="between"><Text size="sm">{ln.title}</Text><Text size="sm">{formatMoney(ln.amount)}</Text></HStack>
            ))}
            <HStack justify="between"><Text weight="semibold">Total</Text><Text weight="semibold">{formatMoney(invoice.total)}</Text></HStack>
          </VStack>
        )}
      </Section>
    </FormBody>
  );
}
