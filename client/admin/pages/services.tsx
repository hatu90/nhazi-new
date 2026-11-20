"use client";

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
import { PriceForm } from "./price-form";
import { ServiceForm } from "./service-form";

export function ServicesPage() {
  const { apiPath, canManage } = useProperty();
  const [creating, setCreating] = useState(false);
  const [pricing, setPricing] = useState<IServiceResponse | null>(null);
  const { data, error, isPending, refetch } = useGet<IServiceListResponse>(apiPath("/services"), { pageSize: 100 });

  return (
    <Stack gap={4}>
      {canManage && <HStack justify="end"><Button label="Add service" onClick={() => setCreating(true)} /></HStack>}
      {isPending ? <PageSpinner /> : error ? <ErrorBox error={error} retry={() => void refetch()} /> : data.items.length === 0 ? (
        <Card padding={4}><Empty title="No services" hint="Things you bill besides rent." action={canManage && <Button label="Add the first service" onClick={() => setCreating(true)} />} /></Card>
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
                    {canManage && <Button label="New price" size="sm" variant="secondary" onClick={() => setPricing(s)} />}
                  </HStack>
                </VStack>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="Add service">{creating && <ServiceForm onDone={() => setCreating(false)} />}</Modal>
      <Modal open={pricing !== null} onClose={() => setPricing(null)} title={`New price · ${pricing?.name ?? ""}`}>{pricing && <PriceForm service={pricing} onDone={() => setPricing(null)} />}</Modal>
    </Stack>
  );
}

