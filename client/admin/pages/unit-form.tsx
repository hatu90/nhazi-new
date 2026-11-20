"use client";

import { useSend } from "@/client/lib/hooks";
import type { IUnitResponse } from "@/client/lib/types";
import { num, text } from "@/client/ui/form";
import { FArea, FCheck, FNumber, FormBody, FText, useSubmit } from "@/client/ui/rhf";
import { useForm } from "react-hook-form";
import { useProperty } from "../property-layout";

export interface UnitValues {
  name: string;
  area: string;
  floor: string;
  bedrooms: string;
  bathrooms: string;
  rentPrice: string;
  rentNegotiable: boolean;
  description: string;
}

export function UnitForm({ unit, onDone }: { unit?: IUnitResponse; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>(unit ? "PATCH" : "POST", unit ? apiPath(`/units/${unit.id}`) : apiPath("/units"), [apiPath("/units"), "/api/admin/properties"]);
  const form = useForm<UnitValues>({
    defaultValues: {
      name: unit?.name ?? "",
      area: unit?.area.toString() ?? "",
      floor: unit?.floor.toString() ?? "1",
      bedrooms: unit?.bedrooms?.toString() ?? "",
      bathrooms: unit?.bathrooms?.toString() ?? "",
      rentPrice: unit?.rentPrice?.toString() ?? "",
      rentNegotiable: unit?.rentNegotiable ?? false,
      description: unit?.description ?? "",
    },
  });
  // Edit sends null to clear an emptied field; create simply omits it.
  const empty = unit ? null : undefined;
  const submit = useSubmit(
    form,
    save,
    (v) => ({ name: v.name.trim(), area: num(v.area), floor: num(v.floor), bedrooms: num(v.bedrooms) ?? empty, bathrooms: num(v.bathrooms) ?? empty, rentPrice: num(v.rentPrice) ?? empty, rentNegotiable: v.rentNegotiable, description: text(v.description) ?? empty }),
    onDone,
  );
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel={unit ? "Save" : "Add unit"} onCancel={onDone}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
      <FNumber control={form.control} name="area" label="Area (m²)" required width="100%" />
      <FNumber control={form.control} name="floor" label="Floor" required width="100%" />
      <FNumber control={form.control} name="bedrooms" label="Bedrooms" width="100%" />
      <FNumber control={form.control} name="bathrooms" label="Bathrooms" width="100%" />
      <FNumber control={form.control} name="rentPrice" label="Rent (₫ / month)" width="100%" />
      <FCheck control={form.control} name="rentNegotiable" label="Negotiable" />
      <FArea control={form.control} name="description" label="Description" width="100%" />
    </FormBody>
  );
}
