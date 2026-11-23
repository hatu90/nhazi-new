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
/** draft = written but not started (nothing billed, hidden from the tenant). */
export type LeaseStatus = "draft" | "upcoming" | "active" | "ended";

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

/** A file attached to a lease: its storage key and a caption (e.g. "ID card, front"). */
/** An agreement on a lease as stored: the template version pinned when it was added + the filled-in values. */
export const leaseAgreementsSchema = z.array(z.object({ id: z.string(), templateId: z.string(), version: z.number().int(), values: z.record(z.string(), z.unknown()).catch({}) }));
export type ILeaseAgreementEntry = z.infer<typeof leaseAgreementsSchema>[number];

export interface ILeaseDocument {
  path: string;
  name: string;
}

export interface ILeaseDetailResponse extends ILeaseSummaryResponse {
  billingCycleDay: number;
  rentVersions: IRentVersion[];
  /** `content` = the template version in use (Puck JSON); `values` = filled data (names, address, signature URL). */
  agreements: { id: string; templateId: string; templateName: string; version: number; content: unknown; values: unknown }[];
  documents: ILeaseDocument[];
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
  payments: { id: string; amount: number; method: string; status: "pending" | "confirmed" | "rejected"; paidOn: string; evidence: string[] }[];
}

export type ILeaseListResponse = IPaginated<ILeaseSummaryResponse>;
export type IInvoiceListResponse = IPaginated<IInvoiceResponse>;

// ── billing (tenant view) ───────────────────────────────────────────────────────────
/** What was invoiced in a calendar month (by invoice due date), grouped for the stacked chart (credits are left out). */
export interface IMonthBreakdown {
  /** YYYY-MM */
  month: string;
  total: number;
  segments: { key: string; label: string; amount: number }[];
}
export interface IMyBillingResponse {
  /** The running period, with the meters the tenant has to read to close it; null when none is running. */
  current: {
    id: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    services: { subscriptionId: string; serviceName: string; usageBase: string }[];
    meters: { meterId: string; serviceName: string; openingValue: number }[];
  } | null;
  /** The recent months (up to five, oldest first). */
  months: IMonthBreakdown[];
}
export interface ICloseMyPeriodResponse {
  closedPeriodId: string;
  nextPeriodId: string | null;
  invoiceId: string | null;
}
