import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { HeroIntro } from "@/client/site/hero-intro";
import { getTranslations } from "next-intl/server";
import { Building2, FileText, Gauge, Smartphone, Wrench, Receipt, Check } from "lucide-react";

const tints = [
  "bg-[#357d9d]/15 text-[#2a6a86] dark:text-[#8ecbe6]",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-teal-500/15 text-teal-600 dark:text-teal-400",
];

const featureIcons = [Building2, FileText, Gauge, Smartphone, Wrench, Receipt];
type Item = { title: string; body: string };

const lineAmounts = ["5.000.000 ₫", "412.300 ₫", "135.000 ₫", "100.000 ₫"];

async function InvoiceMock() {
  const t = await getTranslations("Home");
  const lines = t.raw("mockLines") as string[];
  return (
    <div className="w-full max-w-sm rounded-2xl border border-current/15 border-t-4 border-t-[#357d9d] p-5 shadow-xl shadow-[#357d9d]/10">
      <HStack justify="between" align="center">
        <VStack gap={0.5}>
          <Text size="sm" color="secondary">{t("mockInvoice")}</Text>
          <Heading level={3}>{t("mockMonth")}</Heading>
        </VStack>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
          <Check size={12} /> {t("mockIssued")}
        </span>
      </HStack>
      <div className="my-4 border-t border-current/10" />
      <VStack gap={3}>
        {lines.map((line, i) => (
          <HStack key={line} justify="between">
            <Text size="sm" color="secondary">{line}</Text>
            <Text size="sm">{lineAmounts[i]}</Text>
          </HStack>
        ))}
      </VStack>
      <div className="my-4 border-t border-current/10" />
      <HStack justify="between" align="center">
        <Text>{t("mockTotal")}</Text>
        <Heading level={3}>5.647.300 ₫</Heading>
      </HStack>
    </div>
  );
}

export default async function HomePage() {
  const t = await getTranslations("Home");
  const features = t.raw("features") as Item[];
  const steps = t.raw("steps") as Item[];
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-5">
      {/* Hero */}
      <section className="relative grid items-center gap-8 py-10 md:grid-cols-2 md:gap-12 md:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-96 bg-gradient-to-br from-[#357d9d]/15 via-transparent to-emerald-500/10 blur-2xl" />
        <HeroIntro />
        <div className="flex justify-center md:justify-end">
          <InvoiceMock />
        </div>
      </section>

      {/* Features */}
      <section className="py-4">
        <VStack gap={2} maxWidth={560} className="mb-6 sm:mb-10">
          <Heading level={2} type="display-3">{t("featuresTitle")}</Heading>
          <Text color="secondary">{t("featuresSubtitle")}</Text>
        </VStack>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title, body }, i) => {
            const Icon = featureIcons[i];
            return (
            <div key={title} className="rounded-2xl border border-current/10 p-6 transition hover:-translate-y-0.5 hover:border-[#357d9d]/40 hover:shadow-lg">
              <VStack gap={3}>
                <span className={`flex size-11 items-center justify-center rounded-xl ${tints[i]}`}>
                  <Icon size={22} aria-hidden />
                </span>
                <VStack gap={1.5}>
                  <Heading level={3}>{title}</Heading>
                  <Text color="secondary">{body}</Text>
                </VStack>
              </VStack>
            </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="py-8 sm:py-12">
        <Heading level={2} type="display-3" className="mb-6 sm:mb-10">{t("stepsTitle")}</Heading>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <VStack key={s.title} gap={2}>
              <span className="flex size-9 items-center justify-center rounded-full bg-[#357d9d] text-sm font-semibold text-white">{i + 1}</span>
              <Heading level={3}>{s.title}</Heading>
              <Text color="secondary">{s.body}</Text>
            </VStack>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="my-12 rounded-3xl border border-[#357d9d]/25 bg-gradient-to-br from-[#357d9d]/15 via-cyan-400/10 to-emerald-500/15 px-4 py-10 text-center sm:px-6 sm:py-14">
        <VStack gap={4} align="center">
          <Heading level={2} type="display-3">{t("ctaTitle")}</Heading>
          <Text color="secondary">{t("ctaSubtitle")}</Text>
          <HStack gap={3} wrap="wrap" justify="center">
            <Button variant="primary" label={t("getStarted")} size="lg" href="/auth?next=/dashboard" />
            <Button label={t("learnMore")} size="lg" variant="secondary" href="/about" />
          </HStack>
        </VStack>
      </section>
    </div>
  );
}
