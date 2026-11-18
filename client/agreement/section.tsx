"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useMemo, useState, type ReactNode } from "react";
import { ErrorBox, Section } from "@/client/ui";
import { toPages } from "./config";
import { withDefaults } from "./metadata";
import { AgreementFormFields, AgreementResult, hasFields, useAgreementForm } from "./render";
import { buildVars, type LeaseFacts } from "./vars";

/**
 * The lease's agreement: the result (sheets with the typed values) + print.
 * With `onSaveValues` (admin) the template's form fields can be filled in; the result is what the tenant sees.
 */
export function AgreementSection({
  title = "Agreement",
  content,
  facts,
  values,
  onSaveValues,
  extra,
}: {
  title?: string;
  content: unknown;
  facts: LeaseFacts;
  values: unknown;
  onSaveValues?: (values: Record<string, string>) => Promise<unknown>;
  extra?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const vars = useMemo(() => buildVars(facts), [facts]);
  const filled = useMemo(() => withDefaults(toPages(content), values), [content, values]);
  const canEdit = !!onSaveValues && hasFields(content);

  if (!content) return <Section title={title}><Text color="secondary">This agreement version is not available.</Text></Section>;
  return (
    <Section
      title={title}
      action={
        <HStack gap={2}>
          {canEdit && !editing && <Button label="Fill in" size="sm" variant="secondary" onClick={() => setEditing(true)} />}
          {!editing && <Button label="Print / save as PDF" size="sm" variant="secondary" onClick={() => window.print()} />}
        </HStack>
      }
    >
      <VStack gap={3}>
        {extra}
        {editing ? (
          <FillForm content={content} vars={vars} values={values} onSave={onSaveValues!} onDone={() => setEditing(false)} />
        ) : (
          <div className="agreement-print">
            <AgreementResult data={content} values={filled} vars={vars} />
          </div>
        )}
      </VStack>
    </Section>
  );
}

function FillForm({ content, vars, values, onSave, onDone }: { content: unknown; vars: Record<string, string>; values: unknown; onSave: (v: Record<string, string>) => Promise<unknown>; onDone: () => void }) {
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
          <Button label="Save" type="submit" isLoading={busy} />
        </HStack>
      </VStack>
    </form>
  );
}
