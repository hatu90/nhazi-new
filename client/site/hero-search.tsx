"use client";

import { Button } from "@astryxdesign/core/Button";
import { InputGroup } from "@astryxdesign/core/InputGroup";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

/** Landing-page search: submits to /find-property?q=... */
export function HeroSearch() {
  const t = useTranslations("Site");
  const router = useRouter();
  const [q, setQ] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    router.push(v ? `/find-property?q=${encodeURIComponent(v)}` : "/find-property");
  };

  return (
    <form onSubmit={submit} className="w-full max-w-xl">
      <InputGroup label={t("nameOrAddress")} isLabelHidden size="lg">
        <TextInput label={t("nameOrAddress")} isLabelHidden type="search" value={q} onChange={setQ} placeholder={t("nameOrAddress")} />
        <Button variant="primary" label={t("search")} type="submit" />
      </InputGroup>
    </form>
  );
}
