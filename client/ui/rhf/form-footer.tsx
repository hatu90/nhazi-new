"use client";

import { Button } from "@astryxdesign/core/Button";
import { useTranslations } from "next-intl";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { FormError } from "../form";

/** Error + Cancel / Submit for a form's footer (`<LayoutFooter padding={5}>`). Without `onCancel` (an inline form on a page) it is just the Save button. */
export function FormFooter({ error, busy, submitLabel, submitDisabled, onCancel }: { error?: unknown; busy?: boolean; submitLabel: string; submitDisabled?: boolean; onCancel?: () => void }) {
  const t = useTranslations("Common");
  return (
    <VStack gap={3}>
      <FormError error={error} />
      <HStack gap={2} justify={onCancel ? "end" : "start"}>
        {onCancel && <Button label={t("cancel")} variant="secondary" onClick={onCancel} />}
        <Button variant="primary" type="submit" label={submitLabel} isLoading={busy} isDisabled={submitDisabled} />
      </HStack>
    </VStack>
  );
}
