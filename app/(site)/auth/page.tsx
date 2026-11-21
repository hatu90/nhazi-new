import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFlow } from "@/client/site/auth-flow";

export const metadata: Metadata = { title: "Sign in" };

export default function AuthPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <AuthFlow />
        </Suspense>
      </div>
    </div>
  );
}
