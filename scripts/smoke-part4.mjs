// Continues smoke.mjs (billing periods, frozen prices, event invoices).
// Run:  PART2=./smoke-part2.mjs,./smoke-part3.mjs,./smoke-part4.mjs node scripts/smoke.mjs
export default async function part4({ owner, tenant, tech, P }, { api, check, expect }) {
  console.log("• billing: periods, frozen prices, event invoices");
  const tok = owner.token;
  const unit = expect("unit", await api("POST", `${P}/units`, { token: tok, body: { name: "BILL1", area: 25, floor: 3 } }), 201);
  const step = [{ upTo: 50, rate: 1800 }, { upTo: 100, rate: 2500 }, { upTo: null, rate: 3000 }];
  const elec = expect("step service", await api("POST", `${P}/services`, { token: tok, body: { name: "Elec-B", usageBase: "meter", unitOfMeasure: "kWh", prices: [{ effectiveDate: "2026-01-01", tiers: step }] } }), 201);
  const wifi = expect("plain service", await api("POST", `${P}/services`, { token: tok, body: { name: "Wifi-B", usageBase: "lease", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: null, rate: 100000 }] }] } }), 201);
  const water = expect("member service", await api("POST", `${P}/services`, { token: tok, body: { name: "Water-B", usageBase: "member", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: 1, rate: 0 }, { upTo: null, rate: 60000 }] }] } }), 201);
  const meter = expect("meter", await api("POST", `${P}/meters`, { token: tok, body: { unitId: unit.id, serviceId: elec.id, name: "BM" } }), 201);

  const lease = expect("lease", await api("POST", `${P}/leases`, { token: tok, body: {
    unitId: unit.id, startDate: "2026-11-01", rent: 3000000, depositAmount: 3000000,
    tenants: [{ phoneNumber: tenant.local, displayName: "T" }],
    members: [{ name: "A", yearOfBirth: 1990 }, { name: "B", yearOfBirth: 1992 }, { name: "C", yearOfBirth: 2015 }],
  } }), 201);
  const L = `${P}/leases/${lease.id}`;
  expect("sub meter", await api("POST", `${L}/subscriptions`, { token: tok, body: { serviceId: elec.id, meterId: meter.id, startDate: "2026-11-01" } }), 201);
  expect("sub wifi", await api("POST", `${L}/subscriptions`, { token: tok, body: { serviceId: wifi.id, startDate: "2026-11-01" } }), 201);
  expect("sub water", await api("POST", `${L}/subscriptions`, { token: tok, body: { serviceId: water.id, startDate: "2026-11-01" } }), 201);

  expect("open needs the opening reading", await api("POST", `${L}/billing-periods`, { token: tok, body: { endDate: "2026-11-30" } }), 409);
  const R = `${P}/meters/${meter.id}/readings`;
  expect("opening reading", await api("POST", R, { token: tok, body: { readOn: "2026-11-01", value: 1000 } }), 201);
  expect("end before start", await api("POST", `${L}/billing-periods`, { token: tok, body: { endDate: "2026-10-30" } }), 422);
  expect("technician cannot open", await api("POST", `${L}/billing-periods`, { token: tech.token, body: { endDate: "2026-11-30" } }), 403);
  const period = expect("open period", await api("POST", `${L}/billing-periods`, { token: tok, body: { endDate: "2026-11-30" } }), 201);
  check("period opened", period?.status === "active" && period.startDate === "2026-11-01" && period.rentAmount === 3000000, period);
  const byName = (n) => period.usages.find((u) => u.serviceName === n);
  check("meter usage: opening reading, quantity unknown", byName("Elec-B")?.quantity === null && byName("Elec-B").openingReading?.value === 1000, byName("Elec-B"));
  check("lease usage = 1", byName("Wifi-B")?.quantity === 1);
  check("member usage = headcount 3", byName("Water-B")?.quantity === 3);
  check("price frozen into usage", byName("Elec-B")?.price.effectiveDate === "2026-01-01" && byName("Elec-B").price.tiers.length === 3);
  check("calculated cost for counted usage", byName("Water-B")?.cost.amount === 120000 && byName("Wifi-B").cost.amount === 100000, [byName("Water-B")?.cost, byName("Wifi-B")?.cost]);
  expect("second open while active", await api("POST", `${L}/billing-periods`, { token: tok, body: { endDate: "2026-12-31" } }), 409);

  // a later price change must not touch the frozen usage
  expect("new price version", await api("POST", `${P}/services/${elec.id}/prices`, { token: tok, body: { effectiveDate: "2026-11-15", tiers: [{ upTo: null, rate: 9999 }] } }), 201);
  check("frozen price unchanged", (await api("GET", `${P}/billing-periods/${period.id}`, { token: tok })).body.data.usages.find((u) => u.serviceName === "Elec-B").price.tiers.length === 3);

  const PP = `${P}/billing-periods/${period.id}`;
  expect("adjust member headcount", await api("PATCH", `${PP}/usages/${byName("Water-B").id}`, { token: tok, body: { quantity: 4 } }), 200);
  expect("cannot adjust a meter", await api("PATCH", `${PP}/usages/${byName("Elec-B").id}`, { token: tok, body: { quantity: 4 } }), 422);
  expect("close needs the closing reading", await api("POST", `${PP}/close`, { token: tok }), 409);
  expect("closing reading", await api("POST", R, { token: tok, body: { readOn: "2026-12-01", value: 1070 } }), 201);
  const closed = expect("close", await api("POST", `${PP}/close`, { token: tok }), 200);
  const e = closed?.usages.find((u) => u.serviceName === "Elec-B");
  check("closed, 70 kWh = 50×1800 + 20×2500", closed?.status === "closed" && e.quantity === 70 && e.cost.amount === 140000 && e.cost.type === "step", e);
  expect("close twice", await api("POST", `${PP}/close`, { token: tok }), 409);
  expect("adjust after close", await api("PATCH", `${PP}/usages/${byName("Water-B").id}`, { token: tok, body: { quantity: 1 } }), 409);

  // event invoice: amounts are the admin's (negotiated), usage lines keep the calculation
  const W = closed.usages.find((u) => u.serviceName === "Wifi-B");
  expect("usage from the wrong period/lease", await api("POST", `${P}/invoices`, { token: tok, body: { leaseId: lease.id, kind: "closing", title: "x", dueDate: "2026-12-05", items: [{ title: "a", usageId: "00000000-0000-4000-8000-000000000000", amount: 1 }] } }), 422);
  expect("event invoice needs a period", await api("POST", `${P}/invoices`, { token: tok, body: { leaseId: lease.id, kind: "closing", title: "x", dueDate: "2026-12-05", items: [{ title: "a", amount: 1 }] } }), 422);
  expect("event invoice with unknown period", await api("POST", `${P}/invoices`, { token: tok, body: { leaseId: lease.id, kind: "closing", billingPeriodId: "00000000-0000-4000-8000-000000000000", title: "x", dueDate: "2026-12-05", items: [{ title: "a", amount: 1 }] } }), 404);
  const inv = expect("closing invoice", await api("POST", `${P}/invoices`, { token: tok, body: {
    leaseId: lease.id, kind: "closing", billingPeriodId: period.id, title: "November", dueDate: "2026-12-05",
    items: [
      { title: "Rent", kind: "rent", amount: 3000000 },
      { title: "Electricity", kind: "meter", usageId: e.id, amount: 130000 }, // calculated 140000, negotiated down
      { title: "Wifi", kind: "service", usageId: W.id, amount: 100000 },
    ],
  } }), 201);
  const eItem = inv?.items.find((i) => i.usageId === e.id);
  check("amount kept as negotiated, calculation kept as detail", inv?.amount === 3230000 && eItem.amount === 130000 && eItem.detail?.calculatedAmount === 140000 && eItem.detail.quantity === 70, eItem);
  expect("same event twice", await api("POST", `${P}/invoices`, { token: tok, body: { leaseId: lease.id, kind: "closing", billingPeriodId: period.id, title: "dup", dueDate: "2026-12-05", items: [{ title: "x", amount: 1 }] } }), 409);
  expect("usage already billed", await api("POST", `${P}/invoices`, { token: tok, body: { leaseId: lease.id, kind: "transition", billingPeriodId: period.id, title: "t", dueDate: "2026-12-05", items: [{ title: "Wifi again", usageId: W.id, amount: 1 }] } }), 409);
  check("usage shows billed", (await api("GET", PP, { token: tok })).body.data.usages.every((u) => u.billed === (u.serviceName !== "Water-B")));
  expect("cancel frees the usages", await api("POST", `${P}/invoices/${inv.id}/cancel`, { token: tok }), 200);
  check("usage unbilled again", (await api("GET", PP, { token: tok })).body.data.usages.every((u) => !u.billed));

  const next = expect("open next period", await api("POST", `${L}/billing-periods`, { token: tok, body: { endDate: "2026-12-31", rentAmount: 2900000 } }), 201);
  check("next period starts the day after, rent as typed", next?.startDate === "2026-12-01" && next.rentAmount === 2900000, next);
  check("new price version frozen in the new period", next?.usages.find((u) => u.serviceName === "Elec-B")?.price.effectiveDate === "2026-11-15", next?.usages);
}
