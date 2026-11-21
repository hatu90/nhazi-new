"use client";

import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { formatMoney, label } from "@/client/lib/format";
import { DefList, Modal } from "@/client/ui";
import { FormFooter } from "../../ui/rhf";
import { PropertyFields, usePropertyForm } from "../property-form";
import { useProperty } from "../property-layout";
import { TeamPage } from "./team";

const formatDistance = (m: number | null) => (m === null ? null : m >= 1000 ? `${(m / 1000).toFixed(1).replace(/\.0$/, "")} km` : `${m} m`);

/** Flat page: a heading and its content per block, blocks separated by a divider (no cards around cards). */
export function SettingsPage() {
  const { property, canManage, apiPath } = useProperty();
  const [editing, setEditing] = useState(false);
  const propertyForm = usePropertyForm({ initial: property, method: "PATCH", path: apiPath(), open: editing, onDone: () => setEditing(false) });

  return (
    <VStack gap={6}>
      <VStack gap={4}>
        <HStack justify="between" align="center" gap={3} wrap="wrap">
          <VStack gap={0.5}>
            <Heading level={2}>Property</Heading>
            <Text size="sm" color="secondary">{canManage ? "Name, address, rent and house rules." : "Only owners and admins can change these."}</Text>
          </VStack>
          {canManage && <Button variant="primary" label="Edit property" onClick={() => setEditing(true)} />}
        </HStack>
        <VStack gap={4}>
          <DefList items={[
            ["Name", property.name],
            ["Category", label(property.category)],
            ["Address", `${property.street}, ${property.ward.name}, ${property.province.name}`],
            ["Asking rent", property.rentNegotiable ? "Negotiable" : property.rentPriceFrom === null ? "—" : `${formatMoney(property.rentPriceFrom)}${property.rentPriceTo !== null ? ` – ${formatMoney(property.rentPriceTo)}` : ""}`],
            ["Images", property.images.length + (property.headerImage ? 1 : 0) === 0 ? "None" : `${property.images.length + (property.headerImage ? 1 : 0)}`],
          ]} />
          <VStack gap={1}>
            <Text size="sm" color="secondary">Nearby places</Text>
            {property.referenceAddresses.length === 0 ? <Text>—</Text> : (
              <ul className="list-disc space-y-1 pl-5">
                {property.referenceAddresses.map((r) => (
                  <li key={r.id}><Text>{r.name}{formatDistance(r.distance) && <Text color="secondary"> · {formatDistance(r.distance)}</Text>}</Text></li>
                ))}
              </ul>
            )}
          </VStack>
          <VStack gap={1}>
            <Text size="sm" color="secondary">House rules</Text>
            {property.rules.length === 0 ? <Text>—</Text> : <ul className="list-disc space-y-1 pl-5">{property.rules.map((r, i) => <li key={i}><Text>{r}</Text></li>)}</ul>}
          </VStack>
        </VStack>
      </VStack>
      <Divider />
      <TeamPage />

      <Modal open={editing} onClose={() => setEditing(false)}>
        <form noValidate onSubmit={propertyForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title="Edit property" onOpenChange={(o) => { if (!o) setEditing(false); }} />}
            content={<LayoutContent isScrollable className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ paddingBlock: 16 }}>
              <PropertyFields x={propertyForm} />
            </LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={propertyForm.error} busy={propertyForm.busy} submitLabel="Save changes" onCancel={() => setEditing(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
    </VStack>
  );
}
