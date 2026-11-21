"use client";

import { useTranslations } from "next-intl";
import { TextField } from "@/client/ui";
import { FDate, FSelect, FText } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { type Control } from "react-hook-form";
import { BulkMetersValues, MeterConfig } from "./bulk-meters-types";
import { meterName } from "./helpers";

export function MeterConfigFields({ control, index: i, serviceOptions, serviceNames, prefix, postfix, sampleRoom, getValues, setValue, onRemove }: {
  control: Control<BulkMetersValues>;
  index: number;
  serviceOptions: { value: string; label: string }[];
  serviceNames: Record<string, string>;
  prefix: string;
  postfix: string;
  sampleRoom?: string;
  getValues: (name: `meters.${number}.${keyof MeterConfig}`) => string;
  setValue: (name: `meters.${number}.${keyof MeterConfig}`, v: string) => void;
  onRemove?: () => void;
}) {
  const t = useTranslations("Meters");
  const c = useTranslations("Common");
  return (
    <VStack gap={3}>
      <HStack justify="between" align="center">
        <Text weight="semibold">{t("meterN", { n: i + 1 })}</Text>
        {onRemove && <Button label={c("remove")} size="sm" variant="ghost" onClick={onRemove} />}
      </HStack>
      <FSelect
        control={control}
        name={`meters.${i}.serviceId`}
        label={t("service")}
        required
        options={serviceOptions}
        hint={serviceOptions.length === 0 ? t("noService") : undefined}
        onValueChange={(next) => {
          // the prefix follows the service name until it has been edited by hand
          const current = getValues(`meters.${i}.prefix`);
          if (current === "" || current === (serviceNames[getValues(`meters.${i}.serviceId`)] ?? "")) setValue(`meters.${i}.prefix`, serviceNames[next] ?? "");
        }}
        width="100%"
      />
      <HStack gap={2} align="end">
        <FText control={control} name={`meters.${i}.prefix`} label={t("prefix")} width="100%" />
        <TextField label={t("roomName")} value={sampleRoom ?? t("roomName")} onChange={() => {}} disabled width="100%" />
        <FText control={control} name={`meters.${i}.postfix`} label={t("postfix")} width="100%" />
      </HStack>
      <Text size="sm" color="secondary">{t("preview", { name: meterName(prefix, sampleRoom ?? t("roomName"), postfix) })}</Text>
      <FDate control={control} name={`meters.${i}.installedAt`} label={t("installedOn")} width="100%" />
    </VStack>
  );
}
