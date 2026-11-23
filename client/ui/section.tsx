"use client";

import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import type { ReactNode } from "react";
import { SectionProvider } from "./section-context";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card padding={5} variant="muted">
      <SectionProvider value>
        <VStack gap={4}>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Heading level={2}>{title}</Heading>
            {action}
          </div>
          {children}
        </VStack>
      </SectionProvider>
    </Card>
  );
}
