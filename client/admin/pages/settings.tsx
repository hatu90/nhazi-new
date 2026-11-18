"use client";

import { Button } from "@astryxdesign/core/Button";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { formatMoney, label } from "@/client/lib/format";
import { DefList, Modal, Section, Tag } from "@/client/ui";
import { PropertyForm } from "../property-form";
import { useProperty } from "../property-layout";
import { TeamPage } from "./team";

/** Details + house rules with the edit form. */
function PropertyDetails() {
  const { property, canManage, apiPath } = useProperty();
  const [editing, setEditing] = useState(false);

  return (
    <VStack gap={5}>
      <Section title="Details" action={canManage && <Button label="Edit" size="sm" variant="secondary" onClick={() => setEditing(true)} />}>
        <DefList
          items={[
            ["Category", label(property.category)],
            ["Address", `${property.street}, ${property.ward.name}, ${property.province.name}`],
            ["Units", property.unitCount],
            ["Asking rent", property.rentNegotiable ? <Tag label="Negotiable" tone="info" /> : property.rentPriceFrom === null ? "—" : `${formatMoney(property.rentPriceFrom)}${property.rentPriceTo !== null ? ` – ${formatMoney(property.rentPriceTo)}` : ""}`],
          ]}
        />
      </Section>
      <Section title="House rules">
        {property.rules.length === 0 ? <Text color="secondary">No rules set.</Text> : <ul className="list-disc space-y-1 pl-5">{property.rules.map((r, i) => <li key={i}><Text>{r}</Text></li>)}</ul>}
      </Section>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit property">
        {editing && <PropertyForm initial={property} method="PATCH" path={apiPath()} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />}
      </Modal>
    </VStack>
  );
}

export function SettingsPage() {
  return (
    <VStack gap={6}>
      <PropertyDetails />
      <TeamPage />
    </VStack>
  );
}
