"use client";

import { useTranslations } from "next-intl";
import { endOfMonthIso, formatDate, formatMoney } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { useInvoiceTitle } from "@/client/lib/use-invoice-title";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IServiceListResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { ErrorBox, Section } from "@/client/ui";
import { num } from "@/client/ui/form";
import { FDate, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { planMoveIn } from "@/lib/billing/move-in";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useProperty } from "../../property-layout";
import { MeterOpening, StartValues } from "./meter-opening";

/** Start a draft: confirm the first period, choose the opening meter readings, and see the move-in invoice before it is issued. The invoice is calculated here and sent as the amounts to issue. */
export function useStartForm({ path, lease, open, onDone }: { path: string; lease: ITenancyDetailResponse | undefined; open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const services = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 }, { enabled: open });
  const save = useSend<object>("POST", `${path}/start`, [path, apiPath("/leases"), apiPath("/invoices"), apiPath("/billing-periods")]);
  const defaults = (): StartValues => ({ startDate: lease?.startDate ?? "", periodEnd: lease ? (lease.firstPeriodEnd ?? endOfMonthIso(lease.startDate)) : "", recordNew: {}, readings: {} });
  const form = useForm<StartValues>({ defaultValues: defaults() });
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); });
  const [startDate, periodEnd] = useWatch({ control: form.control, name: ["startDate", "periodEnd"] });

  const invoice = useMemo(() => {
    if (!services.data || !lease) return null;
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

  const live = (s: { startDate: string; endDate: string | null }) => !s.endDate || s.endDate >= (startDate || lease?.startDate || "");
  const fixed = (lease?.subscriptions ?? []).filter((s) => s.usageBase !== "meter" && live(s));
  const metered = (lease?.subscriptions ?? []).filter((s) => s.usageBase === "meter" && s.meterId && live(s));

  return { form, submit, error: save.error, busy: save.isPending || !invoice || !!invoice.error, lease, services, invoice, startDate, periodEnd, fixed, metered };
}

export function StartFields({ x: { form, lease, services, invoice, startDate, periodEnd, fixed, metered } }: { x: ReturnType<typeof useStartForm> }) {
  const t = useTranslations("LeaseDetail");
  const c = useTranslations("Common");
  const en = useEnum();
  const it = useInvoiceTitle();
  if (!lease) return null;
  return (
    <VStack gap={4}>
      <Section title={t("billingPeriod")}>
        <FDate control={form.control} name="startDate" label={t("startDate")} required max={lease.endDate ?? undefined} onChange={(v) => { if (v && periodEnd && periodEnd < v) form.setValue("periodEnd", v); }} width="100%" />
        <FDate control={form.control} name="periodEnd" label={t("firstPeriodEnds")} required min={startDate || lease.startDate} max={lease.endDate ?? undefined} hint={t("periodHint")} width="100%" />
      </Section>

      <Section title={t("fixedServices")}>
        <VStack gap={1}>
          <Text size="sm" color="secondary">{t("billedAdvance")}</Text>
          {fixed.length === 0 ? <Text size="sm">{c("none")}</Text> : fixed.map((s) => <Text key={s.id} size="sm">{s.serviceName} · {en("usageBase", s.usageBase)} ×{s.quantity}</Text>)}
        </VStack>
      </Section>

      {metered.length > 0 && startDate && (
        <Section title={t("openingReadings")}>
          <Text size="sm" color="secondary">{t("openingHint", { date: formatDate(startDate) })}</Text>
          {metered.map((s) => (
            <MeterOpening key={s.id} form={form} meterId={s.meterId!} name={`${s.serviceName}${s.meterName ? ` · ${s.meterName}` : ""}`} startDate={startDate} />
          ))}
        </Section>
      )}

      <Section title={t("moveInInvoice")}>
        {services.error ? <ErrorBox error={services.error} /> : !invoice ? <Text size="sm">{t("calculating")}</Text> : invoice.error ? <ErrorBox error={invoice.error} /> : (
          <VStack gap={1}>
            {invoice.lines.map((ln) => (
              <HStack key={ln.key} justify="between"><Text size="sm">{it(ln.title)}</Text><Text size="sm">{formatMoney(ln.amount)}</Text></HStack>
            ))}
            <HStack justify="between"><Text weight="semibold">{t("total")}</Text><Text weight="semibold">{formatMoney(invoice.total)}</Text></HStack>
          </VStack>
        )}
      </Section>
    </VStack>
  );
}
