// Billing lifecycle: start a lease, frozen prices, mid-term subscription, mid-term roll-over (credit + negotiated meter).
// Run:  PART2=./smoke-part2.mjs,./smoke-part3.mjs,./smoke-part4.mjs,./smoke-part5.mjs node scripts/smoke.mjs
export default async function part4(ctx, { api, check, expect }) {
  console.log("• lifecycle: start, frozen prices, mid-term subscription");
  const { owner, tenant, tech, P } = ctx;
  const tok = owner.token;
  const unit = expect("unit", await api("POST", `${P}/units`, { token: tok, body: { name: "BILL1", area: 25, floor: 3 } }), 201);
  const step = [{ upTo: 50, rate: 1800 }, { upTo: 100, rate: 2500 }, { upTo: null, rate: 3000 }];
  const elec = expect("step service", await api("POST", `${P}/services`, { token: tok, body: { name: "Elec-B", usageBase: "meter", unitOfMeasure: "kWh", prices: [{ effectiveDate: "2026-01-01", tiers: step }] } }), 201);
  const wifi = expect("plain service", await api("POST", `${P}/services`, { token: tok, body: { name: "Wifi-B", usageBase: "lease", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: null, rate: 100000 }] }] } }), 201);
  const water = expect("member service", await api("POST", `${P}/services`, { token: tok, body: { name: "Water-B", usageBase: "member", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: 1, rate: 0 }, { upTo: null, rate: 60000 }] }] } }), 201);
  const park = expect("device service", await api("POST", `${P}/services`, { token: tok, body: { name: "Park-B", usageBase: "device", prices: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: null, rate: 80000 }] }] } }), 201);
  const meter = expect("meter", await api("POST", `${P}/meters`, { token: tok, body: { unitId: unit.id, serviceId: elec.id, name: "BM" } }), 201);

  const lease = expect("draft lease", await api("POST", `${P}/leases`, { token: tok, body: {
    unitId: unit.id, startDate: "2026-11-01", firstPeriodEnd: "2026-11-30", rent: 3000000, depositAmount: 3000000,
    tenants: [{ phoneNumber: tenant.local, displayName: "T" }],
    members: [{ name: "A", yearOfBirth: 1990 }, { name: "B", yearOfBirth: 1992 }, { name: "C", yearOfBirth: 2015 }],
  } }), 201);
  const L = `${P}/leases/${lease.id}`;
  expect("sub meter", await api("POST", `${L}/subscriptions`, { token: tok, body: { serviceId: elec.id, meterId: meter.id, startDate: "2026-11-01" } }), 201);
  expect("sub wifi", await api("POST", `${L}/subscriptions`, { token: tok, body: { serviceId: wifi.id, startDate: "2026-11-01" } }), 201);
  const subWater = expect("sub water", await api("POST", `${L}/subscriptions`, { token: tok, body: { serviceId: water.id, startDate: "2026-11-01" } }), 201);
  check("draft: subscription has no usage and no invoice", subWater?.usageId === null && subWater.invoice === null, subWater);
  const subs = (await api("GET", L, { token: tok })).body.data.subscriptions;
  const subOf = (name) => subs.find((s) => s.serviceName === name).id;

  expect("billing period before start", await api("POST", `${L}/billing-periods`, { token: tok, body: { endDate: "2026-11-30" } }), 409);
  expect("start needs the opening reading", await api("POST", `${L}/start`, { token: tok, body: {} }), 409);
  expect("technician cannot start", await api("POST", `${L}/start`, { token: tech.token, body: {} }), 403);
  expect("unknown line key", await api("POST", `${L}/start`, { token: tok, body: { readings: [{ meterId: meter.id, value: 1000 }], overrides: { "service:nope": 1 } } }), 422);
  expect("reading for a meter not on the lease", await api("POST", `${L}/start`, { token: tok, body: { readings: [{ meterId: "00000000-0000-4000-8000-000000000000", value: 1 }] } }), 422);
  check("failed start left nothing behind", (await api("GET", `${P}/meters/${meter.id}/readings`, { token: tok })).body.data.total === 0 && (await api("GET", L, { token: tok })).body.data.status === "draft");
  expect("end beyond a bad date", await api("POST", `${L}/start`, { token: tok, body: { periodEnd: "2026-10-01", readings: [{ meterId: meter.id, value: 1000 }] } }), 422);

  const st = expect("start (wifi negotiated to 90 000)", await api("POST", `${L}/start`, { token: tok, body: { readings: [{ meterId: meter.id, value: 1000 }], overrides: { [`service:${subOf("Wifi-B")}`]: 90000 } } }), 200);
  check("first period = the draft's period", st?.period.startDate === "2026-11-01" && st.period.endDate === "2026-11-30" && st.period.rentAmount === 3000000 && st.period.status === "active", st?.period);
  check("move-in = deposit + rent + wifi 90k + water 2×60k", st?.invoice.kind === "move_in" && st.invoice.amount === 3000000 + 3000000 + 90000 + 120000, st?.invoice);
  const wifiItem = st?.invoice.items.find((i) => i.title.startsWith("Wifi"));
  check("negotiation kept: charged 90k, calculated 100k", wifiItem?.amount === 90000 && wifiItem.detail?.calculatedAmount === 100000, wifiItem);
  const usageOf = (p, n) => p.usages.find((u) => u.serviceName === n);
  check("usages: meter unknown, wifi 1, water headcount 3", usageOf(st.period, "Elec-B").quantity === null && usageOf(st.period, "Wifi-B").quantity === 1 && usageOf(st.period, "Water-B").quantity === 3, st?.period.usages);
  check("every counted usage is invoiced", usageOf(st.period, "Wifi-B").billed && usageOf(st.period, "Water-B").billed && !usageOf(st.period, "Elec-B").billed);
  expect("adjust an invoiced usage", await api("PATCH", `${P}/billing-periods/${st.period.id}/usages/${usageOf(st.period, "Water-B").id}`, { token: tok, body: { quantity: 4 } }), 409);
  expect("open while a period runs", await api("POST", `${L}/billing-periods`, { token: tok, body: { endDate: "2026-12-31" } }), 409);

  // price changes after the period opened never touch it
  expect("new price version", await api("POST", `${P}/services/${elec.id}/prices`, { token: tok, body: { effectiveDate: "2026-11-15", tiers: [{ upTo: null, rate: 9999 }] } }), 201);
  check("frozen price unchanged", usageOf((await api("GET", `${P}/billing-periods/${st.period.id}`, { token: tok })).body.data, "Elec-B").price.tiers.length === 3);

  // mid-term subscription -> usage + invoice for the 15 days left
  const park1 = expect("mid-term device subscription", await api("POST", `${L}/subscriptions`, { token: tok, body: { serviceId: park.id, quantity: 2, details: "59A-1, 59A-2", startDate: "2026-11-16" } }), 201);
  check("usage in the running period", typeof park1?.usageId === "string", park1);
  check("invoice for 16/11-30/11 = 15/30 of 160 000", park1?.invoice?.kind === "other" && park1.invoice.amount === 80000 && park1.invoice.items[0].detail.from === "2026-11-16" && park1.invoice.items[0].usageId === park1.usageId, park1?.invoice);
  expect("overlapping device subscription", await api("POST", `${L}/subscriptions`, { token: tok, body: { serviceId: park.id, startDate: "2026-11-20" } }), 409);

  console.log("• lifecycle: mid-term roll-over");
  const PP = `${P}/billing-periods/${st.period.id}`;
  expect("roll over without the closing reading", await api("POST", `${PP}/close`, { token: tok, body: { endDate: "2026-11-20", next: { endDate: "2026-12-20" } } }), 409);
  expect("invoice fields without next", await api("POST", `${PP}/close`, { token: tok, body: { endDate: "2026-11-20", dueDate: "2026-12-01" } }), 422);
  expect("reading lower than opening", await api("POST", `${PP}/close`, { token: tok, body: { endDate: "2026-11-20", next: { endDate: "2026-12-20" }, readings: [{ meterId: meter.id, value: 900 }] } }), 409);
  expect("end before the start", await api("POST", `${PP}/close`, { token: tok, body: { endDate: "2026-10-20", next: { endDate: "2026-12-20" }, readings: [{ meterId: meter.id, value: 1070 }] } }), 422);
  const ro = expect("roll over on 20/11 (planned 30/11), meter negotiated to 130 000", await api("POST", `${PP}/close`, { token: tok, body: {
    endDate: "2026-11-20", next: { endDate: "2026-12-20" }, readings: [{ meterId: meter.id, value: 1070 }],
    dueDate: "2026-11-25", overrides: { [`meter:${subOf("Elec-B")}`]: 130000 },
  } }), 200);
  const e1 = usageOf(ro.period, "Elec-B");
  check("period shortened + closed, 70 kWh on the frozen step price", ro?.period.status === "closed" && ro.period.endDate === "2026-11-20" && e1.quantity === 70 && e1.cost.amount === 140000 && e1.cost.type === "step", ro?.period);
  check("next period starts the day after, a full month => full rent", ro?.next.startDate === "2026-11-21" && ro.next.endDate === "2026-12-20" && ro.next.rentAmount === 3000000, ro?.next);
  check("next period opening reading = the closing one, new price frozen", usageOf(ro.next, "Elec-B").openingReading.value === 1070 && usageOf(ro.next, "Elec-B").price.effectiveDate === "2026-11-15", usageOf(ro.next, "Elec-B"));
  const inv = ro?.invoice;
  const credits = inv.items.filter((i) => i.kind === "credit");
  check("transition invoice for the new period", inv.kind === "transition" && inv.billingPeriodId === ro.next.id && inv.dueDate === "2026-11-25", inv);
  check("credit for the 10 unused days: rent 1 000 000, wifi 30 000, water 40 000, parking 53 333", credits.map((i) => i.amount).sort((a, b) => a - b).join() === [-1000000, -40000, -30000, -53333].sort((a, b) => a - b).join(), credits.map((i) => [i.title, i.amount]));
  check("total = rent 3M + wifi 100k + water 120k + parking 160k + meter 130k (negotiated) - credits", inv.amount === 3000000 + 100000 + 120000 + 160000 + 130000 - 1123333, inv.amount);
  const meterItem = inv.items.find((i) => i.kind === "meter");
  check("meter line: usage of the CLOSED period, calculated 140k, charged 130k", meterItem.amount === 130000 && meterItem.detail.calculatedAmount === 140000 && meterItem.usageId === e1.id, meterItem);
  expect("close again", await api("POST", `${PP}/close`, { token: tok, body: {} }), 409);

  Object.assign(ctx, { l4: lease, L4: L, unit4: unit, meter4: meter, subOf, ro, st, services4: { elec, wifi, water, park } });
}
