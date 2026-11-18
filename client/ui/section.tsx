"use client";

import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import type { ReactNode } from "react";
import { SectionProvider } from "./section-context";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card padding={5} variant="muted">
      <SectionProvider value>
        <VStack gap={4}>
          <HStack justify="between" align="center" gap={3}>
            <Heading level={2}>{title}</Heading>
            {action}
          </HStack>
          {children}
        </VStack>
      </SectionProvider>
    </Card>
  );
}
