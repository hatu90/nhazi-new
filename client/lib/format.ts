import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);

const vnd = new Intl.NumberFormat("vi-VN");

export const formatMoney = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${vnd.format(n)} ₫`);

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = dayjs(iso.slice(0, 10));
  return d.isValid() ? d.format("DD/MM/YYYY") : "—";
};

export const formatDateTime = (iso: string, locale = "en") =>
  new Date(iso).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

export const todayIso = () => dayjs().tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
export const endOfMonthIso = (iso: string) => dayjs(iso).endOf("month").format("YYYY-MM-DD");

/** Mirrors the server's `phoneSchema`: 0912345678 | 84912345678 | +84 912 345 678 -> +84912345678. */
export const normalizePhone = (v: string) => {
  const s = v.trim().replace(/[\s.\-()]/g, "");
  return s.startsWith("+") ? s : s.startsWith("0") ? `+84${s.slice(1)}` : s.startsWith("84") ? `+${s}` : s;
};
export const isValidPhone = (v: string) => /^\+\d{8,15}$/.test(normalizePhone(v));
