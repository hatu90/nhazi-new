"use client";

import { AuthProvider } from "@/client/auth/auth-provider";
import { Steps } from "./auth-steps";

export function AuthFlow() {
  return (
    <AuthProvider>
      <Steps />
    </AuthProvider>
  );
}
