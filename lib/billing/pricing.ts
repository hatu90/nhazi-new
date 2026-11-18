/**
 * Billing engine: pure functions, no I/O, no imports. Safe to use from the server
 * (invoice generation) and from the browser (live preview): both get the same numbers.
 *
 * Price model (`services.prices`): versions that take effect on a date, each with tiers.
 *   plain : one tier                     cost = usage × rate
 *   step  : several tiers, upTo ascending cost = Σ (usage falling in tier i) × rate_i
 * `upTo` is the cumulative upper bound of the tier; the last tier has `upTo: null` (unbounded).
 * Example 50 kWh at 1800, then 2500: 70 kWh = 50 × 1800 + 20 × 2500.
 *
 * Money is whole VND. Each tier line is rounded (half up) and the total is the sum of
 * the rounded lines, so a printed breakdown always adds up to its total.
 * Usage keeps up to 3 decimals (numeric(14,3)); it is handled as integer thousandths.
 * Dates are `YYYY-MM-DD`.
 */

export interface IPriceTier {
  /** Cumulative upper bound of the tier; null = unbounded (last tier only). */
  upTo: number | null;
  /** VND per unit of usage inside this tier. */
  rate: number;
}
export interface IPriceVersion {
  effectiveDate: string;
  tiers: IPriceTier[];
}
export type PriceType = "plain" | "step";

export interface ICostLine {
  /** Tier slice, usage units: (from, to]. */
  from: number;
  to: number;
  quantity: number;
  rate: number;
  amount: number;
}
export interface ICost {
  type: PriceType;
  quantity: number;
  /** Whole VND. */
  amount: number;
  /** Tiers that actually received usage (empty for zero usage). */
  lines: ICostLine[];
}

const MILLI = 1000;
const toMilli = (v: number) => Math.round(v * MILLI);
const fromMilli = (m: number) => m / MILLI;

export const priceTypeOf = (version: Pick<IPriceVersion, "tiers">): PriceType => (version.tiers.length === 1 ? "plain" : "step");

/** The tier list must be non-empty, ascending, and end with the one unbounded tier. */
export function assertTiers(tiers: IPriceTier[]): void {
  if (tiers.length === 0) throw new RangeError("A price needs at least one tier");
  tiers.forEach((t, i) => {
    const last = i === tiers.length - 1;
    if (!Number.isFinite(t.rate) || t.rate < 0) throw new RangeError(`Tier ${i + 1}: rate must be >= 0`);
    if (last ? t.upTo !== null : t.upTo === null || !(t.upTo > (tiers[i - 1]?.upTo ?? 0))) {
      throw new RangeError("Tiers must ascend by upTo and only the last tier is unbounded (upTo: null)");
    }
  });
}

/** Cost of `quantity` units under `tiers`. */
export function computeCost(tiers: IPriceTier[], quantity: number): ICost {
  assertTiers(tiers);
  if (!Number.isFinite(quantity) || quantity < 0) throw new RangeError("Usage must be a number >= 0");

  const total = toMilli(quantity);
  const lines: ICostLine[] = [];
  let lower = 0;
  let amount = 0;
  for (const tier of tiers) {
    const upper = tier.upTo === null ? total : Math.min(total, toMilli(tier.upTo));
    const inTier = upper - lower;
    if (inTier > 0) {
      const line = Math.round((inTier * tier.rate) / MILLI);
      lines.push({ from: fromMilli(lower), to: fromMilli(upper), quantity: fromMilli(inTier), rate: tier.rate, amount: line });
      amount += line;
    }
    lower = Math.max(lower, upper);
    if (lower >= total) break;
  }
  return { type: tiers.length === 1 ? "plain" : "step", quantity: fromMilli(total), amount, lines };
}

/** The version in force on `on`: the latest one whose effectiveDate <= on. */
export function resolvePriceVersion<T extends { effectiveDate: string }>(versions: T[], on: string): T | null {
  let best: T | null = null;
  for (const v of versions) if (v.effectiveDate <= on && (!best || v.effectiveDate > best.effectiveDate)) best = v;
  return best;
}

/** Meter usage between two readings. A meter cannot run backwards. */
export function meterQuantity(opening: number, closing: number): number {
  if (closing < opening) throw new RangeError("Closing reading is lower than the opening reading");
  return fromMilli(toMilli(closing) - toMilli(opening));
}

/** Cost of a usage with the price frozen into it (what the calculator and the invoice both use). */
export const usageCost = (usage: { quantity: number; price: IPriceVersion }): ICost => computeCost(usage.price.tiers, usage.quantity);

// ── pre-fill helpers: suggestions only, the admin can always overwrite the amount ──────

const DAY = 86_400_000;
const parse = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
/** Days from `start` to `end`, both included. */
export const daysInclusive = (start: string, end: string): number => Math.round((parse(end) - parse(start)) / DAY) + 1;
/** `date` shifted by `n` days (negative = earlier). */
export const addDays = (date: string, n: number): string => new Date(parse(date) + n * DAY).toISOString().slice(0, 10);
/** `amount` for `days` out of `totalDays`, whole VND (half up). Suggested rent of a partial period. */
export const prorate = (amount: number, days: number, totalDays: number): number => {
  if (totalDays <= 0 || days < 0) throw new RangeError("Invalid proration days");
  return Math.round((amount * Math.min(days, totalDays)) / totalDays);
};
const daysIn = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
const ymd = (y: number, m0: number, day: number) => new Date(Date.UTC(y, m0, day)).toISOString().slice(0, 10);

/**
 * How many billing months [start, end] covers. A month runs from one day-of-month anniversary of `start` to the day
 * before the next (18 Nov - 17 Dec = 1 month); a leftover part counts as days / days of that month window.
 * 1 Nov - 30 Nov = 1 · 18 Nov - 30 Nov = 13/30 · 1 Nov - 15 Dec = 1 + 15/31.
 * Anchors on a missing day (31st) fall back to the month's last day.
 */
export function monthsCovered(start: string, end: string): number {
  if (end < start) throw new RangeError("end is before start");
  const y0 = +start.slice(0, 4);
  const m0 = +start.slice(5, 7) - 1;
  const anchor = +start.slice(8, 10);
  let whole = 0;
  let cursor = start;
  for (;;) {
    const idx = m0 + whole + 1;
    const y = y0 + Math.floor(idx / 12);
    const m = ((idx % 12) + 12) % 12;
    const clamped = anchor > daysIn(y, m);
    const windowEnd = clamped ? ymd(y, m, daysIn(y, m)) : addDays(ymd(y, m, anchor), -1);
    if (windowEnd <= end) {
      whole++;
      cursor = addDays(windowEnd, 1);
      continue;
    }
    if (cursor > end) return whole;
    return whole + daysInclusive(cursor, end) / daysInclusive(cursor, windowEnd);
  }
}

/** Suggested charge for a monthly amount over [start, end] (whole VND, half up). Always editable by the admin. */
export const suggestAmount = (monthly: number, start: string, end: string): number => Math.round(monthly * monthsCovered(start, end));

// ── a whole bill ────────────────────────────────────────────────────────────────────

/** One billable usage: what was consumed and the service's price history. */
export interface IChargeInput {
  /** Caller's key (subscription id, usage id ...) to match results back. */
  key: string;
  title: string;
  quantity: number;
  versions: IPriceVersion[];
  /** Date whose price version applies (period end for meters, billing date for the rest). */
  on: string;
}
export interface IChargeLine {
  key: string;
  title: string;
  quantity: number;
  /** null: no price version is in force on that date; `cost` is null and `amount` 0. */
  priceEffectiveDate: string | null;
  cost: ICost | null;
  amount: number;
}
export interface IBillPreview {
  lines: IChargeLine[];
  total: number;
  /** Keys that could not be priced: a real invoice must refuse them. */
  unpriced: string[];
}

export function priceCharge(input: IChargeInput): IChargeLine {
  const version = resolvePriceVersion(input.versions, input.on);
  const base = { key: input.key, title: input.title, quantity: input.quantity };
  if (!version) return { ...base, priceEffectiveDate: null, cost: null, amount: 0 };
  const cost = computeCost(version.tiers, input.quantity);
  return { ...base, priceEffectiveDate: version.effectiveDate, cost, amount: cost.amount };
}

export function previewBill(inputs: IChargeInput[]): IBillPreview {
  const lines = inputs.map(priceCharge);
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0), unpriced: lines.filter((l) => !l.cost).map((l) => l.key) };
}
