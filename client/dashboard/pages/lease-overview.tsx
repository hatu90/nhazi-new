"use client";

import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";
import { formatDate, formatMoney } from "@/client/lib/format";
import { DefList, Empty, DataTable, Section } from "@/client/ui";
import { useLease } from "../lease-layout";

export function LeaseOverviewPage() {
  const { lease: l } = useLease();
  return (
    <VStack gap={5}>
      <Section title="Your lease">
        <DefList items={[
          ["Property", l.propertyName],
          ["Unit", l.unitName],
          ["Rent", `${formatMoney(l.currentRent)} / month`],
          ["Deposit", formatMoney(l.depositAmount)],
          ["Billing day", `Day ${l.billingCycleDay} of the month`],
          ["Term", `${formatDate(l.startDate)} → ${l.endDate ? formatDate(l.endDate) : "open-ended"}`],
          ...(l.terminatedAt ? ([["Ended on", formatDate(l.terminatedAt)]] as [string, string][]) : []),
        ]} />
      </Section>
      <Section title="Rent history">
        <DataTable<{ id: string; effectiveDate: string; amount: number }>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.rentVersions.map((r) => ({ ...r, id: r.effectiveDate })), page: 1, pageSize: 1000, total: l.rentVersions.length } }}
          empty={<Empty title="No rent history" />}
          columns={[{ key: "d", header: "From", render: (r) => formatDate(r.effectiveDate) }, { key: "a", header: "Monthly rent", render: (r) => formatMoney(r.amount) }]}
        />
      </Section>
      <Section title="People in the unit">
        {l.members.length === 0 ? <Text color="secondary">No other people listed.</Text> : (
          <DataTable<(typeof l.members)[number]>
            query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.members, page: 1, pageSize: 1000, total: l.members.length } }}
            empty={null}
            columns={[{ key: "n", header: "Name", render: (m) => m.name }, { key: "j", header: "Joined", render: (m) => formatDate(m.joinedAt) }, { key: "l", header: "Left", render: (m) => formatDate(m.leftAt) }]}
          />
        )}
      </Section>
    </VStack>
  );
}
