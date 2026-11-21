import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Building2, FileText, Gauge, Smartphone, Wrench, Receipt, Check } from "lucide-react";

const tints = [
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "bg-violet-500/15 text-violet-600 dark:text-violet-400",
];

const features = [
  { icon: Building2, title: "Properties & units", body: "Set up buildings, rooms, shared services and meters once, then reuse them for every lease." },
  { icon: FileText, title: "Leases that bill themselves", body: "Rent versions, deposits and agreements. Each billing period turns into an invoice automatically." },
  { icon: Gauge, title: "Metered utilities", body: "Record electricity and water readings with tiered pricing. Every figure traces back to the usage behind it." },
  { icon: Smartphone, title: "A portal for tenants", body: "Tenants sign in with their phone to see their lease, due dates and invoices, and report payments." },
  { icon: Wrench, title: "Repair requests", body: "Tenants send requests from their dashboard, so nothing gets lost in a chat thread." },
  { icon: Receipt, title: "Invoices that add up", body: "Rent, utilities and extras in đồng, with a clear breakdown your tenants can actually read." },
];

const steps = [
  { n: "1", title: "Add your property", body: "Create buildings, units, services and meters." },
  { n: "2", title: "Start a lease", body: "Invite the tenant by phone number and set the rent." },
  { n: "3", title: "Enter readings, close the period", body: "Review the invoice and send it. The tenant sees it instantly." },
];

const lines = [
  ["Rent — March", "5.000.000 ₫"],
  ["Electricity · 142 kWh", "412.300 ₫"],
  ["Water · 9 m³", "135.000 ₫"],
  ["Internet", "100.000 ₫"],
];

function InvoiceMock() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-current/15 border-t-4 border-t-indigo-500 p-5 shadow-xl shadow-indigo-500/10">
      <HStack justify="between" align="center">
        <VStack gap={0.5}>
          <Text size="sm" color="secondary">Invoice · Room 204</Text>
          <Heading level={3}>March 2026</Heading>
        </VStack>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-xs font-medium">
          <Check size={12} /> Issued
        </span>
      </HStack>
      <div className="my-4 border-t border-current/10" />
      <VStack gap={3}>
        {lines.map(([label, amount]) => (
          <HStack key={label} justify="between">
            <Text size="sm" color="secondary">{label}</Text>
            <Text size="sm">{amount}</Text>
          </HStack>
        ))}
      </VStack>
      <div className="my-4 border-t border-current/10" />
      <HStack justify="between" align="center">
        <Text>Total due</Text>
        <Heading level={3}>5.647.300 ₫</Heading>
      </HStack>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5">
      {/* Hero */}
      <section className="relative grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-96 bg-gradient-to-br from-indigo-500/15 via-transparent to-emerald-500/10 blur-2xl" />
        <VStack gap={6}>
          <VStack gap={3}>
            <span className="w-fit rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">For landlords, property managers and their tenants</span>
            <Heading level={1} type="display-2">The all-in-one platform for managing rental property.</Heading>
            <Text color="secondary" size="lg">
              Nhazi keeps properties, leases, meter readings and invoices in one place — and gives every tenant a simple view of theirs.
            </Text>
          </VStack>
          <HStack gap={3} wrap="wrap">
            <Button variant="primary" label="I have a property for rent" size="lg" href="/auth?next=/admin" />
            <Button label="I'm a tenant" size="lg" variant="secondary" href="/auth?next=/dashboard" />
          </HStack>
        </VStack>
        <div className="flex justify-center md:justify-end">
          <InvoiceMock />
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <VStack gap={2} maxWidth={560} className="mb-10">
          <Heading level={2} type="display-3">Everything a rental needs, nothing it doesn&apos;t.</Heading>
          <Text color="secondary">From the first lease to the last invoice, the work lives in one place.</Text>
        </VStack>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-2xl border border-current/10 p-6 transition hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-lg">
              <VStack gap={3}>
                <span className={`flex size-11 items-center justify-center rounded-xl ${tints[i]}`}>
                  <Icon size={22} aria-hidden />
                </span>
                <VStack gap={1.5}>
                  <Heading level={3}>{title}</Heading>
                  <Text color="secondary">{body}</Text>
                </VStack>
              </VStack>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-12">
        <Heading level={2} type="display-3" className="mb-10">Up and running in three steps</Heading>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <VStack key={s.n} gap={2}>
              <span className="flex size-9 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold text-white">{s.n}</span>
              <Heading level={3}>{s.title}</Heading>
              <Text color="secondary">{s.body}</Text>
            </VStack>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="my-12 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 via-sky-500/10 to-emerald-500/15 px-6 py-14 text-center">
        <VStack gap={4} align="center">
          <Heading level={2} type="display-3">Give your rentals a home of their own.</Heading>
          <Text color="secondary">Set up your first property in minutes.</Text>
          <HStack gap={3} wrap="wrap" justify="center">
            <Button variant="primary" label="Get started" size="lg" href="/auth?next=/admin" />
            <Button label="Learn more" size="lg" variant="secondary" href="/about" />
          </HStack>
        </VStack>
      </section>
    </div>
  );
}
