"use client";

import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { createContext, useContext } from "react";
import { Outlet, useParams } from "react-router";
import { ApiError } from "@/client/lib/api";
import { label } from "@/client/lib/format";
import { useGet } from "@/client/lib/hooks";
import type { IAdminPropertyResponse, PropertyRole } from "@/client/lib/types";
import { NotFound } from "@/client/spa/not-found";
import { ErrorBox, PageSpinner, Tag } from "@/client/ui";

interface PropertyCtx {
  propertyId: string;
  property: IAdminPropertyResponse;
  role: PropertyRole;
  /** owner / admin: may change setup, leases and invoices. The API enforces this too; this only hides buttons. */
  canManage: boolean;
  isOwner: boolean;
  /** `/api/admin/properties/:id` + suffix. */
  apiPath: (suffix?: string) => string;
  /** SPA path inside this property, e.g. `to("leases/123")`. */
  to: (suffix?: string) => string;
}

const Ctx = createContext<PropertyCtx | null>(null);
export function useProperty() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProperty used outside <PropertyLayout>");
  return ctx;
}

export function PropertyLayout() {
  const { propertyId = "" } = useParams();
  const apiPath = (suffix = "") => `/api/admin/properties/${propertyId}${suffix}`;
  const to = (suffix = "") => `/properties/${propertyId}${suffix ? `/${suffix}` : ""}`;
  const { data: property, error, isPending, refetch } = useGet<IAdminPropertyResponse>(apiPath());

  if (isPending) return <PageSpinner />;
  if (error) {
    return error instanceof ApiError && (error.status === 404 || error.status === 403) ? <NotFound backTo="/" label="Back to dashboard" /> : <ErrorBox error={error} retry={() => void refetch()} />;
  }

  const role = property.role;
  const value: PropertyCtx = { propertyId, property, role, canManage: role === "owner" || role === "admin", isOwner: role === "owner", apiPath, to };
  
  return (
    <Ctx value={value}>
      <VStack gap={4} paddingBlockEnd={5}>
        <VStack gap={1}>
          <HStack gap={3} align="center" wrap="wrap">
            <Heading level={1}>{property.name}</Heading>
            <Tag label={label(role)} tone="info" />
          </HStack>
          <Text color="secondary">{property.street}, {property.ward.name}, {property.province.name}</Text>
        </VStack>
      </VStack>
      <Outlet />
    </Ctx>
  );
}
