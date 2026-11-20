"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { formatDate } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITenancyDetailResponse } from "@/client/lib/types";
import { ErrorBox, Modal, PageHeader, PageSpinner, StatusBadge, Tabs } from "@/client/ui";
import { useProperty } from "../../property-layout";
import { BillingPeriodsTab } from "./billing-periods-tab";
import { EndForm } from "./end-form";
import { InvoicesTab } from "./invoices-tab";
import { OverviewTab } from "./overview-tab";
import { StartForm } from "./start-form";

type Dialog = "start" | "end" | null;
type TabId = "overview" | "periods" | "invoices";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "periods", label: "Billing periods" },
  { id: "invoices", label: "Invoices & payments" },
];

export function LeaseDetailPage() {
  const { leaseId = "" } = useParams();
  const { apiPath, canManage, to } = useProperty();
  const navigate = useNavigate();
  const path = apiPath(`/leases/${leaseId}`);
  const lease = useGet<ITenancyDetailResponse>(path);
  const [dialog, setDialog] = useState<Dialog>(null);
  const remove = useSend<undefined>("DELETE", path, [apiPath("/leases")]);
  const [search, setSearch] = useSearchParams();
  const tab: TabId = TABS.find((t) => t.id === search.get("tab"))?.id ?? "overview";
  const done = () => setDialog(null);

  if (lease.isPending) return <PageSpinner />;
  if (lease.error) return <ErrorBox error={lease.error} retry={() => void lease.refetch()} />;
  const l = lease.data;
  const live = l.status === "active" || l.status === "upcoming";

  return (
    <VStack gap={5}>
      <HStack><Button label="All leases" variant="ghost" size="sm" href={to("leases")} /></HStack>
      <PageHeader
        title={l.unitName}
        subtitle={<HStack gap={2} align="center"><StatusBadge status={l.status} /><Text color="secondary">{formatDate(l.startDate)} → {l.endDate ? formatDate(l.endDate) : "open"}</Text></HStack>}
        actions={canManage && (
          <>
            {l.status === "draft" && <Button label="Start lease" onClick={() => setDialog("start")} />}
            {l.status === "draft" && <Button label="Delete draft" variant="secondary" isLoading={remove.isPending} clickAction={async () => { if (confirm("Delete this draft lease?")) { await remove.mutateAsync(undefined); navigate(to("leases")); } }} />}
            {live && <Button label="End lease" variant="secondary" onClick={() => setDialog("end")} />}
          </>
        )}
      />
      {remove.error && <ErrorBox error={remove.error} />}

      <Tabs tabs={TABS} value={tab} onChange={(t) => setSearch(t === "overview" ? {} : { tab: t }, { replace: true })} />
      {tab === "overview" && <OverviewTab lease={l} path={path} />}
      {tab === "periods" && <BillingPeriodsTab leaseId={leaseId} />}
      {tab === "invoices" && <InvoicesTab leaseId={leaseId} />}

      <Modal open={dialog === "start"} onClose={done} title="Start lease">{dialog === "start" && <StartForm path={path} lease={l} onDone={done} />}</Modal>
      <Modal open={dialog === "end"} onClose={done} title="End lease">{dialog === "end" && <EndForm path={path} onDone={done} />}</Modal>
    </VStack>
  );
}
