import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

type Item = { title: string; body: string };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("about") };
}

export default async function AboutPage() {
  const t = await getTranslations("About");
  const principles = t.raw("principles") as Item[];
  const audiences = t.raw("audiences") as Item[];
  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-5">
      <VStack gap={4} maxWidth={680} paddingBlock={10}>
        <Text size="sm" color="secondary">{t("eyebrow")}</Text>
        <Heading level={1} type="display-2">{t("heading")}</Heading>
        <Text color="secondary" size="lg">{t("lead")}</Text>
      </VStack>

      <div className="grid gap-4 pb-12 md:grid-cols-2">
        {audiences.map((a) => (
          <div key={a.title} className="rounded-2xl border border-[#357d9d]/25 bg-[#357d9d]/5 p-6">
            <VStack gap={2}>
              <Heading level={2}>{a.title}</Heading>
              <Text color="secondary">{a.body}</Text>
            </VStack>
          </div>
        ))}
      </div>

      <VStack gap={6} paddingBlock={8}>
        <Heading level={2} type="display-3">{t("principlesTitle")}</Heading>
        <div className="grid gap-8 sm:grid-cols-2">
          {principles.map((p) => (
            <VStack key={p.title} gap={1.5}>
              <Heading level={3}>{p.title}</Heading>
              <Text color="secondary">{p.body}</Text>
            </VStack>
          ))}
        </div>
      </VStack>

      <section className="my-12 rounded-3xl border border-[#357d9d]/25 bg-gradient-to-br from-[#357d9d]/15 via-cyan-400/10 to-emerald-500/15 px-6 py-12 text-center">
        <VStack gap={4} align="center">
          <Heading level={2} type="display-3">{t("ctaTitle")}</Heading>
          <HStack gap={3} wrap="wrap" justify="center">
            <Button variant="primary" label={(await getTranslations("Home"))("ctaLandlord")} size="lg" href="/auth?next=/dashboard" />
            <Button label={(await getTranslations("Home"))("ctaTenant")} size="lg" variant="secondary" href="/auth?next=/dashboard" />
          </HStack>
        </VStack>
      </section>
    </div>
  );
}
