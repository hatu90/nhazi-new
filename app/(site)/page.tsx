import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const features = [
  { title: "Properties & units", body: "Set up buildings, rooms, shared services and meters once, then reuse them for every lease." },
  { title: "Leases that bill themselves", body: "Rent versions, deposits, metered utilities with tiered pricing, and invoices that add up." },
  { title: "A portal for tenants", body: "Tenants sign in with their phone to see their lease, due dates and invoices, and to send repair requests." },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-5">
      <VStack gap={6} paddingBlock={10}>
        <VStack gap={3} maxWidth={640}>
          <Heading level={1} type="display-2">Run your rentals without the spreadsheet.</Heading>
          <Text color="secondary" size="lg">
            Nhazi keeps properties, leases, meter readings and invoices in one place — and gives every tenant a simple view of theirs.
          </Text>
        </VStack>
        <HStack gap={3} wrap="wrap">
          <Button label="Manage properties" size="lg" href="/auth?next=/admin" />
          <Button label="I'm a tenant" size="lg" variant="secondary" href="/auth?next=/dashboard" />
        </HStack>
      </VStack>
      <div className="grid gap-8 py-10 sm:grid-cols-3">
        {features.map((f) => (
          <VStack key={f.title} gap={1.5}>
            <Heading level={2}>{f.title}</Heading>
            <Text color="secondary">{f.body}</Text>
          </VStack>
        ))}
      </div>
    </div>
  );
}
