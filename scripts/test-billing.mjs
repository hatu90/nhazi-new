// Unit tests for lib/billing/pricing.ts:  node scripts/test-billing.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { computeCost, daysInclusive, prorate, suggestRent, usageCost, meterQuantity, previewBill, priceTypeOf, resolvePriceVersion } from "../lib/billing/pricing.ts";

const step = [{ upTo: 50, rate: 1800 }, { upTo: 100, rate: 2500 }, { upTo: null, rate: 3000 }];

test("plain: usage × rate", () => {
  const c = computeCost([{ upTo: null, rate: 3000 }], 12.5);
  assert.equal(c.type, "plain");
  assert.equal(c.amount, 37500);
  assert.equal(c.lines.length, 1);
});
test("step: Σ usage_i × rate_i", () => {
  assert.equal(computeCost(step, 70).amount, 50 * 1800 + 20 * 2500);
  assert.equal(computeCost(step, 130).amount, 50 * 1800 + 50 * 2500 + 30 * 3000);
  const c = computeCost(step, 70);
  assert.equal(c.type, "step");
  assert.deepEqual(c.lines.map((l) => [l.from, l.to, l.quantity]), [[0, 50, 50], [50, 70, 20]]);
});
test("boundaries and zero", () => {
  assert.equal(computeCost(step, 0).amount, 0);
  assert.equal(computeCost(step, 0).lines.length, 0);
  assert.equal(computeCost(step, 50).amount, 90000);
  assert.equal(computeCost(step, 50).lines.length, 1);
  assert.equal(computeCost(step, 100).amount, 90000 + 125000);
});
test("free first tier (member headcount)", () => {
  const t = [{ upTo: 3, rate: 0 }, { upTo: null, rate: 50000 }];
  assert.equal(computeCost(t, 2).amount, 0);
  assert.equal(computeCost(t, 5).amount, 100000);
});
test("decimals: no float drift, lines sum to total", () => {
  const c = computeCost([{ upTo: 10.5, rate: 1999 }, { upTo: null, rate: 2999 }], 20.125);
  assert.equal(c.amount, c.lines.reduce((s, l) => s + l.amount, 0));
  assert.equal(c.lines[0].amount, Math.round(10.5 * 1999));
  assert.equal(c.lines[1].quantity, 9.625);
  assert.equal(meterQuantity(1234.567, 1300.1), 65.533);
});
test("invalid input throws", () => {
  assert.throws(() => computeCost(step, -1), RangeError);
  assert.throws(() => computeCost(step, NaN), RangeError);
  assert.throws(() => computeCost([{ upTo: 10, rate: 1 }], 5), RangeError); // no unbounded tier
  assert.throws(() => computeCost([{ upTo: 20, rate: 1 }, { upTo: 10, rate: 1 }, { upTo: null, rate: 1 }], 5), RangeError);
  assert.throws(() => meterQuantity(100, 99), RangeError);
});
test("version in force and bill preview", () => {
  const versions = [
    { effectiveDate: "2026-01-01", tiers: [{ upTo: null, rate: 2000 }] },
    { effectiveDate: "2026-07-01", tiers: step },
  ];
  assert.equal(resolvePriceVersion(versions, "2025-12-31"), null);
  assert.equal(resolvePriceVersion(versions, "2026-06-30").effectiveDate, "2026-01-01");
  assert.equal(resolvePriceVersion(versions, "2026-07-01").effectiveDate, "2026-07-01");
  assert.equal(priceTypeOf(versions[0]), "plain");
  assert.equal(priceTypeOf(versions[1]), "step");
  const bill = previewBill([
    { key: "elec", title: "Electricity", quantity: 70, versions, on: "2026-08-31" },
    { key: "net", title: "Internet", quantity: 1, versions: [{ effectiveDate: "2026-01-01", tiers: [{ upTo: null, rate: 100000 }] }], on: "2026-08-31" },
    { key: "old", title: "Not yet priced", quantity: 1, versions, on: "2025-01-01" },
  ]);
  assert.equal(bill.total, 50 * 1800 + 20 * 2500 + 100000);
  assert.deepEqual(bill.unpriced, ["old"]);
});

test("frozen price cost + proration suggestions", () => {
  const price = { effectiveDate: "2026-01-01", tiers: step };
  assert.equal(usageCost({ quantity: 70, price }).amount, 140000);
  assert.equal(daysInclusive("2026-11-01", "2026-11-30"), 30);
  assert.equal(daysInclusive("2026-02-01", "2026-02-28"), 28);
  assert.equal(prorate(3000000, 10, 30), 1000000);
  assert.equal(suggestRent(3000000, { start: "2026-11-01", end: "2026-11-30" }, { start: "2026-11-21", end: "2026-11-30" }), 1000000);
  assert.equal(prorate(100, 40, 30), 100);
  assert.throws(() => prorate(1, 1, 0), RangeError);
});
