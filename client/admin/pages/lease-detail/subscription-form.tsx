"use client";

import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useForm, useWatch } from "react-hook-form";
import { formatMoney, label, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IMeterListResponse, IServiceListResponse, IServiceResponse } from "@/client/lib/types";
import { num } from "@/client/ui/form";
import { FMulti, FNumber, FSelect, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../../property-layout";
import type { PersonRow } from "./types";

/** The price in force today, as one line per tier (e.g. "Up to 100 kWh · 3.000 ₫"). */
function priceLines(service: IServiceResponse): string[] {
  const current = [...service.prices].reverse().find((p) => p.effectiveDate <= todayIso()) ?? service.prices[0];
  if (!current) return [];
  const unit = service.unitOfMeasure ? ` ${service.unitOfMeasure}` : "";
  return current.tiers.map((t, i, all) => {
    const range = all.length === 1 ? "" : t.upTo === null ? `Above ${all[i - 1]?.upTo}${unit} · ` : `Up to ${t.upTo}${unit} · `;
    return `${range}${formatMoney(t.rate)}`;
  });
}

interface Values {
  serviceId: string;
  meterId: string;
  quantity: string;
  personIds: string[];
}

export function useSubscriptionForm({ path, unitId, people, open, onDone }: { path: string; unitId: string; people: PersonRow[]; open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const services = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 }, { enabled: open });
  const meters = useGet<IMeterListResponse>(apiPath("/meters"), { unitId, inService: true, pageSize: 100 }, { enabled: open });
  const save = useSend<object>("POST", `${path}/subscriptions`, [path]);
  const form = useForm<Values>({ defaultValues: { serviceId: "", meterId: "", quantity: "1", personIds: people.map((p) => p.id) } });
  useOpenReset(open, () => { form.reset({ serviceId: "", meterId: "", quantity: "1", personIds: people.map((p) => p.id) }); save.reset(); });
  const serviceId = useWatch({ control: form.control, name: "serviceId" });
  const service = services.data?.items.find((s) => s.id === serviceId);
  const unitMeters = (meters.data?.items ?? []).filter((m) => m.serviceId === serviceId);
  const prices = service ? priceLines(service) : [];
  const submit = useSubmit(
    form,
    save,
    (v) => {
      if (service?.usageBase === "member") {
        const chosen = people.filter((p) => v.personIds.includes(p.id));
        return { serviceId: v.serviceId, quantity: Math.min(Math.max(chosen.length, 1), 100), details: chosen.map((p) => p.name).join(", ") || undefined };
      }
      return { serviceId: v.serviceId, meterId: service?.usageBase === "meter" ? v.meterId : undefined, quantity: service?.usageBase === "device" ? (num(v.quantity) ?? 1) : 1 };
    },
    onDone,
  );
  return { form, submit, error: save.error, busy: save.isPending, services, service, unitMeters, prices, people };
}

export function SubscriptionFields({ x: { form, services, service, unitMeters, prices, people } }: { x: ReturnType<typeof useSubscriptionForm> }) {
  return (
    <VStack gap={4}>
      <FSelect control={form.control} name="serviceId" label="Service" required options={(services.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))} onValueChange={() => form.setValue("meterId", "")} width="100%" />
      {service?.usageBase === "meter" && <FSelect control={form.control} name="meterId" label="Meter" required options={unitMeters.map((m) => ({ value: m.id, label: m.name }))} hint={unitMeters.length === 0 ? "This unit has no meter for that service yet (Meters tab)." : undefined} width="100%" />}
      {service?.usageBase === "member" && <FMulti control={form.control} name="personIds" label="People" required options={people.map((p) => ({ value: p.id, label: p.name }))} hint={people.length === 0 ? "Add people to the lease first." : undefined} width="100%" />}
      {service?.usageBase === "device" && <FNumber control={form.control} name="quantity" label="Quantity" required width="100%" />}
      {service && (
        <VStack gap={0.5}>
          <Text size="sm" color="secondary">Price · {label(service.usageBase)}</Text>
          {prices.length === 0 ? <Text size="sm">No price set yet</Text> : prices.map((line) => <Text key={line} size="sm">{line}</Text>)}
        </VStack>
      )}
    </VStack>
  );
}
