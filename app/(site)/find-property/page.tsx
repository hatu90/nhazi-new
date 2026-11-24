import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { formatMoney } from "@/client/lib/format";
import { PropertySearchForm } from "@/client/site/property-search-form";
import { CardGridSkeleton, Empty, Tag } from "@/client/ui";
import { getContainer } from "@/server/container";
import { propertySearchQuerySchema } from "@/server/modules/property/property.schema";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const PAGE_SIZE = 12;

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";

async function Results({
  searchParams,
}: {
  searchParams: PageProps<"/find-property">["searchParams"];
}) {
  const t = await getTranslations("Site");
  const e = await getTranslations("Enums");
  const sp = (await searchParams) as Params;
  const raw = {
    q: first(sp.q),
    category: first(sp.category),
    page: first(sp.page),
  };
  const parsed = propertySearchQuerySchema.safeParse({
    q: raw.q || undefined,
    category: raw.category || undefined,
    page: raw.page || undefined,
    pageSize: PAGE_SIZE,
  });
  const results = parsed.success
    ? await getContainer().searchProperties.execute(parsed.data)
    : null;

  const href = (page: number) => {
    const p = new URLSearchParams();
    for (const k of ["q", "category"] as const) if (raw[k]) p.set(k, raw[k]);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return `/find-property${s ? `?${s}` : ""}`;
  };

  return !results ? (
    <Empty title={t("invalidFilters")} />
  ) : results.items.length === 0 ? (
    <Empty title={t("noResults")} />
  ) : (
    <VStack gap={4}>
      <div className="grid gap-4 sm:grid-cols-2">
        {results.items.map((p) => {
          const imageUrl = p.headerImage ? getContainer().publicFileUrl(p.headerImage) : null;
          const price =
            p.rentPriceFrom == null
              ? p.rentNegotiable
                ? t("negotiable")
                : "—"
              : p.rentPriceTo && p.rentPriceTo !== p.rentPriceFrom
                ? `${formatMoney(p.rentPriceFrom)} – ${formatMoney(p.rentPriceTo)}`
                : formatMoney(p.rentPriceFrom);
          return (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="group block overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/5 dark:bg-white/10">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={p.name}
                    loading="lazy"
                    className="absolute inset-0 m-0 block h-full w-full max-w-none object-cover p-0 scale-[1.06] transition duration-300 group-hover:scale-[1.12]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-black/25 dark:text-white/25">
                    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <Tag label={e(`category.${p.category}`)} tone="info" />
                </div>
                {p.verificationStatus !== "none" && (
                  <div className="absolute right-3 top-3">
                    <Tag label={e(`verificationStatus.${p.verificationStatus}`)} tone={p.verificationStatus === "verified" ? "success" : "info"} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 p-4">
                <Heading level={3}>{p.name}</Heading>
                <Text color="secondary" size="sm">
                  {p.street}, {p.ward.name}, {p.province.name}
                </Text>
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/10">
                  <Text size="sm" color="secondary">
                    {t("unitCount", { count: p.unitCount })}
                  </Text>
                  <span className="text-sm font-semibold">{price}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      {results.total > results.pageSize && (
        <HStack justify="between" align="center">
          <Text size="sm" color="secondary">
            {t("pageOf", { page: results.page, total: Math.ceil(results.total / results.pageSize) })}
          </Text>
          <HStack gap={2}>
            {results.page > 1 && (
              <Button
                label={t("previous")}
                variant="secondary"
                href={href(results.page - 1)}
              />
            )}
            {results.page * results.pageSize < results.total && (
              <Button
                label={t("next")}
                variant="secondary"
                href={href(results.page + 1)}
              />
            )}
          </HStack>
        </HStack>
      )}
    </VStack>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("findProperty") };
}

export default async function FindPropertyPage({
  searchParams,
}: PageProps<"/find-property">) {
  const t = await getTranslations("Site");
  return (
    <div className="mx-auto w-full max-w-4xl px-2 py-4 sm:px-5 sm:py-10">
      <VStack gap={5}>
        <VStack gap={1}>
          <Heading level={1}>{t("findTitle")}</Heading>
          <Text color="secondary">{t("findSubtitle")}</Text>
        </VStack>
        <Card padding={5} variant="muted">
          <Suspense>
            <PropertySearchForm />
          </Suspense>
        </Card>
        <Suspense fallback={<CardGridSkeleton count={6} />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </VStack>
    </div>
  );
}
