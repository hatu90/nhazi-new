"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { api } from "@/client/lib/api";
import { useGet } from "@/client/lib/hooks";
import type { IMeterResponse, IServiceListResponse, IUnitListResponse } from "@/client/lib/types";
import { FMulti, useOpenReset } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useProperty } from "../property-layout";
import { BulkMetersValues, MeterConfig } from "./bulk-meters-types";
import { meterName } from "./helpers";
import { MeterConfigFields } from "./meter-config-fields";

const emptyMeter = (): MeterConfig => ({ serviceId: "", prefix: "", postfix: "", installedAt: "" });

/**
 * Bulk meters: one meter configuration (service, name template) per meter, applied to every picked unit.
 * The API call is all-or-nothing.
 */
export function useBulkMetersForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const t = useTranslations("Meters");
  const { apiPath } = useProperty();
  const qc = useQueryClient();
  const form = useForm<BulkMetersValues>({
    defaultValues: { unitIds: [], meters: [emptyMeter()] },
  });
  const configs = useFieldArray({ control: form.control, name: "meters" });
  const unitIds = useWatch({ control: form.control, name: "unitIds" });
  const meters = useWatch({ control: form.control, name: "meters" });

  const existingUnits = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 }, { enabled: open });
  const services = useGet<IServiceListResponse>(apiPath("/services"), { usageBase: "meter", pageSize: 100 }, { enabled: open });
  const serviceOptions = (services.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }));

  const roomNames = (existingUnits.data?.items ?? []).filter((u) => unitIds.includes(u.id)).map((u) => u.name);

  const run = useMutation({
    mutationFn: async (v: BulkMetersValues) => {
      const units = (existingUnits.data?.items ?? []).filter((u) => v.unitIds.includes(u.id));
      // every picked unit x every configuration
      await api<IMeterResponse[]>(apiPath("/meters/bulk"), {
        method: "POST",
        body: { items: units.flatMap((u) => v.meters.map((m) => ({ unitId: u.id, serviceId: m.serviceId, name: meterName(m.prefix, u.name, m.postfix), installedAt: m.installedAt || undefined }))) },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/properties") });
      onDone();
    },
  });

  useOpenReset(open, () => { form.reset({ unitIds: [], meters: [emptyMeter()] }); run.reset(); });
  const submit = form.handleSubmit((v) => {
    const total = roomNames.length * v.meters.length;
    if (total > 200) return form.setError("unitIds", { message: t("limit", { total }) });
    run.mutate(v);
  });

  return { form, submit, error: run.error, busy: run.isPending, configs, meters, existingUnits, services, serviceOptions, roomNames };
}

export function BulkMetersFields({ x: { form, configs, meters, existingUnits, services, serviceOptions, roomNames } }: { x: ReturnType<typeof useBulkMetersForm> }) {
  const t = useTranslations("Meters");
  const c = useTranslations("Common");
  return (
    <VStack gap={4}>
      <FMulti control={form.control} name="unitIds" label={t("units")} required options={(existingUnits.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))} placeholder={existingUnits.isPending ? `${c("loading")}…` : t("selectUnits")} width="100%" />

      <VStack gap={5}>
          {configs.fields.map((f, i) => (
            <MeterConfigFields key={f.id} control={form.control} index={i} serviceOptions={serviceOptions} prefix={meters[i]?.prefix ?? ""} postfix={meters[i]?.postfix ?? ""} sampleRoom={roomNames[0]} serviceNames={Object.fromEntries((services.data?.items ?? []).map((x) => [x.id, x.name]))} getValues={form.getValues} setValue={form.setValue} onRemove={configs.fields.length > 1 ? () => configs.remove(i) : undefined} />
          ))}
          <HStack><Button icon={<Plus size={16} />} label={t("addAnother")} size="sm" variant="secondary" onClick={() => configs.append(emptyMeter())} /></HStack>
      </VStack>
    </VStack>
  );
}
