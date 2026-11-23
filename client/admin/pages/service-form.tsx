"use client";

import { useTranslations } from "next-intl";
import { useEnumOptions } from "@/client/lib/use-enum";
import { formatDate, formatMoney, todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import { text } from "@/client/ui/form";
import { FArea, applyServerErrors, FDate, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useForm, useWatch } from "react-hook-form";
import { useProperty } from "../property-layout";
import { TierFields, emptyTier, toTiers } from "../tier-editor";
import type { IServiceResponse, ServiceUsageBase } from "@/client/lib/types";
import type { TierRow } from "../tier-editor";

interface ServiceValues {
  name: string;
  usageBase: ServiceUsageBase;
  unitOfMeasure: string;
  description: string;
  effectiveDate: string;
  tiers: TierRow[];
}

const bases: ServiceUsageBase[] = ["meter", "lease", "device", "member"];

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
  const t = useTranslations("Services");
  const c = useTranslations("Common");
  const options = useEnumOptions();
  return (
    <VStack gap={4}>
      <FText control={form.control} name="name" label={c("name")} required width="100%" />
      <FSelect control={form.control} name="usageBase" label={t("billedBy")} options={options("usageBase", bases)} onValueChange={() => form.setValue("tiers", [emptyTier()])} width="100%" />
      {base === "meter" && <FText control={form.control} name="unitOfMeasure" label={t("unitOfMeasure")} width="100%" />}
      <FDate control={form.control} name="effectiveDate" label={t("effectiveFrom")} required width="100%" />
      <TierFields control={form.control} name="tiers" multi={multi} unit={(base === "meter" && unit) || t("unitFallback")} />
      <FArea control={form.control} name="description" label={c("description")} rows={2} width="100%" />
    </VStack>
  );
}

interface EditValues {
  name: string;
  unitOfMeasure: string;
  description: string;
  /** Defaults to today. The latest version's date edits it in place; a later date adds a new version. */
  effectiveDate: string;
  tiers: TierRow[];
}

/** `service` = the service being edited (null while the modal is closed). The billing basis is fixed once created. */
export function useServiceEditForm({ service, onDone }: { service: IServiceResponse | null; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("PATCH", apiPath(`/services/${service?.id}`), [apiPath("/services")]);
  const addPrice = useSend<object>("POST", apiPath(`/services/${service?.id}/prices`), [apiPath("/services")]);
  const editLatest = useSend<object>("PUT", apiPath(`/services/${service?.id}/prices`), [apiPath("/services")]);
  const last = service?.prices[service.prices.length - 1];
  const defaults = (): EditValues => ({
    name: service?.name ?? "",
    unitOfMeasure: service?.unitOfMeasure ?? "",
    description: service?.description ?? "",
    effectiveDate: last && last.effectiveDate > todayIso() ? last.effectiveDate : todayIso(),
    tiers: last ? last.tiers.map((t) => ({ upTo: t.upTo?.toString() ?? "", rate: t.rate.toString() })) : [emptyTier()],
  });
  const form = useForm<EditValues>({ defaultValues: defaults() });
  useOpenReset(service !== null, () => { form.reset(defaults()); save.reset(); addPrice.reset(); editLatest.reset(); }, service?.id);
  const multi = service?.usageBase === "meter" || service?.usageBase === "member";
  const submit = form.handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ name: v.name.trim(), unitOfMeasure: service?.usageBase === "meter" ? text(v.unitOfMeasure) ?? null : undefined, description: text(v.description) ?? null });
      const tiers = toTiers(multi ? v.tiers : v.tiers.slice(0, 1));
      // the latest version's own date = correct it in place (any number of times); a later date = add a new version
      if (last && v.effectiveDate === last.effectiveDate) await editLatest.mutateAsync({ tiers });
      else await addPrice.mutateAsync({ effectiveDate: v.effectiveDate, tiers });
      onDone();
    } catch (e) {
      applyServerErrors(form, e);
    }
  });
  return { form, submit, error: save.error ?? addPrice.error ?? editLatest.error, busy: save.isPending || addPrice.isPending || editLatest.isPending, service, last, multi };
}

export function ServiceEditFields({ x: { form, service, last, multi } }: { x: ReturnType<typeof useServiceEditForm> }) {
  const t = useTranslations("Services");
  const c = useTranslations("Common");
  if (!service) return null;
  return (
    <VStack gap={4}>
      <FText control={form.control} name="name" label={c("name")} required width="100%" />
      {service.usageBase === "meter" && <FText control={form.control} name="unitOfMeasure" label={t("unitOfMeasure")} width="100%" />}
      <FArea control={form.control} name="description" label={c("description")} rows={2} width="100%" />
      <TierFields control={form.control} name="tiers" multi={multi} unit={service.unitOfMeasure ?? t("unitFallback")} />
      <details className="rounded border border-neutral-200 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">{t("priceHistory", { n: service.prices.length })}</summary>
        <VStack gap={2} style={{ marginTop: 8 }}>
          {[...service.prices].reverse().map((p, i) => (
            <VStack key={p.effectiveDate} gap={0.5}>
              <Text size="sm" color="secondary">{formatDate(p.effectiveDate)}{i === 0 ? ` · ${t("latestTag")}` : ""}</Text>
              {p.tiers.map((tier, j, all) => (
                <Text key={j} size="sm">
                  {all.length === 1 ? formatMoney(tier.rate) : `${tier.upTo === null ? t("above", { n: all[j - 1]?.upTo ?? 0 }) : t("upTo", { n: tier.upTo })} · ${formatMoney(tier.rate)}`}
                </Text>
              ))}
            </VStack>
          ))}
        </VStack>
      </details>
      <FDate control={form.control} name="effectiveDate" label={t("newPriceFrom")} required min={last?.effectiveDate} width="100%" />
    </VStack>
  );
}
