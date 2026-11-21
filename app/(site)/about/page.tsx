import type { Metadata } from "next";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

export const metadata: Metadata = { title: "About" };

const principles = [
  { title: "Clear to everyone", body: "Owners and tenants look at the same lease and the same invoice. No surprises, no guessing what a number means." },
  { title: "Every figure has a source", body: "Rent, meter readings and tiered utility prices are recorded, so any amount on an invoice can be traced back to the usage behind it." },
  { title: "Built for local rentals", body: "Amounts are in Vietnamese đồng (₫), with cash and bank-transfer payments, shared services and metered utilities handled the way rentals really work." },
  { title: "You stay in control", body: "Owners decide what is billed and when. Nhazi records invoices and reported payments — it never moves money on your behalf." },
];

const audiences = [
  { title: "For owners and managers", body: "Set up each property, its units, services and meters. Create leases and agreements, record readings, close billing periods and issue invoices. Invite your team and give each person the access they need." },
  { title: "For tenants", body: "Get invited by phone number and see your own lease, invoices and due dates in a dashboard of your own. Report a payment, or send a repair request, in a few taps." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5">
      <VStack gap={4} maxWidth={680} paddingBlock={10}>
        <Text size="sm" color="secondary">About Nhazi</Text>
        <Heading level={1} type="display-2">Renting should be simple for both sides of the key.</Heading>
        <Text color="secondary" size="lg">
          Nhazi is a platform for landlords and property managers who rent out apartments, houses and offices — and for the tenants who live in them. It replaces
          scattered spreadsheets, chat threads and paper notes with one clear record.
        </Text>
      </VStack>

      <div className="grid gap-4 pb-12 md:grid-cols-2">
        {audiences.map((a) => (
          <div key={a.title} className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6">
            <VStack gap={2}>
              <Heading level={2}>{a.title}</Heading>
              <Text color="secondary">{a.body}</Text>
            </VStack>
          </div>
        ))}
      </div>

      <VStack gap={6} paddingBlock={8}>
        <Heading level={2} type="display-3">What we care about</Heading>
        <div className="grid gap-8 sm:grid-cols-2">
          {principles.map((p) => (
            <VStack key={p.title} gap={1.5}>
              <Heading level={3}>{p.title}</Heading>
              <Text color="secondary">{p.body}</Text>
            </VStack>
          ))}
        </div>
      </VStack>

      <section className="my-12 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 via-sky-500/10 to-emerald-500/15 px-6 py-12 text-center">
        <VStack gap={4} align="center">
          <Heading level={2} type="display-3">Try it with your first property.</Heading>
          <HStack gap={3} wrap="wrap" justify="center">
            <Button variant="primary" label="I have a property for rent" size="lg" href="/auth?next=/admin" />
            <Button label="I'm a tenant" size="lg" variant="secondary" href="/auth?next=/dashboard" />
          </HStack>
        </VStack>
      </section>
    </div>
  );
}
