import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getTranslations } from "next-intl/server";
import { HeroSearch } from "./hero-search";

/** Landing-page hero copy: badge, headline, subtitle, property search and the landlord call to action. */
export async function HeroIntro() {
  const t = await getTranslations("Home");
  return (
    <VStack gap={6}>
      <VStack gap={3}>
        <span className="w-fit rounded-full bg-[#357d9d]/10 px-3 py-1 text-sm font-medium text-[#2a6a86] dark:text-[#8ecbe6]">{t("badge")}</span>
        <Heading level={1} type="display-2">{t("title")}</Heading>
        <Text color="secondary" size="lg">{t("subtitle")}</Text>
      </VStack>
      <HeroSearch />
      <div role="separator" className="flex items-center gap-3">
        <span className="h-px flex-1 bg-current/15" />
        <Text size="sm" color="secondary">{t("or")}</Text>
        <span className="h-px flex-1 bg-current/15" />
      </div>
      <HStack gap={3} wrap="wrap">
        <Button variant="primary" label={t("ctaLandlord")} size="lg" href="/auth?next=/admin" />
      </HStack>
    </VStack>
  );
}
