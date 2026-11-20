import type { Metadata } from "next";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";

export const metadata: Metadata = { title: "Terms of use" };

const sections = [
  { title: "Using Nhazi", body: "You sign in with a verified phone number. You are responsible for activity under your account and for keeping your phone secure." },
  { title: "Your data", body: "Property owners control the data of their properties. Tenants can see only the leases they are a party to. We do not sell personal data." },
  { title: "Invoices & payments", body: "Invoices are issued by property owners or their teams. Nhazi records them and the payments reported against them; it does not collect money on anyone's behalf." },
  { title: "Changes", body: "We may update these terms. Continuing to use Nhazi after a change means you accept the updated terms." },
];

export default function TermPage() {
  return (
    <VStack gap={5} maxWidth={640} paddingBlock={10} paddingInline={5} className="mx-auto w-full">
      <VStack gap={1}>
        <Heading level={1}>Terms of use</Heading>
        <Text color="secondary" size="sm">This is a summary placeholder — replace it with your reviewed legal text before launch.</Text>
      </VStack>
      {sections.map((s, i) => (
        <VStack key={s.title} gap={1}>
          <Heading level={2}>{i + 1}. {s.title}</Heading>
          <Text color="secondary">{s.body}</Text>
        </VStack>
      ))}
    </VStack>
  );
}
