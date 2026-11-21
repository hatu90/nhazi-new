"use client";

import { useTranslations } from "next-intl";
import { Section } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useMemo, useState, type ReactNode } from "react";
import { toPages } from "./config";
import { FillForm } from "./fill-form";
import { withDefaults } from "./metadata";
import { AgreementResult, hasFields } from "./render";
import { buildVars, type LeaseFacts } from "./vars";

/**
 * The lease's agreement: the result (sheets with the typed values) + print.
 * With `onSaveValues` (admin) the template's form fields can be filled in; the result is what the tenant sees.
 */
export function AgreementSection({
  title,
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
  const t = useTranslations("Agreements");
  const [editing, setEditing] = useState(false);
  const vars = useMemo(() => buildVars(facts, { openEnded: t("openEnded"), billingDay: (n) => t("billingDay", { n }) }), [facts, t]);
  const filled = useMemo(() => withDefaults(toPages(content), values), [content, values]);
  const canEdit = !!onSaveValues && hasFields(content);

  const heading = title ?? t("title");
  if (!content) return <Section title={heading}><Text color="secondary">{t("unavailable")}</Text></Section>;
  return (
    <Section
      title={heading}
      action={
        <HStack gap={2}>
          {canEdit && !editing && <Button label={t("fillIn")} size="sm" variant="secondary" onClick={() => setEditing(true)} />}
          {!editing && <Button label={t("print")} size="sm" variant="secondary" onClick={() => window.print()} />}
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
