import { localizeTitle, type IGeneratedTitle } from "@/lib/billing/generated-title";

const VI: Record<IGeneratedTitle["key"], (p: Record<string, string>) => string> = {
  moveIn: (p) => `Nhận nhà ${p.date}`,
  transition: (p) => `Hóa đơn ${p.date}`,
  closing: (p) => `Tất toán ${p.date}`,
  rent: (p) => `Tiền nhà ${p.date}`,
  deposit: () => "Tiền cọc",
  credit: (p) => `Hoàn lại: ${p.inner} (còn ${p.unused}/${p.total} ngày chưa dùng)`,
  heldCredit: () => "Trừ vào tiền cọc / tiền nhà / dịch vụ chưa dùng",
};

/** Notifications are written in Vietnamese: an invoice title the system generated in English is rendered the same way. */
export const invoiceLabel = (title: string) => localizeTitle(title, (key, params) => VI[key](params));
