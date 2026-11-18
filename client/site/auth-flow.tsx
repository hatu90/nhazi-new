"use client";

import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { AuthProvider, safeNext, useAuth } from "@/client/auth/auth-provider";
import { confirmOtp, firebaseConfigured, sendOtp } from "@/client/auth/session";
import { api, errorMessage } from "@/client/lib/api";
import { isValidPhone, normalizePhone } from "@/client/lib/format";
import { PageSpinner } from "@/client/ui";
import { FormError } from "@/client/ui/form";
import { FText } from "@/client/ui/rhf";

export function AuthFlow() {
  return (
    <AuthProvider>
      <Steps />
    </AuthProvider>
  );
}

function Steps() {
  const { state, reload } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  useEffect(() => {
    if (state.status === "ready") router.replace(next);
  }, [state.status, next, router]);

  if (state.status === "loading" || state.status === "ready") return <PageSpinner />;

  return (
    <Card padding={6}>
      {state.status === "unregistered" ? (
        <RegisterStep phone={state.phone} initialName={state.displayName ?? ""} onDone={reload} />
      ) : (
        <VStack gap={4}>
          {state.status === "error" && <FormError error={new Error(state.message)} />}
          <PhoneStep onDone={reload} />
        </VStack>
      )}
    </Card>
  );
}

function PhoneStep({ onDone }: { onDone: () => Promise<void> }) {
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

function RegisterStep({ phone, initialName, onDone }: { phone: string | null; initialName: string; onDone: () => Promise<void> }) {
  const form = useForm<{ name: string }>({ defaultValues: { name: initialName } });
  const [error, setError] = useState<unknown>(null);

  const submit = form.handleSubmit(async (v) => {
    setError(null);
    if (!phone) return setError(new Error("Your sign-in has no verified phone number."));
    try {
      await api("/api/public/register", { method: "POST", body: { displayName: v.name.trim(), phoneNumber: phone } });
      await onDone();
    } catch (err) {
      setError(new Error(errorMessage(err)));
    }
  });

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <VStack gap={4}>
        <VStack gap={1}>
          <Heading level={1}>Welcome — what should we call you?</Heading>
          <Text color="secondary">Creating an account for {phone}.</Text>
        </VStack>
        <FText control={form.control} name="name" label="Your name" required autoFocus width="100%" />
        <FormError error={error} />
        <Button type="submit" label="Create account" isLoading={form.formState.isSubmitting} />
      </VStack>
    </form>
  );
}
