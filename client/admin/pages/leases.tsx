"use client";

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
import { LeaseForm } from "../lease-form";
import { useProperty } from "../property-layout";

const statuses = ["draft", "upcoming", "active", "ended"].map((s) => ({ value: s, label: s }));

export function LeasesPage() {
  const { apiPath, canManage, to } = useProperty();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const query = useGet<ITenancyListResponse>(apiPath("/leases"), { page, pageSize: 20, status }, { keepPrevious: true });
  const newLease = canManage && <Button label="New lease" onClick={() => setCreating(true)} />;

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
      <Modal open={creating} onClose={() => setCreating(false)} title="New lease">
        {creating && <LeaseForm onCancel={() => setCreating(false)} onDone={(id) => { setCreating(false); navigate(to(`leases/${id}`)); }} />}
      </Modal>
    </Stack>
  );
}
