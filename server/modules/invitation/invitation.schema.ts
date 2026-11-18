import { z } from "zod";
import type { IActor, IPropertyScope } from "@/server/shared/actor";
import { paginationQuerySchema } from "@/server/shared/pagination";
import {
  idSchema,
  invitationKindSchema,
  invitationStatusSchema,
  phoneSchema,
  propertyRoleSchema,
  type InvitationKind,
  type InvitationStatus,
  type PropertyRole,
} from "@/server/shared/schema";

// ── POST /api/admin/properties/:propertyId/invitations   (invite to the team, owner only) ──
export const invitePropertyPayloadSchema = z.object({ phoneNumber: phoneSchema, role: propertyRoleSchema });
export type IInvitePropertyPayload = z.infer<typeof invitePropertyPayloadSchema>;
export interface IInvitePropertyCommand extends IInvitePropertyPayload, IPropertyScope {}
export const toInvitePropertyCommand = (p: IInvitePropertyPayload, s: IPropertyScope): IInvitePropertyCommand => ({ ...p, ...s });

// ── POST /api/admin/properties/:propertyId/leases/:leaseId/invitations   (invite a tenant) ──
export const inviteTenantPayloadSchema = z.object({ phoneNumber: phoneSchema });
export type IInviteTenantPayload = z.infer<typeof inviteTenantPayloadSchema>;
export interface IInviteTenantCommand extends IInviteTenantPayload, IPropertyScope {
  leaseId: string;
}
export const toInviteTenantCommand = (p: IInviteTenantPayload, s: IPropertyScope, leaseId: string): IInviteTenantCommand => ({ ...p, ...s, leaseId });

// ── GET /api/admin/properties/:propertyId/invitations ────────────────────────────────
export const invitationListQuerySchema = paginationQuerySchema.extend({
  kind: invitationKindSchema.optional(),
  status: invitationStatusSchema.optional(),
  leaseId: idSchema.optional(),
});
export type IInvitationListQuery = z.infer<typeof invitationListQuerySchema>;

// ── GET /api/me/invitations   (what was offered to *my* phone number) ────────────────
export const myInvitationListQuerySchema = paginationQuerySchema.extend({ status: invitationStatusSchema.default("pending") });
export type IMyInvitationListQuery = z.infer<typeof myInvitationListQuerySchema>;

// ── commands that act on one invitation ──────────────────────────────────────────────
export interface IRevokeInvitationCommand extends IPropertyScope {
  invitationId: string;
}
export interface IRespondInvitationCommand {
  actor: IActor;
  invitationId: string;
  decision: "accepted" | "declined";
}

// ── responses ───────────────────────────────────────────────────────────────────────
export interface IInvitationLease {
  id: string;
  unitName: string;
  startDate: string;
  endDate: string | null;
  terminatedAt: string | null;
}
export interface IInvitationResponse {
  id: string;
  kind: InvitationKind;
  status: InvitationStatus;
  phoneNumber: string;
  /** Team role offered (kind = property); null for a lease invitation. */
  role: PropertyRole | null;
  property: { id: string; name: string };
  /** kind = lease only. */
  lease: IInvitationLease | null;
  invitedBy: { accountId: string; displayName: string };
  createdAt: string;
  respondedAt: string | null;
}
