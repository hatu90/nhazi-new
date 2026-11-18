"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { formatDate, formatMoney, isValidPhone, label, normalizePhone, todayIso } from "@/client/lib/format";
import { AgreementSection } from "@/client/agreement/section";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITemplateVersionResponse, IMeterListResponse, IServiceListResponse, ISubscriptionResponse, ITenancyDetailResponse } from "@/client/lib/types";
import { DataTable, DefList, Empty, ErrorBox, Modal, PageHeader, PageSpinner, Section, StatusBadge } from "@/client/ui";
import { num, text } from "@/client/ui/form";
import { FArea, FDate, FNumber, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";

type Dialog = "end" | "rent" | "tenant" | "member" | "service" | null;

function LeaseAgreement({ lease, path }: { lease: ITenancyDetailResponse; path: string }) {
  const { apiPath, canManage, property } = useProperty();
  const a = lease.agreement!;
  const version = useGet<ITemplateVersionResponse>(apiPath(`/agreement-templates/${a.templateId}/versions/${a.version}`));
  const saveValues = useSend<{ agreementValues: Record<string, string> }>("PATCH", path, [path]);
  if (version.isPending) return <PageSpinner />;
  if (version.error) return <ErrorBox error={version.error} retry={() => void version.refetch()} />;
  return (
    <AgreementSection
      title={`Agreement · ${a.templateName} v${a.version}`}
      content={version.data.data}
      facts={{ propertyName: property.name, unitName: lease.unitName, tenantNames: lease.tenants.map((t) => t.displayName), startDate: lease.startDate, endDate: lease.endDate, rent: lease.currentRent, deposit: lease.depositAmount, billingDay: lease.billingCycleDay }}
      values={a.values}
      onSaveValues={canManage ? (agreementValues) => saveValues.mutateAsync({ agreementValues }) : undefined}
    />
  );
}

export function LeaseDetailPage() {
  const { leaseId = "" } = useParams();
  const { apiPath, canManage, to } = useProperty();
  const navigate = useNavigate();
  const path = apiPath(`/leases/${leaseId}`);
  const lease = useGet<ITenancyDetailResponse>(path);
  const [dialog, setDialog] = useState<Dialog>(null);
  const start = useSend<undefined>("POST", `${path}/start`, [apiPath("/leases"), apiPath("/invoices")]);
  const remove = useSend<undefined>("DELETE", path, [apiPath("/leases")]);
  const endSub = useSend<{ id: string; endDate: string }>("PATCH", (b) => `${path}/subscriptions/${b.id}`, [path]);
  const done = () => setDialog(null);

  if (lease.isPending) return <PageSpinner />;
  if (lease.error) return <ErrorBox error={lease.error} retry={() => void lease.refetch()} />;
  const l = lease.data;
  const live = l.status === "active" || l.status === "upcoming";

  return (
    <VStack gap={5}>
      <HStack><Button label="All leases" variant="ghost" size="sm" href={to("leases")} /></HStack>
      <PageHeader
        title={l.unitName}
        subtitle={<HStack gap={2} align="center"><StatusBadge status={l.status} /><Text color="secondary">{formatDate(l.startDate)} → {l.endDate ? formatDate(l.endDate) : "open"}</Text></HStack>}
        actions={canManage && (
          <>
            {l.status === "draft" && <Button label="Start lease" isLoading={start.isPending} clickAction={async () => { await start.mutateAsync(undefined); }} />}
            {l.status === "draft" && <Button label="Delete draft" variant="secondary" isLoading={remove.isPending} clickAction={async () => { if (confirm("Delete this draft lease?")) { await remove.mutateAsync(undefined); navigate(to("leases")); } }} />}
            {live && <Button label="End lease" variant="secondary" onClick={() => setDialog("end")} />}
          </>
        )}
      />
      {(start.error || remove.error || endSub.error) && <ErrorBox error={start.error ?? remove.error ?? endSub.error} />}

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

      <Section title="Tenants" action={canManage && l.status !== "ended" && <Button label="Add tenant" size="sm" variant="secondary" onClick={() => setDialog("tenant")} />}>
        <DataTable<{ id: string; displayName: string; phoneNumber: string }>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.tenants.map((t) => ({ ...t, id: t.accountId })), page: 1, pageSize: 1000, total: l.tenants.length } }}
          empty={<Empty title="No tenants" />}
          columns={[{ key: "n", header: "Name", render: (t) => t.displayName }, { key: "p", header: "Phone", render: (t) => t.phoneNumber }]}
        />
      </Section>

      <Section title="People living here" action={canManage && l.status !== "ended" && <Button label="Add person" size="sm" variant="secondary" onClick={() => setDialog("member")} />}>
        <DataTable<ITenancyDetailResponse["members"][number]>
          query={{ isPending: false, error: null, refetch: () => {}, data: { items: l.members, page: 1, pageSize: 1000, total: l.members.length } }}
          empty={<Empty title="No other people" hint="Members drive per-person services such as water." />}
          columns={[
            { key: "n", header: "Name", render: (m) => m.name },
            { key: "y", header: "Born", render: (m) => m.yearOfBirth },
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

      <Modal open={dialog === "end"} onClose={done} title="End lease">{dialog === "end" && <EndForm path={path} onDone={done} />}</Modal>
      <Modal open={dialog === "rent"} onClose={done} title="Add rent version">{dialog === "rent" && <RentForm path={path} last={l.rentVersions.at(-1)?.effectiveDate} onDone={done} />}</Modal>
      <Modal open={dialog === "tenant"} onClose={done} title="Add tenant">{dialog === "tenant" && <TenantForm path={path} onDone={done} />}</Modal>
      <Modal open={dialog === "member"} onClose={done} title="Add person">{dialog === "member" && <MemberForm path={path} onDone={done} />}</Modal>
      <Modal open={dialog === "service"} onClose={done} title="Add service">{dialog === "service" && <SubscriptionForm path={path} unitId={l.unitId} onDone={done} />}</Modal>
    </VStack>
  );
}

function EndForm({ path, onDone }: { path: string; onDone: () => void }) {
  const { apiPath } = useProperty();
  const save = useSend<object>("POST", `${path}/close`, [apiPath("/leases"), apiPath("/invoices"), apiPath("/refunds")]);
  const form = useForm<{ terminatedAt: string; reason: string }>({ defaultValues: { terminatedAt: todayIso(), reason: "" } });
  const submit = useSubmit(form, save, (v) => ({ terminatedAt: v.terminatedAt, reason: text(v.reason) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="End lease" onCancel={onDone}>
      <Text color="secondary">Ends the lease on this date: closes the running billing period, ends its services and issues the closing invoice and refund suggestion.</Text>
      <FDate control={form.control} name="terminatedAt" label="Last day" required width="100%" />
      <FArea control={form.control} name="reason" label="Reason" rows={2} width="100%" />
    </FormBody>
  );
}

function RentForm({ path, last, onDone }: { path: string; last?: string; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/rent`, [path]);
  const form = useForm<{ effectiveDate: string; amount: string }>({ defaultValues: { effectiveDate: "", amount: "" } });
  const submit = useSubmit(form, save, (v) => ({ effectiveDate: v.effectiveDate, amount: num(v.amount) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add" onCancel={onDone}>
      <FDate control={form.control} name="effectiveDate" label="Effective from" hint={last ? `Must be after ${formatDate(last)}.` : undefined} min={last} required width="100%" />
      <FNumber control={form.control} name="amount" label="Monthly rent (₫)" required width="100%" />
    </FormBody>
  );
}

function TenantForm({ path, onDone }: { path: string; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/tenants`, [path]);
  const form = useForm<{ name: string; phone: string }>({ defaultValues: { name: "", phone: "" } });
  const submit = useSubmit(form, save, (v) => ({ displayName: v.name.trim(), phoneNumber: normalizePhone(v.phone) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add tenant" onCancel={onDone}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
      <FText control={form.control} name="phone" label="Phone number" type="tel" placeholder="0912 345 678" required rules={{ validate: (v) => isValidPhone(String(v)) || "Enter a valid phone number" }} width="100%" />
    </FormBody>
  );
}

function MemberForm({ path, onDone }: { path: string; onDone: () => void }) {
  const save = useSend<object>("POST", `${path}/members`, [path]);
  const form = useForm<{ name: string; yearOfBirth: string }>({ defaultValues: { name: "", yearOfBirth: "" } });
  const submit = useSubmit(form, save, (v) => ({ name: v.name.trim(), yearOfBirth: num(v.yearOfBirth) }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Add" onCancel={onDone}>
      <FText control={form.control} name="name" label="Name" required width="100%" />
      <FNumber control={form.control} name="yearOfBirth" label="Year of birth" required width="100%" />
    </FormBody>
  );
}

function SubscriptionForm({ path, unitId, onDone }: { path: string; unitId: string; onDone: () => void }) {
  const { apiPath } = useProperty();
  const services = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 });
  const meters = useGet<IMeterListResponse>(apiPath("/meters"), { unitId, inService: true, pageSize: 100 });
  const save = useSend<object>("POST", `${path}/subscriptions`, [path]);
  const form = useForm<{ serviceId: string; meterId: string; quantity: string }>({ defaultValues: { serviceId: "", meterId: "", quantity: "1" } });
  const serviceId = useWatch({ control: form.control, name: "serviceId" });
  const service = services.data?.items.find((s) => s.id === serviceId);
  const unitMeters = (meters.data?.items ?? []).filter((m) => m.serviceId === serviceId);
  const submit = useSubmit(form, save, (v) => ({ serviceId: v.serviceId, meterId: service?.usageBase === "meter" ? v.meterId : undefined, quantity: num(v.quantity) ?? 1 }), onDone);
  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Subscribe" onCancel={onDone}>
      <FSelect control={form.control} name="serviceId" label="Service" required options={(services.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))} onValueChange={() => form.setValue("meterId", "")} width="100%" />
      {service?.usageBase === "meter" && <FSelect control={form.control} name="meterId" label="Meter" required options={unitMeters.map((m) => ({ value: m.id, label: m.name }))} hint={unitMeters.length === 0 ? "This unit has no meter for that service yet (Meters tab)." : undefined} width="100%" />}
      {service && service.usageBase !== "meter" && service.usageBase !== "member" && <FNumber control={form.control} name="quantity" label="Quantity" required width="100%" />}
    </FormBody>
  );
}
