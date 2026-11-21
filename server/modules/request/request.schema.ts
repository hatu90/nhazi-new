import { z } from "zod";
import type { IActor, IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema, type IPaginated } from "@/server/shared/pagination";
import { idSchema, isoDateSchema, nonEmptyPatch } from "@/server/shared/schema";

export const requestTypeSchema = z.enum(["maintenance", "close_lease", "close_period", "enquiry"]);
export const requestStatusSchema = z.enum(["open", "in_progress", "resolved", "rejected", "cancelled"]);
export const requestPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type RequestType = z.infer<typeof requestTypeSchema>;
export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type RequestPriority = z.infer<typeof requestPrioritySchema>;

const commentBody = z.string().trim().min(1).max(4000);

// ── lists ───────────────────────────────────────────────────────────────────────────
export const adminRequestListQuerySchema = paginationQuerySchema.extend({
  status: requestStatusSchema.optional(),
  type: requestTypeSchema.optional(),
  priority: requestPrioritySchema.optional(),
  unitId: idSchema.optional(),
  assignedTo: idSchema.optional(),
});
export type IAdminRequestListQuery = z.infer<typeof adminRequestListQuerySchema>;
export const tenantRequestListQuerySchema = paginationQuerySchema.extend({ status: requestStatusSchema.optional(), type: requestTypeSchema.optional() });
export type ITenantRequestListQuery = z.infer<typeof tenantRequestListQuerySchema>;

// ── tenant: create ──────────────────────────────────────────────────────────────────
export const createRequestPayloadSchema = z
  .object({
    // close_period has its own endpoint (it carries the meter readings)
    type: requestTypeSchema.exclude(["close_period"]),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(4000).optional(),
    priority: requestPrioritySchema.default("normal"),
    requestedCloseDate: isoDateSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "close_lease" && !v.requestedCloseDate) ctx.addIssue({ code: "custom", path: ["requestedCloseDate"], message: "Required for close_lease" });
    if (v.type !== "close_lease" && v.requestedCloseDate) ctx.addIssue({ code: "custom", path: ["requestedCloseDate"], message: "Only for close_lease" });
  });
export type ICreateRequestPayload = z.infer<typeof createRequestPayloadSchema>;
/** Meter readings a tenant hands in when asking to close the billing period. */
export interface IClosePeriodDetails {
  periodId: string;
  endDate: string;
  readings: { meterId: string; serviceName: string; openingValue: number; value: number }[];
}
export interface ICreateRequestCommand extends Omit<ICreateRequestPayload, "type"> {
  type: RequestType;
  actor: IActor;
  leaseId: string;
  details?: IClosePeriodDetails;
}
export const toCreateRequestCommand = (p: ICreateRequestPayload, actor: IActor, leaseId: string): ICreateRequestCommand => ({ ...p, actor, leaseId });

// ── admin: update ───────────────────────────────────────────────────────────────────
export const updateRequestPayloadSchema = z
  .object({ status: requestStatusSchema, priority: requestPrioritySchema, assignedTo: idSchema.nullable() })
  .partial()
  .refine(nonEmptyPatch, "Nothing to update");
export type IUpdateRequestPayload = z.infer<typeof updateRequestPayloadSchema>;
export interface IUpdateRequestCommand extends IUpdateRequestPayload, IPropertyScope {
  requestId: string;
}
export const toUpdateRequestCommand = (p: IUpdateRequestPayload, s: IPropertyScope, requestId: string): IUpdateRequestCommand => ({ ...p, ...s, requestId });

// ── comments ────────────────────────────────────────────────────────────────────────
export const commentPayloadSchema = z.object({ body: commentBody });
export type ICommentPayload = z.infer<typeof commentPayloadSchema>;
export interface IAdminCommentCommand extends ICommentPayload, IPropertyScope {
  requestId: string;
}
export interface ITenantCommentCommand extends ICommentPayload {
  actor: IActor;
  leaseId: string;
  requestId: string;
}
export const toAdminCommentCommand = (p: ICommentPayload, s: IPropertyScope, requestId: string): IAdminCommentCommand => ({ ...p, ...s, requestId });
export const toTenantCommentCommand = (p: ICommentPayload, actor: IActor, leaseId: string, requestId: string): ITenantCommentCommand => ({ ...p, actor, leaseId, requestId });

// ── responses ───────────────────────────────────────────────────────────────────────
export interface IPersonRef {
  id: string;
  displayName: string;
}
export interface IRequestResponse {
  id: string;
  propertyId: string;
  unitId: string | null;
  unitName: string | null;
  leaseId: string | null;
  type: RequestType;
  title: string;
  description: string | null;
  priority: RequestPriority;
  status: RequestStatus;
  requestedBy: IPersonRef;
  assignedTo: IPersonRef | null;
  requestedCloseDate: string | null;
  /** close_period requests: the period, the last day and the readings. */
  details: IClosePeriodDetails | null;
  closedAt: string | null;
  createdAt: string;
}
export interface ICommentResponse {
  id: string;
  requestId: string;
  author: IPersonRef;
  body: string;
  createdAt: string;
}
export interface IRequestDetailResponse extends IRequestResponse {
  comments: ICommentResponse[];
}
export type IRequestListResponse = IPaginated<IRequestResponse>;

/** open -> in_progress -> resolved|rejected ; open/in_progress -> cancelled (by the tenant) ; closed states are final. */
const NEXT: Record<RequestStatus, RequestStatus[]> = {
  open: ["in_progress", "resolved", "rejected", "cancelled"],
  in_progress: ["open", "resolved", "rejected", "cancelled"],
  resolved: [],
  rejected: [],
  cancelled: [],
};
export const canTransition = (from: RequestStatus, to: RequestStatus) => from === to || NEXT[from].includes(to);
export const isClosed = (s: RequestStatus) => NEXT[s].length === 0;
