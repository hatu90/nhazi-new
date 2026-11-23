"use client";

import { Card } from "@astryxdesign/core/Card";
import { Pagination } from "@astryxdesign/core/Pagination";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Table, pixel, useTableStickyColumns, type TableColumn, type TablePlugin } from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import type { ReactNode } from "react";
import { ErrorBox } from "./error-box";
import { MobileRow } from "./mobile-row";

import { TableSkeleton } from "./skeletons";
import { useInSection } from "./section-context";
import { useIsMobile } from "./use-is-mobile";

/** Edge-to-edge data table inside a Card, with loading / error / empty states and optional pagination. */
export function DataTable<T extends { id: string }>({
  columns,
  query,
  empty,
  paging,
  pinStart,
}: {
  /** `title` = the card title on phones (default: the first column); `width` = fixed pixel width. */
  columns: { key: string; header: string; render: (row: T) => ReactNode; align?: "start" | "end"; title?: boolean; width?: number }[];
  query: { isPending: boolean; error: unknown; refetch: () => unknown; data?: { items: T[]; page: number; pageSize: number; total: number } };
  empty: ReactNode;
  paging?: (page: number) => void;
  /** Keys of the columns frozen at the start while scrolling sideways: must be the first columns, in order. */
  pinStart?: string[];
}) {
  const sticky = useTableStickyColumns({ startKeys: pinStart });
  const mobile = useIsMobile();
  const nested = useInSection();
  // Inside a Section the surrounding card is already the surface: no second bordered card.
  const variant = nested ? "transparent" : "default";
  const { isPending, error, data } = query;
  if (isPending) return <Card variant={variant}><TableSkeleton /></Card>;
  if (error) return <ErrorBox error={error} retry={() => void query.refetch()} />;
  if (!data || data.items.length === 0) return <Card padding={4} variant={variant}>{empty}</Card>;
  const pager = paging && data.total > data.pageSize && (
    <HStack justify="end" padding={3}>
      <Pagination page={data.page} onChange={paging} totalItems={data.total} pageSize={data.pageSize} />
    </HStack>
  );
  // Phones: one card per row (first column is the title, the rest are label/value pairs) instead of a wide table.
  if (mobile) {
    const first = columns.find((c) => c.title) ?? columns[0];
    const rest = columns.filter((c) => c !== first);
    return (
      <VStack gap={2}>
        {data.items.map((row) => (
          <MobileRow key={row.id} nested={nested}>
            <VStack gap={1.5}>
              <Text weight="semibold">{first.render(row)}</Text>
              {rest.map((c) =>
                c.header ? (
                  <HStack key={c.key} justify="between" align="center" gap={3}>
                    <Text size="sm" color="secondary">{c.header}</Text>
                    <Text size="sm" as="div">{c.render(row)}</Text>
                  </HStack>
                ) : (
                  <HStack key={c.key} justify="end">{c.render(row)}</HStack>
                ),
              )}
            </VStack>
          </MobileRow>
        ))}
        {pager}
      </VStack>
    );
  }
  const cols: TableColumn<T & Record<string, unknown>>[] = columns.map((c) => ({
    key: c.key,
    header: c.header,
    align: c.align,
    width: c.width ? pixel(c.width) : undefined,
    renderCell: (row) => c.render(row as T),
  }));
  return (
    <Card variant={variant} padding={nested ? 0 : undefined}>
      <Table data={data.items as (T & Record<string, unknown>)[]} columns={cols} idKey="id" hasHover plugins={pinStart?.length ? ({ sticky } as unknown as Record<string, TablePlugin<T & Record<string, unknown>>>) : undefined} />
      {pager}
    </Card>
  );
}
