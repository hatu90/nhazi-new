"use client";

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
      if (!firebaseConfigured) throw new Error("Sign-in is not configured (missing NEXT_PUBLIC_FIREBASE_* variables).");
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
          <Heading level={1}>Sign in or create an account</Heading>
          <Text color="secondary">{sent ? `We sent a 6-digit code to ${normalizePhone(phone)}.` : "Use your phone number — we'll text you a code."}</Text>
        </VStack>
        {sent ? (
          <FText control={form.control} name="code" label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required width="100%" />
        ) : (
          <FText control={form.control} name="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="0912 345 678" autoFocus required rules={{ validate: (v) => isValidPhone(String(v)) || "Enter a valid phone number, e.g. 0912 345 678" }} width="100%" />
        )}
        <FormError error={error} />
        <Button type="submit" label={sent ? "Verify" : "Send code"} isLoading={form.formState.isSubmitting} />
        {sent && <Button label="Use a different number" variant="ghost" onClick={() => { setSent(false); form.setValue("code", ""); }} />}
        <div ref={recaptcha} />
      </VStack>
    </form>
  );
}
