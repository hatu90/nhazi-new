"use client";

import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Skeleton } from "@astryxdesign/core/Skeleton";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useInSection } from "./section-context";

/** Announces a loading region to assistive tech; the visuals are the Skeleton blocks inside. */
function Busy({ children }: { children: ReactNode }) {
  const t = useTranslations("Common");
  return (
    <div role="status" aria-busy="true" aria-label={t("loading")}>
      {children}
    </div>
  );
}

/** Text lines; the last one is shorter so it reads as a paragraph. */
function Lines({ count = 2, start = 0 }: { count?: number; start?: number }) {
  return (
    <VStack gap={2}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} index={start + i} height={14} width={i === count - 1 && count > 1 ? "60%" : "100%"} radius={1} />
      ))}
    </VStack>
  );
}

/** Stand-in for a PageHeader: title + subtitle. */
function HeaderSkeleton() {
  return (
    <VStack gap={2} paddingBlockEnd={5}>
      <Skeleton height={28} width="min(320px, 60%)" radius={2} />
      <Skeleton index={1} height={14} width="min(220px, 40%)" radius={1} />
    </VStack>
  );
}

/** Stand-in for a KPI card. */
function KpiSkeleton({ index = 0 }: { index?: number }) {
  return (
    <Card padding={4}>
      <VStack gap={2}>
        <Skeleton index={index} height={12} width="50%" radius={1} />
        <Skeleton index={index + 1} height={28} width="35%" radius={2} />
        <Skeleton index={index + 2} height={12} width="70%" radius={1} />
      </VStack>
    </Card>
  );
}

/** A row of KPI placeholders. */
export function KpiSkeletons({ count = 4 }: { count?: number }) {
  return (
    <Grid columns={{ minWidth: 200 }} gap={3}>
      {Array.from({ length: count }, (_, i) => <KpiSkeleton key={i} index={i} />)}
    </Grid>
  );
}

const FRAME = {
  narrow: "mx-auto w-full max-w-4xl px-4 py-6 sm:px-5 sm:py-8", // = DashboardLayout container
  wide: "mx-auto w-full max-w-6xl px-4 py-6 sm:px-5 sm:py-8", // = AdminLayout container
};

/**
 * Whole-page placeholder: header, then a few content blocks. Use for a page that returns early while loading.
 * Pass `frame` when rendering outside the app layout (app loader, auth gate) so it gets the layout's width and padding.
 */
export function PageSkeleton({ blocks = 2, frame }: { blocks?: number; frame?: keyof typeof FRAME }) {
  const body = (
    <Busy>
      <HeaderSkeleton />
      <VStack gap={4}>
        {Array.from({ length: blocks }, (_, i) => (
          <Card key={i} padding={5} variant="muted">
            <VStack gap={4}>
              <Skeleton index={i} height={20} width="30%" radius={2} />
              <Lines count={3} start={i} />
            </VStack>
          </Card>
        ))}
      </VStack>
    </Busy>
  );
  return frame ? <div className={FRAME[frame]}>{body}</div> : body;
}

/** Dashboard home: KPI row plus a grid of list cards. */
export function DashboardSkeleton() {
  return (
    <Busy>
      <VStack gap={5}>
        <KpiSkeletons count={5} />
        <Grid columns={{ minWidth: 300 }} gap={4}>
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} padding={4}>
              <VStack gap={3}>
                <Skeleton index={i} height={18} width="40%" radius={2} />
                <Lines count={3} start={i} />
              </VStack>
            </Card>
          ))}
        </Grid>
      </VStack>
    </Busy>
  );
}

/** A stack of list rows (title + detail + trailing tag). Inside a Section the rows go flat so cards don't nest. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  const nested = useInSection();
  return (
    <Busy>
      <VStack gap={2}>
        {Array.from({ length: rows }, (_, i) => (
          <Card key={i} padding={3} variant={nested ? "transparent" : "default"}>
            <HStack justify="between" align="center" gap={3}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <VStack gap={2}>
                  <Skeleton index={i} height={16} width="45%" radius={1} />
                  <Skeleton index={i + 1} height={12} width="70%" radius={1} />
                </VStack>
              </div>
              <Skeleton index={i} height={22} width={64} radius="rounded" />
            </HStack>
          </Card>
        ))}
      </VStack>
    </Busy>
  );
}

/** Card grid placeholder (property / lease cards). */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Busy>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: count }, (_, i) => (
          <Card key={i} padding={4}>
            <VStack gap={3}>
              <Skeleton index={i} height={20} width="55%" radius={2} />
              <Skeleton index={i + 1} height={12} width="85%" radius={1} />
              <Skeleton index={i + 2} height={12} width="40%" radius={1} />
            </VStack>
          </Card>
        ))}
      </div>
    </Busy>
  );
}

/** Table placeholder: a header line and `rows` cell rows. */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Busy>
      <VStack gap={3} padding={4}>
        <Grid columns={columns} gap={4}>
          {Array.from({ length: columns }, (_, c) => <Skeleton key={c} index={c} height={12} width="50%" radius={1} />)}
        </Grid>
        {Array.from({ length: rows }, (_, r) => (
          <Grid key={r} columns={columns} gap={4}>
            {Array.from({ length: columns }, (_, c) => <Skeleton key={c} index={r + c} height={16} width={c === 0 ? "80%" : "60%"} radius={1} />)}
          </Grid>
        ))}
      </VStack>
    </Busy>
  );
}
