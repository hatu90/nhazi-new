"use client";

import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Heading } from "@astryxdesign/core/Heading";
import { createContext, useContext } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router";
import { ApiError } from "@/client/lib/api";
import { formatDate } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { ILeaseDetailResponse } from "@/client/lib/types";
import { NotFound } from "@/client/spa/not-found";
import { ErrorBox, PageSpinner, StatusBadge, Tabs } from "@/client/ui";

interface LeaseCtx {
  lease: ILeaseDetailResponse;
  leaseId: string;
  /** `/api/lease/:id` + suffix. */
  apiPath: (suffix?: string) => string;
  /** SPA path inside this lease. */
  to: (suffix?: string) => string;
}
const Ctx = createContext<LeaseCtx | null>(null);
export function useLease() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLease used outside <LeaseLayout>");
  return ctx;
}

const tabs = [
  { id: "", label: "Overview" },
  { id: "invoices", label: "Invoices" },
  { id: "requests", label: "Requests" },
];

export function LeaseLayout() {
  const { leaseId = "" } = useParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const apiPath = (suffix = "") => `/api/lease/${leaseId}${suffix}`;
  const to = (suffix = "") => `/leases/${leaseId}${suffix ? `/${suffix}` : ""}`;
  const { data: lease, error, isPending, refetch } = useGet<ILeaseDetailResponse>(apiPath());

  if (isPending) return <PageSpinner />;
  if (error) return error instanceof ApiError && (error.status === 404 || error.status === 403) ? <NotFound backTo="/" label="Back to my leases" /> : <ErrorBox error={error} retry={() => void refetch()} />;

  const section = pathname.split("/")[3] ?? "";
  return (
    <Ctx value={{ lease, leaseId, apiPath, to }}>
      <VStack gap={4} paddingBlockEnd={5}>
        <HStack><Button label="My leases" variant="ghost" size="sm" href="/" /></HStack>
        <VStack gap={1}>
          <HStack gap={3} align="center" wrap="wrap"><Heading level={1}>{lease.unitName}</Heading><StatusBadge status={lease.status} /></HStack>
          <Text color="secondary">{lease.propertyName} · {formatDate(lease.startDate)} → {lease.endDate ? formatDate(lease.endDate) : "open"}</Text>
        </VStack>
        <Tabs tabs={tabs} value={tabs.some((t) => t.id === section) ? section : ""} onChange={(id) => navigate(to(id))} />
      </VStack>
      <Outlet />
    </Ctx>
  );
}
