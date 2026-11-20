"use client";

import { AgreementSection } from "@/client/agreement/section";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITemplateVersionResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { ErrorBox, PageSpinner } from "@/client/ui";
import { useProperty } from "../../property-layout";

export function LeaseAgreement({ lease, path }: { lease: ITenancyDetailResponse; path: string }) {
  const { apiPath, canManage, property } = useProperty();
  const a = lease.agreement!;
  const version = useGet<ITemplateVersionResponse>(apiPath(`/agreement-templates/${a.templateId}/versions/${a.version}`));
  const saveValues = useSend<{ agreementValues: Record<string, string> }>("PATCH", path, [path]);
  if (version.isPending) return <PageSpinner />;
  if (version.error) return <ErrorBox error={version.error} retry={() => void version.refetch()} />;
  return (
    <AgreementSection
      title={`Agreement · ${a.templateName} v${a.version}`}
      content={version.data.data}
      facts={{ propertyName: property.name, unitName: lease.unitName, tenantNames: lease.tenants.map((t) => t.displayName), startDate: lease.startDate, endDate: lease.endDate, rent: lease.currentRent, deposit: lease.depositAmount, billingDay: lease.billingCycleDay }}
      values={a.values}
      onSaveValues={canManage ? (agreementValues) => saveValues.mutateAsync({ agreementValues }) : undefined}
    />
  );
}
