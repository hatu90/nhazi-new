// Continues smoke.mjs (invitations). Run:  PART2=./smoke-part2.mjs,./smoke-part3.mjs node scripts/smoke.mjs
export default async function part3({ owner, tenant, lease: endedLease, P }, { api, check, expect, user, register }) {
  console.log("• invitations: property team");
  const admin = user("a"), late = user("l"), stranger = user("s");
  await register(admin, "Admin");
  await register(stranger, "Stranger");

  const inv = expect("invite admin", await api("POST", `${P}/invitations`, { token: owner.token, body: { phoneNumber: admin.local, role: "admin" } }), 201);
  check("pending, role admin, normalised phone", inv?.status === "pending" && inv.role === "admin" && inv.phoneNumber === admin.phone && inv.kind === "property" && inv.lease === null, inv);
  expect("invite twice", await api("POST", `${P}/invitations`, { token: owner.token, body: { phoneNumber: admin.phone, role: "viewer" } }), 409);
  expect("invite an existing member", await api("POST", `${P}/invitations`, { token: owner.token, body: { phoneNumber: owner.phone, role: "viewer" } }), 409);
  expect("bad phone", await api("POST", `${P}/invitations`, { token: owner.token, body: { phoneNumber: "abc", role: "viewer" } }), 422);
  expect("stranger cannot invite", await api("POST", `${P}/invitations`, { token: stranger.token, body: { phoneNumber: late.phone, role: "viewer" } }), 404);

  expect("wrong phone cannot see it", await api("POST", `/me/invitations/${inv.id}/accept`, { token: stranger.token }), 404);
  check("stranger's inbox is empty", (await api("GET", "/me/invitations", { token: stranger.token })).body.data.total === 0);
  const inbox = expect("my invitations", await api("GET", "/me/invitations", { token: admin.token }), 200);
  check("inbox has it, with the property name", inbox?.total === 1 && inbox.items[0].id === inv.id && inbox.items[0].property.id !== undefined, inbox);
  expect("not a member yet", await api("GET", `${P}/units`, { token: admin.token }), 404);

  const acc = expect("accept", await api("POST", `/me/invitations/${inv.id}/accept`, { token: admin.token }), 200);
  check("accepted", acc?.status === "accepted" && acc.respondedAt, acc);
  expect("accept again", await api("POST", `/me/invitations/${inv.id}/accept`, { token: admin.token }), 409);
  expect("decline after accept", await api("POST", `/me/invitations/${inv.id}/decline`, { token: admin.token }), 409);
  expect("now a member", await api("GET", `${P}/units`, { token: admin.token }), 200);
  expect("admin cannot invite (owner only)", await api("POST", `${P}/invitations`, { token: admin.token, body: { phoneNumber: late.phone, role: "viewer" } }), 403);
  check("admin sees invitation log", (await api("GET", `${P}/invitations?kind=property&status=accepted`, { token: admin.token })).body.data.total === 1);
  check("inbox has no pending left", (await api("GET", "/me/invitations", { token: admin.token })).body.data.total === 0);

  console.log("• invitations: unregistered phone, revoke, decline");
  const v = expect("invite not-yet-registered phone", await api("POST", `${P}/invitations`, { token: owner.token, body: { phoneNumber: late.phone, role: "viewer" } }), 201);
  await register(late, "Late");
  check("shows up after sign-up", (await api("GET", "/me/invitations", { token: late.token })).body.data.items[0]?.id === v.id);
  expect("admin cannot revoke property invite", await api("POST", `${P}/invitations/${v.id}/revoke`, { token: admin.token }), 403);
  const rv = expect("owner revokes", await api("POST", `${P}/invitations/${v.id}/revoke`, { token: owner.token }), 200);
  check("revoked", rv?.status === "revoked", rv);
  expect("revoke again", await api("POST", `${P}/invitations/${v.id}/revoke`, { token: owner.token }), 409);
  expect("accept revoked", await api("POST", `/me/invitations/${v.id}/accept`, { token: late.token }), 409);
  const v2 = expect("re-invite after revoke", await api("POST", `${P}/invitations`, { token: owner.token, body: { phoneNumber: late.phone, role: "technician" } }), 201);
  const dec = expect("decline", await api("POST", `/me/invitations/${v2.id}/decline`, { token: late.token }), 200);
  check("declined, still not a member", dec?.status === "declined" && (await api("GET", `${P}/units`, { token: late.token })).status === 404, dec);

  console.log("• invitations: tenant to lease");
  const guest = user("g");
  await register(guest, "Guest");
  expect("ended lease", await api("POST", `${P}/leases/${endedLease.id}/invitations`, { token: owner.token, body: { phoneNumber: guest.phone } }), 409);
  const unit2 = expect("second unit", await api("POST", `${P}/units`, { token: owner.token, body: { name: "B2", area: 30, floor: 2 } }), 201);
  const lease = expect("active lease", await api("POST", `${P}/leases`, { token: owner.token, body: { unitId: unit2.id, startDate: "2026-11-01", rent: 4000000, tenants: [{ phoneNumber: tenant.local, displayName: "T" }] } }), 201);
  const L = `${P}/leases/${lease.id}`;
  expect("existing tenant", await api("POST", `${L}/invitations`, { token: owner.token, body: { phoneNumber: tenant.phone } }), 409);
  expect("unknown lease", await api("POST", `${P}/leases/00000000-0000-4000-8000-000000000000/invitations`, { token: owner.token, body: { phoneNumber: guest.phone } }), 404);
  const ti = expect("invite tenant", await api("POST", `${L}/invitations`, { token: admin.token, body: { phoneNumber: guest.local } }), 201);
  check("lease invitation shape", ti?.kind === "lease" && ti.role === null && ti.lease?.id === lease.id && ti.lease.unitName === "B2", ti);
  expect("invite tenant twice", await api("POST", `${L}/invitations`, { token: owner.token, body: { phoneNumber: guest.phone } }), 409);
  expect("no access yet", await api("GET", `/lease/${lease.id}`, { token: guest.token }), 404);
  expect("tenant cannot accept someone else's", await api("POST", `/me/invitations/${ti.id}/accept`, { token: tenant.token }), 404);
  expect("accept", await api("POST", `/me/invitations/${ti.id}/accept`, { token: guest.token }), 200);
  expect("guest now sees the lease", await api("GET", `/lease/${lease.id}`, { token: guest.token }), 200);
  check("lease invitation list", (await api("GET", `${L}/invitations`, { token: owner.token })).body.data.total === 1);
  expect("invite a tenant who accepted", await api("POST", `${L}/invitations`, { token: owner.token, body: { phoneNumber: guest.phone } }), 409);

}
