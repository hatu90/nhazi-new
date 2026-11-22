import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthFlow } from "@/client/site/auth-flow";


export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("signIn") };
}

export default function AuthPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-5 sm:py-12">
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <AuthFlow />
        </Suspense>
      </div>
    </div>
  );
}
