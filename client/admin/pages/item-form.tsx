"use client";

import { useSend } from "@/client/lib/hooks";
import type { IItemResponse } from "@/client/lib/types";
import { FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

export function ItemForm({ item, onDone }: { item?: IItemResponse; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>(item ? "PATCH" : "POST", item ? apiPath(`/inventory-items/${item.id}`) : apiPath("/inventory-items"), [apiPath("/inventory-items")]);
  const form = useForm<{ name: string }>({ defaultValues: { name: item?.name ?? "" } });
  const submit = useSubmit(form, save, (v) => ({ name: v.name.trim() }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel={item ? "Save" : "Add item"} onCancel={onDone}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
    </FormBody>
  );
}
