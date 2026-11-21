"use client";

import { useTranslations } from "next-intl";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IMeterResponse, IServiceListResponse, IUnitListResponse } from "@/client/lib/types";
import { text } from "@/client/ui/form";
import { FDate, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

interface MeterValues {
  unitId: string;
  serviceId: string;
  name: string;
  serialNumber: string;
  installedAt: string;
}

/** `meter` = the meter being edited; undefined = adding. */
export function useMeterForm({ meter, open, onDone }: { meter?: IMeterResponse; open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const units = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 }, { enabled: open && !meter });
  const services = useGet<IServiceListResponse>(apiPath("/services"), { usageBase: "meter", pageSize: 100 }, { enabled: open && !meter });
  const save = useSend<object>(meter ? "PATCH" : "POST", apiPath(meter ? `/meters/${meter.id}` : "/meters"), [apiPath("/meters")]);
  const defaults = (): MeterValues => ({ unitId: meter?.unitId ?? "", serviceId: meter?.serviceId ?? "", name: meter?.name ?? "", serialNumber: meter?.serialNumber ?? "", installedAt: meter?.installedAt?.slice(0, 10) ?? "" });
  const form = useForm<MeterValues>({ defaultValues: defaults() });
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); }, meter?.id);
  const submit = useSubmit(form, save, (v) => meter
    ? { name: v.name.trim(), serialNumber: text(v.serialNumber) ?? null, installedAt: text(v.installedAt) ?? null }
    : { unitId: v.unitId, serviceId: v.serviceId, name: v.name.trim(), serialNumber: text(v.serialNumber), installedAt: text(v.installedAt) }, onDone);
  return { form, submit, error: save.error, busy: save.isPending, meter, units, services };
}

export function MeterFields({ x: { form, meter, units, services } }: { x: ReturnType<typeof useMeterForm> }) {
  const t = useTranslations("Meters");
  return (
    <VStack gap={4}>
      {!meter && <FSelect control={form.control} name="unitId" label={t("unit")} required search options={(units.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))} width="100%" />}
      {!meter && <FSelect control={form.control} name="serviceId" label={t("service")} required options={(services.data?.items ?? []).map((x) => ({ value: x.id, label: x.name }))} hint={services.data?.items.length === 0 ? t("noService") : undefined} width="100%" />}
      <FText control={form.control} name="name" label={t("name")} required width="100%" />
      <FText control={form.control} name="serialNumber" label={t("serial")} width="100%" />
      <FDate control={form.control} name="installedAt" label={t("installedOn")} width="100%" />
    </VStack>
  );
}
