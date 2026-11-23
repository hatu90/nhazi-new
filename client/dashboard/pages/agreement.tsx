"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AgreementSection } from "@/client/agreement/section";
import { AttachAgreementDialog } from "@/client/agreement/attach-dialog";
import { LeaseFiles } from "@/client/documents/lease-files";
import type { ILeaseDocument } from "@/client/lib/types";
import { useGet, useSend } from "@/client/lib/hooks";
import { Section, useConfirm } from "@/client/ui";
import { useLease } from "../lease-layout";

/** The lease's documents: its agreements (add / remove / fill in) and the files either side attached (ID photos, signed copies…). */
export function AgreementPage() {
  const t = useTranslations("Documents");
  const c = useTranslations("Common");
  const { lease: l, apiPath } = useLease();
  const confirm = useConfirm();
  const save = useSend<{ documents: ILeaseDocument[] }>("POST", apiPath("/documents"), [apiPath()]);
  const add = useSend<{ templateId: string }>("POST", apiPath("/agreements"), [apiPath()]);
  const remove = useSend<{ id: string }>("DELETE", (b) => apiPath(`/agreements/${b.id}`), [apiPath()]);
  const saveValues = useSend<{ id: string; values: Record<string, string> }>("PATCH", (b) => apiPath(`/agreements/${b.id}`), [apiPath()]);
  const [adding, setAdding] = useState(false);
  const templates = useGet<{ items: { id: string; name: string }[] }>(apiPath("/agreement-templates"), undefined, { enabled: adding });
  const facts = { propertyName: l.propertyName, unitName: l.unitName, tenantNames: l.members.filter((m) => !m.leftAt).map((m) => m.name), startDate: l.startDate, endDate: l.endDate, rent: l.currentRent, deposit: l.depositAmount, billingDay: l.billingCycleDay };
  return (
    <VStack gap={4}>
      <Section title={t("agreements")} action={<Button icon={<Plus size={16} />} label={t("addAgreement")} size="sm" variant="secondary" onClick={() => setAdding(true)} />}>
        {l.agreements.length === 0 && <Text color="secondary">{t("noAgreement")}</Text>}
        <VStack gap={5}>
      {l.agreements.map((a) => (
        <AgreementSection
          key={a.id}
          embedded
          filesBase={apiPath()}
          title={a.templateName}
          content={a.content}
          facts={facts}
          values={a.values}
          onSaveValues={(values) => saveValues.mutateAsync({ id: a.id, values })}
          action={<Button size="sm" variant="ghost" icon={<Trash2 size={14} />} label={t("removeAgreement")} onClick={() => confirm.ask({ title: t("removeAgreementTitle", { name: a.templateName }), description: t("removeAgreementBody"), actionLabel: c("remove"), onConfirm: () => remove.mutateAsync({ id: a.id }) })} />}
        />
      ))}
        </VStack>
      </Section>
      <Section title={t("title")}><LeaseFiles base={apiPath()} documents={l.documents} onAdd={(documents) => save.mutateAsync({ documents })} /></Section>
      <AttachAgreementDialog open={adding} templates={templates.data?.items} onSave={(templateId) => add.mutateAsync({ templateId })} onClose={() => setAdding(false)} />
      {confirm.element}
    </VStack>
  );
}
