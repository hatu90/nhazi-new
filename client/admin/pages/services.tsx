"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, Stack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { formatDate, formatMoney, label, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IServiceListResponse, IServiceResponse, ServiceUsageBase } from "@/client/lib/types";
import { Empty, ErrorBox, Modal, PageSpinner, Tag } from "@/client/ui";
import { text } from "@/client/ui/form";
import { FArea, FDate, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";
import { TierFields, emptyTier, toTiers, type TierRow } from "../tier-editor";

const bases: { id: ServiceUsageBase; label: string; hint: string }[] = [
  { id: "meter", label: "Metered", hint: "Meter readings; tiers allowed." },
  { id: "lease", label: "Per lease", hint: "Flat per lease." },
  { id: "device", label: "Per device", hint: "Flat per device." },
  { id: "member", label: "Per person", hint: "Flat per person." },
];

export function ServicesPage() {
  const { apiPath, canManage } = useProperty();
  const [creating, setCreating] = useState(false);
  const [pricing, setPricing] = useState<IServiceResponse | null>(null);
  const { data, error, isPending, refetch } = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 });

  return (
    <Stack gap={4}>
      {canManage && <HStack justify="end"><Button label="Add service" onClick={() => setCreating(true)} /></HStack>}
      {isPending ? <PageSpinner /> : error ? <ErrorBox error={error} retry={() => void refetch()} /> : data.items.length === 0 ? (
        <Card padding={4}><Empty title="No services" hint="Things you bill besides rent." action={canManage && <Button label="Add the first service" onClick={() => setCreating(true)} />} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((s) => {
            const current = [...s.prices].reverse().find((p) => p.effectiveDate <= todayIso()) ?? s.prices[0];
            const latest = s.prices[s.prices.length - 1];
            return (
              <Card key={s.id} padding={5}>
                <VStack gap={3}>
                  <HStack justify="between" align="start" gap={2}>
                    <VStack gap={0.5}><Heading level={2}>{s.name}</Heading>{s.description && <Text color="secondary" size="sm">{s.description}</Text>}</VStack>
                    <Tag label={label(s.usageBase)} />
                  </HStack>
                  <VStack gap={1}>
                    {current?.tiers.map((t, i, all) => (
                      <HStack key={i} justify="between">
                        <Text color="secondary" size="sm">{all.length === 1 ? "Rate" : t.upTo === null ? `Above ${all[i - 1]?.upTo}` : `Up to ${t.upTo}`}{s.unitOfMeasure ? ` ${s.unitOfMeasure}` : ""}</Text>
                        <Text size="sm">{formatMoney(t.rate)}</Text>
                      </HStack>
                    ))}
                  </VStack>
                  <HStack justify="between" align="center" gap={2}>
                    <Text size="sm" color="secondary">{s.prices.length} price {s.prices.length === 1 ? "version" : "versions"} · latest from {formatDate(latest?.effectiveDate)}</Text>
                    {canManage && <Button label="New price" size="sm" variant="secondary" onClick={() => setPricing(s)} />}
                  </HStack>
                </VStack>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="Add service">{creating && <ServiceForm onDone={() => setCreating(false)} />}</Modal>
      <Modal open={pricing !== null} onClose={() => setPricing(null)} title={`New price · ${pricing?.name ?? ""}`}>{pricing && <PriceForm service={pricing} onDone={() => setPricing(null)} />}</Modal>
    </Stack>
  );
}

interface ServiceValues {
  name: string;
  usageBase: ServiceUsageBase;
  unitOfMeasure: string;
  description: string;
  effectiveDate: string;
  tiers: TierRow[];
}

function ServiceForm({ onDone }: { onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", apiPath("/services"), [apiPath("/services")]);
  const form = useForm<ServiceValues>({ defaultValues: { name: "", usageBase: "meter", unitOfMeasure: "", description: "", effectiveDate: todayIso(), tiers: [emptyTier()] } });
  const base = useWatch({ control: form.control, name: "usageBase" });
  const unit = useWatch({ control: form.control, name: "unitOfMeasure" });
  const multi = base === "meter" || base === "member";
  const submit = useSubmit(
    form,
    save,
    (v) => ({ name: v.name.trim(), usageBase: v.usageBase, unitOfMeasure: text(v.unitOfMeasure), description: text(v.description), prices: [{ effectiveDate: v.effectiveDate, tiers: toTiers(multi ? v.tiers : v.tiers.slice(0, 1)) }] }),
    onDone,
  );
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add service" onCancel={onDone}>
      <FText control={form.control} name="name" label="Name" placeholder="Electricity" required width="100%" />
      <FSelect control={form.control} name="usageBase" label="Billed by" hint={bases.find((b) => b.id === base)?.hint} options={bases.map((b) => ({ value: b.id, label: b.label }))} onValueChange={() => form.setValue("tiers", [emptyTier()])} width="100%" />
      <FText control={form.control} name="unitOfMeasure" label="Unit of measure" hint="e.g. kWh, m³" width="100%" />
      <FDate control={form.control} name="effectiveDate" label="Effective from" required width="100%" />
      <TierFields control={form.control} name="tiers" multi={multi} unit={unit || "unit"} />
      <FArea control={form.control} name="description" label="Description" rows={2} width="100%" />
    </FormBody>
  );
}

function PriceForm({ service, onDone }: { service: IServiceResponse; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", apiPath(`/services/${service.id}/prices`), [apiPath("/services")]);
  const last = service.prices[service.prices.length - 1];
  const multi = service.usageBase === "meter" || service.usageBase === "member";
  const form = useForm<{ effectiveDate: string; tiers: TierRow[] }>({
    defaultValues: { effectiveDate: "", tiers: last ? last.tiers.map((t) => ({ upTo: t.upTo?.toString() ?? "", rate: t.rate.toString() })) : [emptyTier()] },
  });
  const submit = useSubmit(form, save, (v) => ({ effectiveDate: v.effectiveDate, tiers: toTiers(v.tiers) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add price" onCancel={onDone}>
      <FDate control={form.control} name="effectiveDate" label="Effective from" hint={last ? `After ${formatDate(last.effectiveDate)}` : undefined} min={last?.effectiveDate} required width="100%" />
      <TierFields control={form.control} name="tiers" multi={multi} unit={service.unitOfMeasure ?? "unit"} />
    </FormBody>
  );
}
