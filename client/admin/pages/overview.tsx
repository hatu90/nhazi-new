"use client";

import { VStack } from "@astryxdesign/core/Stack";
import { Kpis } from "./overview-kpis";
import { QuickLinks } from "./overview-quick-links";
import { UnitsByFloor } from "./units-by-floor";

/** Property dashboard: KPIs, then every unit grouped by floor with its occupancy. */
export function OverviewPage() {
  return (
    <VStack gap={6}>
      <Kpis />
      <UnitsByFloor />
      <QuickLinks />
    </VStack>
  );
}
