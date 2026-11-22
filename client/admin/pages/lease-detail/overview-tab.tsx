"use client";

import { useTranslations } from "next-intl";
import { CalendarX, Pencil, Plus, Trash2 } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Stack";
import { useState } from "react";
import { formatDate, formatMoney, todayIso } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { useSend } from "@/client/lib/hooks";
import type { ISubscriptionResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, Section, useConfirm, RowActions } from "@/client/ui";
import { useProperty } from "../../property-layout";
import { HandoverFields, useHandoverForm } from "./handover-form";
import { LeaseDocuments } from "./lease-agreement";
import { MemberFields, useMemberForm } from "./member-form";
import { RentFields, useRentForm } from "./rent-form";
import { SubscriptionFields, useSubscriptionForm } from "./subscription-form";
import { type Handover, type PersonRow, peopleOf } from "./types";

type Dialog = "rent" | "member" | "service" | "handover" | null;

/** Terms, agreement, rent history, people, services and the handover list. */
export function OverviewTab({ lease: l, path }: { lease: ITenancyDetailResponse; path: string }) {
  const t = useTranslations("LeaseDetail");
  const c = useTranslations("Common");
  const en = useEnum();
  const confirm = useConfirm();
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

      <Section title={t("terms")}>
        <DefList items={[
          [t("currentRent"), formatMoney(l.currentRent)],
          [t("deposit"), formatMoney(l.depositAmount)],
          [t("billingDay"), t("billingDayValue", { n: l.billingCycleDay })],
          [t("firstPeriodEnds"), formatDate(l.firstPeriodEnd)],
          ...(l.terminatedAt ? ([[t("endedOn"), `${formatDate(l.terminatedAt)}${l.terminationReason ? ` — ${l.terminationReason}` : ""}`]] as [string, string][]) : []),
        ]} />
      </Section>

      <LeaseDocuments lease={l} path={path} />

      <Section title={t("rentHistory")} action={canManage && l.status !== "ended" && <Button icon={<Plus size={16} />} label={t("addRentVersion")} size="sm" variant="secondary" onClick={() => setDialog("rent")} />}>
        <DataTable<{ id: string; effectiveDate: string; amount: number }>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.rentVersions.map((r) => ({ ...r, id: r.effectiveDate })), page: 1, pageSize: 1000, total: l.rentVersions.length } }}
          empty={<Empty title={t("noRentVersions")} />}
          columns={[{ key: "d", header: t("effectiveFrom"), render: (r) => formatDate(r.effectiveDate) }, { key: "a", header: t("monthlyRent"), render: (r) => formatMoney(r.amount) }]}
        />
      </Section>

      <Section title={t("people")} action={canManage && l.status !== "ended" && <Button icon={<Plus size={16} />} label={t("addPerson")} size="sm" variant="secondary" onClick={() => setDialog("member")} />}>
        <DataTable<PersonRow>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: people, page: 1, pageSize: 1000, total: people.length } }}
          empty={<Empty title={t("noPeople")} />}
          columns={[
            { key: "n", header: c("name"), render: (m) => m.name },
            { key: "p", header: c("phone"), render: (m) => m.phoneNumber ?? "—" },
            { key: "a", header: t("appAccess"), render: (m) => (m.tenant ? t("hasAccess") : m.phoneNumber ? t("notJoined") : "—") },
            { key: "y", header: t("born"), render: (m) => m.yearOfBirth ?? "—" },
            { key: "j", header: t("joined"), render: (m) => formatDate(m.joinedAt) },
            { key: "l", header: t("left"), render: (m) => formatDate(m.leftAt) },
          ]}
        />
      </Section>

      <Section title={t("services")} action={canManage && l.status !== "ended" && <Button icon={<Plus size={16} />} label={t("addService")} size="sm" variant="secondary" onClick={() => setDialog("service")} />}>
        <DataTable<ISubscriptionResponse>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.subscriptions, page: 1, pageSize: 1000, total: l.subscriptions.length } }}
          empty={<Empty title={t("noServices")} />}
          columns={[
            { key: "s", header: t("service"), render: (s) => s.serviceName },
            { key: "b", header: t("billedBy"), render: (s) => en("usageBase", s.usageBase) },
            { key: "m", header: t("meterQty"), render: (s) => s.meterName ?? `×${s.quantity}` },
            { key: "p", header: t("period"), render: (s) => `${formatDate(s.startDate)} → ${s.endDate ? formatDate(s.endDate) : c("open")}` },
            { key: "e", header: "", align: "end", render: (s) => canManage && !s.endDate && <RowActions actions={[{ id: "end", label: t("endService"), icon: CalendarX, onClick: () => { void (async () => { await endSub.mutateAsync({ id: s.id, endDate: todayIso() }); })(); } }]} /> },
          ]}
        />
      </Section>

      <Section title={t("handover")} action={canManage && l.status !== "ended" && <Button icon={<Plus size={16} />} label={t("addItem")} size="sm" variant="secondary" onClick={() => setDialog("handover")} />}>
        <DataTable<Handover>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.handovers, page: 1, pageSize: 1000, total: l.handovers.length } }}
          empty={<Empty title={t("nothingHandedOver")} />}
          columns={[
            { key: "i", header: t("item"), render: (h) => h.itemName },
            { key: "q", header: t("quantity"), render: (h) => h.quantity },
            { key: "c", header: t("condition"), render: (h) => en("condition", h.condition) },
            { key: "d", header: t("note"), render: (h) => h.description ?? "—" },
            {
              key: "a",
              header: "",
              align: "end",
              render: (h) => canManage && <RowActions actions={[
                { id: "edit", label: c("edit"), icon: Pencil, onClick: () => setEditingHandover(h) },
                { id: "remove", label: c("remove"), icon: Trash2, destructive: true, onClick: () => confirm.ask({ title: t("removeTitle", { name: h.itemName }), description: t("removeBody"), actionLabel: c("remove"), onConfirm: () => removeHandover.mutateAsync({ id: h.id }) }) },
              ]} />,
            },
          ]}
        />
      </Section>

      <Modal open={dialog === "rent"} onClose={() => done()}>
        <form noValidate onSubmit={rentForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("addRentVersion")} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><RentFields x={rentForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={rentForm.error} busy={rentForm.busy} submitLabel={c("add")} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={dialog === "member"} onClose={() => done()}>
        <form noValidate onSubmit={memberForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("addPerson")} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><MemberFields x={memberForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={memberForm.error} busy={memberForm.busy} submitLabel={c("add")} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={dialog === "handover"} onClose={() => done()}>
        <form noValidate onSubmit={addHandover.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("addHandoverItem")} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><HandoverFields x={addHandover} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={addHandover.error} busy={addHandover.busy} submitLabel={c("add")} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={editingHandover !== null} onClose={() => setEditingHandover(null)}>
        <form noValidate onSubmit={editHandover.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("editHandoverItem")} onOpenChange={(o) => { if (!o) setEditingHandover(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><HandoverFields x={editHandover} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={editHandover.error} busy={editHandover.busy} submitLabel={c("save")} onCancel={() => setEditingHandover(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={dialog === "service"} onClose={() => done()}>
        <form noValidate onSubmit={subscribeForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("addService")} onOpenChange={(o) => { if (!o) done(); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><SubscriptionFields x={subscribeForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={subscribeForm.error} busy={subscribeForm.busy} submitLabel={t("subscribe")} onCancel={() => done()} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </VStack>
  );
}
