"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
import { api } from "@/client/lib/api";
import { todayIso } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IMeterResponse, IServiceListResponse, IServiceResponse, IUnitListResponse } from "@/client/lib/types";
import { num } from "@/client/ui/form";
import { FDate, FMulti, FNumber, FormBody, FSelect, FText } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";
import { autoTemplate, meterName, NEW_SERVICE, ROOM_TOKEN } from "./helpers";

interface MeterConfig {
  serviceId: string;
  newServiceName: string;
  newServiceUnit: string;
  newServiceRate: string;
  newServiceFrom: string;
  template: string;
  installedAt: string;
}
interface Values {
  unitIds: string[];
  meters: MeterConfig[];
}

const emptyMeter = (): MeterConfig => ({
  serviceId: "",
  newServiceName: "",
  newServiceUnit: "",
  newServiceRate: "",
  newServiceFrom: todayIso(),
  template: autoTemplate(""),
  installedAt: "",
});

/** Services a half-finished run already created, so a retry after the meters step failed does not duplicate them. */
interface Progress {
  services: Record<number, string>;
}

/**
 * Bulk meters: one meter configuration (service, name template) per meter, applied to every picked unit.
 * A service the meters need can be created on the spot. Steps run in order (new services -> meters); each API call is
 * all-or-nothing, and a created service is remembered if the meters step fails, so a retry does not duplicate it.
 */
export function BulkMetersForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { apiPath } = useProperty();
  const qc = useQueryClient();
  const progress = useRef<Progress>({ services: {} });
  const [stage, setStage] = useState<string>();

  const form = useForm<Values>({
    defaultValues: { unitIds: [], meters: [emptyMeter()] },
  });
  const configs = useFieldArray({ control: form.control, name: "meters" });
  const unitIds = useWatch({ control: form.control, name: "unitIds" });
  const meters = useWatch({ control: form.control, name: "meters" });

  const existingUnits = useGet<IUnitListResponse>(apiPath("/units"), { pageSize: 100 });
  const services = useGet<IServiceListResponse>(apiPath("/services"), { usageBase: "meter", pageSize: 100 });
  const serviceOptions = [...(services.data?.items ?? []).map((s) => ({ value: s.id, label: s.name })), { value: NEW_SERVICE, label: "+ Add a new service…" }];

  const roomNames = (existingUnits.data?.items ?? []).filter((u) => unitIds.includes(u.id)).map((u) => u.name);

  const run = useMutation({
    mutationFn: async (v: Values) => {
      const done = progress.current;

      // 1. services that do not exist yet
      const serviceIds: string[] = [];
      for (const [i, m] of v.meters.entries()) {
        if (m.serviceId !== NEW_SERVICE) {
          serviceIds[i] = m.serviceId;
          continue;
        }
        if (!done.services[i]) {
          setStage(`Creating service “${m.newServiceName}”…`);
          const created = await api<IServiceResponse[]>(apiPath("/services/bulk"), {
            method: "POST",
            body: { items: [{ name: m.newServiceName.trim(), usageBase: "meter", unitOfMeasure: m.newServiceUnit.trim() || undefined, prices: [{ effectiveDate: m.newServiceFrom, tiers: [{ upTo: null, rate: num(m.newServiceRate) ?? 0 }] }] }] },
          });
          done.services[i] = created[0].id;
        }
        serviceIds[i] = done.services[i];
      }

      // 2. the units that were picked
      const units = (existingUnits.data?.items ?? []).filter((u) => v.unitIds.includes(u.id));

      // 3. meters: every picked unit x every configuration
      setStage(`Creating ${units.length * v.meters.length} meters…`);
      await api<IMeterResponse[]>(apiPath("/meters/bulk"), {
        method: "POST",
        body: { items: units.flatMap((u) => v.meters.map((m, i) => ({ unitId: u.id, serviceId: serviceIds[i], name: meterName(m.template, u.name), installedAt: m.installedAt || undefined }))) },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/properties") });
      onDone();
    },
    onSettled: () => setStage(undefined),
  });

  const submit = form.handleSubmit((v) => {
    const total = roomNames.length * v.meters.length;
    if (total > 200) return form.setError("unitIds", { message: `That would create ${total} meters; the limit is 200 at a time` });
    run.mutate(v);
  });


  return (
    <FormBody onSubmit={submit} error={run.error} busy={run.isPending} submitLabel="Create meters" onCancel={onCancel}>
      <FMulti control={form.control} name="unitIds" label="Units" required options={(existingUnits.data?.items ?? []).map((u) => ({ value: u.id, label: u.name }))} placeholder={existingUnits.isPending ? "Loading…" : "Select units…"} width="100%" />

      <VStack gap={5}>
          {configs.fields.map((f, i) => (
            <MeterConfigFields key={f.id} control={form.control} index={i} serviceOptions={serviceOptions} isNew={meters[i]?.serviceId === NEW_SERVICE} template={meters[i]?.template ?? ""} rooms={roomNames} serviceNames={Object.fromEntries((services.data?.items ?? []).map((x) => [x.id, x.name]))} getValues={form.getValues} setValue={form.setValue} onRemove={configs.fields.length > 1 ? () => configs.remove(i) : undefined} />
          ))}
          <HStack><Button label="Add another meter" size="sm" variant="secondary" onClick={() => configs.append(emptyMeter())} /></HStack>
          <Text size="sm" color="secondary">{roomNames.length} unit{roomNames.length === 1 ? "" : "s"} × {meters.length} meter{meters.length === 1 ? "" : "s"} per unit = {roomNames.length * meters.length} meters.</Text>
      </VStack>
      {stage && <Text size="sm" color="secondary">{stage}</Text>}
    </FormBody>
  );
}

function MeterConfigFields({ control, index: i, serviceOptions, serviceNames, isNew, template, rooms, getValues, setValue, onRemove }: {
  control: Control<Values>;
  index: number;
  serviceOptions: { value: string; label: string }[];
  serviceNames: Record<string, string>;
  isNew: boolean;
  template: string;
  rooms: string[];
  getValues: (name: `meters.${number}.${keyof MeterConfig}`) => string;
  setValue: (name: `meters.${number}.${keyof MeterConfig}`, v: string) => void;
  onRemove?: () => void;
}) {
  const sample = rooms.slice(0, 2).map((r) => meterName(template, r)).filter(Boolean);
  /** Keep the name template in step with the service's name, until the admin has edited it by hand. */
  const followName = (previous: string, next: string) => {
    if (getValues(`meters.${i}.template`) === autoTemplate(previous)) setValue(`meters.${i}.template`, autoTemplate(next));
  };
  return (
    <VStack gap={3}>
      <HStack justify="between" align="center">
        <Text weight="semibold">Meter {i + 1}</Text>
        {onRemove && <Button label="Remove" size="sm" variant="ghost" onClick={onRemove} />}
      </HStack>
      <FSelect
        control={control}
        name={`meters.${i}.serviceId`}
        label="Service"
        required
        options={serviceOptions}
        hint={serviceOptions.length === 1 ? "No metered service yet — add one here." : undefined}
        onValueChange={(next) => {
          const previousId = getValues(`meters.${i}.serviceId`);
          const previous = previousId === NEW_SERVICE ? getValues(`meters.${i}.newServiceName`) : (serviceNames[previousId] ?? "");
          followName(previous, next === NEW_SERVICE ? getValues(`meters.${i}.newServiceName`) : (serviceNames[next] ?? ""));
        }}
        width="100%"
      />
      {isNew && (
        <>
          <FText control={control} name={`meters.${i}.newServiceName`} label="New service name" placeholder="Electricity" required onValueChange={(next) => followName(getValues(`meters.${i}.newServiceName`), next)} width="100%" />
          <FText control={control} name={`meters.${i}.newServiceUnit`} label="Unit of measure" hint="e.g. kWh, m³" width="100%" />
          <FNumber control={control} name={`meters.${i}.newServiceRate`} label="Price per unit (₫)" required hint="A flat price; add price tiers later on the Services tab." width="100%" />
          <FDate control={control} name={`meters.${i}.newServiceFrom`} label="Price takes effect on" required width="100%" />
        </>
      )}
      <FText
        control={control}
        name={`meters.${i}.template`}
        label="Meter name"
        required
        width="100%"
        hint={`Put ${ROOM_TOKEN} before or after your text: “Electricity - ${ROOM_TOKEN}” or “${ROOM_TOKEN} - Electricity”.${sample.length ? ` Preview: ${sample.join(", ")}${rooms.length > 2 ? ", …" : ""}` : ""}`}
      />
      <FDate control={control} name={`meters.${i}.installedAt`} label="Installed on" hint="Optional." width="100%" />
    </VStack>
  );
}
