import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Check } from "lucide-react";

type Item = { title: string; body: string };
type Plan = {
  name: string;
  tagline: string;
  price: string;
  yearly: string;
  cta: string;
  highlight?: boolean;
  features: string[];
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("pricing") };
}

export default async function PricingPage() {
  const t = await getTranslations("Pricing");
  const plans = t.raw("plans") as Plan[];
  const includes = t.raw("includes") as Item[];
  const faqs = t.raw("faqs") as Item[];
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-5">
      <VStack gap={4} maxWidth={680} paddingBlock={10}>
        <Text size="sm" color="secondary">{t("eyebrow")}</Text>
        <Heading level={1} type="display-2">{t("heading")}</Heading>
        <Text color="secondary" size="lg">{t("lead")}</Text>
      </VStack>

      <div className="grid gap-4 pb-12 md:grid-cols-3">
        {plans.map((p) => {
          const free = p.price.startsWith("0");
          return (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                p.highlight
                  ? "border-[#357d9d] bg-[#357d9d]/5 shadow-xl shadow-[#357d9d]/10"
                  : "border-current/15"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-[#357d9d] px-3 py-1 text-xs font-medium text-white">
                  {t("popular")}
                </span>
              )}
              <VStack gap={4} className="flex-1">
                <VStack gap={1}>
                  <Heading level={2}>{p.name}</Heading>
                  <Text color="secondary">{p.tagline}</Text>
                </VStack>
                <VStack gap={1}>
                  <HStack align="end" gap={1.5}>
                    <Heading level={3} type="display-3">{p.price}</Heading>
                    {!free && <Text color="secondary">{t("monthly")}</Text>}
                  </HStack>
                  <Text size="sm" color="secondary">
                    {free ? t("free") : t("yearlyNote", { price: p.yearly })}
                  </Text>
                </VStack>
                <Button
                  variant={p.highlight ? "primary" : "secondary"}
                  size="lg"
                  label={p.cta}
                  href="/auth?next=/admin"
                />
                <VStack gap={3} className="border-t border-current/10 pt-4">
                  {p.features.map((f) => (
                    <HStack key={f} gap={2} align="start">
                      <Check size={16} aria-hidden className="mt-1 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <Text size="sm">{f}</Text>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            </div>
          );
        })}
      </div>

      <VStack gap={6} paddingBlock={8}>
        <Heading level={2} type="display-3">{t("compareTitle")}</Heading>
        <div className="grid gap-8 sm:grid-cols-3">
          {includes.map((i) => (
            <VStack key={i.title} gap={1.5}>
              <Heading level={3}>{i.title}</Heading>
              <Text color="secondary">{i.body}</Text>
            </VStack>
          ))}
        </div>
      </VStack>

      <VStack gap={6} paddingBlock={8}>
        <Heading level={2} type="display-3">{t("faqTitle")}</Heading>
        <div className="grid gap-8 sm:grid-cols-2">
          {faqs.map((f) => (
            <VStack key={f.title} gap={1.5}>
              <Heading level={3}>{f.title}</Heading>
              <Text color="secondary">{f.body}</Text>
            </VStack>
          ))}
        </div>
      </VStack>

      <section className="my-12 rounded-3xl border border-[#357d9d]/25 bg-gradient-to-br from-[#357d9d]/15 via-cyan-400/10 to-emerald-500/15 px-6 py-12 text-center">
        <VStack gap={4} align="center">
          <Heading level={2} type="display-3">{t("ctaTitle")}</Heading>
          <Button variant="primary" size="lg" label={t("plans.0.cta")} href="/auth?next=/admin" />
        </VStack>
      </section>
    </div>
  );
}
