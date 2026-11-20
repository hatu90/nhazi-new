"use client";

import { safeNext, useAuth } from "@/client/auth/auth-provider";
import { PageSpinner } from "@/client/ui";
import { FormError } from "@/client/ui/form";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Stack";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PhoneStep } from "./phone-step";
import { RegisterStep } from "./register-step";

export function Steps() {
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
