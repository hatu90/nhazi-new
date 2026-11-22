"use client";

import { useTranslations } from "next-intl";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { formatDate } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITenancyDetailResponse } from "@/client/lib/types";
import { ErrorBox, Modal, PageHeader, PageSkeleton, StatusBadge, Tabs, useConfirm } from "@/client/ui";
import { useProperty } from "../../property-layout";
import { BillingPeriodsTab } from "./billing-periods-tab";
import { EndFields, useEndForm } from "./end-form";
import { InvoicesTab } from "./invoices-tab";
import { OverviewTab } from "./overview-tab";
import { StartFields, useStartForm } from "./start-form";

import { CalendarRange, LayoutDashboard, Receipt, type LucideIcon } from "lucide-react";

type Dialog = "start" | "end" | null;
type TabId = "overview" | "periods" | "invoices";
const TABS: { id: TabId; icon: LucideIcon }[] = [
  { id: "overview", icon: LayoutDashboard },
  { id: "periods", icon: CalendarRange },
  { id: "invoices", icon: Receipt },
];

export function LeaseDetailPage() {
  const t = useTranslations("LeaseDetail");
  const c = useTranslations("Common");
  const confirm = useConfirm();
  const { leaseId = "" } = useParams();
  const { apiPath, canManage, to } = useProperty();
  const navigate = useNavigate();
  const path = apiPath(`/leases/${leaseId}`);
  const lease = useGet<ITenancyDetailResponse>(path);
  const [dialog, setDialog] = useState<Dialog>(null);
  const remove = useSend<undefined>("DELETE", path, [apiPath("/leases")]);
  const [search, setSearch] = useSearchParams();
  const tab: TabId = TABS.find((x) => x.id === search.get("tab"))?.id ?? "overview";
  const done = () => setDialog(null);
  const endForm = useEndForm({ path, leaseId, handovers: lease.data?.handovers ?? [], open: dialog === "end", onDone: done });
  const startForm = useStartForm({ path, lease: lease.data, open: dialog === "start", onDone: done });

  if (lease.isPending) return <PageSkeleton />;
  if (lease.error) return <ErrorBox error={lease.error} retry={() => void lease.refetch()} />;
  const l = lease.data;
  const live = l.status === "active" || l.status === "upcoming";

  return (
    <VStack gap={5}>
      <HStack><Button label={t("allLeases")} variant="ghost" size="sm" href={to("leases")} /></HStack>
      <PageHeader
        title={l.unitName}
        subtitle={<HStack gap={2} align="center"><StatusBadge status={l.status} /><Text color="secondary">{formatDate(l.startDate)} → {l.endDate ? formatDate(l.endDate) : c("open")}</Text></HStack>}
        actions={canManage && (
          <>
            {l.status === "draft" && <Button variant="primary" label={t("startLease")} onClick={() => setDialog("start")} />}
            {l.status === "draft" && <Button label={t("deleteDraft")} variant="secondary" isLoading={remove.isPending} onClick={() => confirm.ask({ title: t("deleteDraftTitle"), description: t("deleteDraftBody"), actionLabel: t("deleteDraft"), onConfirm: async () => { await remove.mutateAsync(undefined); navigate(to("leases")); } })} />}
            {live && <Button label={t("endLease")} variant="secondary" onClick={() => setDialog("end")} />}
          </>
        )}
      />
      {remove.error && <ErrorBox error={remove.error} />}

      <Tabs tabs={TABS.map((x) => ({ ...x, label: t(`tabs.${x.id}`) }))} value={tab} onChange={(id) => setSearch(id === "overview" ? {} : { tab: id }, { replace: true })} />
      {tab === "overview" && <OverviewTab lease={l} path={path} />}
      {tab === "periods" && <BillingPeriodsTab leaseId={leaseId} />}
      {tab === "invoices" && <InvoicesTab leaseId={leaseId} />}

      <Modal open={dialog === "start"} onClose={() => done()}>
        <form noValidate onSubmit={startForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("startLease")} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><StartFields x={startForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={startForm.error} busy={startForm.busy} submitLabel={t("startLease")} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={dialog === "end"} onClose={() => done()}>
        <form noValidate onSubmit={endForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("endLease")} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><EndFields x={endForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={endForm.error} busy={endForm.busy} submitLabel={t("endLease")} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </VStack>
  );
}
