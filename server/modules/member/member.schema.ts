import { z } from "zod";
import type { IPropertyScope } from "@/server/shared/actor";
import { phoneSchema, propertyRoleSchema, type PropertyRole } from "@/server/shared/schema";

export const addMemberPayloadSchema = z.object({ phoneNumber: phoneSchema, role: propertyRoleSchema });
export type IAddMemberPayload = z.infer<typeof addMemberPayloadSchema>;
export interface IAddMemberCommand extends IAddMemberPayload, IPropertyScope {}
export const toAddMemberCommand = (p: IAddMemberPayload, s: IPropertyScope): IAddMemberCommand => ({ ...p, ...s });

export const changeMemberRolePayloadSchema = z.object({ role: propertyRoleSchema });
export type IChangeMemberRolePayload = z.infer<typeof changeMemberRolePayloadSchema>;
export interface IChangeMemberRoleCommand extends IChangeMemberRolePayload, IPropertyScope {
  accountId: string;
}
export const toChangeMemberRoleCommand = (p: IChangeMemberRolePayload, s: IPropertyScope, accountId: string): IChangeMemberRoleCommand => ({ ...p, ...s, accountId });

export interface IMemberResponse {
  accountId: string;
  displayName: string;
  phoneNumber: string;
  role: PropertyRole;
}
