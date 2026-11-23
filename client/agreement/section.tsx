"use client";

import { useTranslations } from "next-intl";
import { Section } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Eye, EyeOff, X } from "lucide-react";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useMemo, useState, type ReactNode } from "react";
import { toPages } from "./config";
import { FillForm } from "./fill-form";
import { withDefaults } from "./metadata";
import { AgreementResult, hasFields } from "./render";
import { buildVars, type LeaseFacts } from "./vars";

/**
 * The lease's agreement: the result (sheets with the typed values).
 * With `onSaveValues` (admin) the template's form fields can be filled in; the result is what the tenant sees.
 */
export function AgreementSection({
  title,
  content,
  facts,
  values,
  onSaveValues,
  extra,
  after,
  action,
  embedded,
}: {
  title?: string;
  content: unknown;
  facts: LeaseFacts;
  values: unknown;
  onSaveValues?: (values: Record<string, string>) => Promise<unknown>;
  extra?: ReactNode;
  /** Rendered below the agreement (e.g. attached files). */
  after?: ReactNode;
  /** Extra header button(s) next to Print. */
  action?: ReactNode;
  /** Inside another Section: no card of its own, a smaller title. */
  embedded?: boolean;
}) {
  const t = useTranslations("Agreements");
  const c = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [shown, setShown] = useState(false);
  const vars = useMemo(() => buildVars(facts, { openEnded: t("openEnded"), billingDay: (n) => t("billingDay", { n }) }), [facts, t]);
  const filled = useMemo(() => withDefaults(toPages(content), values), [content, values]);
  const canEdit = !!onSaveValues && hasFields(content);

  const heading = title ?? t("title");
  const wrap = (actions: ReactNode, body: ReactNode) =>
    embedded ? (
      <VStack gap={3}>
        <HStack justify="between" align="center" gap={3}>
          <Heading level={4}>{heading}</Heading>
          {actions}
        </HStack>
        {body}
      </VStack>
    ) : (
      <Section title={heading} action={actions}>{body}</Section>
    );
  if (!content) return wrap(null, <Text color="secondary">{t("unavailable")}</Text>);
  return wrap(
    <HStack gap={2}>
      <Button icon={shown ? <EyeOff size={16} /> : <Eye size={16} />} label={shown ? t("hide") : t("show")} size="sm" variant="ghost" onClick={() => { setShown((v) => !v); setEditing(false); }} />
      {!editing && action}
      {shown && canEdit && !editing && <Button label={t("fillIn")} size="sm" variant="secondary" onClick={() => setEditing(true)} />}
      {editing && <Button icon={<X size={16} />} label={c("close")} size="sm" variant="secondary" onClick={() => setEditing(false)} />}
    </HStack>,
    <VStack gap={3}>
      {extra}
      {!shown ? null : editing ? (
        <FillForm content={content} vars={vars} values={values} onSave={onSaveValues!} onDone={() => setEditing(false)} />
      ) : (
        <div className="agreement-print">
          <AgreementResult data={content} values={filled} vars={vars} />
        </div>
      )}
      {after}
    </VStack>,
  );
}
