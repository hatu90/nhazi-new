"use client";

import { useForm, useWatch } from "react-hook-form";
import { label } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { IAdminPropertyResponse, PropertyCategory } from "@/client/lib/types";
import { FArea, FCheck, FNumber, FormBody, FSelect, FText, useSubmit } from "@/client/ui/rhf";
import { num } from "@/client/ui/form";
import { useProvinces, useWards } from "./location";

export const categories: PropertyCategory[] = ["apartment", "house", "mini_apartment", "office"];

interface Values {
  name: string;
  category: PropertyCategory;
  street: string;
  provinceCode: string;
  wardCode: string;
  rentPriceFrom: string;
  rentPriceTo: string;
  rentNegotiable: boolean;
  rules: string;
}

/** Create (`method: POST`, `path: /api/admin/properties`) or edit (`PATCH`, `/api/admin/properties/:id`) a property. */
export function PropertyForm({ initial, method, path, onDone, onCancel, inline }: { initial?: IAdminPropertyResponse; method: "POST" | "PATCH"; path: string; onDone: (p: IAdminPropertyResponse) => void; onCancel: () => void; inline?: boolean }) {
  const form = useForm<Values>({
    defaultValues: {
      name: initial?.name ?? "",
      category: initial?.category ?? "apartment",
      street: initial?.street ?? "",
      provinceCode: initial?.province.code.toString() ?? "",
      wardCode: initial?.ward.code.toString() ?? "",
      rentPriceFrom: initial?.rentPriceFrom?.toString() ?? "",
      rentPriceTo: initial?.rentPriceTo?.toString() ?? "",
      rentNegotiable: initial?.rentNegotiable ?? false,
      rules: (initial?.rules ?? []).join("\n"),
    },
  });
  const save = useSend<object, IAdminPropertyResponse>(method, path, ["/api/admin/properties", "/api/me"]);
  const provinceCode = useWatch({ control: form.control, name: "provinceCode" });

  const provinces = useProvinces();
  const wards = useWards(provinceCode ? Number(provinceCode) : undefined);
  const provinceList = provinces.data ?? (initial ? [initial.province] : []);
  const wardList = wards.data ?? (initial && initial.province.code === Number(provinceCode) ? [initial.ward] : []);

  const submit = useSubmit(
    form,
    save,
    (v) => ({
      name: v.name.trim(),
      category: v.category,
      street: v.street.trim(),
      province: provinceList.find((p) => p.code === Number(v.provinceCode)),
      ward: wardList.find((w) => w.code === Number(v.wardCode)),
      rentPriceFrom: num(v.rentPriceFrom) ?? null,
      rentPriceTo: num(v.rentPriceTo) ?? null,
      rentNegotiable: v.rentNegotiable,
      rules: v.rules.split("\n").map((r) => r.trim()).filter(Boolean),
    }),
    onDone,
  );

  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel={initial ? "Save changes" : "Create property"} onCancel={onCancel} inline={inline}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
      <FSelect control={form.control} name="category" label="Category" options={categories.map((c) => ({ value: c, label: label(c) }))} width="100%" />
      <FText control={form.control} name="street" label="Street address" required width="100%" />
      <FSelect control={form.control} name="provinceCode" label="Province / city" required search options={provinceList.map((p) => ({ value: String(p.code), label: p.name }))} placeholder={provinces.isPending ? "Loading…" : "Select…"} onValueChange={() => form.setValue("wardCode", "")} width="100%" />
      <FSelect control={form.control} name="wardCode" label="Ward" required search disabled={!provinceCode} options={wardList.map((w) => ({ value: String(w.code), label: w.name }))} placeholder={wards.isPending && provinceCode ? "Loading…" : "Select…"} width="100%" />
      <FNumber control={form.control} name="rentPriceFrom" label="Rent from (₫)" width="100%" />
      <FNumber control={form.control} name="rentPriceTo" label="Rent to (₫)" width="100%" />
      <FCheck control={form.control} name="rentNegotiable" label="Rent is negotiable" />
      <FArea control={form.control} name="rules" label="House rules" hint="One rule per line." width="100%" />
    </FormBody>
  );
}
