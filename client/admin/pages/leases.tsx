"use client";

import { Plus } from "lucide-react";
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
import { useGet } from "@/client/lib/hooks";
import type { ITenancyListResponse, ITenancySummaryResponse } from "@/client/lib/types";
import { DataTable, Empty, Modal, SelectField, StatusBadge } from "@/client/ui";
import { LeaseFields, useLeaseForm } from "../lease-form";
import { useProperty } from "../property-layout";

const statuses = ["draft", "upcoming", "active", "ended"].map((s) => ({ value: s, label: s }));

export function LeasesPage() {
  const { apiPath, canManage, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const leaseForm = useLeaseForm({ open: creating, onDone: (id) => { setCreating(false); navigate(to(`leases/${id}`)); } });
  const query = useGet<ITenancyListResponse>(apiPath("/leases"), { page, pageSize: 20, status }, { keepPrevious: true });
  const newLease = canManage && <Button icon={<Plus size={16} />} variant="primary" label="New lease" onClick={() => setCreating(true)} />;

  return (
    <Stack gap={4}>
      <HStack justify="between" align="end" wrap="wrap" gap={3}>
        <SelectField label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: "All statuses" }, ...statuses]} width={200} />
        {newLease}
      </HStack>
      <DataTable<ITenancySummaryResponse>
        query={query}
        paging={setPage}
        empty={<Empty title="No leases" hint="Create a lease to attach tenants to a unit and start billing." action={newLease} />}
        columns={[
          { key: "unit", header: "Unit", render: (l) => <Link href={to(`leases/${l.id}`)}>{l.unitName}</Link> },
          { key: "tenants", header: "Tenants", render: (l) => l.tenants.map((t) => t.displayName).join(", ") || "—" },
          { key: "period", header: "Period", render: (l) => <Text color="secondary">{formatDate(l.startDate)} → {l.endDate ? formatDate(l.endDate) : "open"}</Text> },
          { key: "rent", header: "Rent", render: (l) => formatMoney(l.currentRent) },
          { key: "status", header: "Status", render: (l) => <StatusBadge status={l.status} /> },
        ]}
      />
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={leaseForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"New lease"} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><LeaseFields x={leaseForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={leaseForm.error} busy={leaseForm.busy} submitLabel={"Create draft lease"} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Stack>
  );
}
