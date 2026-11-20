"use client";

import { useGet, useSend } from "@/client/lib/hooks";
import type { IServiceListResponse, IUnitListResponse } from "@/client/lib/types";
import { text } from "@/client/ui/form";
import { FDate, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

interface MeterValues {
  unitId: string;
  serviceId: string;
  name: string;
  serialNumber: string;
  installedAt: string;
}

export function MeterForm({ onDone }: { onDone: () => void }) {
  const { apiPath } = useProperty();
  const units = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 });
  const services = useGet<IServiceListResponse>(apiPath("/services"), { usageBase: "meter", pageSize: 100 });
  const save = useSend<object>("POST", apiPath("/meters"), [apiPath("/meters")]);
  const form = useForm<MeterValues>({ defaultValues: { unitId: "", serviceId: "", name: "", serialNumber: "", installedAt: "" } });
  const submit = useSubmit(form, save, (v) => ({ unitId: v.unitId, serviceId: v.serviceId, name: v.name.trim(), serialNumber: text(v.serialNumber), installedAt: text(v.installedAt) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add meter" onCancel={onDone}>
      <FSelect control={form.control} name="unitId" label="Unit" required search options={(units.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))} width="100%" />
      <FSelect control={form.control} name="serviceId" label="Service" required options={(services.data?.items ?? []).map((x) => ({ value: x.id, label: x.name }))} hint={services.data?.items.length === 0 ? "Create a metered service first (Services tab)." : undefined} width="100%" />
      <FText control={form.control} name="name" label="Name" placeholder="Electric meter" required width="100%" />
      <FText control={form.control} name="serialNumber" label="Serial number" width="100%" />
      <FDate control={form.control} name="installedAt" label="Installed on" width="100%" />
    </FormBody>
  );
}
