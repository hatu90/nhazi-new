"use client";

import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { api } from "@/client/lib/api";
import { formatMoney, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type {
  IAdminInvoiceDetailResponse,
  IAdminInvoiceListResponse,
  IBillingPeriodDetailResponse,
  IBillingPeriodListResponse,
  IRefundListResponse,
} from "@/client/lib/types";
import { Raised, Section } from "@/client/ui";
import { num, text } from "@/client/ui/form";
import {
  FArea,
  FDate,
  FNumber,
  FSelect,
  useOpenReset,
  useSubmit,
} from "@/client/ui/rhf";
import { useProperty } from "../../property-layout";
import { billedLines, settle } from "./settlement";
import type { Handover } from "./types";

interface Values {
  terminatedAt: string;
  reason: string;
  readings: Record<string, string>;
  /** Check-out per handed-over item (by handover id). `charge` = what the tenant pays for damage / loss. */
  handovers: Record<
    string,
    { quantity: string; condition: string; note: string; charge: string }
  >;
}
const CONDITIONS = ["good", "damaged", "missing"].map((c) => ({
  value: c,
  label: c[0].toUpperCase() + c.slice(1),
}));
type Meter = { meterId: string; serviceName: string; openingValue: number };

/**
 * Ends the lease: closes the running period (no new one opens), bills the final metered usage and settles the money held
 * (deposit, unused rent, unused non-metered services). Everything is calculated here from the loaded data; the server re-checks it.
 */
export function useEndForm({ path, leaseId, handovers, open, onDone }: { path: string; leaseId: string; handovers: Handover[]; open: boolean; onDone: () => void }) {
  const { apiPath } = useProperty();
  const periods = useGet<IBillingPeriodListResponse>(apiPath("/billing-periods"), { leaseId, pageSize: 100 }, { enabled: open });
  const invoices = useGet<IAdminInvoiceListResponse>(apiPath("/invoices"), { leaseId, pageSize: 100 }, { enabled: open });
  const refunds = useGet<IRefundListResponse>(apiPath("/refunds"), { leaseId, pageSize: 100 }, { enabled: open });
  const items = periods.data?.items ?? [];
  const target = items.find((p) => p.status === "active") ?? [...items].sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
  const detail = useGet<IBillingPeriodDetailResponse>(apiPath(`/billing-periods/${target?.id}`), undefined, { enabled: open && !!target });
  const live = (invoices.data?.items ?? []).filter((i) => i.status !== "cancelled");
  const details = useQueries({
    queries: live.map((i) => ({
      queryKey: [apiPath(`/invoices/${i.id}`), {}],
      queryFn: () => api<IAdminInvoiceDetailResponse>(apiPath(`/invoices/${i.id}`)),
    })),
  });
  const loading = periods.isPending || invoices.isPending || refunds.isPending || (!!target && detail.isPending) || details.some((d) => d.isPending);
  const period = detail.data;
  const meters: Meter[] =
    period?.status === "active"
      ? period.usages.filter((u) => u.usageBase === "meter" && u.meterId).map((u) => ({ meterId: u.meterId!, serviceName: u.serviceName, openingValue: u.openingReading?.value ?? 0 }))
      : [];
  const billed = period ? billedLines(period, details.flatMap((d) => (d.data ? [d.data] : [])), refunds.data?.items ?? []) : [];

  // Only the lease is refetched now (its status changes). Invoices / refunds / periods are just marked stale: they load when next opened.
  const qc = useQueryClient();
  const save = useSend<object>("POST", `${path}/close`, [apiPath("/leases")]);
  const done = () => {
    void qc.invalidateQueries({
      predicate: (q) =>
        typeof q.queryKey[0] === "string" &&
        [
          apiPath("/invoices"),
          apiPath("/refunds"),
          apiPath("/billing-periods"),
        ].some((p) => (q.queryKey[0] as string).startsWith(p)),
      refetchType: "none",
    });
    onDone();
  };
  const today = todayIso();
  const defaults = (): Values => ({
    terminatedAt: period ? (today > period.endDate ? period.endDate : today) : today,
    reason: "",
    readings: {},
    handovers: Object.fromEntries(handovers.map((h) => [h.id, { quantity: String(h.quantity), condition: h.condition, note: "", charge: "" }])),
  });
  const form = useForm<Values>({ defaultValues: defaults() });
  // the last day depends on the loaded period, so reset again once it arrives
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); }, period?.id);
  const w = useWatch({ control: form.control });

  const extraCharges = handovers.flatMap((h) => {
    const x = w.handovers?.[h.id];
    const charge = num(x?.charge ?? "");
    return charge && charge > 0
      ? [
          {
            title: `${h.itemName}: ${x?.condition ?? h.condition}`,
            amount: charge,
          },
        ]
      : [];
  });
  const readingValues = Object.fromEntries(
    meters.flatMap((m) =>
      num(w.readings?.[m.meterId] ?? "") === undefined
        ? []
        : [[m.meterId, num(w.readings![m.meterId]!)!]],
    ),
  );
  const ready =
    !!period &&
    !!w.terminatedAt &&
    w.terminatedAt >= period.startDate &&
    meters.every(
      (m) =>
        readingValues[m.meterId] !== undefined &&
        readingValues[m.meterId] >= m.openingValue,
    );
  const extraKey = JSON.stringify(extraCharges);
  const readingKey = JSON.stringify(readingValues);
  const s = useMemo(
    () =>
      ready && period
        ? settle({
            period,
            terminatedAt: w.terminatedAt!,
            readings: readingValues,
            billed,
            extraCharges,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value (extraKey / readingKey)
    [ready, w.terminatedAt, extraKey, readingKey, period, billed],
  );

  // + deposit + unused rent + unused services - metered usage - handover charges
  const credit = (s?.refund ?? []).reduce((t, l) => t + l.gross, 0);
  const balance = credit - (s?.charged ?? 0);

  const submit = useSubmit(
    form,
    save,
    (v) => ({
      terminatedAt: v.terminatedAt,
      reason: text(v.reason),
      readings: meters.map((m) => ({
        meterId: m.meterId,
        value: num(v.readings[m.meterId] ?? ""),
      })),
      handovers: handovers.map((h) => {
        const x = v.handovers[h.id];
        return {
          handoverId: h.id,
          condition: x?.condition ?? h.condition,
          quantity: num(x?.quantity ?? "") ?? h.quantity,
          note: text(x?.note ?? ""),
        };
      }),
      extraItems: extraCharges.map((e) => ({ ...e, kind: "other" })),
    }),
    done,
  );

  return { form, submit, error: save.error, busy: save.isPending || loading || !period, loading, period, meters, handovers, w, s, balance };
}

export function EndFields({ x: { form, loading, period, meters, handovers, w, s, balance } }: { x: ReturnType<typeof useEndForm> }) {
  if (loading) return <Text color="secondary">Loading…</Text>;
  if (!period) return <Text color="secondary">This lease has no billing period.</Text>;
  return (
    <VStack gap={4}>
      <Text color="secondary">
        Ends the lease on this date: closes the running billing period (no new
        one opens), ends its services and settles the final invoice against the
        deposit, unused rent and unused services.
      </Text>
      <FDate
        control={form.control}
        name="terminatedAt"
        label="Last day"
        required
        width="100%"
      />
      <FArea
        control={form.control}
        name="reason"
        label="Reason"
        rows={2}
        width="100%"
      />

      {meters.length > 0 && (
        <Section title="Final meter readings">
          <VStack gap={2}>
            {meters.map((m) => {
              const v = w.readings?.[m.meterId];
              const used = v ? Number(v) - m.openingValue : null;
              return (
                <Raised key={m.meterId}>
                  <VStack gap={2}>
                    <HStack
                      justify="between"
                      align="center"
                      gap={2}
                      wrap="wrap"
                    >
                      <Text weight="semibold">{m.serviceName}</Text>
                      <Text size="sm" color="secondary">
                        Previous reading: {m.openingValue}
                      </Text>
                    </HStack>
                    <FNumber
                      control={form.control}
                      name={`readings.${m.meterId}`}
                      label="Final reading"
                      required
                      rules={{
                        validate: (x) =>
                          Number(x) >= m.openingValue ||
                          `Must be at least ${m.openingValue}`,
                      }}
                      hint={
                        used !== null && used >= 0
                          ? `Used this period: ${used}`
                          : undefined
                      }
                      width="100%"
                    />
                  </VStack>
                </Raised>
              );
            })}
          </VStack>
        </Section>
      )}

      {handovers.length > 0 && (
        <Section title="Handover check-out">
          <VStack gap={2}>
            <Text size="sm" color="secondary">
              Record what the tenant gives back. A charge for damaged or missing
              items is added to the final invoice and taken from the deposit.
            </Text>
            {handovers.map((h) => (
              <Raised key={h.id}>
                <VStack gap={2}>
                  <HStack justify="between" align="center" gap={2} wrap="wrap">
                    <Text weight="semibold">{h.itemName}</Text>
                    <Text size="sm" color="secondary">
                      Handed over: {h.quantity} · {h.condition}
                    </Text>
                  </HStack>
                  <HStack gap={2} wrap="wrap">
                    <FNumber
                      control={form.control}
                      name={`handovers.${h.id}.quantity`}
                      label="Returned"
                      width="100%"
                    />
                    <FSelect
                      control={form.control}
                      name={`handovers.${h.id}.condition`}
                      label="Condition"
                      options={CONDITIONS}
                      width="100%"
                    />
                  </HStack>
                  <FNumber
                    control={form.control}
                    name={`handovers.${h.id}.charge`}
                    label="Charge for damage / loss"
                    money
                    width="100%"
                  />
                  <FArea
                    control={form.control}
                    name={`handovers.${h.id}.note`}
                    label="Note"
                    rows={1}
                    width="100%"
                  />
                </VStack>
              </Raised>
            ))}
          </VStack>
        </Section>
      )}

      <Section title="Settlement">
        {!s ? (
          <Text size="sm" color="secondary">
            Enter the final meter readings to see the balance.
          </Text>
        ) : (
          <Raised>
            <VStack gap={2}>
              {s.refund.map((l) => (
                <Row key={l.key} label={l.title} amount={l.gross} />
              ))}
              {s.invoice.map((it, i) => (
                <Row key={i} label={it.title} amount={-it.amount} />
              ))}
              <Row
                label={
                  balance >= 0
                    ? "We pay the tenant (refund)"
                    : "The tenant pays (invoice)"
                }
                amount={Math.abs(balance)}
                bold
              />
            </VStack>
          </Raised>
        )}
      </Section>
    </VStack>
  );
}

function Row({
  label,
  amount,
  bold,
}: {
  label: string;
  amount: number;
  bold?: boolean;
}) {
  return (
    <HStack justify="between" gap={2}>
      <Text size="sm" weight={bold ? "semibold" : undefined}>
        {label}
      </Text>
      <Text size="sm" weight={bold ? "semibold" : undefined}>
        {formatMoney(amount)}
      </Text>
    </HStack>
  );
}
