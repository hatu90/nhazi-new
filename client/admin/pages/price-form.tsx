"use client";

import { formatDate } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { IServiceResponse } from "@/client/lib/types";
import { FDate, FormBody, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";
import { TierFields, emptyTier, toTiers, type TierRow } from "../tier-editor";

export function PriceForm({ service, onDone }: { service: IServiceResponse; onDone: () => void }) {
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
