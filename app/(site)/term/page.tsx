import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";

type Section = { title: string; body: string[] };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("terms") };
}

export default async function TermPage() {
  const t = await getTranslations("Terms");
  const sections = t.raw("sections") as Section[];
  return (
    <VStack gap={6} maxWidth={680} paddingBlock={10} paddingInline={5} className="mx-auto w-full">
      <VStack gap={2}>
        <Heading level={1} type="display-3">{t("title")}</Heading>
        <Text color="secondary">{t("lead")}</Text>
        <Text color="secondary" size="sm">{t("review")}</Text>
      </VStack>
      {sections.map((s, i) => (
        <VStack key={s.title} gap={2}>
          <Heading level={2}>{i + 1}. {s.title}</Heading>
          {s.body.map((p) => <Text key={p} color="secondary">{p}</Text>)}
        </VStack>
      ))}
    </VStack>
  );
}
