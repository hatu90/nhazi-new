"use client";

import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/client/lib/use-error-message";

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  const t = useTranslations("Common");
  const message = useErrorMessage();
  return <Banner status="error" title={message(error)} endContent={retry && <Button label={t("retry")} variant="secondary" size="sm" onClick={retry} />} />;
}
