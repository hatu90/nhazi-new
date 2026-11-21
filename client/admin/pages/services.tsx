"use client";

import { Plus } from "lucide-react";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { FormFooter } from "@/client/ui/rhf";
import { formatDate, formatMoney, label, todayIso } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IServiceListResponse, IServiceResponse } from "@/client/lib/types";
import { Empty, ErrorBox, Modal, PageSpinner, Tag } from "@/client/ui";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, Stack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useProperty } from "../property-layout";
import { PriceFields, usePriceForm } from "./price-form";
import { ServiceFields, useServiceForm } from "./service-form";

export function ServicesPage() {
  const { apiPath, canManage } = useProperty();
  const [creating, setCreating] = useState(false);
  const serviceForm = useServiceForm({ open: creating, onDone: () => setCreating(false) });
  const [pricing, setPricing] = useState<IServiceResponse | null>(null);
  const priceForm = usePriceForm({ service: pricing, onDone: () => setPricing(null) });
  const { data, error, isPending, refetch } = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 });

  return (
    <Stack gap={4}>
      {canManage && <HStack justify="end"><Button icon={<Plus size={16} />} variant="primary" label="Add service" onClick={() => setCreating(true)} /></HStack>}
      {isPending ? <PageSpinner /> : error ? <ErrorBox error={error} retry={() => void refetch()} /> : data.items.length === 0 ? (
        <Card padding={4}><Empty title="No services" hint="Things you bill besides rent." action={canManage && <Button icon={<Plus size={16} />} variant="primary" label="Add the first service" onClick={() => setCreating(true)} />} /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((s) => {
            const current = [...s.prices].reverse().find((p) => p.effectiveDate <= todayIso()) ?? s.prices[0];
            const latest = s.prices[s.prices.length - 1];
            return (
              <Card key={s.id} padding={5}>
                <VStack gap={3}>
                  <HStack justify="between" align="start" gap={2}>
                    <VStack gap={0.5}><Heading level={2}>{s.name}</Heading>{s.description && <Text color="secondary" size="sm">{s.description}</Text>}</VStack>
                    <Tag label={label(s.usageBase)} />
                  </HStack>
                  <VStack gap={1}>
                    {current?.tiers.map((t, i, all) => (
                      <HStack key={i} justify="between">
                        <Text color="secondary" size="sm">{all.length === 1 ? "Rate" : t.upTo === null ? `Above ${all[i - 1]?.upTo}` : `Up to ${t.upTo}`}{s.unitOfMeasure ? ` ${s.unitOfMeasure}` : ""}</Text>
                        <Text size="sm">{formatMoney(t.rate)}</Text>
                      </HStack>
                    ))}
                  </VStack>
                  <HStack justify="between" align="center" gap={2}>
                    <Text size="sm" color="secondary">{s.prices.length} price {s.prices.length === 1 ? "version" : "versions"} · latest from {formatDate(latest?.effectiveDate)}</Text>
                    {canManage && <Button icon={<Plus size={16} />} label="New price" size="sm" variant="secondary" onClick={() => setPricing(s)} />}
                  </HStack>
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
            header={<DialogHeader title={"Add service"} onOpenChange={(o) => { if (!o) setCreating(false); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><ServiceFields x={serviceForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={serviceForm.error} busy={serviceForm.busy} submitLabel={"Add service"} onCancel={() => setCreating(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={pricing !== null} onClose={() => setPricing(null)}>
        <form noValidate onSubmit={priceForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={`New price · ${pricing?.name ?? ""}`} onOpenChange={(o) => { if (!o) setPricing(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><PriceFields x={priceForm} /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={priceForm.error} busy={priceForm.busy} submitLabel={"Add price"} onCancel={() => setPricing(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </Stack>
  );
}

