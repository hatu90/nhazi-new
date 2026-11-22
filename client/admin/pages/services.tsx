"use client";

import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, formatMoney, todayIso } from "@/client/lib/format";
import { useEnum } from "@/client/lib/use-enum";
import { useGet, useSend } from "@/client/lib/hooks";
import type { IServiceListResponse, IServiceResponse } from "@/client/lib/types";
import { Empty, ErrorBox, ListSkeleton, Modal, RowActions, Tag, useConfirm } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, Stack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { ServiceEditFields, ServiceFields, useServiceEditForm, useServiceForm } from "./service-form";

export function ServicesPage() {
  const t = useTranslations("Services");
  const en = useEnum();
  const { apiPath, canManage } = useProperty();
  const [creating, setCreating] = useState(false);
  const serviceForm = useServiceForm({ open: creating, onDone: () => setCreating(false) });
  const [editing, setEditing] = useState<IServiceResponse | null>(null);
  const editForm = useServiceEditForm({ service: editing, onDone: () => setEditing(null) });
  const c = useTranslations("Common");
  const confirm = useConfirm();
  const remove = useSend<string>("DELETE", (id) => apiPath(`/services/${id}`), [apiPath("/services")]);
  const { data, error, isPending, refetch } = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 });

  return (
    <Stack gap={4}>
      {canManage && <HStack justify="end"><Button icon={<Plus size={16} />} variant="primary" label={t("add")} onClick={() => setCreating(true)} /></HStack>}
      {isPending ? <ListSkeleton /> : error ? <ErrorBox error={error} retry={() => void refetch()} /> : data.items.length === 0 ? (
        <Card padding={4}><Empty title={t("empty")} action={canManage && <Button icon={<Plus size={16} />} variant="primary" label={t("add")} onClick={() => setCreating(true)} />} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((s) => {
            const current = [...s.prices].reverse().find((p) => p.effectiveDate <= todayIso()) ?? s.prices[0];
            return (
              <Card key={s.id} padding={5}>
                <VStack gap={3}>
                  <HStack justify="between" align="start" gap={2}>
                    <VStack gap={1}>
                      <HStack gap={2} align="center" wrap="wrap"><Heading level={2}>{s.name}</Heading><Tag label={en("usageBase", s.usageBase)} /></HStack>
                      {s.description && <Text color="secondary" size="sm">{s.description}</Text>}
                    </VStack>
                    {canManage && (
                      <RowActions
                        actions={[
                          { id: "edit", label: c("edit"), icon: Pencil, onClick: () => setEditing(s) },
                          { id: "delete", label: c("delete"), icon: Trash2, destructive: true, onClick: () => confirm.ask({ title: t("deleteTitle", { name: s.name }), description: t("deleteBody"), actionLabel: c("delete"), onConfirm: () => remove.mutateAsync(s.id) }) },
                        ]}
                      />
                    )}
                  </HStack>
                  <VStack gap={1}>
                    {current?.tiers.map((tier, i, all) => (
                      <HStack key={i} justify="between">
                        <Text color="secondary" size="sm">{all.length === 1 ? t("rate") : tier.upTo === null ? t("above", { n: all[i - 1]?.upTo ?? 0 }) : t("upTo", { n: tier.upTo })}{s.unitOfMeasure ? ` ${s.unitOfMeasure}` : ""}</Text>
                        <Text size="sm">{formatMoney(tier.rate)}</Text>
                      </HStack>
                    ))}
                  </VStack>
                  <Text size="sm" color="secondary">{current ? t("currentSince", { date: formatDate(current.effectiveDate) }) : t("noPrice")}</Text>
                </VStack>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)}>
        <form noValidate onSubmit={serviceForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("add")} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ServiceFields x={serviceForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={serviceForm.error} busy={serviceForm.busy} submitLabel={t("add")} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        <form noValidate onSubmit={editForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("editFor", { name: editing?.name ?? "" })} onOpenChange={(o) => { if (!o) setEditing(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ServiceEditFields x={editForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={editForm.error} busy={editForm.busy} submitLabel={c("save")} onCancel={() => setEditing(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </Stack>
  );
}

