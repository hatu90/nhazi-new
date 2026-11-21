/**
 * The API contract. Type-only re-exports from the server schemas (erased at build time, so no server code is bundled),
 * which keeps the frontend in lock-step with the backend.
 */
export type { IPaginated } from "@/server/shared/pagination";
export type { PropertyRole, PropertyCategory, InvoiceStatus, InvoiceKind, ServiceUsageBase, ItemCondition, InvitationStatus } from "@/server/shared/schema";
export type { IMeResponse, IAccountResponse } from "@/server/modules/identity/identity.schema";
export type {
  IPropertySummaryResponse,
  IPropertyDetailResponse,
  IAdminPropertyResponse,
  IAdminPropertySummaryResponse,
  IAdminPropertyListResponse,
  IPropertySearchResponse,
  IProvince,
  IWard,
} from "@/server/modules/property/property.schema";
export type { IReferenceAddressResponse, IPropertyReferenceAddressResponse, IReferenceAddressListResponse } from "@/server/modules/reference-address/reference-address.schema";
export type { IBillingPeriodResponse, IBillingPeriodListResponse, IBillingPeriodDetailResponse } from "@/server/modules/billing/billing.schema";
export type { IUnitResponse, IUnitListResponse } from "@/server/modules/unit/unit.schema";
export type {
  ILeaseSummaryResponse,
  ILeaseDetailResponse,
  ILeaseListResponse,
  IInvoiceResponse,
  IInvoiceDetailResponse,
  IInvoiceListResponse,
  IRentVersion,
  LeaseStatus,
} from "@/server/modules/lease/lease.schema";
export type {
  ITenancySummaryResponse,
  ITenancyDetailResponse,
  ITenancyListResponse,
  ISubscriptionResponse,
  ICreateLeasePayload,
} from "@/server/modules/tenancy/tenancy.schema";
export type { IRefundResponse, IRefundListResponse } from "@/server/modules/refund/refund.schema";
export type {
  IAdminInvoiceResponse,
  IAdminInvoiceDetailResponse,
  IAdminInvoiceListResponse,
  IPaymentResponse,
  IRecordPaymentPayload,
  ICreateInvoicePayload,
  PaymentMethod,
  InvoiceItemKind,
} from "@/server/modules/invoice/invoice.schema";
export type {
  IRequestResponse,
  IRequestDetailResponse,
  IRequestListResponse,
  ICommentResponse,
  RequestType,
  RequestStatus,
  RequestPriority,
} from "@/server/modules/request/request.schema";
export type { IItemResponse, IItemListResponse, IHandoverResponse } from "@/server/modules/inventory/inventory.schema";
export type { IServiceResponse, IServiceListResponse, IPriceVersion } from "@/server/modules/service/service.schema";
export type { IMeterResponse, IMeterListResponse } from "@/server/modules/meter/meter.schema";
export type { IReadingResponse, IReadingListResponse } from "@/server/modules/reading/reading.schema";
export type { IMemberResponse } from "@/server/modules/member/member.schema";
export type { IInvitationResponse } from "@/server/modules/invitation/invitation.schema";
export type { IPlanResponse } from "@/server/modules/plan/plan.schema";
export type { IPropertyStatsResponse } from "@/server/modules/stats/stats.schema";
export type { ITemplateListResponse, ITemplateSummaryResponse, ITemplateDetailResponse, ITemplateVersionResponse } from "@/server/modules/agreement/agreement.schema";
export type { INotificationResponse, INotificationListResponse, NotificationKind } from "@/server/modules/notification/notification.schema";
export type { IMyBillingResponse, IMonthBreakdown, ICloseMyPeriodResponse } from "@/server/modules/lease/lease.schema";

export type { IInvoicePreview } from "@/server/modules/lifecycle/lifecycle.schema";
