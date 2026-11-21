"use client";

import { useTranslations } from "next-intl";
import { formatDate, formatDateTime } from "@/client/lib/format";
import { useLocale } from "next-intl";
import { useGet } from "@/client/lib/hooks";
import type { IReadingListResponse } from "@/client/lib/types";
import { num } from "@/client/ui/form";
import { FCheck, FNumber } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useEffect } from "react";
import { useWatch, type Control, type UseFormReturn } from "react-hook-form";
import { useProperty } from "../../property-layout";

export type StartValues = { startDate: string; periodEnd: string; recordNew: Record<string, boolean>; readings: Record<string, string> };

/**
 * One meter's opening value. Defaults to the meter's last reading (locked); "Record a new reading" unlocks the field
 * and saves what is typed as a new reading taken now (it must not be below the latest reading).
 */
export function MeterOpening({ form, meterId, name, startDate }: { form: UseFormReturn<StartValues>; meterId: string; name: string; startDate: string }) {
  const t = useTranslations("LeaseDetail");
  const locale = useLocale();
  const { apiPath } = useProperty();
  const path = apiPath(`/meters/${meterId}/readings`);
  // The latest reading on/before the start date, else the nearest later one.
  const before = useGet<IReadingListResponse>(path, { to: startDate, pageSize: 1 }, { enabled: !!startDate });
  const after = useGet<IReadingListResponse>(path, { from: startDate, pageSize: 100 }, { enabled: !!startDate && before.data?.items.length === 0 });
  const found = before.data?.items[0] ?? after.data?.items.at(-1);
  const last = found && { value: found.value, on: found.readOn };
  // A new reading is taken now, so it follows the latest reading of any date.
  const latestQ = useGet<IReadingListResponse>(path, { pageSize: 1 });
  const latest = latestQ.data?.items[0];
  const recordNew = useWatch({ control: form.control as Control<StartValues>, name: `recordNew.${meterId}` }) === true;

  const recording = !last || recordNew;
  const bound = latest ? t("mustBe", { value: latest.value, at: formatDateTime(latest.readAt, locale) }) : undefined;

  // Locked: show the last reading. Unticking puts it back.
  useEffect(() => {
    if (last && !recordNew) form.setValue(`readings.${meterId}`, String(last.value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.value, last?.on, recordNew, meterId, form]);

  // No reading exists to open from, so what is typed must be sent as a new reading (the submit only sends ticked meters).
  const loaded = !before.isPending && !(before.data?.items.length === 0 && after.isPending);
  useEffect(() => {
    if (loaded && !last) form.setValue(`recordNew.${meterId}`, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, !last, meterId, form]);

  if (before.isPending || latestQ.isPending || (before.data?.items.length === 0 && after.isPending)) return <Text size="sm" color="secondary">{t("loadingReading", { name })}</Text>;
  return (
    <VStack gap={1}>
      <FNumber
        control={form.control}
        name={`readings.${meterId}`}
        label={`${name} · ${formatDate(startDate)}`}
        hint={last ? (recording ? bound : t("lastReading", { date: formatDate(last.on) })) : t("noReading")}
        disabled={!recording}
        required
        rules={latest ? { validate: (v) => num(String(v)) === undefined || num(String(v))! >= latest.value || bound } : undefined}
        width="100%"
      />
      {last && <FCheck control={form.control} name={`recordNew.${meterId}`} label={t("recordNew")} />}
    </VStack>
  );
}
