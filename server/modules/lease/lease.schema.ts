import { z } from "zod";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { invoiceStatusSchema, isoDateSchema, vndSchema, type InvoiceKind, type InvoiceStatus } from "@/server/shared/schema";

/** `leases.prices` JSON: rent versions, effective from `effectiveDate`. */
export const rentVersionsSchema = z.array(z.object({ effectiveDate: isoDateSchema, amount: vndSchema }));
export type IRentVersion = z.infer<typeof rentVersionsSchema>[number];

// ── GET /api/lease ──────────────────────────────────────────────────────────────────
export const leaseListQuerySchema = paginationQuerySchema;
export type ILeaseListQuery = z.infer<typeof leaseListQuerySchema>;

// ── GET /api/lease/:leaseId/invoices ────────────────────────────────────────────────
export const invoiceListQuerySchema = paginationQuerySchema.extend({ status: invoiceStatusSchema.optional() });
export type IInvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;

// ── responses ───────────────────────────────────────────────────────────────────────
export type LeaseStatus = "upcoming" | "active" | "ended";

export interface ILeaseSummaryResponse {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitName: string;
  startDate: string;
  endDate: string | null;
  terminatedAt: string | null;
  status: LeaseStatus;
  currentRent: number | null;
  depositAmount: number;
}

export interface ILeaseDetailResponse extends ILeaseSummaryResponse {
  billingCycleDay: number;
  rentVersions: IRentVersion[];
  /** `content` = the template version in use (Puck JSON); `values` = filled data (names, address, signature URL). */
  agreement: { templateId: string; templateName: string; version: number; content: unknown; values: unknown } | null;
  documents: string[];
  members: { id: string; name: string; phoneNumber: string | null; yearOfBirth: number; joinedAt: string; leftAt: string | null }[];
}

export interface IInvoiceResponse {
  id: string;
  leaseId: string;
  kind: InvoiceKind;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface IInvoiceDetailResponse extends IInvoiceResponse {
  items: { id: string; kind: string; title: string; amount: number }[];
  payments: { id: string; amount: number; method: string; paidOn: string }[];
}

export type ILeaseListResponse = IPaginated<ILeaseSummaryResponse>;
export type IInvoiceListResponse = IPaginated<IInvoiceResponse>;
