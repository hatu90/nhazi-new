import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FeedbackAdmin } from "@/client/site/feedback-admin";
import { CATEGORY_TONE, FEEDBACK_CATEGORIES } from "@/client/site/feedback-categories";
import { FeedbackForm } from "@/client/site/feedback-form";
import { Empty, ListSkeleton, Tag } from "@/client/ui";
import { getContainer } from "@/server/container";
import { feedbackListQuerySchema } from "@/server/modules/feedback/feedback.schema";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

const PAGE_SIZE = 10;

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const dateFormat = (locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

async function Feedbacks({ searchParams }: { searchParams: PageProps<"/feedbacks">["searchParams"] }) {
  const t = await getTranslations("Feedbacks");
  const e = await getTranslations("Enums");
  const sp = (await searchParams) as Params;
  const raw = { category: first(sp.category), page: first(sp.page) };
  const parsed = feedbackListQuerySchema.safeParse({ category: raw.category || undefined, page: raw.page || undefined, pageSize: PAGE_SIZE });
  const results = parsed.success ? await getContainer().listFeedbacks.execute(parsed.data) : null;
  const fmt = dateFormat(await getLocale());

  const href = (category: string, page: number) => {
    const p = new URLSearchParams();
    if (category) p.set("category", category);
    if (page > 1) p.set("page", String(page));
    const s = p.toString();
    return `/feedbacks${s ? `?${s}` : ""}`;
  };

  return (
    <VStack gap={4}>
      <HStack gap={2} wrap="wrap">
        <Button label={t("all")} size="sm" variant={raw.category ? "secondary" : "primary"} href={href("", 1)} />
        {FEEDBACK_CATEGORIES.map((c) => (
          <Button key={c} label={e(`feedbackCategory.${c}`)} size="sm" variant={raw.category === c ? "primary" : "secondary"} href={href(c, 1)} />
        ))}
      </HStack>

      {!results ? (
        <Empty title={t("invalidFilters")} />
      ) : results.items.length === 0 ? (
        <Empty title={t("none")} />
      ) : (
        results.items.map((f) => (
          <article key={f.id} className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <HStack justify="between" align="center" gap={2} wrap="wrap">
              <HStack gap={2} align="center">
                <Tag label={e(`feedbackCategory.${f.category}`)} tone={CATEGORY_TONE[f.category]} />
                <Text weight="medium">{f.authorName}</Text>
              </HStack>
              <Text size="sm" color="secondary">{fmt.format(new Date(f.createdAt))}</Text>
            </HStack>
            <p className="m-0 whitespace-pre-wrap break-words">{f.message}</p>
            {f.answer && (
              <div className="rounded-lg border-l-4 border-[#357d9d] bg-[#357d9d]/5 p-3">
                <HStack gap={2} align="center" wrap="wrap">
                  <Text size="sm" weight="medium">{t("answerFrom")}</Text>
                  {f.answeredAt && <Text size="sm" color="secondary">{fmt.format(new Date(f.answeredAt))}</Text>}
                </HStack>
                <p className="m-0 mt-1 whitespace-pre-wrap break-words">{f.answer}</p>
              </div>
            )}
            <FeedbackAdmin id={f.id} answer={f.answer} />
          </article>
        ))
      )}

      {results && results.total > results.pageSize && (
        <HStack justify="between" align="center">
          <Text size="sm" color="secondary">{t("pageOf", { page: results.page, total: Math.ceil(results.total / results.pageSize) })}</Text>
          <HStack gap={2}>
            {results.page > 1 && <Button label={t("previous")} variant="secondary" href={href(raw.category, results.page - 1)} />}
            {results.page * results.pageSize < results.total && <Button label={t("next")} variant="secondary" href={href(raw.category, results.page + 1)} />}
          </HStack>
        </HStack>
      )}
    </VStack>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return { title: t("feedbacks") };
}

export default async function FeedbacksPage({ searchParams }: PageProps<"/feedbacks">) {
  const t = await getTranslations("Feedbacks");
  return (
    <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:px-5 sm:py-10">
      <VStack gap={5}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <VStack gap={1} className="min-w-0 flex-1 basis-64">
            <Heading level={1}>{t("title")}</Heading>
            <Text color="secondary">{t("subtitle")}</Text>
          </VStack>
          <FeedbackForm />
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <Feedbacks searchParams={searchParams} />
        </Suspense>
      </VStack>
    </div>
  );
}
