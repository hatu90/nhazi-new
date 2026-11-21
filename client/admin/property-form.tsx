"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { label } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { IAdminPropertyResponse, PropertyCategory } from "@/client/lib/types";
import { FArea, FCheck, FNumber, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { Section } from "@/client/ui";
import { num } from "@/client/ui/form";
import { PropertyImages } from "./property-images";
import { ReferenceAddressPicker, type RefAddressDraft } from "./reference-address-picker";
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
export function usePropertyForm({ initial, method, path, open, onDone }: { initial?: IAdminPropertyResponse; method: "POST" | "PATCH"; path: string; open?: boolean; onDone: (p: IAdminPropertyResponse) => void }) {
  const defaults = (): Values => ({
    name: initial?.name ?? "",
    category: initial?.category ?? "apartment",
    street: initial?.street ?? "",
    provinceCode: initial?.province.code.toString() ?? "",
    wardCode: initial?.ward.code.toString() ?? "",
    rentPriceFrom: initial?.rentPriceFrom?.toString() ?? "",
    rentPriceTo: initial?.rentPriceTo?.toString() ?? "",
    rentNegotiable: initial?.rentNegotiable ?? false,
    rules: (initial?.rules ?? []).join("\n"),
  });
  const form = useForm<Values>({ defaultValues: defaults() });
  const [headerImage, setHeaderImage] = useState<string | null>(initial?.headerImage ?? null);
  const allImages = () => (initial?.headerImage && !initial.images.includes(initial.headerImage) ? [initial.headerImage, ...initial.images] : initial?.images ?? []);
  const [images, setImages] = useState<string[]>(allImages);
  const initialRefs = (): RefAddressDraft[] => (initial?.referenceAddresses ?? []).map((r) => ({ id: r.id, name: r.name, distance: r.distance?.toString() ?? "" }));
  const [refs, setRefs] = useState<RefAddressDraft[]>(initialRefs);
  const [uploading, setUploading] = useState(false);
  const save = useSend<object, IAdminPropertyResponse>(method, path, ["/api/admin/properties", "/api/me"]);
  // `open` is undefined for an inline form on a page: it is never reset
  useOpenReset(!!open, () => { form.reset(defaults()); setHeaderImage(initial?.headerImage ?? null); setImages(allImages()); setRefs(initialRefs()); save.reset(); });
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
      // existing places by id, new ones by name (the server finds-or-creates them by slug)
      referenceAddresses: refs.map((r) => ({ ...(r.id ? { id: r.id } : { name: r.name }), distance: num(r.distance) === undefined ? null : Math.round(num(r.distance)!) })),
      // a new property takes the keys of images staged under /api/admin/drafts (the server moves them under it)
      ...(initial ? { headerImage: headerImage ?? images[0] ?? null, images } : { headerImage: headerImage ?? images[0], images }),
    }),
    onDone,
  );

  return { form, submit, error: save.error, busy: save.isPending || uploading, initial, path, headerImage, setHeaderImage, images, setImages, refs, setRefs, setUploading, provinces, wards, provinceCode, provinceList, wardList };
}

export function PropertyFields({ x: { form, initial, path, headerImage, setHeaderImage, images, setImages, refs, setRefs, setUploading, provinces, wards, provinceCode, provinceList, wardList } }: { x: ReturnType<typeof usePropertyForm> }) {
  return (
    <VStack gap={4}>
      <Section title="Basics">
        <FText control={form.control} name="name" label="Name" required width="100%" />
        <FSelect control={form.control} name="category" label="Category" options={categories.map((c) => ({ value: c, label: label(c) }))} width="100%" />
      </Section>

      <Section title="Address">
        <FText control={form.control} name="street" label="Street address" required width="100%" />
        <FSelect control={form.control} name="provinceCode" label="Province / city" required search options={provinceList.map((p) => ({ value: String(p.code), label: p.name }))} placeholder={provinces.isPending ? "Loading…" : "Select…"} onValueChange={() => form.setValue("wardCode", "")} width="100%" />
        <FSelect control={form.control} name="wardCode" label="Ward" required search disabled={!provinceCode} options={wardList.map((w) => ({ value: String(w.code), label: w.name }))} placeholder={wards.isPending && provinceCode ? "Loading…" : "Select…"} width="100%" />
      </Section>

      <Section title="Nearby places">
        <ReferenceAddressPicker value={refs} onChange={setRefs} />
      </Section>

      <Section title="Rent">
        <FNumber control={form.control} name="rentPriceFrom" label="Rent from" money width="100%" />
        <FNumber control={form.control} name="rentPriceTo" label="Rent to" money width="100%" />
        <FCheck control={form.control} name="rentNegotiable" label="Rent is negotiable" />
      </Section>

      <Section title="Images">
        <PropertyImages base={initial ? path : "/api/admin/drafts"} headerImage={headerImage} images={images} onHeaderImage={setHeaderImage} onImages={setImages} onBusy={setUploading} />
      </Section>

      <Section title="House rules">
        <FArea control={form.control} name="rules" label="Rules" hint="One rule per line." width="100%" />
      </Section>
    </VStack>
  );
}
