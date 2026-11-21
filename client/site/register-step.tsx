"use client";

import { api, errorMessage } from "@/client/lib/api";
import { FormError } from "@/client/ui/form";
import { FText } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useForm } from "react-hook-form";

export function RegisterStep({ phone, initialName, onDone }: { phone: string | null; initialName: string; onDone: () => Promise<void> }) {
  const form = useForm<{ name: string }>({ defaultValues: { name: initialName } });
  const [error, setError] = useState<unknown>(null);

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    if (!phone) return setError(new Error("Your sign-in has no verified phone number."));
    try {
      await api("/api/public/register", { method: "POST", body: { displayName: v.name.trim(), phoneNumber: phone } });
      await onDone();
    } catch (err) {
      setError(new Error(errorMessage(err)));
    }
  });

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={1}>Welcome — what should we call you?</Heading>
          <Text color="secondary">Creating an account for {phone}.</Text>
        </VStack>
        <FText control={form.control} name="name" label="Your name" required autoFocus width="100%" />
        <FormError error={error} />
        <Button variant="primary" type="submit" label="Create account" isLoading={form.formState.isSubmitting} />
      </VStack>
    </form>
  );
}
