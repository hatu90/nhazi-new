"use client";

import { todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { text } from "@/client/ui/form";
import { FArea, FDate, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { useForm, useWatch } from "react-hook-form";
import { useProperty } from "../property-layout";
import { TierFields, emptyTier, toTiers } from "../tier-editor";
import type { ServiceUsageBase } from "@/client/lib/types";
import type { TierRow } from "../tier-editor";

interface ServiceValues {
  name: string;
  usageBase: ServiceUsageBase;
  unitOfMeasure: string;
  description: string;
  effectiveDate: string;
  tiers: TierRow[];
}

const bases: { id: ServiceUsageBase; label: string; hint: string }[] = [
  { id: "meter", label: "Metered", hint: "Meter readings; tiers allowed." },
  { id: "lease", label: "Per lease", hint: "Flat per lease." },
  { id: "device", label: "Per device", hint: "Flat per device." },
  { id: "member", label: "Per person", hint: "Flat per person." },
];

const defaults = (): ServiceValues => ({ name: "", usageBase: "meter", unitOfMeasure: "", description: "", effectiveDate: todayIso(), tiers: [emptyTier()] });

export function useServiceForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", apiPath("/services"), [apiPath("/services")]);
  const form = useForm<ServiceValues>({ defaultValues: defaults() });
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); });
  const base = useWatch({ control: form.control, name: "usageBase" });
  const unit = useWatch({ control: form.control, name: "unitOfMeasure" });
  const multi = base === "meter" || base === "member";
  const submit = useSubmit(
    form,
    save,
    (v) => ({ name: v.name.trim(), usageBase: v.usageBase, unitOfMeasure: base === "meter" ? text(v.unitOfMeasure) : undefined, description: text(v.description), prices: [{ effectiveDate: v.effectiveDate, tiers: toTiers(multi ? v.tiers : v.tiers.slice(0, 1)) }] }),
    onDone,
  );
  return { form, submit, error: save.error, busy: save.isPending, base, unit, multi };
}

export function ServiceFields({ x: { form, base, unit, multi } }: { x: ReturnType<typeof useServiceForm> }) {
  return (
    <VStack gap={4}>
      <FText control={form.control} name="name" label="Name" placeholder="Electricity" required width="100%" />
      <FSelect control={form.control} name="usageBase" label="Billed by" hint={bases.find((b) => b.id === base)?.hint} options={bases.map((b) => ({ value: b.id, label: b.label }))} onValueChange={() => form.setValue("tiers", [emptyTier()])} width="100%" />
      {base === "meter" && <FText control={form.control} name="unitOfMeasure" label="Unit of measure" hint="e.g. kWh, m³" width="100%" />}
      <FDate control={form.control} name="effectiveDate" label="Effective from" required width="100%" />
      <TierFields control={form.control} name="tiers" multi={multi} unit={(base === "meter" && unit) || "unit"} />
      <FArea control={form.control} name="description" label="Description" rows={2} width="100%" />
    </VStack>
  );
}
