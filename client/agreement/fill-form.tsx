"use client";

import { ErrorBox } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { AgreementFormFields } from "./agreement-form-fields";
import { useAgreementForm } from "./render";

export function FillForm({ content, vars, values, onSave, onDone }: { content: unknown; vars: Record<string, string>; values: unknown; onSave: (v: Record<string, string>) => Promise<unknown>; onDone: () => void }) {
  const form = useAgreementForm(content, values);
  const [error, setError] = useState<Error | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={form.handleSubmit(async (v) => {
        setBusy(true);
        setError(null);
        try {
          await onSave(v);
          onDone();
        } catch (e) {
          setError(e as Error);
        } finally {
          setBusy(false);
        }
      })}
    >
      <VStack gap={3}>
        {error && <ErrorBox error={error} />}
        <AgreementFormFields form={form} data={content} vars={vars} />
        <HStack gap={2} justify="end">
          <Button label="Cancel" variant="secondary" onClick={onDone} />
          <Button variant="primary" label="Save" type="submit" isLoading={busy} />
        </HStack>
      </VStack>
    </form>
  );
}
