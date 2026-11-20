"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { formatDate, formatMoney, label, todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { ISubscriptionResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, Section } from "@/client/ui";
import { useProperty } from "../../property-layout";
import { HandoverForm } from "./handover-form";
import { LeaseAgreement } from "./lease-agreement";
import { MemberForm } from "./member-form";
import { RentForm } from "./rent-form";
import { SubscriptionForm } from "./subscription-form";
import { type Handover, type PersonRow, peopleOf } from "./types";

type Dialog = "rent" | "member" | "service" | "handover" | null;

/** Terms, agreement, rent history, people, services and the handover list. */
export function OverviewTab({ lease: l, path }: { lease: ITenancyDetailResponse; path: string }) {
  const { canManage } = useProperty();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editingHandover, setEditingHandover] = useState<Handover | null>(null);
  const removeHandover = useSend<{ id: string }>("DELETE", (b) => `${path}/handovers/${b.id}`, [path]);
  const endSub = useSend<{ id: string; endDate: string }>("PATCH", (b) => `${path}/subscriptions/${b.id}`, [path]);
  const done = () => setDialog(null);
  const people = peopleOf(l);

  return (
    <VStack gap={5}>
      {(endSub.error || removeHandover.error) && <ErrorBox error={endSub.error ?? removeHandover.error} />}

      <Section title="Terms">
        <DefList items={[
          ["Current rent", formatMoney(l.currentRent)],
          ["Deposit", formatMoney(l.depositAmount)],
          ["Billing day", `Day ${l.billingCycleDay} of the month`],
          ["First period ends", formatDate(l.firstPeriodEnd)],
          ...(l.terminatedAt ? ([["Ended on", `${formatDate(l.terminatedAt)}${l.terminationReason ? ` — ${l.terminationReason}` : ""}`]] as [string, string][]) : []),
        ]} />
      </Section>

      {l.agreement && <LeaseAgreement lease={l} path={path} />}

      <Section title="Rent history" action={canManage && l.status !== "ended" && <Button label="Add rent version" size="sm" variant="secondary" onClick={() => setDialog("rent")} />}>
        <DataTable<{ id: string; effectiveDate: string; amount: number }>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.rentVersions.map((r) => ({ ...r, id: r.effectiveDate })), page: 1, pageSize: 1000, total: l.rentVersions.length } }}
          empty={<Empty title="No rent versions" />}
          columns={[{ key: "d", header: "Effective from", render: (r) => formatDate(r.effectiveDate) }, { key: "a", header: "Monthly rent", render: (r) => formatMoney(r.amount) }]}
        />
      </Section>

      <Section title="People" action={canManage && l.status !== "ended" && <Button label="Add person" size="sm" variant="secondary" onClick={() => setDialog("member")} />}>
        <DataTable<PersonRow>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: people, page: 1, pageSize: 1000, total: people.length } }}
          empty={<Empty title="No one yet" hint="Add the people living here. With a phone number they are invited to sign in and see the lease." />}
          columns={[
            { key: "n", header: "Name", render: (m) => m.name },
            { key: "p", header: "Phone", render: (m) => m.phoneNumber ?? "—" },
            { key: "a", header: "App access", render: (m) => (m.tenant ? "Has access" : m.phoneNumber ? "Not joined yet" : "—") },
            { key: "y", header: "Born", render: (m) => m.yearOfBirth ?? "—" },
            { key: "j", header: "Joined", render: (m) => formatDate(m.joinedAt) },
            { key: "l", header: "Left", render: (m) => formatDate(m.leftAt) },
          ]}
        />
      </Section>

      <Section title="Services" action={canManage && l.status !== "ended" && <Button label="Add service" size="sm" variant="secondary" onClick={() => setDialog("service")} />}>
        <DataTable<ISubscriptionResponse>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.subscriptions, page: 1, pageSize: 1000, total: l.subscriptions.length } }}
          empty={<Empty title="No services" hint="Subscribe the lease to electricity, water, internet…" />}
          columns={[
            { key: "s", header: "Service", render: (s) => s.serviceName },
            { key: "b", header: "Billed by", render: (s) => label(s.usageBase) },
            { key: "m", header: "Meter / qty", render: (s) => s.meterName ?? `×${s.quantity}` },
            { key: "p", header: "Period", render: (s) => `${formatDate(s.startDate)} → ${s.endDate ? formatDate(s.endDate) : "open"}` },
            { key: "e", header: "", align: "end", render: (s) => canManage && !s.endDate && <Button label="End" size="sm" variant="ghost" clickAction={async () => { await endSub.mutateAsync({ id: s.id, endDate: todayIso() }); }} /> },
          ]}
        />
      </Section>

      <Section title="Handover" action={canManage && l.status !== "ended" && <Button label="Add item" size="sm" variant="secondary" onClick={() => setDialog("handover")} />}>
        <DataTable<Handover>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.handovers, page: 1, pageSize: 1000, total: l.handovers.length } }}
          empty={<Empty title="Nothing handed over" hint="List the furniture, appliances and keys the tenant receives, and their condition." />}
          columns={[
            { key: "i", header: "Item", render: (h) => h.itemName },
            { key: "q", header: "Quantity", render: (h) => h.quantity },
            { key: "c", header: "Condition", render: (h) => label(h.condition) },
            { key: "d", header: "Note", render: (h) => h.description ?? "—" },
            {
              key: "a",
              header: "",
              align: "end",
              render: (h) => canManage && (
                <HStack gap={1} justify="end">
                  <Button label="Edit" size="sm" variant="ghost" onClick={() => setEditingHandover(h)} />
                  <Button label="Remove" size="sm" variant="ghost" clickAction={async () => { if (confirm(`Remove "${h.itemName}" from the handover?`)) await removeHandover.mutateAsync({ id: h.id }); }} />
                </HStack>
              ),
            },
          ]}
        />
      </Section>

      <Modal open={dialog === "rent"} onClose={done} title="Add rent version">{dialog === "rent" && <RentForm path={path} last={l.rentVersions.at(-1)?.effectiveDate} onDone={done} />}</Modal>
      <Modal open={dialog === "member"} onClose={done} title="Add person">{dialog === "member" && <MemberForm path={path} onDone={done} />}</Modal>
      <Modal open={dialog === "handover"} onClose={done} title="Add handover item">{dialog === "handover" && <HandoverForm path={path} taken={l.handovers.map((h) => h.itemId)} onDone={done} />}</Modal>
      <Modal open={editingHandover !== null} onClose={() => setEditingHandover(null)} title="Edit handover item">{editingHandover && <HandoverForm key={editingHandover.id} path={path} handover={editingHandover} taken={[]} onDone={() => setEditingHandover(null)} />}</Modal>
      <Modal open={dialog === "service"} onClose={done} title="Add service">{dialog === "service" && <SubscriptionForm path={path} unitId={l.unitId} people={people.filter((p) => !p.leftAt)} onDone={done} />}</Modal>
    </VStack>
  );
}
