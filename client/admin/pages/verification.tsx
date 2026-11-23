"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useGet, useSend } from "@/client/lib/hooks";
import { useCriterionText } from "@/client/lib/criterion";
import { useEnum } from "@/client/lib/use-enum";
import { formatDate } from "@/client/lib/format";
import type { CriterionStatus, IPropertyCriterionResponse, IPropertyVerificationResponse } from "@/client/lib/types";
import { CheckField, Empty, ErrorBox, Modal, PageSkeleton, Section, Tag, TextAreaField, useConfirm, VerificationBadge } from "@/client/ui";
import { text } from "@/client/ui/form";
import { FormFooter } from "@/client/ui/rhf";
import { useProperty } from "../property-layout";

const RENEW_WINDOW_MS = 60 * 24 * 3600 * 1000;
const tone = { declared: "warning", confirmed: "success", rejected: "error" } as const satisfies Record<CriterionStatus, string>;

/** Owner / admin: declare which quality criteria the property meets; platform staff confirm them. */
export function VerificationPage() {
  const t = useTranslations("Verification");
  const en = useEnum();
  const crit = useCriterionText();
  const confirm = useConfirm();
  const { apiPath, canManage } = useProperty();
  const path = apiPath("/verification");
  const { data, error, isPending, refetch } = useGet<IPropertyVerificationResponse>(path);
  const [now] = useState(() => Date.now());
  const invalidate = [path, apiPath()];
  const withdraw = useSend<string>("DELETE", (id) => `${path}/${id}`, invalidate);
  const declareAll = useSend<{ criterionIds: string[]; note: string | null }>("POST", path, invalidate);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [bulkNote, setBulkNote] = useState("");

  if (isPending) return <PageSkeleton />;
  if (error) return <ErrorBox error={error} retry={() => void refetch()} />;
  const expired = (d: IPropertyCriterionResponse["declaration"]) => d?.status === "confirmed" && d.expiresAt !== null && Date.parse(d.expiresAt) < now;
  const renewable = (d: IPropertyCriterionResponse["declaration"]) => d?.status === "declared" ? false : d?.status !== "confirmed" || (d.expiresAt !== null && Date.parse(d.expiresAt) - now < RENEW_WINDOW_MS);
  const todo = data.criteria.filter((x) => !x.declaration || x.declaration.status === "rejected" || renewable(x.declaration));
  const openBulk = () => { setPicked(todo.map((x) => x.criterion.id)); setBulkNote(""); declareAll.reset(); setBulkOpen(true); };
  const confirmed = data.criteria.filter((x) => x.declaration?.status === "confirmed" && !expired(x.declaration)).length;

  return (
    <VStack gap={4}>
      <Section title={t("title")} action={<VerificationBadge status={data.status} />}>
        <VStack gap={2}>
          <Text color="secondary">{t(`intro.${data.status}`)}</Text>
          {data.expiresAt && <Text size="sm" color="secondary">{t("validUntil", { date: formatDate(data.expiresAt) })}</Text>}
          <Text size="sm" color="secondary">{t("progress", { done: confirmed, total: data.criteria.length })}</Text>
          {canManage && todo.length > 0 && <div><Button variant="primary" label={t("declareAll")} onClick={openBulk} /></div>}
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
                  {canManage && d && (
                    <HStack gap={2}>
                      <Button variant="secondary" label={t("withdraw")} onClick={() => confirm.ask({ title: t("withdrawTitle", { name }), description: t("withdrawBody"), actionLabel: t("withdraw"), onConfirm: () => withdraw.mutateAsync(row.criterion.id) })} />
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
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)}>
        <form noValidate onSubmit={(e) => { e.preventDefault(); void declareAll.mutateAsync({ criterionIds: picked, note: text(bulkNote) ?? null }).then(() => setBulkOpen(false)).catch(() => {}); }} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("declareAllTitle")} onOpenChange={(o) => { if (!o) setBulkOpen(false); }} />}
            content={
              <LayoutContent isScrollable style={{ paddingBlock: 16 }}>
                <VStack gap={3}>
                  <Text color="secondary">{t("declareAllBody")}</Text>
                  <CheckField label={t("selectAll")} value={picked.length === todo.length} onChange={(v) => setPicked(v ? todo.map((x) => x.criterion.id) : [])} />
                  {todo.map((row) => {
                    const { name, description } = crit(row.criterion);
                    const id = row.criterion.id;
                    return <CheckField key={id} label={name} hint={description ?? undefined} value={picked.includes(id)} onChange={(v) => setPicked((p) => (v ? [...p, id] : p.filter((x) => x !== id)))} />;
                  })}
                  <TextAreaField label={t("noteLabel")} value={bulkNote} onChange={setBulkNote} rows={3} width="100%" />
                </VStack>
              </LayoutContent>
            }
            footer={<LayoutFooter padding={5}><FormFooter error={declareAll.error} busy={declareAll.isPending} submitLabel={t("declareSelected", { count: picked.length })} submitDisabled={picked.length === 0} onCancel={() => setBulkOpen(false)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </VStack>
  );
}
