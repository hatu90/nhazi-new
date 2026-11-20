"use client";

import { Text } from "@astryxdesign/core/Text";
import { useForm } from "react-hook-form";
import { label } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IItemListResponse, ItemCondition } from "@/client/lib/types";
import { num, text } from "@/client/ui/form";
import { FArea, FNumber, FSelect, FormBody, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../../property-layout";
import type { Handover } from "./types";

const CONDITIONS: ItemCondition[] = ["good", "damaged", "missing"];
const conditionOptions = CONDITIONS.map((c) => ({ value: c, label: label(c) }));

/** Add an inventory item to the lease's handover list, or (with `handover`) update its quantity / condition / note. */
export function HandoverForm({ path, handover, taken, onDone }: { path: string; handover?: Handover; taken: string[]; onDone: () => void }) {
  const { apiPath } = useProperty();
  const items = useGet<IItemListResponse>(apiPath("/inventory-items"), { pageSize: 100 }, { enabled: !handover });
  const save = useSend<object>(handover ? "PATCH" : "POST", handover ? `${path}/handovers/${handover.id}` : `${path}/handovers`, [path]);
  const form = useForm<{ itemId: string; quantity: string; condition: ItemCondition; description: string }>({
    defaultValues: { itemId: handover?.itemId ?? "", quantity: String(handover?.quantity ?? 1), condition: handover?.condition ?? "good", description: handover?.description ?? "" },
  });
  const available = (items.data?.items ?? []).filter((i) => !taken.includes(i.id));
  const empty = handover ? null : undefined;
  const submit = useSubmit(
    form,
    save,
    (v) => ({ ...(handover ? {} : { itemId: v.itemId }), quantity: num(v.quantity), condition: v.condition, description: text(v.description) ?? empty }),
    onDone,
  );
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel={handover ? "Save" : "Add"} onCancel={onDone}>
      {handover ? (
        <Text weight="semibold">{handover.itemName}</Text>
      ) : (
        <FSelect control={form.control} name="itemId" label="Item" required options={available.map((i) => ({ value: i.id, label: i.name }))} hint={items.data && available.length === 0 ? "No items left. Add more under Inventory." : undefined} width="100%" />
      )}
      <FNumber control={form.control} name="quantity" label="Quantity" required width="100%" />
      <FSelect control={form.control} name="condition" label="Condition" required options={conditionOptions} width="100%" />
      <FArea control={form.control} name="description" label="Note" rows={2} width="100%" />
    </FormBody>
  );
}
