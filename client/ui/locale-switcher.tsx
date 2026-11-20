"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { localeLabels, locales } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";

/** Native select that stores the choice in a cookie and refreshes the page. */
export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("Common");
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <select
      aria-label={t("language")}
      value={locale}
      disabled={pending}
      onChange={(e) => start(async () => { await setLocale(e.target.value); router.refresh(); })}
      className="rounded-md border border-current/20 bg-transparent px-2 py-1 text-sm"
    >
      {locales.map((l) => <option key={l} value={l}>{localeLabels[l]}</option>)}
    </select>
  );
}
