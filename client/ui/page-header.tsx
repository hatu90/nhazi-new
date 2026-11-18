"use client";

import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <HStack justify="between" align="start" wrap="wrap" gap={3} paddingBlockEnd={5}>
      <VStack gap={1}>
        <Heading level={1}>{title}</Heading>
        {subtitle && <Text color="secondary">{subtitle}</Text>}
      </VStack>
      {actions && <HStack gap={2} wrap="wrap">{actions}</HStack>}
    </HStack>
  );
}
