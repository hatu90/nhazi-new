"use client";

import { useTranslations } from "next-intl";
import { confirmOtp, firebaseConfigured, sendOtp } from "@/client/auth/session";
import { isValidPhone, normalizePhone } from "@/client/lib/format";
import { FormError } from "@/client/ui/form";
import { FText } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

export function PhoneStep({ onDone }: { onDone: () => Promise<void> }) {
  const t = useTranslations("Auth");
  const c = useTranslations("Common");
  const form = useForm<{ phone: string; code: string }>({ defaultValues: { phone: "", code: "" } });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const recaptcha = useRef<HTMLDivElement>(null);
  const phone = useWatch({ control: form.control, name: "phone" });

  const run = async (v: { phone: string; code: string }) => {
    setError(null);
    try {
      if (sent) {
        await confirmOtp(v.code.trim());
        return await onDone();
      }
      const e164 = normalizePhone(v.phone);
      if (!firebaseConfigured) throw new Error(t("notConfigured"));
      await sendOtp(e164, recaptcha.current!);
      setSent(true);
    } catch (e) {
      setError(e);
    }
  };

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void form.handleSubmit(run)(); }}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={1}>{t("title")}</Heading>
        </VStack>
        {sent ? (
          <FText control={form.control} name="code" label={t("code")} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required width="100%" />
        ) : (
          <FText control={form.control} name="phone" label={c("phone")} type="tel" autoComplete="tel" placeholder="0912 345 678" autoFocus required rules={{ validate: (v) => isValidPhone(String(v)) || t("phoneExample") }} width="100%" />
        )}
        <FormError error={error} />
        <Button variant="primary" type="submit" label={sent ? t("verify") : t("sendCode")} isLoading={form.formState.isSubmitting} />
        {sent && <Button label={t("changeNumber")} variant="ghost" onClick={() => { setSent(false); form.setValue("code", ""); }} />}
      </VStack>
      <div ref={recaptcha} />
    </form>
  );
}
