import type { Metadata } from "next";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Stack";

export const metadata: Metadata = { title: "Terms of use" };

const sections = [
  {
    title: "Using Nhazi",
    body: [
      "Nhazi is a tool for managing rental properties, leases, meter readings and invoices. You sign in with a verified phone number or another sign-in method linked to your account.",
      "You are responsible for activity under your account and for keeping your phone and sign-in details secure. Please give accurate information and use Nhazi only for lawful purposes.",
    ],
  },
  {
    title: "Accounts and roles",
    body: [
      "Property owners can invite team members and tenants. What each person can see and do depends on the role they are given, and owners are responsible for the access they grant.",
      "Tenants can see only the leases, invoices and requests they are a party to.",
    ],
  },
  {
    title: "Your data and privacy",
    body: [
      "Property owners control the data of their properties, including leases, readings and invoices. We use personal data, such as phone numbers and names, only to run the service, and we do not sell it.",
      "You can ask us to correct or delete your personal data, subject to records that owners and tenants need to keep for their lease.",
    ],
  },
  {
    title: "Invoices and payments",
    body: [
      "Invoices are issued by property owners or their teams, and the amounts are their responsibility. Nhazi records invoices and the payments reported against them.",
      "Nhazi does not collect, hold or transfer money on anyone's behalf. A payment reported by a tenant counts only once the owner confirms it.",
    ],
  },
  {
    title: "Agreements between owners and tenants",
    body: ["Leases and agreements are between the owner and the tenant. Nhazi helps record and present them but is not a party to them and does not give legal advice."],
  },
  {
    title: "Availability and liability",
    body: ["We work to keep Nhazi available and accurate, but the service is provided as is. To the extent the law allows, we are not liable for losses arising from outages, errors in data entered by users, or disputes between owners and tenants."],
  },
  {
    title: "Changes to these terms",
    body: ["We may update these terms from time to time. Continuing to use Nhazi after a change means you accept the updated terms."],
  },
];

export default function TermPage() {
  return (
    <VStack gap={6} maxWidth={680} paddingBlock={10} paddingInline={5} className="mx-auto w-full">
      <VStack gap={2}>
        <Heading level={1} type="display-3">Terms of use</Heading>
        <Text color="secondary">The short version of how Nhazi works and what we each expect from the other.</Text>
        <Text color="secondary" size="sm">This summary should be reviewed by a legal professional before launch.</Text>
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
