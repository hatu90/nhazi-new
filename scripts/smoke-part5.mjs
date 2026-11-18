// Property setup (bulk adds, images) and the end of a lease (mid-term meter subscription, closing invoice, prefilled refund).
export default async function part5(ctx, { api, check, expect }) {
  const { owner, tech, P, L4, l4, unit4, meter4, ro, st } = ctx;
  const tok = owner.token;

  console.log("• setup: bulk adds, property images");
  const units = expect("bulk units", await api("POST", `${P}/units/bulk`, { token: tok, body: { items: [{ name: "BULK-1", area: 20, floor: 1 }, { name: "BULK-2", area: 22, floor: 2, bedrooms: 1 }, { name: "BULK-3", area: 25, floor: 3 }] } }), 201);
  check("3 units created", units?.length === 3 && units[1].bedrooms === 1, units);
  expect("duplicate name in the request", await api("POST", `${P}/units/bulk`, { token: tok, body: { items: [{ name: "dup", area: 1, floor: 1 }, { name: "DUP", area: 1, floor: 1 }] } }), 422);
  expect("clash with an existing unit (all or nothing)", await api("POST", `${P}/units/bulk`, { token: tok, body: { items: [{ name: "ATOMIC-NEW", area: 1, floor: 1 }, { name: "BULK-1", area: 1, floor: 1 }] } }), 409);
  check("nothing from the failed batch was created", (await api("GET", `${P}/units?q=ATOMIC`, { token: tok })).body.data.total === 0);
  expect("empty bulk", await api("POST", `${P}/units/bulk`, { token: tok, body: { items: [] } }), 422);
  expect("technician cannot bulk add", await api("POST", `${P}/units/bulk`, { token: tech.token, body: { items: [{ name: "T", area: 1, floor: 1 }] } }), 403);

  const price = (rate) => [{ effectiveDate: "2026-01-01", tiers: [{ upTo: null, rate }] }];
  expect("flat service with two tiers (all or nothing)", await api("POST", `${P}/services/bulk`, { token: tok, body: { items: [{ name: "Ok-S", usageBase: "lease", prices: price(1) }, { name: "Bad-S", usageBase: "lease", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: 1, rate: 1 }, { upTo: null, rate: 2 }] }] }] } }), 422);
  const svcs = expect("bulk services", await api("POST", `${P}/services/bulk`, { token: tok, body: { items: [{ name: "Gas-B", usageBase: "meter", unitOfMeasure: "m3", prices: price(10000) }, { name: "Trash-B", usageBase: "lease", prices: price(30000) }] } }), 201);
  check("2 services, Ok-S was not created", svcs?.length === 2 && (await api("GET", `${P}/services?usageBase=lease`, { token: tok })).body.data.items.every((s) => s.name !== "Ok-S"), svcs);
  const gas = svcs[0];
  const meters = expect("bulk meters", await api("POST", `${P}/meters/bulk`, { token: tok, body: { items: [{ unitId: units[0].id, serviceId: gas.id, name: "G1" }, { unitId: units[1].id, serviceId: gas.id, name: "G2" }, { unitId: unit4.id, serviceId: gas.id, name: "G-BILL" }] } }), 201);
  check("3 meters", meters?.length === 3, meters);
  expect("meter on a non-meter service", await api("POST", `${P}/meters/bulk`, { token: tok, body: { items: [{ unitId: units[0].id, serviceId: svcs[1].id, name: "x" }] } }), 422);
  expect("meter on an unknown unit", await api("POST", `${P}/meters/bulk`, { token: tok, body: { items: [{ unitId: "00000000-0000-4000-8000-000000000000", serviceId: gas.id, name: "x" }] } }), 404);
  const items = expect("bulk inventory items", await api("POST", `${P}/inventory-items/bulk`, { token: tok, body: { items: [{ name: "Sofa" }, { name: "Fridge" }, { name: "Fan" }] } }), 201);
  check("3 items", items?.length === 3);
  expect("duplicate inventory item", await api("POST", `${P}/inventory-items/bulk`, { token: tok, body: { items: [{ name: "Lamp" }, { name: "Sofa" }] } }), 409);
  check("Lamp was not created", (await api("GET", `${P}/inventory-items?q=Lamp`, { token: tok })).body.data.total === 0);

  const patched = expect("setup images", await api("PATCH", P, { token: tok, body: { headerImage: "properties/p/header.jpg", images: ["properties/p/1.jpg", "properties/p/2.jpg"], rules: ["No smoking"] } }), 200);
  check("images saved", patched?.headerImage === "properties/p/header.jpg" && patched.images.length === 2 && patched.rules[0] === "No smoking" && patched.role === "owner", patched);
  expect("clear the header", await api("PATCH", P, { token: tok, body: { headerImage: null } }), 200);
  check("header cleared", (await api("GET", P, { token: tok })).body.data.headerImage === null);
  expect("empty patch", await api("PATCH", P, { token: tok, body: {} }), 422);
  expect("ward without province", await api("PATCH", P, { token: tok, body: { ward: { code: 1, name: "x", codename: "x", provinceCode: 79 } } }), 422);
  expect("one-sided price range", await api("PATCH", P, { token: tok, body: { rentPriceFrom: 5000000, rentPriceTo: 1000000 } }), 422);
  expect("technician cannot edit", await api("PATCH", P, { token: tech.token, body: { rules: [] } }), 403);

  console.log("• lifecycle: mid-term meter subscription, close the lease, refund");
  const gasBill = meters[2];
  expect("meter subscription needs the reading", await api("POST", `${L4}/subscriptions`, { token: tok, body: { serviceId: gas.id, meterId: gasBill.id, startDate: "2026-11-25" } }), 409);
  const g = expect("meter subscription with its reading", await api("POST", `${L4}/subscriptions`, { token: tok, body: { serviceId: gas.id, meterId: gasBill.id, startDate: "2026-11-25", reading: 50 } }), 201);
  check("usage created, billed in arrears (no invoice yet)", typeof g?.usageId === "string" && g.invoice === null, g);

  // the tenant pays everything invoiced so far
  const pay = async (inv) => expect(`pay ${inv.title}`, await api("POST", `${P}/invoices/${inv.id}/payments`, { token: tok, body: { amount: inv.amount, method: "bank_transfer", paidOn: "2026-11-26" } }), 201);
  await pay(st.invoice);
  await pay(ro.invoice);

  const period2 = ro.next;
  const C = `${L4}/close`;
  expect("after the running period", await api("POST", C, { token: tok, body: { terminatedAt: "2026-12-25" } }), 409);
  expect("before the running period", await api("POST", C, { token: tok, body: { terminatedAt: "2026-11-10" } }), 409);
  expect("closing readings missing", await api("POST", C, { token: tok, body: { terminatedAt: "2026-12-05" } }), 409);
  const rd = [{ meterId: meter4.id, value: 1100 }, { meterId: gasBill.id, value: 60 }];
  expect("unknown invoice line", await api("POST", C, { token: tok, body: { terminatedAt: "2026-12-05", readings: rd, overrides: { "meter:nope": 1 } } }), 422);
  expect("unknown refund line", await api("POST", C, { token: tok, body: { terminatedAt: "2026-12-05", readings: rd, overrides: { "refund:nope": 1 } } }), 422);
  expect("refund beyond the charge", await api("POST", C, { token: tok, body: { terminatedAt: "2026-12-05", readings: rd, overrides: { "refund:rent": 3500000 } } }), 409);
  expect("refund amounts with skip", await api("POST", C, { token: tok, body: { terminatedAt: "2026-12-05", readings: rd, overrides: { "refund:deposit": 1 }, refund: { skip: true } } }), 422);
  check("failed closes changed nothing", (await api("GET", L4, { token: tok })).body.data.terminatedAt === null && (await api("GET", `${P}/billing-periods/${period2.id}`, { token: tok })).body.data.status === "active");

  const closed = expect("close the lease on 5/12", await api("POST", C, { token: tok, body: {
    terminatedAt: "2026-12-05", reason: "moved out", readings: rd,
    extraItems: [{ title: "Door repair", amount: 200000 }],
    overrides: { "refund:deposit": 2500000 },
  } }), 200);
  const ci = closed?.invoice;
  check("closing invoice: electricity 30 kWh × 9 999 + gas 10 × 10 000 + repair", ci?.kind === "closing" && ci.billingPeriodId === period2.id && ci.amount === 299970 + 100000 + 200000, ci);
  check("period 2 shortened to 5/12 and closed", closed?.period.status === "closed" && closed.period.endDate === "2026-12-05", closed?.period);
  const gasUsage = closed?.period.usages.find((u) => u.serviceName === "Gas-B");
  check("gas quantity 10 from the typed reading", gasUsage?.quantity === 10 && gasUsage.cost.amount === 100000, gasUsage);

  const rf = closed?.refund;
  const byKind = (k) => rf?.items.filter((i) => i.kind === k) ?? [];
  check("refund pending", rf?.status === "pending", rf);
  check("unused rent: 15 of 30 days of 3 000 000", byKind("unused_rent")[0]?.amount === 1500000 && byKind("unused_rent")[0].unusedDays === 15 && byKind("unused_rent")[0].totalDays === 30, byKind("unused_rent"));
  check("unused services: wifi 50k, water 60k, parking 80k", byKind("unused_service").map((i) => i.amount).sort((a, b) => a - b).join() === "50000,60000,80000", byKind("unused_service"));
  check("deposit: typed 2 500 000 (500k kept)", byKind("deposit")[0]?.amount === 2500000 && byKind("deposit")[0].chargedAmount === 3000000, byKind("deposit"));
  check("refund total", rf?.amount === 1500000 + 190000 + 2500000, rf?.amount);
  const lease2 = (await api("GET", L4, { token: tok })).body.data;
  check("lease terminated, subscriptions ended, members left", lease2.terminatedAt === "2026-12-05" && lease2.subscriptions.every((s) => s.endDate && s.endDate <= "2026-12-05") && lease2.members.every((m) => m.leftAt === "2026-12-05"), lease2);
  expect("close again", await api("POST", C, { token: tok, body: { terminatedAt: "2026-12-06" } }), 409);
  expect("pay the refund", await api("POST", `${P}/refunds/${rf.id}/pay`, { token: tok, body: { method: "bank_transfer", paidOn: "2026-12-06" } }), 200);
  check("exactly 1 refund on the lease", (await api("GET", `${P}/refunds?leaseId=${l4.id}`, { token: tok })).body.data.total === 1);
}
