"use client";

import { useTranslations } from "next-intl";
import { Text } from "@astryxdesign/core/Text";
import { AgreementSection } from "@/client/agreement/section";
import { LeaseFiles } from "@/client/documents/lease-files";
import type { ILeaseDocument } from "@/client/lib/types";
import { useSend } from "@/client/lib/hooks";
import { Section } from "@/client/ui";
import { useLease } from "../lease-layout";

/** The lease's documents: the agreement (when there is one) and the files either side attached (ID photos, signed copies…). */
export function AgreementPage() {
  const t = useTranslations("Documents");
  const { lease: l, apiPath } = useLease();
  const save = useSend<{ documents: ILeaseDocument[] }>("POST", apiPath("/documents"), [apiPath()]);
  const files = <LeaseFiles base={apiPath()} documents={l.documents} onAdd={(documents) => save.mutateAsync({ documents })} />;
  if (!l.agreement) return <Section title={t("title")}>{files}</Section>;
  return (
    <AgreementSection
      title={t("title")}
      extra={<Text color="secondary">{`${t("agreement")} · ${l.agreement.templateName}`}</Text>}
      content={l.agreement.content}
      facts={{ propertyName: l.propertyName, unitName: l.unitName, tenantNames: l.members.filter((m) => !m.leftAt).map((m) => m.name), startDate: l.startDate, endDate: l.endDate, rent: l.currentRent, deposit: l.depositAmount, billingDay: l.billingCycleDay }}
      values={l.agreement.values}
      after={files}
    />
  );
}
