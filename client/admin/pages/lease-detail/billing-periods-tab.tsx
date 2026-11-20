"use client";

import { Badge } from "@astryxdesign/core/Badge";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IBillingPeriodListResponse, IBillingPeriodResponse } from "@/client/lib/types";
import { DataTable, Empty, Section, StatusBadge } from "@/client/ui";
import { useProperty } from "../../property-layout";

/** The lease's billing periods, the running one highlighted. */
export function BillingPeriodsTab({ leaseId }: { leaseId: string }) {
  const { apiPath } = useProperty();
  const periods = useGet<IBillingPeriodListResponse>(apiPath("/billing-periods"), { leaseId, pageSize: 100 });
  return (
    <Section title="Billing periods">
      <DataTable<IBillingPeriodResponse>
        query={periods}
        empty={<Empty title="No billing periods yet" hint="The first period opens when the lease starts." />}
        columns={[
          {
            key: "p",
            header: "Period",
            render: (b) => (
              <HStack gap={2} align="center">
                <Text weight={b.status === "active" ? "semibold" : undefined}>{formatDate(b.startDate)} → {formatDate(b.endDate)}</Text>
                {b.status === "active" && <Badge variant="info" label="Current" />}
              </HStack>
            ),
          },
          { key: "s", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
          { key: "r", header: "Rent", align: "end", render: (b) => formatMoney(b.rentAmount) },
        ]}
      />
    </Section>
  );
}
