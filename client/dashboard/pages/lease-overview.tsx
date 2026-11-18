"use client";

import { Button } from "@astryxdesign/core/Button";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useNavigate } from "react-router";
import { AgreementSection } from "@/client/agreement/section";
import { formatDate, formatMoney, label } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IInvoiceListResponse, IInvoiceResponse, IRequestListResponse, IRequestResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Kpi, StatusBadge } from "@/client/ui";
import { useLease } from "../lease-layout";

const todayIso = () => new Date().toISOString().slice(0, 10);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Flat dashboard: KPI cards, then headed blocks (no card around a card). */
export function LeaseOverviewPage() {
  const { lease: l, apiPath, to } = useLease();
  const navigate = useNavigate();
  const invoices = useGet<IInvoiceListResponse>(apiPath("/invoices"), { pageSize: 100 });
  const requests = useGet<IRequestListResponse>(apiPath("/requests"), { pageSize: 100 });

  const today = todayIso();
  const unpaid = (invoices.data?.items ?? []).filter((i) => i.status === "pending" || i.status === "partial").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const owed = unpaid.reduce((s, i) => s + (i.amount - i.paidAmount), 0);
  const overdue = unpaid.filter((i) => i.dueDate < today).length;
  const nextDue = unpaid.find((i) => i.dueDate >= today);
  const openRequests = (requests.data?.items ?? []).filter((r) => r.status === "open" || r.status === "in_progress");
  const inProgress = openRequests.filter((r) => r.status === "in_progress").length;
  const ready = !!invoices.data && !!requests.data;

  return (
    <VStack gap={6}>
      {(invoices.error || requests.error) && <ErrorBox error={invoices.error ?? requests.error} retry={() => { void invoices.refetch(); void requests.refetch(); }} />}

      {ready && (
        <Grid columns={{ minWidth: 220 }} gap={3}>
          <Kpi title="Monthly rent" value={formatMoney(l.currentRent)} detail={`Deposit ${formatMoney(l.depositAmount)}`} onClick={() => document.getElementById("lease-terms")?.scrollIntoView({ behavior: "smooth" })} />
          <Kpi title="Outstanding" value={formatMoney(owed)} detail={unpaid.length === 0 ? "Nothing to pay" : plural(unpaid.length, "unpaid invoice")} onClick={() => navigate(to("invoices"))} />
          <Kpi title="Overdue invoices" value={overdue} detail={nextDue ? `Next due ${formatDate(nextDue.dueDate)}` : "No upcoming due date"} onClick={() => navigate(to("invoices"))} />
          <Kpi title="Open requests" value={openRequests.length} detail={`${inProgress} in progress`} onClick={() => navigate(to("requests"))} />
        </Grid>
      )}

      <VStack gap={3}>
        <HStack justify="between" align="center" gap={3}>
          <Heading level={2}>To pay</Heading>
          <Button label="All invoices" variant="ghost" size="sm" href={to("invoices")} />
        </HStack>
        <DataTable<IInvoiceResponse>
          query={{ isPending: invoices.isPending, error: null, refetch: () => {}, data: invoices.data && { items: unpaid.slice(0, 5), page: 1, pageSize: 1000, total: Math.min(unpaid.length, 5) } }}
          empty={<Empty title="You're all paid up" hint="Unpaid invoices from your landlord appear here." />}
          columns={[
            { key: "t", header: "Invoice", render: (i) => <Link href={to(`invoices/${i.id}`)}>{i.title}</Link> },
            { key: "a", header: "Left to pay", render: (i) => formatMoney(i.amount - i.paidAmount) },
            { key: "d", header: "Due", render: (i) => formatDate(i.dueDate) },
            { key: "s", header: "Status", render: (i) => (i.dueDate < today ? <StatusBadge status="overdue" /> : <StatusBadge status={i.status} />) },
          ]}
        />
      </VStack>

      <VStack gap={3}>
        <HStack justify="between" align="center" gap={3}>
          <Heading level={2}>Requests</Heading>
          <Button label="All requests" variant="ghost" size="sm" href={to("requests")} />
        </HStack>
        <DataTable<IRequestResponse>
          query={{ isPending: requests.isPending, error: null, refetch: () => {}, data: requests.data && { items: requests.data.items.slice(0, 5), page: 1, pageSize: 1000, total: Math.min(requests.data.items.length, 5) } }}
          empty={<Empty title="No requests" hint="Report a repair or ask to end your lease from the Requests tab." />}
          columns={[
            { key: "t", header: "Request", render: (r) => <Link href={to(`requests/${r.id}`)}>{r.title}</Link> },
            { key: "ty", header: "Type", render: (r) => label(r.type) },
            { key: "c", header: "Created", render: (r) => formatDate(r.createdAt) },
            { key: "s", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </VStack>

      {l.agreement && (
        <AgreementSection
          title={`Agreement · ${l.agreement.templateName}`}
          content={l.agreement.content}
          facts={{ propertyName: l.propertyName, unitName: l.unitName, tenantNames: l.members.filter((m) => !m.leftAt).map((m) => m.name), startDate: l.startDate, endDate: l.endDate, rent: l.currentRent, deposit: l.depositAmount, billingDay: l.billingCycleDay }}
          values={l.agreement.values}
        />
      )}

      <VStack gap={3}>
        <Heading level={2} id="lease-terms">Your lease</Heading>
        <DefList items={[
          ["Property", l.propertyName],
          ["Unit", l.unitName],
          ["Term", `${formatDate(l.startDate)} → ${l.endDate ? formatDate(l.endDate) : "open-ended"}`],
          ["Billing day", `Day ${l.billingCycleDay} of the month`],
          ...(l.terminatedAt ? ([["Ended on", formatDate(l.terminatedAt)]] as [string, string][]) : []),
        ]} />
      </VStack>

      <VStack gap={3}>
        <Heading level={2}>Rent history</Heading>
        <DataTable<{ id: string; effectiveDate: string; amount: number }>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.rentVersions.map((r) => ({ ...r, id: r.effectiveDate })), page: 1, pageSize: 1000, total: l.rentVersions.length } }}
          empty={<Empty title="No rent history" />}
          columns={[{ key: "d", header: "From", render: (r) => formatDate(r.effectiveDate) }, { key: "a", header: "Monthly rent", render: (r) => formatMoney(r.amount) }]}
        />
      </VStack>

      {l.members.length > 0 && (
        <VStack gap={3}>
          <Heading level={2}>People in the unit</Heading>
          <DataTable<(typeof l.members)[number]>
            query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.members, page: 1, pageSize: 1000, total: l.members.length } }}
            empty={null}
            columns={[{ key: "n", header: "Name", render: (m) => m.name }, { key: "j", header: "Joined", render: (m) => formatDate(m.joinedAt) }, { key: "l", header: "Left", render: (m) => formatDate(m.leftAt) }]}
          />
        </VStack>
      )}
    </VStack>
  );
}
