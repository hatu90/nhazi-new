"use client";

import { Divider } from "@astryxdesign/core/Divider";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { formatMoney, label } from "@/client/lib/format";
import { DefList } from "@/client/ui";
import { PropertyForm } from "../property-form";
import { useProperty } from "../property-layout";
import { TeamPage } from "./team";

/** Flat page: a heading and its content per block, blocks separated by a divider (no cards around cards). */
export function SettingsPage() {
  const { property, canManage, apiPath } = useProperty();
  const [saved, setSaved] = useState(false);

  return (
    <VStack gap={6}>
      <VStack gap={4}>
        <VStack gap={0.5}>
          <Heading level={2}>Property</Heading>
          <Text size="sm" color="secondary">{canManage ? "Name, address, rent and house rules." : "Only owners and admins can change these."}</Text>
        </VStack>
        <div className="max-w-xl">
          {canManage ? (
            <VStack gap={2}>
              <PropertyForm inline initial={property} method="PATCH" path={apiPath()} onDone={() => setSaved(true)} onCancel={() => {}} />
              {saved && <Text size="sm" color="secondary">Saved.</Text>}
            </VStack>
          ) : (
            <VStack gap={4}>
              <DefList items={[
                ["Category", label(property.category)],
                ["Address", `${property.street}, ${property.ward.name}, ${property.province.name}`],
                ["Asking rent", property.rentNegotiable ? "Negotiable" : property.rentPriceFrom === null ? "—" : `${formatMoney(property.rentPriceFrom)}${property.rentPriceTo !== null ? ` – ${formatMoney(property.rentPriceTo)}` : ""}`],
              ]} />
              {property.rules.length > 0 && <ul className="list-disc space-y-1 pl-5">{property.rules.map((r, i) => <li key={i}><Text>{r}</Text></li>)}</ul>}
            </VStack>
          )}
        </div>
      </VStack>
      <Divider />
      <TeamPage />
    </VStack>
  );
}
