"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useFieldArray, type Control, type FieldValues, type Path } from "react-hook-form";
import { FNumber } from "@/client/ui/rhf";
import { IconButton } from '@astryxdesign/core/IconButton'
import { Minus, Plus } from "lucide-react";

export interface TierRow {
  upTo: string;
  rate: string;
}
export const emptyTier = (): TierRow => ({ upTo: "", rate: "" });

/** Rows -> API tiers. The last tier is always unbounded. */
export const toTiers = (rows: TierRow[]) => rows.map((r, i) => ({ upTo: i === rows.length - 1 ? null : Number(r.upTo), rate: Number(r.rate) }));

/** Price tiers as a react-hook-form field array (`name` must point at a `TierRow[]`). Single-column. */
export function TierFields<T extends FieldValues>({ control, name, multi, unit }: { control: Control<T>; name: string; multi: boolean; unit: string }) {
  const t = useTranslations("Services");
  const { fields, append, remove } = useFieldArray({ control, name: name as never });
  return (
    <VStack gap={3}>
      {fields.map((f, i) => {
        const last = i === fields.length - 1;
        return (
          <VStack key={f.id} gap={1}>
            {multi && last && <Text size="sm" color="secondary">{t("tierAbove", { n: i + 1 })}</Text>}
            <HStack gap={2} align="end">
              {multi && !last && <FNumber control={control} name={`${name}.${i}.upTo` as Path<T>} label={t("tierUpTo", { n: i + 1 })} unit={unit} required width="100%" />}
              <FNumber control={control} name={`${name}.${i}.rate` as Path<T>} label={multi ? t("rate") : t("price")} money hint={t("per", { unit })} required width="100%" />
              {multi && fields.length > 1 && (!last) && <IconButton label={t("removeTier", { n: i + 1 })} variant="ghost" icon={<Minus />} onClick={() => remove(i)} />}
              {multi && last && (
                <IconButton icon={<Plus />} label={t("addTier")} onClick={() => append(emptyTier() as never)} />
              )}
            </HStack>
          </VStack>
        );
      })}

    </VStack>
  );
}
