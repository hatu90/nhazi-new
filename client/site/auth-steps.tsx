"use client";

import { safeNext, useAuth } from "@/client/auth/auth-provider";
import { PageSpinner } from "@/client/ui";
import { FormError } from "@/client/ui/form";
import { Card } from "@astryxdesign/core/Card";
import { VStack } from "@astryxdesign/core/Stack";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { PhoneStep } from "./phone-step";
import { RegisterStep } from "./register-step";

export function Steps() {
  const { state, reload } = useAuth();
  const next = safeNext(useSearchParams().get("next"));

  useEffect(() => {
    // /dashboard and /admin are separate SPAs behind a catch-all route: leave with a full page load (as RequireAccount does),
    // a soft router.replace can stall on mobile browsers.
    if (state.status === "ready") window.location.replace(next);
  }, [state.status, next]);

  if (state.status === "loading" || state.status === "ready") return <PageSpinner />;

  return (
    <Card padding={6}>
      {state.status === "unregistered" ? (
        <RegisterStep phone={state.phone} initialName={state.displayName ?? ""} onDone={reload} />
      ) : (
        <VStack gap={4}>
          {state.status === "error" && <FormError error={state.error} />}
          <PhoneStep onDone={reload} />
        </VStack>
      )}
    </Card>
  );
}
