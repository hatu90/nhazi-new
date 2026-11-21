import { AuthProvider } from "@/client/auth/auth-provider";
import { AccountMenu } from "@/client/site/account-menu";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { getTranslations } from "next-intl/server";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("Common");
  return (
    <AuthProvider>
      <header>
        <HStack align="center" justify="between" paddingInline={5} paddingBlock={3} gap={3}>
          <Button label="Nhazi" variant="ghost" href="/" />
          <HStack align="center" gap={1}>
            <Button label={t("about")} variant="ghost" href="/about" />
            <Button label={t("terms")} variant="ghost" href="/term" />
            <AccountMenu />
          </HStack>
        </HStack>
        <Divider />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer>
        <Divider />
        <HStack justify="between" align="center" paddingInline={5} paddingBlock={4} wrap="wrap" gap={3}>
          <Text color="secondary" size="sm">© Nhazi</Text>
          <HStack gap={1}>
            <Button label={t("about")} variant="ghost" size="sm" href="/about" />
            <Button label={t("terms")} variant="ghost" size="sm" href="/term" />
          </HStack>
        </HStack>
      </footer>
    </AuthProvider>
  );
}
