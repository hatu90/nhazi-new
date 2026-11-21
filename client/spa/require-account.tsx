"use client";

import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router";
import { loginUrl, useAuth } from "@/client/auth/auth-provider";
import { ErrorBox, PageSpinner } from "@/client/ui";

/**
 * Gate for both SPAs. Anonymous and not-yet-registered users leave the SPA for the (server-rendered) /auth page,
 * which sends them back to where they were.
 */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { state, reload } = useAuth();
  const location = useLocation();
  const needsLogin = state.status === "anonymous" || state.status === "unregistered";

  useEffect(() => {
    if (needsLogin) window.location.replace(loginUrl(window.location.pathname + location.search));
  }, [needsLogin, location.search]);

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorBox error={state.error} retry={() => void reload()} />
      </div>
    );
  }
  if (state.status !== "ready") return <PageSpinner />;
  return <>{children}</>;
}
