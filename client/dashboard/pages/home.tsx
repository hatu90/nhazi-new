"use client";

import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Pagination } from "@astryxdesign/core/Pagination";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useMe } from "@/client/auth/auth-provider";
import { formatDate, formatMoney, label as humanize } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IAdminPropertyListResponse, IInvitationResponse, ILeaseListResponse, IPaginated } from "@/client/lib/types";
import { PropertyForm } from "@/client/admin/property-form";
import { Empty, ErrorBox, Modal, PageHeader, PageSpinner, StatusBadge, Tag } from "@/client/ui";

export function HomePage() {
  const me = useMe();
  const navigate = useNavigate();
  const leases = useGet<ILeaseListResponse>("/api/lease", { pageSize: 50 });
  const invitations = useGet<IPaginated<IInvitationResponse>>("/api/me/invitations", { status: "pending", pageSize: 20 });
  const respond = useSend<{ id: string; decision: "accept" | "decline" }>("POST", (b) => `/api/me/invitations/${b.id}/${b.decision}`, ["/api/me", "/api/lease"]);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const properties = useGet<IAdminPropertyListResponse>("/api/admin/properties", { page, pageSize: 6 }, { keepPrevious: true });
  const openProperty = (id: string) => window.location.assign(`/admin/properties/${id}`);
  const pending = invitations.data?.items ?? [];

  return (
    <VStack gap={5}>
      <PageHeader title="Dashboard" subtitle={`Hello, ${me.displayName}.`} />
      <VStack gap={3}>
        <Heading level={2}>Notifications</Heading>
        {pending.length === 0 && <Text color="secondary" size="sm">You&apos;re all caught up.</Text>}
          {pending.map((i) => (
            <Card key={i.id} padding={4}>
              <HStack justify="between" align="center" gap={3} wrap="wrap">
                <VStack gap={0.5}>
                  <Text weight="semibold">{i.property.name}{i.lease ? ` · ${i.lease.unitName}` : ""}</Text>
                  <Text size="sm" color="secondary">{i.invitedBy.displayName} invited you {i.kind === "lease" ? "as a tenant" : `to the team as ${i.role}`}.</Text>
                </VStack>
                <HStack gap={2}>
                  <Button label="Decline" variant="secondary" isLoading={respond.isPending} clickAction={async () => { await respond.mutateAsync({ id: i.id, decision: "decline" }); }} />
                  <Button label="Accept" isLoading={respond.isPending} clickAction={async () => { await respond.mutateAsync({ id: i.id, decision: "accept" }); }} />
                </HStack>
              </HStack>
            </Card>
          ))}
          {respond.error && <ErrorBox error={respond.error} />}
      </VStack>
      <Heading level={2}>Leases</Heading>
      {leases.isPending ? <PageSpinner /> : leases.error ? <ErrorBox error={leases.error} retry={() => void leases.refetch()} /> : leases.data.items.length === 0 ? (
        <Empty title="No leases yet" hint="When a landlord adds your phone number to a lease, it appears here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leases.data.items.map((l) => (
            <ClickableCard key={l.id} onClick={() => navigate(`/leases/${l.id}`)} label={`${l.propertyName} ${l.unitName}`} padding={4}>
              <VStack gap={2}>
                <HStack justify="between" align="start" gap={2}><Heading level={2}>{l.unitName}</Heading><StatusBadge status={l.status} /></HStack>
                <Text color="secondary" size="sm">{l.propertyName}</Text>
                <HStack justify="between"><Text size="sm" color="secondary">From {formatDate(l.startDate)}</Text><Text size="sm">{formatMoney(l.currentRent)} / month</Text></HStack>
              </VStack>
            </ClickableCard>
          ))}
        </div>
      )}
      <HStack justify="between" align="center" gap={3} wrap="wrap">
        <Heading level={2}>Properties</Heading>
        <Button label="New property" variant="secondary" onClick={() => setCreating(true)} />
      </HStack>
      {properties.isPending ? <PageSpinner /> : properties.error ? <ErrorBox error={properties.error} retry={() => void properties.refetch()} /> : properties.data.items.length === 0 ? (
        <Empty title="No properties yet" hint="Create a property to add units, services and leases." />
      ) : (
        <VStack gap={4}>
          <div className="grid gap-4 sm:grid-cols-2">
            {properties.data.items.map((p) => (
              <ClickableCard key={p.id} onClick={() => openProperty(p.id)} label={p.name} padding={4}>
                <VStack gap={2}>
                  <HStack justify="between" align="start" gap={2}><Heading level={3}>{p.name}</Heading><Tag label={humanize(p.role)} tone="info" /></HStack>
                  <Text color="secondary" size="sm">{p.street}, {p.ward.name}, {p.province.name}</Text>
                  <Text size="sm" color="secondary">{humanize(p.category)} · {p.unitCount} {p.unitCount === 1 ? "unit" : "units"}</Text>
                </VStack>
              </ClickableCard>
            ))}
          </div>
          {properties.data.total > properties.data.pageSize && <HStack justify="end"><Pagination page={properties.data.page} onChange={setPage} totalItems={properties.data.total} pageSize={properties.data.pageSize} /></HStack>}
        </VStack>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="New property">
        {creating && <PropertyForm method="POST" path="/api/admin/properties" onDone={(p) => { setCreating(false); openProperty(p.id); }} onCancel={() => setCreating(false)} />}
      </Modal>
    </VStack>
  );
}
