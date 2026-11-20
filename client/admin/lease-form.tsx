"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { isValidPhone, normalizePhone, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITemplateListResponse, IUnitListResponse } from "@/client/lib/types";
import { Section } from "@/client/ui";
import { num } from "@/client/ui/form";
import { FDate, FNumber, FormBody, FSelect, FText, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "./property-layout";

interface Values {
  unitId: string;
  startDate: string;
  endDate: string;
  rent: string;
  depositAmount: string;
  tenants: { name: string; phone: string }[];
  templateId: string;
}

/** Creates a draft lease; start it from its page. */
export function LeaseForm({ onDone, onCancel }: { onDone: (leaseId: string) => void; onCancel: () => void }) {
  const { apiPath } = useProperty();
  const units = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 });
  const templates = useGet<ITemplateListResponse>(apiPath("/agreement-templates"), { pageSize: 100 });
  const create = useSend<object, { id: string }>("POST", apiPath("/leases"), [apiPath("/leases")]);
  const form = useForm<Values>({
    defaultValues: { unitId: "", startDate: todayIso(), endDate: "", rent: "", depositAmount: "", tenants: [{ name: "", phone: "" }], templateId: "" },
  });
  // preselect the property's default template once the list arrives
  const defaultTemplate = templates.data?.items.find((t) => t.isDefault)?.id;
  useEffect(() => {
    if (defaultTemplate && !form.getValues("templateId")) form.setValue("templateId", defaultTemplate);
  }, [defaultTemplate, form]);
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
      tenants: v.tenants.map((t) => ({ phoneNumber: normalizePhone(t.phone), displayName: t.name.trim() })),
    }),
    (l) => onDone(l.id),
  );

  return (
    <FormBody onSubmit={submit} error={create.error} busy={create.isPending} submitLabel="Create draft lease" onCancel={onCancel}>
      <Section title="Unit & term">
        <FSelect
          control={form.control}
          name="unitId"
          label="Unit"
          required
          search
          options={(units.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))}
          onValueChange={(id) => {
            const u = units.data?.items.find((x) => x.id === id);
            if (u?.rentPrice && !form.getValues("rent")) form.setValue("rent", String(u.rentPrice));
          }}
          width="100%"
        />
        <FDate control={form.control} name="startDate" label="Start date" required width="100%" />
        <FDate control={form.control} name="endDate" label="End date" hint="Leave empty for an open-ended lease." width="100%" />
      </Section>

      <Section title="Rent & deposit">
        <FNumber control={form.control} name="rent" label="Monthly rent (₫)" required width="100%" />
        <FNumber control={form.control} name="depositAmount" label="Deposit (₫)" hint="An invoice for the deposit is issued with the draft." width="100%" />
      </Section>

      <Section title="Agreement">
        <FSelect
          control={form.control}
          name="templateId"
          label="Agreement template"
          hint="Optional. The current version is pinned to this lease."
          options={[{ value: "", label: "None" }, ...(templates.data?.items ?? []).map((t) => ({ value: t.id, label: t.isDefault ? `${t.name} (default)` : t.name }))]}
          width="100%"
        />
      </Section>

      <Section title="Tenants" action={<Button label="Add tenant" size="sm" variant="secondary" onClick={() => tenants.append({ name: "", phone: "" })} />}>
        <Text size="sm" color="secondary">They sign in with this phone number to see the lease. Unregistered numbers are claimed when they sign up.</Text>
        {tenants.fields.map((f, i) => (
          <VStack key={f.id} gap={2}>
            <FText control={form.control} name={`tenants.${i}.name`} label={`Tenant ${i + 1} name`} required width="100%" />
            <FText control={form.control} name={`tenants.${i}.phone`} label="Phone" type="tel" placeholder="0912 345 678" required rules={{ validate: (v) => isValidPhone(String(v)) || "Enter a valid phone number" }} width="100%" />
            {tenants.fields.length > 1 && <HStack><Button label="Remove tenant" variant="ghost" size="sm" onClick={() => tenants.remove(i)} /></HStack>}
          </VStack>
        ))}
      </Section>
    </FormBody>
  );
}
