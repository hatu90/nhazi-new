import type { Metadata } from "next";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <VStack gap={4} maxWidth={640} paddingBlock={10} paddingInline={5} className="mx-auto w-full">
      <Heading level={1}>About Handly</Heading>
      <Text color="secondary">Handly is built for landlords and property managers who rent out apartments, houses and offices — and for the tenants who live in them.</Text>
      <Text color="secondary">
        Owners and their teams set up each property, its units, services and meters, create leases and issue invoices. Tenants are invited by phone number and see
        their own lease, invoices and requests in a dashboard of their own.
      </Text>
      <Text color="secondary">Amounts are in Vietnamese đồng (₫). Every figure on an invoice is written by a person and can be traced back to the usage behind it.</Text>
    </VStack>
  );
}
