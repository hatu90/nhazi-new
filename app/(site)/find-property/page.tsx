import type { Metadata } from "next";
import { formatMoney, label as humanize } from "@/client/lib/format";
import { Empty, Tag } from "@/client/ui";
import { getContainer } from "@/server/container";
import { propertySearchQuerySchema } from "@/server/modules/property/property.schema";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

export const metadata: Metadata = { title: "Find a property" };

const categories = ["apartment", "house", "mini_apartment", "office"];
const PAGE_SIZE = 12;
const inputClass = "w-full rounded-md border border-[var(--border-color,#d4d4d8)] bg-transparent px-3 py-2 text-sm";

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function FindPropertyPage({ searchParams }: PageProps<"/find-property">) {
  const sp = (await searchParams) as Params;
  const raw = { q: first(sp.q), category: first(sp.category), minPrice: first(sp.minPrice), maxPrice: first(sp.maxPrice), page: first(sp.page) };
  const parsed = propertySearchQuerySchema.safeParse({
    q: raw.q || undefined,
    category: raw.category || undefined,
    minPrice: raw.minPrice || undefined,
    maxPrice: raw.maxPrice || undefined,
    page: raw.page || undefined,
    pageSize: PAGE_SIZE,
  });
  const results = parsed.success ? await getContainer().searchProperties.execute(parsed.data) : null;

  const href = (page: number) => {
    const p = new URLSearchParams();
    for (const k of ["q", "category", "minPrice", "maxPrice"] as const) if (raw[k]) p.set(k, raw[k]);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return `/find-property${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <VStack gap={5}>
        <VStack gap={1}>
          <Heading level={1}>Find a property</Heading>
          <Text color="secondary">Search places to rent.</Text>
        </VStack>
        <Card padding={5} variant="muted">
          <form method="GET" action="/find-property">
            <VStack gap={3}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">Name or address
                  <input name="q" type="search" defaultValue={raw.q} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">Category
                  <select name="category" defaultValue={raw.category} className={inputClass}>
                    <option value="">Any</option>
                    {categories.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">Min rent (₫)
                  <input name="minPrice" type="number" min={0} defaultValue={raw.minPrice} className={inputClass} />
                </label>
                <label className="flex flex-col gap-1 text-sm">Max rent (₫)
                  <input name="maxPrice" type="number" min={0} defaultValue={raw.maxPrice} className={inputClass} />
                </label>
              </div>
              <HStack gap={2}>
                <Button variant="primary" label="Search" type="submit" />
                <Button label="Clear" variant="ghost" href="/find-property" />
              </HStack>
            </VStack>
          </form>
        </Card>

        {!results ? (
          <Empty title="Invalid filters" hint="Check the rent range and try again." />
        ) : results.items.length === 0 ? (
          <Empty title="No properties found" hint="Try different filters." />
        ) : (
          <VStack gap={4}>
            <div className="grid gap-4 sm:grid-cols-2">
              {results.items.map((p) => (
                <Card key={p.id} padding={4}>
                  <VStack gap={2}>
                    <HStack justify="between" align="start" gap={2}>
                      <Heading level={3}>{p.name}</Heading>
                      <Tag label={humanize(p.category)} tone="info" />
                    </HStack>
                    <Text color="secondary" size="sm">{p.street}, {p.ward.name}, {p.province.name}</Text>
                    <HStack justify="between">
                      <Text size="sm" color="secondary">{p.unitCount} {p.unitCount === 1 ? "unit" : "units"}</Text>
                      <Text size="sm">
                        {p.rentNegotiable && p.rentPriceFrom == null
                          ? "Negotiable"
                          : p.rentPriceFrom == null
                            ? "—"
                            : p.rentPriceTo && p.rentPriceTo !== p.rentPriceFrom
                              ? `${formatMoney(p.rentPriceFrom)} – ${formatMoney(p.rentPriceTo)}`
                              : formatMoney(p.rentPriceFrom)}
                      </Text>
                    </HStack>
                  </VStack>
                </Card>
              ))}
            </div>
            {results.total > results.pageSize && (
              <HStack justify="between" align="center">
                <Text size="sm" color="secondary">Page {results.page} of {Math.ceil(results.total / results.pageSize)}</Text>
                <HStack gap={2}>
                  {results.page > 1 && <Button label="Previous" variant="secondary" href={href(results.page - 1)} />}
                  {results.page * results.pageSize < results.total && <Button label="Next" variant="secondary" href={href(results.page + 1)} />}
                </HStack>
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </div>
  );
}
