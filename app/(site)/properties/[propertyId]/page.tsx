import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { formatMoney, label as humanize } from "@/client/lib/format";
import { EnquiryButton } from "@/client/site/enquiry-button";
import { PageSpinner, Tag } from "@/client/ui";
import { Divider } from "@astryxdesign/core/Divider";
import Link from "next/link";
import { getContainer } from "@/server/container";
import type { IPublicServiceResponse } from "@/server/modules/property/property.schema";
import { NotFoundError } from "@/server/shared/errors";
import { idSchema } from "@/server/shared/schema";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const load = cache(async (propertyId: string) => {
  if (!idSchema.safeParse(propertyId).success) notFound();
  try {
    return await getContainer().getPublicProperty.execute({ propertyId });
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: PageProps<"/properties/[propertyId]">): Promise<Metadata> {
  const { propertyId } = await params;
  const p = await load(propertyId);
  return { title: p.name, description: `${p.street}, ${p.ward.name}, ${p.province.name}` };
}

const priceText = (s: IPublicServiceResponse) => {
  if (s.tiers.length === 0) return "—";
  const per = s.unitOfMeasure ? ` / ${s.unitOfMeasure}` : s.usageBase === "member" ? " / person" : s.usageBase === "lease" ? " / month" : "";
  const [first, ...rest] = s.tiers;
  return rest.length ? `from ${formatMoney(first.rate)}${per}` : `${formatMoney(first.rate)}${per}`;
};

export default function PropertyPageRoute({ params }: PageProps<"/properties/[propertyId]">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <PropertyPage params={params} />
    </Suspense>
  );
}

const rentText = (negotiable: boolean, from: number | null, to: number | null) =>
  negotiable && from == null ? "Negotiable" : from == null ? "—" : to && to !== from ? `${formatMoney(from)} – ${formatMoney(to)}` : formatMoney(from);

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding={5}>
      <VStack gap={3}>
        <Heading level={2}>{title}</Heading>
        {children}
      </VStack>
    </Card>
  );
}

async function PropertyPage({ params }: Pick<PageProps<"/properties/[propertyId]">, "params">) {
  const { propertyId } = await params;
  const p = await load(propertyId);
  const empty = new Set(p.emptyUnitIds);
  const available = p.units.filter((u) => empty.has(u.id));

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8">
      <VStack gap={5}>
        <Link href="/find-property" className="text-sm text-[var(--text-secondary,#71717a)] hover:underline">← Find a property</Link>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* main column */}
          <VStack gap={5}>
            <VStack gap={2}>
              <HStack gap={2} align="center" wrap="wrap">
                <Heading level={1}>{p.name}</Heading>
                <Tag label={humanize(p.category)} tone="info" />
              </HStack>
              <Text color="secondary">{p.street}, {p.ward.name}, {p.province.name}</Text>
              {p.referenceAddresses.length > 0 && (
                <HStack gap={2} wrap="wrap" align="center">
                  <Text size="sm" color="secondary">Near</Text>
                  {p.referenceAddresses.map((r) => <Tag key={r.slug} label={r.distance != null ? `${r.name} · ${r.distance} m` : r.name} />)}
                </HStack>
              )}
            </VStack>

            <Panel title={`Available units (${available.length})`}>
              {available.length === 0 ? (
                <Text color="secondary">No units are available right now. You can still send an enquiry.</Text>
              ) : (
                <VStack gap={0}>
                  {available.map((u, i) => (
                    <div key={u.id}>
                      {i > 0 && <Divider />}
                      <HStack justify="between" align="center" gap={3} paddingBlock={2}>
                        <VStack gap={0}>
                          <Text>{u.name}</Text>
                          <Text size="sm" color="secondary">
                            Floor {u.floor} · {u.area} m²
                            {u.bedrooms != null && ` · ${u.bedrooms} bed`}
                            {u.bathrooms != null && ` · ${u.bathrooms} bath`}
                          </Text>
                        </VStack>
                        <Text>{rentText(u.rentNegotiable, u.rentPrice, null)}</Text>
                      </HStack>
                    </div>
                  ))}
                </VStack>
              )}
            </Panel>

            <Panel title="Services">
              {p.services.length === 0 ? (
                <Text color="secondary">No services listed.</Text>
              ) : (
                <VStack gap={0}>
                  {p.services.map((s, i) => (
                    <div key={s.name}>
                      {i > 0 && <Divider />}
                      <HStack justify="between" align="start" gap={3} paddingBlock={2}>
                        <VStack gap={0}>
                          <Text>{s.name}</Text>
                          {s.description && <Text size="sm" color="secondary">{s.description}</Text>}
                        </VStack>
                        <Text>{priceText(s)}</Text>
                      </HStack>
                    </div>
                  ))}
                </VStack>
              )}
            </Panel>

            <div className="grid gap-5 sm:grid-cols-2">
              <Panel title="House rules">
                {p.rules.length === 0 ? (
                  <Text color="secondary">No rules listed.</Text>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-sm">{p.rules.map((r, i) => <li key={i}>{r}</li>)}</ul>
                )}
              </Panel>
              <Panel title="Provided items">
                {p.inventoryItems.length === 0 ? (
                  <Text color="secondary">No items listed.</Text>
                ) : (
                  <HStack gap={2} wrap="wrap">{p.inventoryItems.map((n) => <Tag key={n} label={n} />)}</HStack>
                )}
              </Panel>
            </div>
          </VStack>

          {/* summary + enquiry */}
          <div className="lg:sticky lg:top-6">
            <Card padding={5}>
              <VStack gap={4}>
                <VStack gap={1}>
                  <Text size="sm" color="secondary">Rent per month</Text>
                  <Heading level={2}>{rentText(p.rentNegotiable, p.rentPriceFrom, p.rentPriceTo)}</Heading>
                </VStack>
                <Divider />
                <HStack justify="between">
                  <Text color="secondary">Available units</Text>
                  <Text>{p.emptyUnitCount} of {p.units.length}</Text>
                </HStack>
                <EnquiryButton propertyId={p.id} units={available.map((u) => ({ id: u.id, name: u.name }))} />
              </VStack>
            </Card>
          </div>
        </div>
      </VStack>
    </div>
  );
}
