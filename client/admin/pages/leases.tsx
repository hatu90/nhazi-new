"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Plus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useNavigate } from "react-router";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useEnumOptions } from "@/client/lib/use-enum";
import { useGet } from "@/client/lib/hooks";
import type { ITenancyListResponse, ITenancySummaryResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, SelectField, StatusBadge } from "@/client/ui";
import { LeaseFields, useLeaseForm } from "../lease-form";
import { useProperty } from "../property-layout";

const statuses = ["draft", "upcoming", "active", "ended"];

export function LeasesPage() {
  const t = useTranslations("Leases");
  const c = useTranslations("Common");
  const options = useEnumOptions();
  const { apiPath, canManage, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const leaseForm = useLeaseForm({ open: creating, onDone: (id) => { setCreating(false); navigate(to(`leases/${id}`)); } });
  const query = useGet<ITenancyListResponse>(apiPath("/leases"), { page, pageSize: 20, status }, { keepPrevious: true });
  const hasTenants = (query.data?.items ?? []).some((l) => l.tenants.length > 0 || l.members.length > 0);
  const newLease = canManage && <Button icon={<Plus size={16} />} variant="primary" label={t("newLease")} onClick={() => setCreating(true)} />;

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <SelectField label={c("status")} value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: c("allStatuses") }, ...options("status", statuses)]} width={200} />
        {newLease}
      </HStack>
      <DataTable<ITenancySummaryResponse>
        query={query}
        paging={setPage}
        empty={<Empty title={t("empty")} action={newLease} />}
        columns={[
          { key: "unit", header: c("unit"), render: (l) => <Link href={to(`leases/${l.id}`)}>{l.unitName}</Link> },
          ...(hasTenants ? [
            { key: "tenants", header: t("tenants"), render: (l: ITenancySummaryResponse) => {
              const people = [
                ...l.tenants.map((x) => ({ key: x.accountId, name: x.displayName, phone: x.phoneNumber })),
                ...l.members.filter((m) => !l.tenants.some((x) => x.phoneNumber === m.phoneNumber)).map((m) => ({ key: m.id, name: m.name, phone: m.phoneNumber })),
              ];
              return people.length ? (
                <Stack gap={1}>
                  {people.map((p) => (
                    <Stack key={p.key} gap={0}>
                      <Text>{p.name}</Text>
                      {p.phone && <Text color="secondary">{p.phone}</Text>}
                    </Stack>
                  ))}
                </Stack>
              ) : "—";
            } },
          ] : []),
          { key: "period", header: t("period"), render: (l) => <Text color="secondary">{formatDate(l.startDate)} → {l.endDate ? formatDate(l.endDate) : t("openEnded")}</Text> },
          { key: "rent", header: t("rent"), render: (l) => formatMoney(l.currentRent) },
          { key: "status", header: c("status"), render: (l) => <StatusBadge status={l.status} /> },
          { key: "visit", header: "", render: (l) => <Button variant="secondary" label={t("visit")} icon={<ArrowRight size={16} />} onClick={() => navigate(to(`leases/${l.id}`))} /> },
        ]}
      />
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={leaseForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("newLease")} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><LeaseFields x={leaseForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={leaseForm.error} busy={leaseForm.busy} submitLabel={t("createDraft")} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Stack>
  );
}
