"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { ClosePeriodFields, useClosePeriodForm } from "@/client/billing/close-period-form";
import { MonthChart } from "../billing/month-chart";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IMyBillingResponse } from "@/client/lib/types";
import { DefList, ErrorBox, Modal, Section, StatusBadge } from "@/client/ui";
import { useLease } from "../lease-layout";

/** One column: property & unit, the running billing period (+ request to close), the cost chart; the agreement and history follow. Invoices and requests have their own tabs. */
export function LeaseOverviewPage() {
  const { lease: l, apiPath, to } = useLease();
  const billing = useGet<IMyBillingResponse>(apiPath("/billing"));
  const [closing, setClosing] = useState(false);
  const closeForm = useClosePeriodForm({ path: apiPath("/billing/close"), invalidate: ["/api/lease", "/api/me"], period: billing.data?.current ?? undefined, meters: billing.data?.current?.meters, open: closing, onDone: () => setClosing(false) });

  return (
    <VStack gap={6}>
      <VStack gap={4}>
        <Section title="Property & unit" action={<StatusBadge status={l.status} />}>
          <DefList items={[
            ["Property", l.propertyName],
            ["Unit", l.unitName],
            ["Term", `${formatDate(l.startDate)} → ${l.endDate ? formatDate(l.endDate) : "open-ended"}`],
            ["Monthly rent", formatMoney(l.currentRent)],
            ["Deposit", formatMoney(l.depositAmount)],
            ["Billing day", `Day ${l.billingCycleDay} of the month`],
            ...(l.terminatedAt ? ([["Ended on", formatDate(l.terminatedAt)]] as [string, string][]) : []),
          ]} />
        </Section>

        <Section title="Current billing period">
          {billing.isPending ? <Text color="secondary" size="sm">Loading…</Text> : billing.error ? <ErrorBox error={billing.error} retry={() => void billing.refetch()} /> : !billing.data.current ? (
            <Text color="secondary" size="sm">{l.status === "draft" ? "Billing starts when your landlord starts the lease." : "No billing period is running."}</Text>
          ) : (
            <>
              <DefList items={[
                ["Period", `${formatDate(billing.data.current.startDate)} → ${formatDate(billing.data.current.endDate)}`],
                ["Rent", formatMoney(billing.data.current.rentAmount)],
                ["Services", billing.data.current.services.map((s) => s.serviceName).join(", ") || "None"],
              ]} />
              {l.status === "active" && <HStack><Button variant="primary" label="Close billing period" onClick={() => setClosing(true)} /></HStack>}
              <Modal open={closing} onClose={() => setClosing(false)}>
                <form noValidate onSubmit={closeForm.submit} className="flex min-h-0 flex-1 flex-col">
                  <Layout
                    height="fill"
                    padding={5}
                    header={<DialogHeader title={"Close billing period"} onOpenChange={(o) => { if (!o) setClosing(false); }} />}
                    content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ClosePeriodFields x={closeForm} /></LayoutContent>}
                    footer={<LayoutFooter padding={5}><FormFooter error={closeForm.error} busy={closeForm.busy} submitLabel={"Close period"} onCancel={() => setClosing(false)} /></LayoutFooter>}
                  />
                </form>
              </Modal>
            </>
          )}
        </Section>

        {billing.data && (
          <Section title="Costs by month">
            {billing.data.months.some((m) => m.total > 0) ? <MonthChart months={billing.data.months} /> : <Text color="secondary" size="sm">Nothing has been invoiced yet.</Text>}
          </Section>
        )}
      </VStack>
    </VStack>
  );
}
