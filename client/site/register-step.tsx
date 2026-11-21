"use client";

import { useTranslations } from "next-intl";
import { api } from "@/client/lib/api";
import { FormError } from "@/client/ui/form";
import { FText } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useForm } from "react-hook-form";

export function RegisterStep({ phone, initialName, onDone }: { phone: string | null; initialName: string; onDone: () => Promise<void> }) {
  const t = useTranslations("Auth");
  const form = useForm<{ name: string }>({ defaultValues: { name: initialName } });
  const [error, setError] = useState<unknown>(null);

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    if (!phone) return setError(new Error(t("noPhone")));
    try {
      await api("/api/public/register", { method: "POST", body: { displayName: v.name.trim(), phoneNumber: phone } });
      await onDone();
    } catch (err) {
      setError(err);
    }
  });

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={1}>{t("welcome")}</Heading>
          <Text color="secondary">{t("creating", { phone: phone ?? "" })}</Text>
        </VStack>
        <FText control={form.control} name="name" label={t("yourName")} required autoFocus width="100%" />
        <FormError error={error} />
        <Button variant="primary" type="submit" label={t("createAccount")} isLoading={form.formState.isSubmitting} />
      </VStack>
    </form>
  );
}
