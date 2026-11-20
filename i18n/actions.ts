"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, hasLocale } from "./config";

export async function setLocale(locale: string) {
  if (!hasLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
