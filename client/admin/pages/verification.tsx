"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useGet, useSend } from "@/client/lib/hooks";
import { useCriterionText } from "@/client/lib/criterion";
import { useEnum } from "@/client/lib/use-enum";
import { formatDate } from "@/client/lib/format";
import type { CriterionStatus, IPropertyCriterionResponse, IPropertyVerificationResponse } from "@/client/lib/types";
import { Empty, ErrorBox, Modal, PageSkeleton, Section, Tag, useConfirm, VerificationBadge } from "@/client/ui";
import { text } from "@/client/ui/form";
import { FArea, FormFooter, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";

const RENEW_WINDOW_MS = 60 * 24 * 3600 * 1000;
const tone = { declared: "warning", confirmed: "success", rejected: "error" } as const satisfies Record<CriterionStatus, string>;

/** Owner / admin: declare which quality criteria the property meets; platform staff confirm them. */
export function VerificationPage() {
  const t = useTranslations("Verification");
  const c = useTranslations("Common");
  const en = useEnum();
  const crit = useCriterionText();
  const confirm = useConfirm();
  const { apiPath, canManage } = useProperty();
  const path = apiPath("/verification");
  const { data, error, isPending, refetch } = useGet<IPropertyVerificationResponse>(path);
  const [now] = useState(() => Date.now());
  const [editing, setEditing] = useState<IPropertyCriterionResponse | null>(null);
  const invalidate = [path, apiPath()];
  const withdraw = useSend<string>("DELETE", (id) => `${path}/${id}`, invalidate);
  const save = useSend<{ note: string | null }>("PUT", `${path}/${editing?.criterion.id}`, invalidate);
  const form = useForm<{ note: string }>({ defaultValues: { note: "" } });
  useOpenReset(editing !== null, () => { form.reset({ note: editing?.declaration?.note ?? "" }); save.reset(); }, editing?.criterion.id);
  const submit = useSubmit(form, save, (v) => ({ note: text(v.note) ?? null }), () => setEditing(null));

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorBox error={error} retry={() => void refetch()} />;
  const expired = (d: IPropertyCriterionResponse["declaration"]) => d?.status === "confirmed" && d.expiresAt !== null && Date.parse(d.expiresAt) < now;
  const renewable = (d: IPropertyCriterionResponse["declaration"]) => d?.status !== "confirmed" || (d.expiresAt !== null && Date.parse(d.expiresAt) - now < RENEW_WINDOW_MS);
  const confirmed = data.criteria.filter((x) => x.declaration?.status === "confirmed" && !expired(x.declaration)).length;

  return (
    <VStack gap={4}>
      <Section title={t("title")} action={<VerificationBadge status={data.status} />}>
        <VStack gap={2}>
          <Text color="secondary">{t(`intro.${data.status}`)}</Text>
          {data.expiresAt && <Text size="sm" color="secondary">{t("validUntil", { date: formatDate(data.expiresAt) })}</Text>}
          <Text size="sm" color="secondary">{t("progress", { done: confirmed, total: data.criteria.length })}</Text>
        </VStack>
      </Section>
      <Section title={t("criteria")}>
        {data.criteria.length === 0 ? <Empty title={t("empty")} /> : (
          <VStack gap={4}>
            {data.criteria.map((row) => {
              const { name, description } = crit(row.criterion);
              const d = row.declaration;
              return (
                <HStack key={row.criterion.id} justify="between" align="start" gap={3} wrap="wrap">
                  <VStack gap={1}>
                    <HStack gap={2} align="center" wrap="wrap">
                      <Text weight="semibold">{name}</Text>
                      {!row.criterion.required && <Tag label={t("optional")} />}
                      <Tag label={expired(d) ? t("expired") : d ? en("criterionStatus", d.status) : t("notDeclared")} tone={expired(d) ? "error" : d ? tone[d.status] : "neutral"} />
                    </HStack>
                    {description && <Text size="sm" color="secondary">{description}</Text>}
                    {d?.note && <Text size="sm">{t("note")}: {d.note}</Text>}
                    {d?.status === "rejected" && d.reviewNote && <Text size="sm" weight="semibold">{t("rejectedBecause", { reason: d.reviewNote })}</Text>}
                    {d?.status === "confirmed" && d.expiresAt && <Text size="sm" color="secondary">{t(expired(d) ? "expiredOn" : "validUntil", { date: formatDate(d.expiresAt) })}{d.validityYears ? ` · ${t("years", { n: d.validityYears })}` : ""}</Text>}
                    {d && <Text size="sm" color="secondary">{d.reviewedAt ? t("reviewedOn", { date: formatDate(d.reviewedAt) }) : t("declaredOn", { date: formatDate(d.declaredAt) })}</Text>}
                  </VStack>
                  {canManage && (
                    <HStack gap={2}>
                      {renewable(d) && <Button variant={d ? "secondary" : "primary"} label={!d ? t("declare") : d.status === "confirmed" ? t("renew") : d.status === "rejected" ? t("redeclare") : c("edit")} onClick={() => setEditing(row)} />}
                      {d && <Button variant="secondary" label={t("withdraw")} onClick={() => confirm.ask({ title: t("withdrawTitle", { name }), description: t("withdrawBody"), actionLabel: t("withdraw"), onConfirm: () => withdraw.mutateAsync(row.criterion.id) })} />}
                    </HStack>
                  )}
                </HStack>
              );
            })}
          </VStack>
        )}
      </Section>
      {data.history.length > 0 && (
        <Section title={t("history")}>
          <VStack gap={3}>
            {data.history.map((r) => (
              <HStack key={r.id} justify="between" align="center" gap={3} wrap="wrap">
                <VStack gap={1}>
                  <Text weight="semibold">{formatDate(r.verifiedAt)} → {formatDate(r.endedAt ?? r.expiresAt)}</Text>
                  <Text size="sm" color="secondary">{t("historyCriteria", { count: r.criteria.length })}</Text>
                </VStack>
                <Tag label={r.endReason ? t(`ended.${r.endReason}`) : t("current")} tone={r.endReason ? "neutral" : "success"} />
              </HStack>
            ))}
          </VStack>
        </Section>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)}>
        <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={editing ? crit(editing.criterion).name : ""} onOpenChange={(o) => { if (!o) setEditing(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><VStack gap={3}><Text color="secondary">{t("declareHint")}</Text><FArea control={form.control} name="note" label={t("noteLabel")} rows={4} width="100%" /></VStack></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={save.error} busy={save.isPending} submitLabel={t("submitForReview")} onCancel={() => setEditing(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </VStack>
  );
}
