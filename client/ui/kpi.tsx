"use client";

import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

/** A number with a caption and a detail line; the whole card is a link. Used for the overview dashboards. */
export function Kpi({ title, value, detail, onClick }: { title: string; value: string | number; detail: string; onClick: () => void }) {
  return (
    <ClickableCard label={title} padding={4} onClick={onClick}>
      <VStack gap={1}>
        <Text size="sm" color="secondary">{title}</Text>
        <Heading level={1}>{value}</Heading>
        <Text size="sm" color="secondary">{detail}</Text>
      </VStack>
    </ClickableCard>
  );
}
