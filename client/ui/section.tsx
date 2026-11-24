"use client";

import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import type { ReactNode } from "react";
import { SectionProvider } from "./section-context";
import { useIsMobile } from "./use-is-mobile";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const mobile = useIsMobile();
  return (
    <Card padding={mobile ? 3 : 5} variant="muted">
      <SectionProvider value>
        <VStack gap={mobile ? 3 : 4}>
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
