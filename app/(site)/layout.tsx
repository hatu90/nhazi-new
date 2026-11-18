import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header>
        <HStack align="center" justify="between" paddingInline={5} paddingBlock={3} gap={3}>
          <Button label="Handly" variant="ghost" href="/" />
          <HStack align="center" gap={1}>
            <Button label="About" variant="ghost" href="/about" />
            <Button label="Terms" variant="ghost" href="/term" />
            <Button label="Sign in" href="/auth" />
          </HStack>
        </HStack>
        <Divider />
      </header>
      <main className="flex-1">{children}</main>
      <footer>
        <Divider />
        <HStack justify="between" align="center" paddingInline={5} paddingBlock={4} wrap="wrap" gap={3}>
          <Text color="secondary" size="sm">© Handly</Text>
          <HStack gap={1}>
            <Button label="About" variant="ghost" size="sm" href="/about" />
            <Button label="Terms" variant="ghost" size="sm" href="/term" />
          </HStack>
        </HStack>
      </footer>
    </>
  );
}
