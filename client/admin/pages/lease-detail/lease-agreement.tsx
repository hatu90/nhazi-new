"use client";

import { useTranslations } from "next-intl";
import { Text } from "@astryxdesign/core/Text";
import { AgreementSection } from "@/client/agreement/section";
import { LeaseFiles } from "@/client/documents/lease-files";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ILeaseDocument, ITemplateVersionResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { ErrorBox, PageSkeleton, Section } from "@/client/ui";
import { useProperty } from "../../property-layout";

/** The lease's documents: the agreement (when it has one) and the files attached to it (ID photos, signed copies…). */
export function LeaseDocuments({ lease, path }: { lease: ITenancyDetailResponse; path: string }) {
  const t = useTranslations("Documents");
  const { canManage } = useProperty();
  const saveDocs = useSend<{ documents: ILeaseDocument[] }>("PATCH", path, [path]);
  const files = <LeaseFiles base={path} documents={lease.documents} onAdd={canManage ? (added) => saveDocs.mutateAsync({ documents: [...lease.documents, ...added] }) : undefined} onChange={canManage ? (documents) => saveDocs.mutateAsync({ documents }) : undefined} />;
  if (!lease.agreement) return <Section title={t("title")}>{files}</Section>;
  return <LeaseAgreement lease={lease} path={path} files={files} />;
}

function LeaseAgreement({ lease, path, files }: { lease: ITenancyDetailResponse; path: string; files: React.ReactNode }) {
  const t = useTranslations("Documents");
  const { apiPath, canManage, property } = useProperty();
  const a = lease.agreement!;
  const version = useGet<ITemplateVersionResponse>(apiPath(`/agreement-templates/${a.templateId}/versions/${a.version}`));
  const saveValues = useSend<{ agreementValues: Record<string, string> }>("PATCH", path, [path]);
  if (version.isPending) return <PageSkeleton />;
  if (version.error) return <ErrorBox error={version.error} retry={() => void version.refetch()} />;
  return (
    <AgreementSection
      title={t("title")}
      extra={<Text color="secondary">{`${t("agreement")} · ${a.templateName} · v${a.version}`}</Text>}
      content={version.data.data}
      facts={{ propertyName: property.name, unitName: lease.unitName, tenantNames: lease.tenants.map((x) => x.displayName), startDate: lease.startDate, endDate: lease.endDate, rent: lease.currentRent, deposit: lease.depositAmount, billingDay: lease.billingCycleDay }}
      values={a.values}
      onSaveValues={canManage ? (agreementValues) => saveValues.mutateAsync({ agreementValues }) : undefined}
      after={files}
    />
  );
}
