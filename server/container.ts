import { AccessPolicy } from "./modules/access/access.policy";
import {
  AuthenticateUseCase,
  GetMeUseCase,
  RegisterUseCase,
  UpdateMeUseCase,
  VerifyTokenUseCase,
} from "./modules/identity/identity.usecases";
import { GetMyInvoiceUseCase, GetMyLeaseUseCase, ListMyLeaseInvoicesUseCase, ListMyLeasesUseCase } from "./modules/lease/lease.usecases";
import {
  CreatePropertyUseCase,
  GetManagedPropertyUseCase,
  GetPublicPropertyUseCase,
  ListManagedPropertiesUseCase,
  SearchPropertiesUseCase,
} from "./modules/property/property.usecases";
import { CreateUnitUseCase, DeleteUnitUseCase, GetUnitUseCase, ListUnitsUseCase, UpdateUnitUseCase } from "./modules/unit/unit.usecases";
import { AddServicePriceUseCase, CreateServiceUseCase, DeleteServiceUseCase, GetServiceUseCase, ListServicesUseCase, UpdateServiceUseCase } from "./modules/service/service.usecases";
import { CreateMeterUseCase, DeleteMeterUseCase, GetMeterUseCase, ListMetersUseCase, UpdateMeterUseCase } from "./modules/meter/meter.usecases";
import { CreateReadingUseCase, DeleteReadingUseCase, ListReadingsUseCase } from "./modules/reading/reading.usecases";
import { CreateHandoverUseCase, CreateItemUseCase, DeleteHandoverUseCase, DeleteItemUseCase, ListHandoversUseCase, ListItemsUseCase, UpdateHandoverUseCase, UpdateItemUseCase } from "./modules/inventory/inventory.usecases";
import { AddTemplateVersionUseCase, CreateTemplateUseCase, DeleteTemplateUseCase, GetTemplateUseCase, GetTemplateVersionUseCase, ListTemplatesUseCase, UpdateTemplateUseCase } from "./modules/agreement/agreement.usecases";
import { AddMemberUseCase, ChangeMemberRoleUseCase, ListMembersUseCase, RemoveMemberUseCase } from "./modules/member/member.usecases";
import { InvitePropertyUseCase, InviteTenantUseCase, ListInvitationsUseCase, ListMyInvitationsUseCase, RespondInvitationUseCase, RevokeInvitationUseCase } from "./modules/invitation/invitation.usecases";
import { PrismaInvitationRepository } from "./infrastructure/prisma/repositories/invitation.repository";
import { PrismaUnitRepository } from "./infrastructure/prisma/repositories/unit.repository";
import { PrismaServiceRepository } from "./infrastructure/prisma/repositories/service.repository";
import { PrismaMeterRepository } from "./infrastructure/prisma/repositories/meter.repository";
import { PrismaReadingRepository } from "./infrastructure/prisma/repositories/reading.repository";
import { PrismaInventoryRepository } from "./infrastructure/prisma/repositories/inventory.repository";
import { PrismaAgreementRepository } from "./infrastructure/prisma/repositories/agreement.repository";
import { PrismaMemberRepository } from "./infrastructure/prisma/repositories/member.repository";
import { AddLeaseMemberUseCase, AddRentVersionUseCase, AddTenantUseCase, CreateSubscriptionUseCase, CreateTenancyUseCase, DeleteSubscriptionUseCase, GetTenancyUseCase, ListTenanciesUseCase, RemoveTenantUseCase, TerminateTenancyUseCase, UpdateLeaseHandoverUseCase, UpdateLeaseMemberUseCase, UpdateSubscriptionUseCase, UpdateTenancyUseCase } from "./modules/tenancy/tenancy.usecases";
import { PrismaTenancyRepository } from "./infrastructure/prisma/repositories/tenancy.repository";
import { CancelInvoiceUseCase, CreateInvoiceUseCase, DeletePaymentUseCase, GetInvoiceUseCase, ListInvoicesUseCase, RecordPaymentUseCase } from "./modules/invoice/invoice.usecases";
import { CancelRefundUseCase, CreateRefundUseCase, GetRefundUseCase, ListRefundsUseCase, PayRefundUseCase } from "./modules/refund/refund.usecases";
import { AddMyCommentUseCase, AddStaffCommentUseCase, CancelMyRequestUseCase, CreateMyRequestUseCase, GetMyRequestUseCase, GetRequestUseCase, ListMyRequestsUseCase, ListRequestsUseCase, UpdateRequestUseCase } from "./modules/request/request.usecases";
import { GetMySubscriptionUseCase, ListPlansUseCase } from "./modules/plan/plan.usecases";
import { CloseBillingPeriodUseCase, GetBillingPeriodUseCase, ListBillingPeriodsUseCase, OpenBillingPeriodUseCase, UpdateUsageUseCase } from "./modules/billing/billing.usecases";
import { PrismaInvoiceRepository } from "./infrastructure/prisma/repositories/invoice.repository";
import { PrismaRefundRepository } from "./infrastructure/prisma/repositories/refund.repository";
import { PrismaRequestRepository } from "./infrastructure/prisma/repositories/request.repository";
import { PrismaPlanRepository } from "./infrastructure/prisma/repositories/plan.repository";
import { PrismaBillingRepository } from "./infrastructure/prisma/repositories/billing.repository";
import { DevAwareTokenVerifier, FirebaseTokenVerifier } from "./infrastructure/firebase/token-verifier";
import { getPrisma } from "./infrastructure/prisma/client";
import { PrismaAccessRepository } from "./infrastructure/prisma/repositories/access.repository";
import { PrismaAccountRepository } from "./infrastructure/prisma/repositories/account.repository";
import { PrismaLeaseRepository } from "./infrastructure/prisma/repositories/lease.repository";
import { PrismaPropertyRepository } from "./infrastructure/prisma/repositories/property.repository";

/**
 * Composition root: the ONLY place that knows both usecases and infrastructure.
 * Swap an implementation here (e.g. another database) without touching routes or usecases.
 */
function build() {
  const db = getPrisma();
  const verifier = new DevAwareTokenVerifier(new FirebaseTokenVerifier());

  const accounts = new PrismaAccountRepository(db);
  const properties = new PrismaPropertyRepository(db);
  const leases = new PrismaLeaseRepository(db);
  
  const units = new PrismaUnitRepository(db);
  const services = new PrismaServiceRepository(db);
  const meters = new PrismaMeterRepository(db);
  const readings = new PrismaReadingRepository(db);
  const inventory = new PrismaInventoryRepository(db);
  const agreements = new PrismaAgreementRepository(db);
  const members = new PrismaMemberRepository(db);
  const invitations = new PrismaInvitationRepository(db);
  const tenancies = new PrismaTenancyRepository(db);
  const invoices = new PrismaInvoiceRepository(db);
  const refunds = new PrismaRefundRepository(db);
  const requests = new PrismaRequestRepository(db);
  const plans = new PrismaPlanRepository(db);
  const billing = new PrismaBillingRepository(db);
  const access = new PrismaAccessRepository(db);
  const policy = new AccessPolicy(access);

  return {
    // identity
    verifyToken: new VerifyTokenUseCase(verifier),
    authenticate: new AuthenticateUseCase(verifier, accounts),
    register: new RegisterUseCase(accounts),
    getMe: new GetMeUseCase(accounts),
    updateMe: new UpdateMeUseCase(accounts),
    // property: public
    searchProperties: new SearchPropertiesUseCase(properties),
    getPublicProperty: new GetPublicPropertyUseCase(properties),
    // property: admin
    listManagedProperties: new ListManagedPropertiesUseCase(properties),
    getManagedProperty: new GetManagedPropertyUseCase(properties, policy),
    createProperty: new CreatePropertyUseCase(properties),
    // units
    listUnits: new ListUnitsUseCase(units, policy),
    getUnit: new GetUnitUseCase(units, policy),
    createUnit: new CreateUnitUseCase(units, policy),
    updateUnit: new UpdateUnitUseCase(units, policy),
    deleteUnit: new DeleteUnitUseCase(units, policy),
    // services
    listServices: new ListServicesUseCase(services, policy),
    getService: new GetServiceUseCase(services, policy),
    createService: new CreateServiceUseCase(services, policy),
    updateService: new UpdateServiceUseCase(services, policy),
    addServicePrice: new AddServicePriceUseCase(services, policy),
    deleteService: new DeleteServiceUseCase(services, policy),
    // meters + readings
    listMeters: new ListMetersUseCase(meters, policy),
    getMeter: new GetMeterUseCase(meters, policy),
    createMeter: new CreateMeterUseCase(meters, policy),
    updateMeter: new UpdateMeterUseCase(meters, policy),
    deleteMeter: new DeleteMeterUseCase(meters, policy),
    listReadings: new ListReadingsUseCase(readings, policy),
    createReading: new CreateReadingUseCase(readings, policy),
    deleteReading: new DeleteReadingUseCase(readings, policy),
    // inventory + handovers
    listItems: new ListItemsUseCase(inventory, policy),
    createItem: new CreateItemUseCase(inventory, policy),
    updateItem: new UpdateItemUseCase(inventory, policy),
    deleteItem: new DeleteItemUseCase(inventory, policy),
    listHandovers: new ListHandoversUseCase(inventory, policy),
    createHandover: new CreateHandoverUseCase(inventory, policy),
    updateHandover: new UpdateHandoverUseCase(inventory, policy),
    deleteHandover: new DeleteHandoverUseCase(inventory, policy),
    // agreement templates
    listTemplates: new ListTemplatesUseCase(agreements, policy),
    getTemplate: new GetTemplateUseCase(agreements, policy),
    getTemplateVersion: new GetTemplateVersionUseCase(agreements, policy),
    createTemplate: new CreateTemplateUseCase(agreements, policy),
    updateTemplate: new UpdateTemplateUseCase(agreements, policy),
    addTemplateVersion: new AddTemplateVersionUseCase(agreements, policy),
    deleteTemplate: new DeleteTemplateUseCase(agreements, policy),
    // leases (admin side)
    listTenancies: new ListTenanciesUseCase(tenancies, policy),
    getTenancy: new GetTenancyUseCase(tenancies, policy),
    createTenancy: new CreateTenancyUseCase(tenancies, policy),
    updateTenancy: new UpdateTenancyUseCase(tenancies, policy),
    terminateTenancy: new TerminateTenancyUseCase(tenancies, policy),
    addRentVersion: new AddRentVersionUseCase(tenancies, policy),
    addTenant: new AddTenantUseCase(tenancies, policy),
    removeTenant: new RemoveTenantUseCase(tenancies, policy),
    addLeaseMember: new AddLeaseMemberUseCase(tenancies, policy),
    updateLeaseMember: new UpdateLeaseMemberUseCase(tenancies, policy),
    createSubscription: new CreateSubscriptionUseCase(tenancies, policy),
    updateSubscription: new UpdateSubscriptionUseCase(tenancies, policy),
    deleteSubscription: new DeleteSubscriptionUseCase(tenancies, policy),
    updateLeaseHandover: new UpdateLeaseHandoverUseCase(tenancies, policy),
    // billing (read) + invoices + payments + refunds
    listBillingPeriods: new ListBillingPeriodsUseCase(billing, policy),
    getBillingPeriod: new GetBillingPeriodUseCase(billing, policy),
    openBillingPeriod: new OpenBillingPeriodUseCase(billing, policy),
    closeBillingPeriod: new CloseBillingPeriodUseCase(billing, policy),
    updateUsage: new UpdateUsageUseCase(billing, policy),
    listInvoices: new ListInvoicesUseCase(invoices, policy),
    getInvoice: new GetInvoiceUseCase(invoices, policy),
    createInvoice: new CreateInvoiceUseCase(invoices, policy),
    cancelInvoice: new CancelInvoiceUseCase(invoices, policy),
    recordPayment: new RecordPaymentUseCase(invoices, policy),
    deletePayment: new DeletePaymentUseCase(invoices, policy),
    listRefunds: new ListRefundsUseCase(refunds, policy),
    getRefund: new GetRefundUseCase(refunds, policy),
    createRefund: new CreateRefundUseCase(refunds, policy),
    payRefund: new PayRefundUseCase(refunds, policy),
    cancelRefund: new CancelRefundUseCase(refunds, policy),
    // requests: staff + tenant
    listRequests: new ListRequestsUseCase(requests, policy),
    getRequest: new GetRequestUseCase(requests, policy),
    updateRequest: new UpdateRequestUseCase(requests, policy, access),
    addStaffComment: new AddStaffCommentUseCase(requests, policy),
    listMyRequests: new ListMyRequestsUseCase(requests),
    getMyRequest: new GetMyRequestUseCase(requests),
    createMyRequest: new CreateMyRequestUseCase(requests),
    cancelMyRequest: new CancelMyRequestUseCase(requests),
    addMyComment: new AddMyCommentUseCase(requests),
    // SaaS plans
    listPlans: new ListPlansUseCase(plans),
    getMySubscription: new GetMySubscriptionUseCase(plans),
    // team
    listMembers: new ListMembersUseCase(members, policy),
    addMember: new AddMemberUseCase(members, policy),
    changeMemberRole: new ChangeMemberRoleUseCase(members, policy),
    removeMember: new RemoveMemberUseCase(members, policy),
    // invitations
    invitePropertyMember: new InvitePropertyUseCase(invitations, policy),
    inviteTenant: new InviteTenantUseCase(invitations, policy),
    listInvitations: new ListInvitationsUseCase(invitations, policy),
    revokeInvitation: new RevokeInvitationUseCase(invitations, policy),
    listMyInvitations: new ListMyInvitationsUseCase(invitations),
    respondInvitation: new RespondInvitationUseCase(invitations),
    // lease: tenant
    listMyLeases: new ListMyLeasesUseCase(leases),
    getMyLease: new GetMyLeaseUseCase(leases),
    listMyLeaseInvoices: new ListMyLeaseInvoicesUseCase(leases),
    getMyInvoice: new GetMyInvoiceUseCase(leases),
  };
}

export type IContainer = ReturnType<typeof build>;

let instance: IContainer | undefined;
/** Lazy: nothing connects to the database or Firebase at import/build time. */
export const getContainer = (): IContainer => (instance ??= build());
