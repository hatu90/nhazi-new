import { z } from "zod";
import type { IActor } from "@/server/shared/actor";
import type { IVerifiedIdentity } from "@/server/shared/auth";
import { accountStatusSchema, phoneSchema, type AccountStatus, type PropertyRole } from "@/server/shared/schema";

// ── POST /api/public/register ───────────────────────────────────────────────────
export const registerPayloadSchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  phoneNumber: phoneSchema,
});
export type IRegisterPayload = z.infer<typeof registerPayloadSchema>;

export interface IRegisterCommand extends IRegisterPayload {
  identity: IVerifiedIdentity;
}
export const toRegisterCommand = (payload: IRegisterPayload, identity: IVerifiedIdentity): IRegisterCommand => ({
  ...payload,
  identity,
});

// ── PATCH /api/me ───────────────────────────────────────────────────────────────
export const updateMePayloadSchema = z
  .object({ displayName: z.string().trim().min(1).max(100).optional() })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type IUpdateMePayload = z.infer<typeof updateMePayloadSchema>;

export interface IUpdateMeCommand extends IUpdateMePayload {
  actor: IActor;
}
export const toUpdateMeCommand = (payload: IUpdateMePayload, actor: IActor): IUpdateMeCommand => ({ ...payload, actor });

// ── responses ───────────────────────────────────────────────────────────────────
export const accountResponseSchema = z.object({
  id: z.uuid(),
  phoneNumber: z.string(),
  displayName: z.string(),
  status: accountStatusSchema,
  createdAt: z.iso.datetime(),
});
export interface IAccountResponse {
  id: string;
  phoneNumber: string;
  displayName: string;
  status: AccountStatus;
  createdAt: string;
}

export interface IMeResponse extends IAccountResponse {
  properties: { propertyId: string; propertyName: string; role: PropertyRole }[];
  leaseCount: number;
  isPlatformAdmin: boolean;
}
