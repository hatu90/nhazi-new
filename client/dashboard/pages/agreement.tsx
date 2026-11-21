"use client";

import { AgreementSection } from "@/client/agreement/section";
import { Empty } from "@/client/ui";
import { useLease } from "../lease-layout";

export function AgreementPage() {
  const { lease: l } = useLease();
  if (!l.agreement) return <Empty title="No agreement" hint="Your landlord has not attached an agreement to this lease." />;
  return (
    <AgreementSection
      title={`Agreement · ${l.agreement.templateName}`}
      content={l.agreement.content}
      facts={{ propertyName: l.propertyName, unitName: l.unitName, tenantNames: l.members.filter((m) => !m.leftAt).map((m) => m.name), startDate: l.startDate, endDate: l.endDate, rent: l.currentRent, deposit: l.depositAmount, billingDay: l.billingCycleDay }}
      values={l.agreement.values}
    />
  );
}
