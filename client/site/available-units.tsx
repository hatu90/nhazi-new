"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

export type AvailableUnit = { id: string; name: string; meta: string; rent: string };

const PAGE_SIZE = 5;

/** Paginated list of available units (5 per page). */
export function AvailableUnits({ units }: { units: AvailableUnit[] }) {
  const t = useTranslations("Site");
  const [page, setPage] = useState(1);
  const total = Math.max(1, Math.ceil(units.length / PAGE_SIZE));
  const current = Math.min(page, total);
  const slice = units.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <VStack gap={2}>
      <VStack gap={0}>
        {slice.map((u, i) => (
          <div key={u.id}>
            {i > 0 && <Divider />}
            <HStack justify="between" align="center" gap={3} paddingBlock={2}>
              <VStack gap={0}>
                <Text>{u.name}</Text>
                <Text size="sm" color="secondary">{u.meta}</Text>
              </VStack>
              <Text>{u.rent}</Text>
            </HStack>
          </div>
        ))}
      </VStack>
      {total > 1 && (
        <HStack justify="between" align="center" gap={3}>
          <Button label={t("previous")} variant="ghost" isDisabled={current === 1} onClick={() => setPage(current - 1)}>‹</Button>
          <Text size="sm" color="secondary">{t("pageOf", { page: current, total })}</Text>
          <Button label={t("next")} variant="ghost" isDisabled={current === total} onClick={() => setPage(current + 1)}>›</Button>
        </HStack>
      )}
    </VStack>
  );
}
