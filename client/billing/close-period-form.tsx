"use client";

import { useTranslations } from "next-intl";
import { useInvoiceTitle } from "@/client/lib/use-invoice-title";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { api } from "@/client/lib/api";
import { formatDate, formatMoney, todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { IInvoicePreview } from "@/client/lib/types";
import { Raised, Section } from "@/client/ui";
import { num } from "@/client/ui/form";
import { FDate, FNumber, useOpenReset, useSubmit } from "@/client/ui/rhf";

export interface IMeterToRead {
  meterId: string;
  serviceName: string;
  openingValue: number;
}
interface Values {
  endDate: string;
  nextEnd: string;
  readings: Record<string, string>;
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** The day before the same day next month: a month-long period starting on `start`. */
const monthEnd = (start: string) => {
  const [y, m, d] = start.split("-").map(Number);
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return addDays(new Date(Date.UTC(y, m, Math.min(d, last))).toISOString().slice(0, 10), -1);
};

/**
 * Close the running billing period with the meter readings, and open the next one. Shared by the tenant (`path` = their lease
 * endpoint, the next period is a month) and the landlord (`askNextEnd`: they choose where the next period ends).
 * One card per meter, so it stays readable with many meters.
 */
export function useClosePeriodForm({ path, invalidate, period, meters = [], askNextEnd, open, onDone }: {
  path: string;
  invalidate: string[];
  /** The period being closed; undefined while it is still loading (then the form is not shown). */
  period?: { startDate: string; endDate: string };
  meters?: IMeterToRead[];
  askNextEnd?: boolean;
  open: boolean;
  onDone: () => void;
}) {
  const save = useSend<object>("POST", path, invalidate);
  const today = todayIso();
  const endDate = period && period.endDate < today ? period.endDate : today;
  const defaults = (): Values => ({ endDate, nextEnd: monthEnd(addDays(endDate, 1)), readings: {} });
  const form = useForm<Values>({ defaultValues: defaults() });
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); });
  const readings = useWatch({ control: form.control, name: "readings" });
  const submit = useSubmit(
    form,
    save,
    (v) => ({
      endDate: v.endDate,
      readings: meters.map((m) => ({ meterId: m.meterId, value: num(v.readings[m.meterId]) })),
      ...(askNextEnd && { next: { endDate: v.nextEnd } }),
    }),
    onDone,
  );
  const watched = useWatch({ control: form.control });
  const complete = meters.every((m) => {
    const v = watched.readings?.[m.meterId];
    return v !== undefined && v !== "" && Number(v) >= m.openingValue;
  });
  const body = {
    endDate: watched.endDate,
    readings: meters.map((m) => ({ meterId: m.meterId, value: num(watched.readings?.[m.meterId] ?? "") })),
    ...(askNextEnd && { next: { endDate: watched.nextEnd } }),
  };
  const ready = complete && !!watched.endDate && (!askNextEnd || !!watched.nextEnd);
  const preview = useQuery({
    queryKey: [`${path}/preview`, body],
    queryFn: () => api<IInvoicePreview>(`${path}/preview`, { method: "POST", body }),
    enabled: open && ready,
    retry: false,
  });
  return { form, submit, error: save.error, busy: save.isPending, period, meters, askNextEnd, readings, ready, preview, today };
}

export function ClosePeriodFields({ x: { form, period, meters, askNextEnd, readings, ready, preview, today } }: { x: ReturnType<typeof useClosePeriodForm> }) {
  const t = useTranslations("ClosePeriod");
  const it = useInvoiceTitle();
  if (!period) return null;
  return (
    <VStack gap={4}>
      <Section title={t("billingPeriod")}>
        <Text size="sm" color="secondary">{t("closing", { from: formatDate(period.startDate), to: formatDate(period.endDate) })}</Text>
        <FDate control={form.control} name="endDate" label={t("lastDay")} required width="100%" />
        {askNextEnd && <FDate control={form.control} name="nextEnd" label={t("nextEnds")} required width="100%" />}
      </Section>

      {meters.length > 0 && (
        <Section title={t("readings")}>
          <VStack gap={2}>
            {meters.map((m) => {
              const value = Number(readings?.[m.meterId]);
              const used = readings?.[m.meterId] ? value - m.openingValue : null;
              return (
                <Raised key={m.meterId}>
                  <VStack gap={2}>
                    <HStack justify="between" align="center" gap={2} wrap="wrap">
                      <Text weight="semibold">{m.serviceName}</Text>
                      <Text size="sm" color="secondary">{t("previous", { n: m.openingValue })}</Text>
                    </HStack>
                    <FNumber
                      control={form.control}
                      name={`readings.${m.meterId}`}
                      label={t("newReading")}
                      required
                      rules={{ validate: (v) => Number(v) >= m.openingValue || t("min", { n: m.openingValue }) }}
                      hint={used !== null && used >= 0 ? t("used", { n: used }) : undefined}
                      width="100%"
                    />
                  </VStack>
                </Raised>
              );
            })}
          </VStack>
        </Section>
      )}

      <Section title={t("invoice")}>
        {!ready ? (
          <Text size="sm" color="secondary">{t("enterReadings")}</Text>
        ) : preview.isPending ? (
          <Text size="sm" color="secondary">{t("calculating")}</Text>
        ) : preview.error ? (
          <Text size="sm" color="secondary">{preview.error.message}</Text>
        ) : !preview.data.items.length ? (
          <Text size="sm" color="secondary">{t("nothing")}</Text>
        ) : (
          <Raised>
            <VStack gap={2}>
              <Text size="sm" color="secondary">{t("issued", { title: it(preview.data.title ?? ""), date: formatDate(today) })}</Text>
              {preview.data.items.map((row, i) => (
                <HStack key={i} justify="between" gap={2}>
                  <Text size="sm">{it(row.title)}</Text>
                  <Text size="sm">{formatMoney(row.amount)}</Text>
                </HStack>
              ))}
              <HStack justify="between" gap={2}>
                <Text weight="semibold">{t("total")}</Text>
                <Text weight="semibold">{formatMoney(preview.data.total)}</Text>
              </HStack>
            </VStack>
          </Raised>
        )}
      </Section>
    </VStack>
  );
}
