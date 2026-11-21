import type { IPaginated } from "@/server/shared/pagination";
import type {
  IAdminRequestListQuery,
  ICommentResponse,
  ICreateEnquiryCommand,
  ICreateRequestCommand,
  IRequestDetailResponse,
  IRequestResponse,
  ITenantRequestListQuery,
  IUpdateRequestCommand,
  RequestStatus,
} from "./request.schema";

/** Where a request is looked up: by property (staff) or by lease (tenant). */
export type IRequestScope = { propertyId: string } | { leaseId: string };

export interface IRequestRepository {
  listForProperty(propertyId: string, query: IAdminRequestListQuery): Promise<IPaginated<IRequestResponse>>;
  listForLease(leaseId: string, query: ITenantRequestListQuery): Promise<IPaginated<IRequestResponse>>;
  find(scope: IRequestScope, requestId: string): Promise<IRequestDetailResponse | null>;
  /** The lease, if `accountId` is one of its tenants. */
  findTenantLease(accountId: string, leaseId: string): Promise<{ id: string; propertyId: string; unitId: string } | null>;
  create(command: ICreateRequestCommand, lease: { propertyId: string; unitId: string }): Promise<string>;
  /** Names for the enquiry title; null when the property is gone or the unit is not one of its units. */
  findEnquiryTarget(propertyId: string, unitId?: string): Promise<{ propertyName: string; unitName: string | null } | null>;
  hasOpenEnquiry(accountId: string, propertyId: string): Promise<boolean>;
  createEnquiry(command: ICreateEnquiryCommand, title: string): Promise<string>;
  update(command: IUpdateRequestCommand, closeAt: Date | null): Promise<void>;
  /** Tenant cancel. */
  setStatus(requestId: string, status: RequestStatus, closedAt: Date | null): Promise<void>;
  addComment(requestId: string, authorId: string, body: string): Promise<ICommentResponse>;
}
