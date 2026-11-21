"use client";

import { useTranslations } from "next-intl";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useForm } from "react-hook-form";
import { useEnumOptions } from "@/client/lib/use-enum";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IItemListResponse, ItemCondition } from "@/client/lib/types";
import { num, text } from "@/client/ui/form";
import { FArea, FNumber, FSelect, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../../property-layout";
import type { Handover } from "./types";

const CONDITIONS: ItemCondition[] = ["good", "damaged", "missing"];

interface Values {
  itemId: string;
  quantity: string;
  condition: ItemCondition;
  description: string;
}

/** Add an inventory item to the lease's handover list, or (with `handover`) update its quantity / condition / note. */
export function useHandoverForm({ path, handover, taken, open, onDone }: { path: string; handover?: Handover; taken: string[]; open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const items = useGet<IItemListResponse>(apiPath("/inventory-items"), { pageSize: 100 }, { enabled: open && !handover });
  const save = useSend<object>(handover ? "PATCH" : "POST", handover ? `${path}/handovers/${handover.id}` : `${path}/handovers`, [path]);
  const defaults = (): Values => ({ itemId: handover?.itemId ?? "", quantity: String(handover?.quantity ?? 1), condition: handover?.condition ?? "good", description: handover?.description ?? "" });
  const form = useForm<Values>({ defaultValues: defaults() });
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); }, handover?.id);
  const available = (items.data?.items ?? []).filter((i) => !taken.includes(i.id));
  const empty = handover ? null : undefined;
  const submit = useSubmit(
    form,
    save,
    (v) => ({ ...(handover ? {} : { itemId: v.itemId }), quantity: num(v.quantity), condition: v.condition, description: text(v.description) ?? empty }),
    onDone,
  );
  return { form, submit, error: save.error, busy: save.isPending, handover, items, available };
}

export function HandoverFields({ x: { form, handover, items, available } }: { x: ReturnType<typeof useHandoverForm> }) {
  const t = useTranslations("LeaseDetail");
  const options = useEnumOptions();
  return (
    <VStack gap={4}>
      {handover ? (
        <Text weight="semibold">{handover.itemName}</Text>
      ) : (
        <FSelect control={form.control} name="itemId" label={t("item")} required options={available.map((i) => ({ value: i.id, label: i.name }))} hint={items.data && available.length === 0 ? t("noItemsLeft") : undefined} width="100%" />
      )}
      <FNumber control={form.control} name="quantity" label={t("quantity")} required width="100%" />
      <FSelect control={form.control} name="condition" label={t("condition")} required options={options("condition", CONDITIONS)} width="100%" />
      <FArea control={form.control} name="description" label={t("note")} rows={2} width="100%" />
    </VStack>
  );
}
