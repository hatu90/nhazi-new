"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { X, Plus } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { isValidPhone, normalizePhone, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITemplateListResponse, IUnitListResponse } from "@/client/lib/types";
import { Section } from "@/client/ui";
import { num } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "./property-layout";

interface Values {
  unitId: string;
  startDate: string;
  endDate: string;
  rent: string;
  depositAmount: string;
  tenants: { name: string; yearOfBirth: string; phone: string }[];
  templateId: string;
}

const defaults = (): Values => ({ unitId: "", startDate: todayIso(), endDate: "", rent: "", depositAmount: "", tenants: [{ name: "", yearOfBirth: "", phone: "" }], templateId: "" });

/** Creates a draft lease; start it from its page. */
/** `unitId` preselects the unit (adding a lease from an empty unit). */
export function useLeaseForm({ open, unitId, onDone }: { open: boolean; unitId?: string; onDone: (leaseId: string) => void }) {
  const { apiPath } = useProperty();
  const units = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 }, { enabled: open });
  const templates = useGet<ITemplateListResponse>(apiPath("/agreement-templates"), { pageSize: 100 }, { enabled: open });
  const create = useSend<object, { id: string }>("POST", apiPath("/leases"), [apiPath("/leases")]);
  const form = useForm<Values>({ defaultValues: defaults() });
  // preselect the property's default template once the list arrives
  const defaultTemplate = templates.data?.items.find((t) => t.isDefault)?.id;
  useOpenReset(open, () => { form.reset({ ...defaults(), unitId: unitId ?? "", templateId: defaultTemplate ?? "" }); create.reset(); }, unitId);
  useEffect(() => {
    if (defaultTemplate && !form.getValues("templateId")) form.setValue("templateId", defaultTemplate);
  }, [defaultTemplate, form]);
  // a preselected unit pre-fills the rent once the unit list arrives (picking a unit by hand does this in the field)
  const preselectedRent = unitId ? units.data?.items.find((u) => u.id === unitId)?.rentPrice : undefined;
  useEffect(() => {
    if (preselectedRent && !form.getValues("rent")) form.setValue("rent", String(preselectedRent));
  }, [preselectedRent, form]);
  const tenants = useFieldArray({ control: form.control, name: "tenants" });

  const submit = useSubmit(
    form,
    create,
    (v) => ({
      unitId: v.unitId,
      startDate: v.startDate,
      endDate: v.endDate || undefined,
      rent: num(v.rent),
      depositAmount: num(v.depositAmount) ?? 0,
      ...(v.templateId && { agreement: { templateId: v.templateId, values: {} } }),
      // tenants are the lease's people; those with a phone number are invited to see the lease
      members: v.tenants.map((t) => ({ name: t.name.trim(), yearOfBirth: num(t.yearOfBirth), phoneNumber: t.phone.trim() ? normalizePhone(t.phone) : undefined })),
    }),
    (l) => onDone(l.id),
  );

  return { form, submit, error: create.error, busy: create.isPending, units, templates, tenants };
}

export function LeaseFields({ x: { form, units, templates, tenants } }: { x: ReturnType<typeof useLeaseForm> }) {
  const t = useTranslations("LeaseForm");
  const c = useTranslations("Common");
  return (
    <VStack gap={4}>
      <Section title={t("unitTerm")}>
        <FSelect
          control={form.control}
          name="unitId"
          label={c("unit")}
          required
          search
          options={(units.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))}
          onValueChange={(id) => {
            const u = units.data?.items.find((x) => x.id === id);
            if (u?.rentPrice && !form.getValues("rent")) form.setValue("rent", String(u.rentPrice));
          }}
          width="100%"
        />
        <FDate control={form.control} name="startDate" label={t("startDate")} required width="100%" />
        <FDate control={form.control} name="endDate" label={t("endDate")} hint={t("endHint")} width="100%" />
      </Section>

      <Section title={t("rentDeposit")}>
        <FNumber control={form.control} name="rent" label={t("monthlyRent")} money required width="100%" />
        <FNumber control={form.control} name="depositAmount" label={t("deposit")} money width="100%" />
      </Section>

      <Section title={t("agreement")}>
        <FSelect
          control={form.control}
          name="templateId"
          label={t("template")}
          options={[{ value: "", label: c("none") }, ...(templates.data?.items ?? []).map((tpl) => ({ value: tpl.id, label: tpl.isDefault ? t("defaultSuffix", { name: tpl.name }) : tpl.name }))]}
          width="100%"
        />
      </Section>

      <Section title={t("tenants")} action={<Button icon={<Plus size={16} />} label={t("addTenant")} size="sm" variant="secondary" onClick={() => tenants.append({ name: "", yearOfBirth: "", phone: "" })} />}>
        <Text size="sm" color="secondary">{t("tenantsHint")}</Text>
        {tenants.fields.map((f, i) => (
          <Card key={f.id} padding={4}>
            <VStack gap={3}>
              <HStack justify="between" align="center" gap={2}>
                <Text weight="semibold">{t("tenantN", { n: i + 1 })}</Text>
                {tenants.fields.length > 1 && <IconButton label={t("removeTenant", { n: i + 1 })} variant="ghost" size="sm" icon={<X />} onClick={() => tenants.remove(i)} />}
              </HStack>
              <FText control={form.control} name={`tenants.${i}.name`} label={c("name")} required width="100%" />
              <FNumber control={form.control} name={`tenants.${i}.yearOfBirth`} label={t("yearOfBirth")} required width="100%" />
              <FText
                control={form.control}
                name={`tenants.${i}.phone`}
                label={c("phone")}
                type="tel"
                placeholder="0912 345 678"
                rules={{ validate: (v) => !String(v ?? "").trim() || isValidPhone(String(v)) || c("invalidPhone") }}
                width="100%"
              />
            </VStack>
          </Card>
        ))}
      </Section>
    </VStack>
  );
}
