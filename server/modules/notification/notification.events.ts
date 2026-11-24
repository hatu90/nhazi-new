import type { ITargetContext } from "./notification.repository";
import type { INotificationMetadata, NotificationArea, NotificationEvent, NotificationSeverity } from "./notification.schema";

/** Extra facts an event carries beyond what the target itself says. */
export interface IEventExtra {
  /** request.status_changed: the new status. */
  status?: string;
  /** request.assigned: who got it. */
  assigneeId?: string | null;
  /** payment.recorded / confirmed / rejected: the account whose payment it is. */
  payerId?: string | null;
  /** invitation.accepted / declined: who answered. */
  actorName?: string;
  /** Days past the due / end date (overdue events). */
  daysLate?: number;
}

/** One message for a group of receivers (staff and tenants read different apps, so they get different groups). */
export interface IPlanGroup {
  ids: string[];
  area: NotificationArea;
  title: string;
  body: string;
  severity: NotificationSeverity;
}
export interface IPlan {
  groups: IPlanGroup[];
  metadata: INotificationMetadata;
}

const money = (n: number | null) => `${new Intl.NumberFormat("vi-VN").format(n ?? 0)} ₫`;
/** yyyy-mm-dd -> dd/mm/yyyy */
const dmy = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");
const where = (c: ITargetContext) => [c.propertyName, c.unitName].filter(Boolean).join(" · ");
const excerpt = (s: string, n = 140) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
const uniq = (ids: (string | null | undefined)[]) => [...new Set(ids.filter((x): x is string => !!x))];
const ROLE: Record<string, string> = { owner: "chủ nhà", admin: "quản trị viên", technician: "kỹ thuật viên", viewer: "người xem" };
const STATUS: Record<string, string> = { open: "đang mở", in_progress: "đang xử lý", resolved: "đã giải quyết", rejected: "bị từ chối", cancelled: "đã hủy" };

/** Where `path` leads, for the receiver's app. */
export function pathFor(c: ITargetContext, area: NotificationArea): string {
  if (area === "admin") {
    const base = `/properties/${c.propertyId}`;
    switch (c.targetType) {
      case "request": return `${base}/requests/${c.targetId}`;
      case "request_comment": return `${base}/requests/${c.parentId}`;
      case "invoice": return `${base}/invoices/${c.targetId}`;
      case "payment": return `${base}/invoices/${c.parentId}`;
      case "invitation": return c.leaseId ? `${base}/leases/${c.leaseId}` : `${base}/team`;
      default: return c.leaseId ? `${base}/leases/${c.leaseId}` : base;
    }
  }
  if (c.targetType === "invitation") return "/";
  if (!c.leaseId) return "/";
  const lease = `/leases/${c.leaseId}`;
  switch (c.targetType) {
    case "request": return `${lease}/requests/${c.targetId}`;
    case "request_comment": return `${lease}/requests/${c.parentId}`;
    case "invoice": return `${lease}/invoices/${c.targetId}`;
    case "payment": return `${lease}/invoices/${c.parentId}`;
    case "agreement": return `${lease}/agreement`;
    default: return lease;
  }
}

export function metadataOf(c: ITargetContext): INotificationMetadata {
  return {
    propertyId: c.propertyId,
    propertyName: c.propertyName,
    leaseId: c.leaseId ?? undefined,
    unitName: c.unitName ?? undefined,
    ...(c.targetType === "request" && { requestId: c.targetId }),
    ...(c.targetType === "request_comment" && c.parentId && { requestId: c.parentId }),
    ...(c.targetType === "invoice" && { invoiceId: c.targetId }),
    ...(c.targetType === "payment" && c.parentId && { invoiceId: c.parentId }),
    ...(c.targetType === "billing_period" && { billingPeriodId: c.targetId }),
  };
}

/**
 * Who hears about `event` and what it says. Pure: the publisher drops the actor from every group and empty groups afterwards.
 * Tenants only hear about a lease once it has started (a draft is invisible to them).
 */
export function plan(event: NotificationEvent, c: ITargetContext, x: IEventExtra = {}): IPlan {
  const tenants = c.leaseStarted ? c.tenantIds : [];
  const staff = (title: string, body: string, ids: string[], severity: NotificationSeverity = "info"): IPlanGroup => ({ ids, area: "admin", title, body, severity });
  const tenant = (title: string, body: string, ids: string[] = tenants, severity: NotificationSeverity = "info"): IPlanGroup => ({ ids, area: "dashboard", title, body, severity });
  const who = c.creatorName ?? "Ai đó";
  // The sender travels in metadata (not the body) so the UI can show it on its own line.
  const metadata = { ...metadataOf(c), ...(c.creatorName && (event === "request.created" || event === "request.status_changed" || event === "request_comment.created") && { senderName: c.creatorName }) };
  const out = (...groups: IPlanGroup[]): IPlan => ({ groups, metadata });

  switch (event) {
    // ── invitations ──
    case "invitation.received":
      return out(tenant(
        "Bạn có lời mời mới",
        c.role ? `${who} mời bạn tham gia nhóm quản lý ${c.propertyName} với vai trò ${ROLE[c.role] ?? c.role}.` : `${who} mời bạn làm người thuê ${where(c)}.`,
        uniq([c.inviteeId]),
        "warning",
      ));
    case "invitation.accepted":
    case "invitation.declined": {
      const answered = event === "invitation.accepted" ? "đã chấp nhận" : "đã từ chối";
      return out(staff(
        event === "invitation.accepted" ? "Lời mời được chấp nhận" : "Lời mời bị từ chối",
        `${x.actorName ?? "Người được mời"} ${answered} lời mời ${c.role ? `tham gia ${c.propertyName}` : `thuê ${where(c)}`}.`,
        uniq([c.creatorId]),
      ));
    }

    // ── lease / agreement ──
    case "lease.started":
      return out(tenant("Hợp đồng thuê đã bắt đầu", `${where(c)} · từ ngày ${dmy(c.date)}`));
    case "lease.ended":
      return out(tenant("Hợp đồng thuê đã kết thúc", `${where(c)}${c.date ? ` · kết thúc ngày ${dmy(c.date)}` : ""}`));
    case "agreement.updated":
      return out(tenant("Thỏa thuận thuê đã được cập nhật", `Thỏa thuận của ${where(c)} vừa được cập nhật. Vui lòng xem lại.`, tenants, "warning"));

    // ── billing periods ──
    case "billing_period.closed": {
      const body = `${where(c)} · ${dmy(c.startDate)} → ${dmy(c.date)}`;
      return out(tenant("Kỳ thanh toán đã chốt", body), staff("Kỳ thanh toán đã chốt", body, c.managerIds));
    }
    case "billing_period.closing_soon": {
      const body = `${where(c)} · kết thúc ngày ${dmy(c.date)}`;
      return out(staff("Kỳ thanh toán sắp kết thúc", `${body}. Hãy ghi chỉ số cuối kỳ và chốt kỳ.`, c.managerIds, "warning"), tenant("Kỳ thanh toán sắp kết thúc", body, tenants, "warning"));
    }
    case "billing_period.overdue": {
      const body = `${where(c)} · đã kết thúc ngày ${dmy(c.date)} (${x.daysLate ?? 0} ngày trước)`;
      return out(staff("Kỳ thanh toán quá hạn chốt", body, c.managerIds, "urgent"), tenant("Kỳ thanh toán quá hạn chốt", body, tenants, "urgent"));
    }

    // ── requests ──
    case "request.created":
      return out(staff(c.label, [where(c), c.detail && excerpt(c.detail)].filter(Boolean).join(" · "), c.fieldIds, "warning"));
    case "request.status_changed":
      // the requester hears every change; staff only hear that the requester withdrew it
      return out(
        requesterGroup(c, `Yêu cầu ${STATUS[x.status ?? ""] ?? "được cập nhật"}`, c.label),
        ...(x.status === "cancelled" ? [staff(`Yêu cầu đã hủy: ${c.label}`, where(c), uniq([c.assigneeId]).length ? uniq([c.assigneeId]) : c.fieldIds)] : []),
      );
    case "request.assigned":
      return out(staff(`Bạn được giao yêu cầu: ${c.label}`, where(c), uniq([x.assigneeId ?? c.assigneeId])));
    case "request_comment.created": {
      // a tenant-side author talks to the staff, a staff author talks to the requester
      const fromTenant = !!c.creatorId && (c.tenantIds.includes(c.creatorId) || c.creatorId === c.requesterId);
      return out(fromTenant
        ? staff(`Bình luận mới: ${c.label}`, where(c), uniq([c.assigneeId]).length ? uniq([c.assigneeId]) : c.fieldIds)
        : requesterGroup(c, `Phản hồi mới: ${c.label}`, `${who} đã phản hồi`));
    }

    // ── invoices / payments ──
    case "invoice.created":
      return out(tenant(`Hóa đơn mới: ${c.label}`, `${money(c.amount)} · hạn ${dmy(c.date)} · ${where(c)}`));
    case "invoice.cancelled":
      return out(tenant(`Hóa đơn đã hủy: ${c.label}`, where(c)));
    case "invoice.overdue": {
      const body = `${money(c.amount)} quá hạn từ ${dmy(c.date)} · ${where(c)}`;
      return out(tenant(`Hóa đơn quá hạn: ${c.label}`, body, tenants, "urgent"), staff(`Hóa đơn quá hạn: ${c.label}`, body, c.managerIds, "urgent"));
    }
    case "payment.recorded":
      return out(tenant(`Đã nhận thanh toán ${money(c.amount)}`, `${c.label} · ${where(c)}`));
    case "payment.reported":
      return out(staff(`Xác nhận thanh toán ${money(c.amount)}`, `${who} đã thanh toán “${c.label}” · ${where(c)}`, c.managerIds, "warning"));
    case "payment.confirmed":
      return out(tenant(`Thanh toán đã được xác nhận: ${money(c.amount)}`, `${c.label} · ${where(c)}`, uniq([x.payerId ?? c.creatorId])));
    case "payment.rejected":
      return out(tenant(`Thanh toán bị từ chối: ${money(c.amount)}`, `${c.label} · ${where(c)}. Vui lòng liên hệ chủ nhà.`, uniq([x.payerId ?? c.creatorId]), "warning"));
  }
}

/** The requester reads it in the tenant app (a tenant, or an enquirer who has no lease: their path is the home page), a staff member who filed it in the admin one. */
function requesterGroup(c: ITargetContext, title: string, body: string): IPlanGroup {
  const id = c.requesterId;
  const isStaff = !!id && c.fieldIds.includes(id) && !c.tenantIds.includes(id);
  return { ids: uniq([id]), area: isStaff ? "admin" : "dashboard", title, body: `${body} · ${where(c)}`, severity: "info" };
}
