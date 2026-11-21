"use client";

import { Button } from "@astryxdesign/core/Button";
import { useTranslations } from "next-intl";
import { Empty } from "@/client/ui";

export function NotFound({ backTo = "/", label }: { backTo?: string; label?: string }) {
  const t = useTranslations("Common");
  return <Empty title={t("notFound")} hint={t("notFoundHint")} action={<Button label={label ?? t("back")} variant="secondary" href={backTo} />} />;
}
