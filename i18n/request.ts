import { headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, hasLocale, type Locale } from "./config";

/** Pick the first supported language from the browser's Accept-Language header. */
function detectLocale(header: string | null): Locale {
  const langs = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { base: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return langs.find((l) => hasLocale(l.base))?.base as Locale ?? defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = detectLocale((await headers()).get("accept-language"));
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
