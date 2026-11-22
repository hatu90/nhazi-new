"use client";

import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { ReactNode } from "react";

/** One dashboard card: a heading with its total, then up to a few rows (or `empty`), then an optional "see all" footer. */
export function ListCard<T>({ title, total, items, empty, row }: { title: string; total: number; items: T[]; empty: string; row: (item: T) => ReactNode }) {
  return (
    <Card padding={4}>
      <VStack gap={3}>
        <HStack justify="between" align="center" gap={2}>
          <Heading level={3}>{title}</Heading>
          <Text size="sm" color="secondary">{total}</Text>
        </HStack>
        {items.length === 0 ? <Text size="sm" color="secondary">{empty}</Text> : <VStack gap={2}>{items.map(row)}</VStack>}
      </VStack>
    </Card>
  );
}

/** A clickable two-line row: title + trailing value on top, a secondary line below. */
export function Row({ title, trailing, detail, onClick }: { title: string; trailing?: ReactNode; detail: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10">
      <VStack gap={0}>
        <HStack justify="between" align="center" gap={2}>
          <Text weight="medium">{title}</Text>
          {trailing}
        </HStack>
        <Text size="sm" color="secondary">{detail}</Text>
      </VStack>
    </button>
  );
}
