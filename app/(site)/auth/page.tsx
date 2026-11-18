import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFlow } from "@/client/site/auth-flow";

export const metadata: Metadata = { title: "Sign in" };

export default function AuthPage() {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12">
      <Suspense fallback={null}>
        <AuthFlow />
      </Suspense>
    </div>
  );
}
