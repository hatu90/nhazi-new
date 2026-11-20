"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/client/auth/auth-provider";
import { ApiError } from "@/client/lib/api";
import { SpaLinks } from "./spa-links";

export function SpaProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SpaLinks>
        <AuthProvider>{children}</AuthProvider>
      </SpaLinks>
    </QueryClientProvider>
  );
}
