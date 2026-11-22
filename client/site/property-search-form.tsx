"use client";

import { useTranslations } from "next-intl";
import { useEnumOptions } from "@/client/lib/use-enum";
import { SelectField, TextField } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

const categories = ["apartment", "house", "mini_apartment", "office"];

export type SearchValues = { q: string; category: string };

/** Reads its initial values from the URL itself, so the page shell needs no request-time data. Render inside <Suspense>. */
export function PropertySearchForm() {
  const sp = useSearchParams();
  // Remount when the URL changes (back/forward, external links) so the fields re-sync.
  return <SearchFormInner key={`${sp.get("q") ?? ""}|${sp.get("category") ?? ""}`} />;
}

function SearchFormInner() {
  const t = useTranslations("Site");
  const options = useEnumOptions();
  const categoryOptions = [{ value: "", label: t("any") }, ...options("category", categories)];
  const router = useRouter();
  const sp = useSearchParams();
  const [v, setV] = useState<SearchValues>({ q: sp.get("q") ?? "", category: sp.get("category") ?? "" });
  const set = (k: keyof SearchValues) => (val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(v)) if (val.trim()) p.set(k, val.trim());
    const s = p.toString();
    router.push(`/find-property${s ? `?${s}` : ""}`);
  };

  const clear = () => {
    setV({ q: "", category: "" });
    router.push("/find-property");
  };

  return (
    <form onSubmit={submit}>
      <VStack gap={3}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t("nameOrAddress")} type="search" value={v.q} onChange={set("q")} />
          <SelectField label={t("category")} options={categoryOptions} value={v.category} onChange={set("category")} />
        </div>
        <HStack gap={2}>
          <Button variant="primary" label={t("search")} type="submit" />
          <Button label={t("clear")} variant="ghost" onClick={clear} />
        </HStack>
      </VStack>
    </form>
  );
}
