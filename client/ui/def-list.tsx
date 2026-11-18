"use client";

import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import type { ReactNode } from "react";

export function DefList({ items }: { items: [string, ReactNode][] }) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <VStack key={k} gap={0.5}>
          <Text size="sm" color="secondary">{k}</Text>
          <Text>{v ?? "—"}</Text>
        </VStack>
      ))}
    </div>
  );
}
