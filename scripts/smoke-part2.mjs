// Continues smoke.mjs (money, requests, plans). Run:  PART2=./smoke-part2.mjs node scripts/smoke.mjs
export default async function part2({ owner, tenant, tech, lease, unit, P }, { api, check, expect, user, register }) {
  console.log("• invoices / payments");
  expect("invoice for unknown lease", await api("POST", `${P}/invoices`, { token: owner.token, body: { leaseId: "00000000-0000-4000-8000-000000000000", title: "x", dueDate: "2026-09-01", items: [{ title: "a", amount: 1 }] } }), 404);
  expect("negative non-credit line", await api("POST", `${P}/invoices`, { token: owner.token, body: { leaseId: lease.id, title: "x", dueDate: "2026-09-01", items: [{ title: "a", amount: -5 }] } }), 422);
  const inv = expect("create invoice", await api("POST", `${P}/invoices`, { token: owner.token, body: { leaseId: lease.id, title: "Repair", dueDate: "2026-09-10", items: [{ title: "Door", amount: 600000 }, { title: "Lock", amount: 400000 }, { title: "Discount", kind: "credit", amount: -100000 }] } }), 201);
  check("invoice total 900000 pending", inv?.amount === 900000 && inv.status === "pending" && inv.items.length === 3, inv);
  const I = `${P}/invoices/${inv.id}`;
  expect("zero payment", await api("POST", `${I}/payments`, { token: owner.token, body: { amount: 0, method: "cash", paidOn: "2026-09-01" } }), 422);
  const p1 = expect("partial payment", await api("POST", `${I}/payments`, { token: owner.token, body: { amount: 400000, method: "bank_transfer", paidOn: "2026-09-01", reference: "FT123", evidence: ["proof/1.jpg"] } }), 201);
  check("status partial", (await api("GET", I, { token: owner.token })).body.data.status === "partial");
  expect("overpayment", await api("POST", `${I}/payments`, { token: owner.token, body: { amount: 600000, method: "cash", paidOn: "2026-09-02" } }), 409);
  expect("cancel with payments", await api("POST", `${I}/cancel`, { token: owner.token }), 409);
  expect("pay the rest", await api("POST", `${I}/payments`, { token: owner.token, body: { amount: 500000, method: "cash", paidOn: "2026-09-02" } }), 201);
  check("status paid", (await api("GET", I, { token: owner.token })).body.data.status === "paid");
  expect("technician cannot pay", await api("POST", `${I}/payments`, { token: tech.token, body: { amount: 1, method: "cash", paidOn: "2026-09-02" } }), 403);
  expect("remove payment", await api("DELETE", `${I}/payments/${p1.id}`, { token: owner.token }), 204);
  const afterDel = (await api("GET", I, { token: owner.token })).body.data;
  check("status back to partial", afterDel.status === "partial" && afterDel.paidAmount === 500000, afterDel);
  const tenantInv = expect("tenant invoice detail", await api("GET", `/lease/${lease.id}/invoices/${inv.id}`, { token: tenant.token }), 200);
  check("tenant sees items + payments", tenantInv?.items.length === 3 && tenantInv.payments.length === 1, tenantInv);

  const inv2 = expect("second invoice", await api("POST", `${P}/invoices`, { token: owner.token, body: { leaseId: lease.id, title: "Cancel me", dueDate: "2026-09-10", items: [{ title: "x", amount: 100 }] } }), 201);
  check("cancel", (expect("cancel invoice", await api("POST", `${P}/invoices/${inv2.id}/cancel`, { token: owner.token }), 200))?.status === "cancelled");
  expect("pay cancelled", await api("POST", `${P}/invoices/${inv2.id}/payments`, { token: owner.token, body: { amount: 1, method: "cash", paidOn: "2026-09-02" } }), 409);
  expect("cancel twice", await api("POST", `${P}/invoices/${inv2.id}/cancel`, { token: owner.token }), 409);
  check("list by status", (expect("list invoices", await api("GET", `${P}/invoices?leaseId=${lease.id}&status=partial`, { token: owner.token }), 200))?.total === 1);

  console.log("• refunds");
  const line = inv.items[0]; // 600000 door
  expect("refund exceeds charge", await api("POST", `${P}/refunds`, { token: owner.token, body: { leaseId: lease.id, items: [{ invoiceId: inv.id, kind: "other", invoiceItemId: line.id, title: "Door", chargedAmount: 600000, amount: 600000 }] } }), 409);
  expect("charged mismatch", await api("POST", `${P}/refunds`, { token: owner.token, body: { leaseId: lease.id, items: [{ invoiceId: inv.id, kind: "other", invoiceItemId: line.id, title: "Door", chargedAmount: 1, amount: 1 }] } }), 422);
  expect("amount > charged", await api("POST", `${P}/refunds`, { token: owner.token, body: { leaseId: lease.id, items: [{ invoiceId: inv.id, kind: "other", title: "x", chargedAmount: 10, amount: 11 }] } }), 422);
  expect("refund cancelled invoice", await api("POST", `${P}/refunds`, { token: owner.token, body: { leaseId: lease.id, items: [{ invoiceId: inv2.id, kind: "other", title: "x", chargedAmount: 100, amount: 100 }] } }), 409);
  const ref = expect("refund 300000 of 500000 paid", await api("POST", `${P}/refunds`, { token: owner.token, body: { leaseId: lease.id, note: "goodwill", items: [{ invoiceId: inv.id, kind: "other", invoiceItemId: line.id, title: "Door", chargedAmount: 600000, amount: 300000 }] } }), 201);
  check("refund pending 300000", ref?.status === "pending" && ref.amount === 300000, ref);
  expect("second refund over paid", await api("POST", `${P}/refunds`, { token: owner.token, body: { leaseId: lease.id, items: [{ invoiceId: inv.id, kind: "other", title: "more", chargedAmount: 500000, amount: 300000 }] } }), 409);
  expect("pay refund w/o method", await api("POST", `${P}/refunds/${ref.id}/pay`, { token: owner.token, body: {} }), 422);
  check("pay refund", (expect("pay refund", await api("POST", `${P}/refunds/${ref.id}/pay`, { token: owner.token, body: { method: "cash", paidOn: "2026-09-05" } }), 200))?.status === "paid");
  expect("pay refund twice", await api("POST", `${P}/refunds/${ref.id}/pay`, { token: owner.token, body: { method: "cash" } }), 409);
  expect("cancel paid refund", await api("POST", `${P}/refunds/${ref.id}/cancel`, { token: owner.token }), 409);

  console.log("• requests");
  const stranger = user("s");
  await register(stranger, "Stranger");
  const RQ = `/lease/${lease.id}/requests`;
  expect("close_lease without date", await api("POST", RQ, { token: tenant.token, body: { type: "close_lease", title: "bye" } }), 422);
  expect("stranger cannot file", await api("POST", RQ, { token: stranger.token, body: { type: "maintenance", title: "x" } }), 404);
  const rq = expect("tenant files request", await api("POST", RQ, { token: tenant.token, body: { type: "maintenance", title: "Leaking tap", description: "kitchen", priority: "high" } }), 201);
  check("request open with unit", rq?.status === "open" && rq.unitId === unit.id, rq);
  expect("tenant comments", await api("POST", `${RQ}/${rq.id}/comments`, { token: tenant.token, body: { body: "please hurry" } }), 201);
  const Q = `${P}/requests/${rq.id}`;
  expect("staff sees it", await api("GET", Q, { token: owner.token }), 200);
  expect("technician cannot re-prioritise", await api("PATCH", Q, { token: tech.token, body: { priority: "low" } }), 422);
  const me = (await api("GET", "/me", { token: tech.token })).body.data;
  expect("assign to technician", await api("PATCH", Q, { token: owner.token, body: { assignedTo: me.id, status: "in_progress" } }), 200);
  expect("assign to a stranger", await api("PATCH", Q, { token: owner.token, body: { assignedTo: tenant.id ?? (await api("GET", "/me", { token: tenant.token })).body.data.id } }), 422);
  expect("staff comments", await api("POST", `${Q}/comments`, { token: tech.token, body: { body: "on my way" } }), 201);
  const done = expect("technician resolves", await api("PATCH", Q, { token: tech.token, body: { status: "resolved" } }), 200);
  check("resolved has closedAt + 2 comments", done?.closedAt && done.comments.length === 2, done);
  expect("reopen resolved", await api("PATCH", Q, { token: owner.token, body: { status: "open" } }), 409);
  expect("comment on closed", await api("POST", `${RQ}/${rq.id}/comments`, { token: tenant.token, body: { body: "thanks" } }), 409);
  const rq2 = expect("second request", await api("POST", RQ, { token: tenant.token, body: { type: "enquiry", title: "Parking?" } }), 201);
  check("tenant cancels", (expect("cancel request", await api("POST", `${RQ}/${rq2.id}/cancel`, { token: tenant.token }), 200))?.status === "cancelled");
  check("staff list filtered", (expect("list requests", await api("GET", `${P}/requests?status=resolved&type=maintenance`, { token: owner.token }), 200))?.total === 1);
  check("tenant list", (expect("tenant requests", await api("GET", RQ, { token: tenant.token }), 200))?.total === 2);

  console.log("• periods / plans");
  expect("billing periods", await api("GET", `${P}/billing-periods?leaseId=${lease.id}`, { token: owner.token }), 200);
  const plans = expect("public plans", await api("GET", "/public/plans"), 200);
  check("plans is an array", Array.isArray(plans));
  check("no subscription yet", (await api("GET", "/me/subscription", { token: owner.token })).body.data === null);
  expect("viewer-less stranger on admin", await api("GET", `${P}/invoices`, { token: stranger.token }), 404);
}
