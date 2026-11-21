"use client";

import { Spinner } from "@astryxdesign/core/Spinner";
import { VStack } from "@astryxdesign/core/Stack";
import { useTranslations } from "next-intl";

export function PageSpinner() {
  const t = useTranslations("Common");
  return (
    <VStack align="center" padding={8}>
      <Spinner label={t("loading")} />
    </VStack>
  );
}
