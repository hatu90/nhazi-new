"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Pagination } from "@astryxdesign/core/Pagination";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useMe } from "@/client/auth/auth-provider";
import { formatDate, formatMoney } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { useGet } from "@/client/lib/hooks";
import type { IAdminPropertyListResponse, ILeaseListResponse } from "@/client/lib/types";
import { NotificationsCard } from "@/client/dashboard/notifications-card";
import { PropertyFields, usePropertyForm } from "@/client/admin/property-form";
import { Empty, ErrorBox, Modal, PageHeader, PageSpinner, Section, StatusBadge, Tag } from "@/client/ui";

export function HomePage() {
  const t = useTranslations("Dashboard");
  const en = useEnum();
  const me = useMe();
  const navigate = useNavigate();
  const leases = useGet<ILeaseListResponse>("/api/lease", { pageSize: 50 });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const properties = useGet<IAdminPropertyListResponse>("/api/admin/properties", { page, pageSize: 6 }, { keepPrevious: true });
  const openProperty = (id: string) => window.location.assign(`/admin/properties/${id}`);
  const propertyForm = usePropertyForm({
    method: "POST", path: "/api/admin/properties", open: creating, onDone: (p) => {
      openProperty(p.id);
      setCreating(false);
    }
  });

  return (
    <VStack gap={5}>
      <PageHeader title={t("title")} subtitle={t("hello", { name: me.displayName })} />
      <NotificationsCard />
      <Section title={t("leases")} action={<Button label={t("findProperty")} variant="primary" onClick={() => window.location.assign("/find-property")} />}>
        {leases.isPending ? <PageSpinner /> : leases.error ? <ErrorBox error={leases.error} retry={() => void leases.refetch()} /> : leases.data.items.length === 0 ? (
          <Empty title={t("noLeases")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {leases.data.items.map((l) => (
              <ClickableCard key={l.id} onClick={() => navigate(`/leases/${l.id}`)} label={`${l.propertyName} ${l.unitName}`} padding={4}>
                <VStack gap={2}>
                  <HStack justify="between" align="start" gap={2}><Heading level={2}>{l.unitName}</Heading><StatusBadge status={l.status} /></HStack>
                  <Text color="secondary" size="sm">{l.propertyName}</Text>
                  <HStack justify="between"><Text size="sm" color="secondary">{t("from", { date: formatDate(l.startDate) })}</Text><Text size="sm">{t("perMonth", { amount: formatMoney(l.currentRent) })}</Text></HStack>
                </VStack>
              </ClickableCard>
            ))}
          </div>
        )}
      </Section>
      <Section title={t("properties")} action={<Button icon={<Plus size={16} />} label={t("newProperty")} variant="primary" onClick={() => setCreating(true)} />}>
        {properties.isPending ? <PageSpinner /> : properties.error ? <ErrorBox error={properties.error} retry={() => void properties.refetch()} /> : properties.data.items.length === 0 ? (
          <Empty title={t("noProperties")} />
        ) : (
          <VStack gap={4}>
            <div className="grid gap-4 sm:grid-cols-2">
              {properties.data.items.map((p) => (
                <ClickableCard key={p.id} onClick={() => openProperty(p.id)} label={p.name} padding={4}>
                  <VStack gap={2}>
                    <HStack justify="between" align="start" gap={2}><Heading level={3}>{p.name}</Heading><Tag label={en("role", p.role)} tone="info" /></HStack>
                    <Text color="secondary" size="sm">{p.street}, {p.ward.name}, {p.province.name}</Text>
                    <Text size="sm" color="secondary">{en("category", p.category)} · {t("units", { count: p.unitCount })}</Text>
                  </VStack>
                </ClickableCard>
              ))}
            </div>
            {properties.data.total > properties.data.pageSize && <HStack justify="end"><Pagination page={properties.data.page} onChange={setPage} totalItems={properties.data.total} pageSize={properties.data.pageSize} /></HStack>}
          </VStack>
        )}
      </Section>
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={propertyForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("newProperty")} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}>
              <PropertyFields x={propertyForm} />
            </LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={propertyForm.error} busy={propertyForm.busy} submitLabel={t("createProperty")} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
