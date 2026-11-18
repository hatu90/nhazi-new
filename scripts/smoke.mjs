// End-to-end smoke test against a running dev server:  AUTH_DEV_BYPASS=1 npm run dev  then  node scripts/smoke.mjs
const BASE = process.env.BASE ?? "http://localhost:3100/api";
let failed = 0, passed = 0;

const api = async (method, path, { token, body } = {}) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const check = (name, cond, extra) => {
  if (cond) passed++;
  else { failed++; console.log("  ✗", name, extra === undefined ? "" : JSON.stringify(extra).slice(0, 400)); }
};
const expect = (name, res, status) => { check(`${name} -> ${status}`, res.status === status, { got: res.status, body: res.body }); return res.body?.data; };

const rnd = () => String(Math.floor(10_000_000 + Math.random() * 89_999_999));
const user = (suffix) => { const phone = `+849${rnd()}`; return { token: `dev:${suffix}${rnd()}:${phone}`, phone, local: "0" + phone.slice(3) }; };
const register = async (u, name) => expect(`register ${name}`, await api("POST", "/public/register", { token: u.token, body: { displayName: name, phoneNumber: u.local } }), 201);

const owner = user("o"), tech = user("t"), tenant = user("n");
const PROV = { code: 79, name: "Thành phố Hồ Chí Minh", codename: "thanh_pho_ho_chi_minh" };
const WARD = { code: 26740, name: "Phường Bến Nghé", codename: "phuong_ben_nghe", provinceCode: 79 };

console.log("• setup");
await register(owner, "Owner");
await register(tech, "Tech");
const prop = expect("create property", await api("POST", "/admin/properties", { token: owner.token, body: { name: "Smoke " + rnd(), category: "apartment", street: "1 Test", province: PROV, ward: WARD } }), 201);
const P = `/admin/properties/${prop.id}`;

console.log("• units");
const unit = expect("create unit", await api("POST", `${P}/units`, { token: owner.token, body: { name: "A1", area: 25, floor: 1, rentPrice: 3000000 } }), 201);
expect("duplicate unit name", await api("POST", `${P}/units`, { token: owner.token, body: { name: "A1", area: 20, floor: 1 } }), 409);
expect("patch unit", await api("PATCH", `${P}/units/${unit.id}`, { token: owner.token, body: { bedrooms: 2, description: null } }), 200);
expect("patch unit empty", await api("PATCH", `${P}/units/${unit.id}`, { token: owner.token, body: {} }), 422);
check("list units", (expect("list units", await api("GET", `${P}/units?q=a1`, { token: owner.token }), 200))?.total === 1);

console.log("• services / meters / readings");
const elec = expect("create meter service", await api("POST", `${P}/services`, { token: owner.token, body: { name: "Electricity", usageBase: "meter", unitOfMeasure: "kWh", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: 50, rate: 1800 }, { upTo: null, rate: 2500 }] }] } }), 201);
const net = expect("create lease service", await api("POST", `${P}/services`, { token: owner.token, body: { name: "Internet", usageBase: "lease", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: null, rate: 100000 }] }] } }), 201);
const park = expect("create device service", await api("POST", `${P}/services`, { token: owner.token, body: { name: "Parking", usageBase: "device", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: null, rate: 80000 }] }] } }), 201);
expect("flat service with 2 tiers", await api("POST", `${P}/services`, { token: owner.token, body: { name: "Bad", usageBase: "lease", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: 5, rate: 1 }, { upTo: null, rate: 2 }] }] } }), 422);
expect("tiers not ascending", await api("POST", `${P}/services`, { token: owner.token, body: { name: "Bad2", usageBase: "meter", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: 50, rate: 1 }, { upTo: 20, rate: 2 }, { upTo: null, rate: 3 }] }] } }), 422);
expect("add price version", await api("POST", `${P}/services/${elec.id}/prices`, { token: owner.token, body: { effectiveDate: "2026-07-01", tiers: [{ upTo: null, rate: 3000 }] } }), 201);
expect("price version not later", await api("POST", `${P}/services/${elec.id}/prices`, { token: owner.token, body: { effectiveDate: "2026-03-01", tiers: [{ upTo: null, rate: 3000 }] } }), 422);
expect("meter on non-meter service", await api("POST", `${P}/meters`, { token: owner.token, body: { unitId: unit.id, serviceId: net.id, name: "x" } }), 422);
const meter = expect("create meter", await api("POST", `${P}/meters`, { token: owner.token, body: { unitId: unit.id, serviceId: elec.id, name: "E-A1", serialNumber: "SN1" } }), 201);
const R = `${P}/meters/${meter.id}/readings`;
expect("reading 100", await api("POST", R, { token: owner.token, body: { readOn: "2026-01-01", value: 100 } }), 201);
expect("reading 150", await api("POST", R, { token: owner.token, body: { readOn: "2026-02-01", value: 150 } }), 201);
expect("reading 120 between", await api("POST", R, { token: owner.token, body: { readOn: "2026-01-15", value: 120 } }), 201);
expect("reading same day", await api("POST", R, { token: owner.token, body: { readOn: "2026-01-15", value: 121 } }), 409);
expect("reading lower than prev", await api("POST", R, { token: owner.token, body: { readOn: "2026-03-01", value: 90 } }), 422);
expect("reading higher than next", await api("POST", R, { token: owner.token, body: { readOn: "2026-01-20", value: 160 } }), 422);
check("list readings", (expect("list readings", await api("GET", R, { token: owner.token }), 200))?.total === 3);

console.log("• team");
expect("add technician", await api("POST", `${P}/members`, { token: owner.token, body: { phoneNumber: tech.local, role: "technician" } }), 201);
expect("technician adds reading", await api("POST", R, { token: tech.token, body: { readOn: "2026-04-01", value: 200 } }), 201);
expect("technician cannot create unit", await api("POST", `${P}/units`, { token: tech.token, body: { name: "Z", area: 10, floor: 1 } }), 403);
expect("technician cannot manage team", await api("POST", `${P}/members`, { token: tech.token, body: { phoneNumber: owner.local, role: "viewer" } }), 403);
expect("demote last owner", await api("PATCH", `${P}/members/${(await api("GET", `${P}/members`, { token: owner.token })).body.data.find((m) => m.role === "owner").accountId}`, { token: owner.token, body: { role: "admin" } }), 409);

console.log("• inventory / templates");
const item = expect("create item", await api("POST", `${P}/inventory-items`, { token: owner.token, body: { name: "Bed" } }), 201);
expect("dup item", await api("POST", `${P}/inventory-items`, { token: owner.token, body: { name: "Bed" } }), 409);
expect("add handover", await api("POST", `${P}/units/${unit.id}/handovers`, { token: owner.token, body: { itemId: item.id, quantity: 2 } }), 201);
expect("dup handover", await api("POST", `${P}/units/${unit.id}/handovers`, { token: owner.token, body: { itemId: item.id, quantity: 1 } }), 409);
expect("delete used item", await api("DELETE", `${P}/inventory-items/${item.id}`, { token: owner.token }), 409);
const tpl = expect("create template", await api("POST", `${P}/agreement-templates`, { token: owner.token, body: { name: "Standard", isDefault: true, data: { content: [{ type: "Heading", props: { text: "v1" } }] } } }), 201);
check("template v1", tpl?.currentVersion === 1);
const tpl2 = expect("add version", await api("POST", `${P}/agreement-templates/${tpl.id}/versions`, { token: owner.token, body: { baseVersion: 1, data: { content: [{ type: "Heading", props: { text: "v2" } }] } } }), 201);
check("template v2", tpl2?.currentVersion === 2);
expect("stale version", await api("POST", `${P}/agreement-templates/${tpl.id}/versions`, { token: owner.token, body: { baseVersion: 1, data: { content: [] } } }), 409);
check("get version 1", (expect("get version 1", await api("GET", `${P}/agreement-templates/${tpl.id}/versions/1`, { token: owner.token }), 200))?.data.content[0].props.text === "v1");

console.log("• leases");
const lease = expect("create lease", await api("POST", `${P}/leases`, { token: owner.token, body: {
  unitId: unit.id, startDate: "2026-01-01", firstPeriodEnd: "2026-12-31", rent: 3000000, depositAmount: 3000000,
  tenants: [{ phoneNumber: tenant.local, displayName: "Tenant" }],
  members: [{ name: "Tenant", yearOfBirth: 1999 }],
  agreement: { templateId: tpl.id, values: { tenantName: "Tenant", signatureUrl: "sig/1.png" } },
} }), 201);
check("lease pinned template v2", lease?.agreement?.version === 2, lease?.agreement);
check("lease handover snapshot", lease?.handovers.length === 1 && lease.handovers[0].itemName === "Bed", lease?.handovers);
check("new lease is a draft", lease?.status === "draft" && lease.activatedAt === null && lease.firstPeriodEnd === "2026-12-31" && lease.currentRent === 3000000, lease);
expect("overlapping lease", await api("POST", `${P}/leases`, { token: owner.token, body: { unitId: unit.id, startDate: "2026-06-01", firstPeriodEnd: "2026-06-30", rent: 1, tenants: [{ phoneNumber: tenant.local, displayName: "T" }] } }), 409);
expect("template v3 after lease", await api("POST", `${P}/agreement-templates/${tpl.id}/versions`, { token: owner.token, body: { baseVersion: 2, data: { content: [] } } }), 201);
check("lease still on v2", (expect("get lease", await api("GET", `${P}/leases/${lease.id}`, { token: owner.token }), 200))?.agreement.version === 2);
const L = `${P}/leases/${lease.id}`;
expect("meter service without meter", await api("POST", `${L}/subscriptions`, { token: owner.token, body: { serviceId: elec.id } }), 422);
expect("meter subscription", await api("POST", `${L}/subscriptions`, { token: owner.token, body: { serviceId: elec.id, meterId: meter.id, startDate: "2026-01-01" } }), 201);
expect("overlapping subscription", await api("POST", `${L}/subscriptions`, { token: owner.token, body: { serviceId: elec.id, meterId: meter.id, startDate: "2026-02-01" } }), 409);
expect("lease service quantity 2", await api("POST", `${L}/subscriptions`, { token: owner.token, body: { serviceId: net.id, quantity: 2, startDate: "2026-01-01" } }), 422);
const sNet = expect("lease subscription", await api("POST", `${L}/subscriptions`, { token: owner.token, body: { serviceId: net.id, startDate: "2026-01-01" } }), 201);
expect("device quantity 2", await api("POST", `${L}/subscriptions`, { token: owner.token, body: { serviceId: park.id, quantity: 2, details: "59A-1, 59A-2", startDate: "2026-01-01" } }), 201);
expect("end subscription", await api("PATCH", `${L}/subscriptions/${sNet.id}`, { token: owner.token, body: { endDate: "2026-06-30" } }), 200);
expect("add rent version", await api("POST", `${L}/rent`, { token: owner.token, body: { effectiveDate: "2026-07-01", amount: 3200000 } }), 201);
expect("rent version not later", await api("POST", `${L}/rent`, { token: owner.token, body: { effectiveDate: "2026-05-01", amount: 1 } }), 422);
expect("add member", await api("POST", `${L}/members`, { token: owner.token, body: { name: "Kid", yearOfBirth: 2015, joinedAt: "2026-03-01" } }), 201);
expect("cannot close a draft", await api("POST", `${L}/close`, { token: owner.token, body: { terminatedAt: "2026-02-01" } }), 409);
expect("update handover", await api("PATCH", `${L}/handovers/${lease.handovers[0].id}`, { token: owner.token, body: { condition: "damaged" } }), 200);

console.log("• tenant claims placeholder account");
const claimed = expect("tenant registers", await api("POST", "/public/register", { token: tenant.token, body: { displayName: "Tenant Real", phoneNumber: tenant.local } }), 201);
check("claimed the placeholder", claimed?.displayName === "Tenant Real");
check("a draft is hidden from the tenant", (await api("GET", "/lease", { token: tenant.token })).body.data.total === 0);
expect("draft hidden by id", await api("GET", `/lease/${lease.id}`, { token: tenant.token }), 404);
expect("remove last tenant", await api("DELETE", `${L}/tenants/${claimed.id}`, { token: owner.token }), 409);

console.log("• start the lease");
const started = expect("start", await api("POST", `${L}/start`, { token: owner.token, body: { dueDate: "2026-01-05" } }), 200);
check("first period over the whole year, rent 12 months", started?.period.startDate === "2026-01-01" && started.period.endDate === "2026-12-31" && started.period.rentAmount === 36000000, started?.period);
check("move-in invoice: deposit + rent + net 6 months + parking 12 months", started?.invoice.kind === "move_in" && started.invoice.amount === 3000000 + 36000000 + 600000 + 1920000, started?.invoice);
expect("start twice", await api("POST", `${L}/start`, { token: owner.token, body: {} }), 409);
expect("cannot delete a started lease", await api("DELETE", L, { token: owner.token }), 409);
const mine = expect("tenant leases", await api("GET", "/lease", { token: tenant.token }), 200);
check("tenant sees the started lease", mine?.items[0]?.id === lease.id, mine);

console.log("• close the lease");
expect("close before a member joined", await api("POST", `${L}/close`, { token: owner.token, body: { terminatedAt: "2026-02-01" } }), 422);
expect("close needs the closing reading", await api("POST", `${L}/close`, { token: owner.token, body: { terminatedAt: "2026-08-31" } }), 409);
const ended = expect("close lease", await api("POST", `${L}/close`, { token: owner.token, body: { terminatedAt: "2026-08-31", reason: "moved out", readings: [{ meterId: meter.id, value: 200 }] } }), 200);
check("closing invoice = 100 kWh on the frozen step price", ended?.invoice?.kind === "closing" && ended.invoice.amount === 50 * 1800 + 50 * 2500, ended?.invoice);
check("nothing was paid -> no refund", ended?.refund === null, ended?.refund);
const after = (await api("GET", L, { token: owner.token })).body.data;
check("terminated sets subscriptions end", after.status === "ended" && after.subscriptions.every((s) => s.endDate && s.endDate <= "2026-08-31"), after.subscriptions);
check("members left", after.members.every((m) => m.leftAt === "2026-08-31"), after.members);
expect("close twice", await api("POST", `${L}/close`, { token: owner.token, body: { terminatedAt: "2026-09-01" } }), 409);
expect("delete unit with leases", await api("DELETE", `${P}/units/${unit.id}`, { token: owner.token }), 409);

globalThis.__ctx = { owner, tenant, tech, prop, unit, lease, P, L };
for (const part of (process.env.PART2 ?? "").split(",").filter(Boolean)) await (await import(part)).default(globalThis.__ctx, { api, check, expect, user, register });
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
