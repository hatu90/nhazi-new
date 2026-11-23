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
import { useGet, useSend } from "@/client/lib/hooks";
import type { ILeaseDocument, ITemplateListResponse, ITemplateVersionResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { ErrorBox, PageSkeleton, Section, useConfirm } from "@/client/ui";
import { useProperty } from "../../property-layout";

/** The lease's documents: its agreements (add / remove / fill in) and the files attached to it (ID photos, signed copies…). */
export function LeaseDocuments({ lease, path }: { lease: ITenancyDetailResponse; path: string }) {
  const t = useTranslations("Documents");
  const { apiPath, canManage } = useProperty();
  const save = useSend<Record<string, unknown>>("PATCH", path, [path]);
  const [adding, setAdding] = useState(false);
  const templates = useGet<ITemplateListResponse>(apiPath("/agreement-templates"), { pageSize: 100 }, { enabled: adding });
  const files = <LeaseFiles base={path} documents={lease.documents} onAdd={canManage ? (added) => save.mutateAsync({ documents: [...lease.documents, ...added] satisfies ILeaseDocument[] }) : undefined} onChange={canManage ? (documents) => save.mutateAsync({ documents }) : undefined} />;
  return (
    <VStack gap={4}>
      <Section title={t("agreements")} action={canManage && <Button icon={<Plus size={16} />} label={t("addAgreement")} size="sm" variant="secondary" onClick={() => setAdding(true)} />}>
        {lease.agreements.length === 0 && <Text color="secondary">{t("noAgreement")}</Text>}
        <VStack gap={5}>
          {lease.agreements.map((a) => (
            <LeaseAgreement key={a.id} lease={lease} path={path} agreement={a} />
          ))}
        </VStack>
      </Section>
      <Section title={t("title")}>{files}</Section>
      <AttachAgreementDialog open={adding} templates={templates.data?.items} onSave={(addAgreement) => save.mutateAsync({ addAgreement })} onClose={() => setAdding(false)} />
    </VStack>
  );
}

function LeaseAgreement({ lease, path, agreement: a }: { lease: ITenancyDetailResponse; path: string; agreement: ITenancyDetailResponse["agreements"][number] }) {
  const t = useTranslations("Documents");
  const c = useTranslations("Common");
  const { apiPath, canManage, property } = useProperty();
  const confirm = useConfirm();
  const version = useGet<ITemplateVersionResponse>(apiPath(`/agreement-templates/${a.templateId}/versions/${a.version}`));
  const save = useSend<Record<string, unknown>>("PATCH", path, [path]);
  if (version.isPending) return <PageSkeleton />;
  if (version.error) return <ErrorBox error={version.error} retry={() => void version.refetch()} />;
  return (
    <>
      <AgreementSection
        embedded
        title={`${a.templateName} · v${a.version}`}
        content={version.data.data}
        facts={{ propertyName: property.name, unitName: lease.unitName, tenantNames: lease.tenants.map((x) => x.displayName), startDate: lease.startDate, endDate: lease.endDate, rent: lease.currentRent, deposit: lease.depositAmount, billingDay: lease.billingCycleDay }}
        values={a.values}
        onSaveValues={canManage ? (values) => save.mutateAsync({ agreementValues: { agreementId: a.id, values } }) : undefined}
        action={canManage ? <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} label={t("removeAgreement")} onClick={() => confirm.ask({ title: t("removeAgreementTitle", { name: a.templateName }), description: t("removeAgreementBody"), actionLabel: c("remove"), onConfirm: () => save.mutateAsync({ removeAgreement: a.id }) })} /> : undefined}
      />
      {confirm.element}
    </>
  );
}
