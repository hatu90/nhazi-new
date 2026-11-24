"use client";

import { useTranslations } from "next-intl";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { formatMoney, todayIso } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IMeterListResponse, IServiceListResponse, IServiceResponse } from "@/client/lib/types";
import { num } from "@/client/ui/form";
import { FMulti, FNumber, FSelect, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../../property-layout";
import type { PersonRow } from "./types";

type T = ReturnType<typeof useTranslations<"LeaseDetail">>;

/** The price in force today, as one line per tier (e.g. "Up to 100 kWh · 3.000 ₫"). */
function priceLines(service: IServiceResponse, t: T): string[] {
  const current = [...service.prices].reverse().find((p) => p.effectiveDate <= todayIso()) ?? service.prices[0];
  if (!current) return [];
  const unit = service.unitOfMeasure ? ` ${service.unitOfMeasure}` : "";
  return current.tiers.map((tier, i, all) => {
    const rate = formatMoney(tier.rate);
    if (all.length === 1) return rate;
    return tier.upTo === null ? t("priceAbove", { n: all[i - 1]?.upTo ?? 0, unit, rate }) : t("priceUpTo", { n: tier.upTo, unit, rate });
  });
}

interface Values {
  serviceId: string;
  meterId: string;
  reading: string;
  quantity: string;
  personIds: string[];
}

export function useSubscriptionForm({ path, unitId, draft, people, open, onDone }: { path: string; unitId: string; draft: boolean; people: PersonRow[]; open: boolean; onDone: () => void }) {
  const t = useTranslations("LeaseDetail");
  const { apiPath } = useProperty();
  const services = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 }, { enabled: open });
  const meters = useGet<IMeterListResponse>(apiPath("/meters"), { unitId, inService: true, pageSize: 100 }, { enabled: open });
  const save = useSend<object>("POST", `${path}/subscriptions`, [path]);
  const form = useForm<Values>({ defaultValues: { serviceId: "", meterId: "", reading: "", quantity: "1", personIds: people.map((p) => p.id) } });
  useOpenReset(open, () => { form.reset({ serviceId: "", meterId: "", reading: "", quantity: "1", personIds: people.map((p) => p.id) }); save.reset(); });
  const serviceId = useWatch({ control: form.control, name: "serviceId" });
  const service = services.data?.items.find((s) => s.id === serviceId);
  const unitMeters = (meters.data?.items ?? []).filter((m) => m.serviceId === serviceId);
  const meterId = useWatch({ control: form.control, name: "meterId" });
  // default to the unit's meter for this service
  useEffect(() => {
    if (service?.usageBase === "meter" && !unitMeters.some((m) => m.id === meterId)) form.setValue("meterId", unitMeters[0]?.id ?? "");
  }, [service?.usageBase, unitMeters.map((m) => m.id).join(","), meterId, form]); // eslint-disable-line react-hooks/exhaustive-deps
  const prices = service ? priceLines(service, t) : [];
  const submit = useSubmit(
    form,
    save,
    (v) => {
      if (service?.usageBase === "member") {
        const chosen = people.filter((p) => v.personIds.includes(p.id));
        return { serviceId: v.serviceId, quantity: Math.min(Math.max(chosen.length, 1), 100), details: chosen.map((p) => p.name).join(", ") || undefined };
      }
      return { serviceId: v.serviceId, meterId: service?.usageBase === "meter" ? v.meterId : undefined, reading: service?.usageBase === "meter" && !draft ? num(v.reading) : undefined, quantity: service?.usageBase === "device" ? (num(v.quantity) ?? 1) : 1 };
    },
    onDone,
  );
  return { form, submit, draft, error: save.error, busy: save.isPending, services, service, unitMeters, prices, people };
}

export function SubscriptionFields({ x: { form, draft, services, service, unitMeters, prices, people } }: { x: ReturnType<typeof useSubscriptionForm> }) {
  const t = useTranslations("LeaseDetail");
  const en = useEnum();
  return (
    <VStack gap={4}>
      <FSelect control={form.control} name="serviceId" label={t("service")} required options={(services.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))} onValueChange={() => form.setValue("meterId", "")} width="100%" />
      {service?.usageBase === "meter" && <FSelect control={form.control} name="meterId" label={t("meter")} required options={unitMeters.map((m) => ({ value: m.id, label: m.name }))} hint={unitMeters.length === 0 ? t("noMeter") : undefined} width="100%" />}
      {service?.usageBase === "meter" && !draft && <FNumber control={form.control} name="reading" label={t("startReading")} required hint={t("startReadingHint")} width="100%" />}
      {service?.usageBase === "member" && <FMulti control={form.control} name="personIds" label={t("people")} required options={people.map((p) => ({ value: p.id, label: p.name }))} hint={people.length === 0 ? t("addPeopleFirst") : undefined} width="100%" />}
      {service?.usageBase === "device" && <FNumber control={form.control} name="quantity" label={t("quantity")} required width="100%" />}
      {service && (
        <VStack gap={0.5}>
          <Text size="sm" color="secondary">{t("priceBase", { base: en("usageBase", service.usageBase) })}</Text>
          {prices.length === 0 ? <Text size="sm">{t("noPrice")}</Text> : prices.map((line) => <Text key={line} size="sm">{line}</Text>)}
        </VStack>
      )}
    </VStack>
  );
}
