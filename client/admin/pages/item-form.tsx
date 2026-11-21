"use client";

import { useSend } from "@/client/lib/hooks";
import type { IItemResponse } from "@/client/lib/types";
import { FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

/** `item` = the row being renamed; undefined = adding. `open` is whether the modal is showing. */
export function useItemForm({ item, open, onDone }: { item?: IItemResponse; open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>(item ? "PATCH" : "POST", item ? apiPath(`/inventory-items/${item.id}`) : apiPath("/inventory-items"), [apiPath("/inventory-items")]);
  const form = useForm<{ name: string }>({ defaultValues: { name: item?.name ?? "" } });
  useOpenReset(open, () => { form.reset({ name: item?.name ?? "" }); save.reset(); }, item?.id);
  const submit = useSubmit(form, save, (v) => ({ name: v.name.trim() }), onDone);
  return { form, submit, error: save.error, busy: save.isPending, isEdit: !!item };
}

export function ItemFields({ x }: { x: ReturnType<typeof useItemForm> }) {
  return <FText control={x.form.control} name="name" label="Name" required width="100%" />;
}
