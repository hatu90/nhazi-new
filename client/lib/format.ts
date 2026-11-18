const vnd = new Intl.NumberFormat("vi-VN");

export const formatMoney = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${vnd.format(n)} ₫`);

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export const todayIso = () => new Date().toISOString().slice(0, 10);
export const endOfMonthIso = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/** Mirrors the server's `phoneSchema`: 0912345678 | 84912345678 | +84 912 345 678 -> +84912345678. */
export const normalizePhone = (v: string) => {
  const s = v.trim().replace(/[\s.\-()]/g, "");
  return s.startsWith("+") ? s : s.startsWith("0") ? `+84${s.slice(1)}` : s.startsWith("84") ? `+${s}` : s;
};
export const isValidPhone = (v: string) => /^\+\d{8,15}$/.test(normalizePhone(v));

export const label = (v: string) => v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
