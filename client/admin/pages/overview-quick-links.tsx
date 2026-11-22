"use client";

import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Heading } from "@astryxdesign/core/Heading";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ClipboardList, FileSignature, FileText, Gauge, Package, Receipt, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNavigate } from "react-router";
import { useProperty } from "../property-layout";

const links = [
  { id: "leases", icon: FileSignature },
  { id: "services", icon: Wrench },
  { id: "meters", icon: Gauge },
  { id: "invoices", icon: Receipt },
  { id: "agreements", icon: FileText },
  { id: "requests", icon: ClipboardList },
  { id: "inventory", icon: Package },
] as const;

/** Shortcuts from the property overview to its main sections. */
export function QuickLinks() {
  const t = useTranslations("AdminNav");
  const { to } = useProperty();
  const navigate = useNavigate();
  return (
    <VStack gap={3}>
    <Heading level={2}>{t("quickLinks")}</Heading>
    <Grid columns={{ minWidth: 160 }} gap={3}>
      {links.map(({ id, icon: Icon }) => (
        <ClickableCard key={id} label={t(id)} padding={3} onClick={() => navigate(to(id))}>
          <HStack gap={2} align="center">
            <Icon size={18} aria-hidden />
            <Text weight="medium">{t(id)}</Text>
          </HStack>
        </ClickableCard>
      ))}
    </Grid>
    </VStack>
  );
}
