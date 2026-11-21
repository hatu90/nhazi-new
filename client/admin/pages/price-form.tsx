"use client";

import { useTranslations } from "next-intl";
import { useSend } from "@/client/lib/hooks";
import type { IServiceResponse } from "@/client/lib/types";
import { FDate, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";
import { TierFields, emptyTier, toTiers, type TierRow } from "../tier-editor";

interface Values {
  effectiveDate: string;
  tiers: TierRow[];
}

/** `service` = the service getting a new price (null while the modal is closed). */
export function usePriceForm({ service, onDone }: { service: IServiceResponse | null; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", apiPath(`/services/${service?.id}/prices`), [apiPath("/services")]);
  const last = service?.prices[service.prices.length - 1];
  const defaults = (): Values => ({ effectiveDate: "", tiers: last ? last.tiers.map((t) => ({ upTo: t.upTo?.toString() ?? "", rate: t.rate.toString() })) : [emptyTier()] });
  const form = useForm<Values>({ defaultValues: defaults() });
  useOpenReset(service !== null, () => { form.reset(defaults()); save.reset(); }, service?.id);
  const submit = useSubmit(form, save, (v) => ({ effectiveDate: v.effectiveDate, tiers: toTiers(v.tiers) }), onDone);
  return { form, submit, error: save.error, busy: save.isPending, service, last };
}

export function PriceFields({ x: { form, service, last } }: { x: ReturnType<typeof usePriceForm> }) {
  const t = useTranslations("Services");
  if (!service) return null;
  const multi = service.usageBase === "meter" || service.usageBase === "member";
  return (
    <VStack gap={4}>
      <FDate control={form.control} name="effectiveDate" label={t("effectiveFrom")} min={last?.effectiveDate} required width="100%" />
      <TierFields control={form.control} name="tiers" multi={multi} unit={service.unitOfMeasure ?? t("unitFallback")} />
    </VStack>
  );
}
