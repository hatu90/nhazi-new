"use client";

import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { formatDate, formatMoney, label, todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { ISubscriptionResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, Section } from "@/client/ui";
import { useProperty } from "../../property-layout";
import { HandoverFields, useHandoverForm } from "./handover-form";
import { LeaseAgreement } from "./lease-agreement";
import { MemberFields, useMemberForm } from "./member-form";
import { RentFields, useRentForm } from "./rent-form";
import { SubscriptionFields, useSubscriptionForm } from "./subscription-form";
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
  const subscribeForm = useSubscriptionForm({ path, unitId: l.unitId, people: people.filter((p) => !p.leftAt), open: dialog === "service", onDone: done });
  const editHandover = useHandoverForm({ path, handover: editingHandover ?? undefined, taken: [], open: editingHandover !== null, onDone: () => setEditingHandover(null) });
  const addHandover = useHandoverForm({ path, taken: l.handovers.map((h) => h.itemId), open: dialog === "handover", onDone: done });
  const memberForm = useMemberForm({ path, open: dialog === "member", onDone: done });
  const rentForm = useRentForm({ path, last: l.rentVersions.at(-1)?.effectiveDate, open: dialog === "rent", onDone: done });

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

      <Modal open={dialog === "rent"} onClose={() => done()}>
        <form noValidate onSubmit={rentForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Add rent version"} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><RentFields x={rentForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={rentForm.error} busy={rentForm.busy} submitLabel={"Add"} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={dialog === "member"} onClose={() => done()}>
        <form noValidate onSubmit={memberForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Add person"} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><MemberFields x={memberForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={memberForm.error} busy={memberForm.busy} submitLabel={"Add"} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={dialog === "handover"} onClose={() => done()}>
        <form noValidate onSubmit={addHandover.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Add handover item"} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><HandoverFields x={addHandover} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={addHandover.error} busy={addHandover.busy} submitLabel={"Add"} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={editingHandover !== null} onClose={() => setEditingHandover(null)}>
        <form noValidate onSubmit={editHandover.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Edit handover item"} onOpenChange={(o) => { if (!o) setEditingHandover(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><HandoverFields x={editHandover} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={editHandover.error} busy={editHandover.busy} submitLabel={"Save"} onCancel={() => setEditingHandover(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={dialog === "service"} onClose={() => done()}>
        <form noValidate onSubmit={subscribeForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={"Add service"} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><SubscriptionFields x={subscribeForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={subscribeForm.error} busy={subscribeForm.busy} submitLabel={"Subscribe"} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
