"use client";

import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMe } from "@/client/auth/auth-provider";
import { useGet, useSend } from "@/client/lib/hooks";
import { useCriterionText } from "@/client/lib/criterion";
import { formatDate } from "@/client/lib/format";
import type { ICriterionResponse, IReviewItemResponse, IReviewListResponse } from "@/client/lib/types";
import { NotFound } from "@/client/spa/not-found";
import { Empty, ErrorBox, ListSkeleton, Modal, RowActions, Section, Tag, useConfirm } from "@/client/ui";
import { num, text } from "@/client/ui/form";
import { FArea, FCheck, FText, FormFooter, useOpenReset, useSubmit } from "@/client/ui/rhf";

interface CriterionValues { name: string; nameEn: string; description: string; descriptionEn: string; sortOrder: string; required: boolean; active: boolean }
const emptyCriterion: CriterionValues = { name: "", nameEn: "", description: "", descriptionEn: "", sortOrder: "0", required: true, active: true };

/** `target`: null = closed, "new" = creating, a criterion = editing it. */
function useCriterionForm({ target, onDone }: { target: ICriterionResponse | "new" | null; onDone: () => void }) {
  const editing = target !== null && target !== "new" ? target : null;
  const save = useSend<object>(editing ? "PATCH" : "POST", editing ? `/api/admin/verification/criteria/${editing.id}` : "/api/admin/verification/criteria", ["/api/admin/verification", "/api/admin/properties"]);
  const form = useForm<CriterionValues>({ defaultValues: emptyCriterion });
  useOpenReset(target !== null, () => {
    form.reset(editing ? { name: editing.name, nameEn: editing.nameEn ?? "", description: editing.description ?? "", descriptionEn: editing.descriptionEn ?? "", sortOrder: String(editing.sortOrder), required: editing.required, active: editing.active } : emptyCriterion);
    save.reset();
  }, editing?.id ?? target);
  // on edit, "" means clear (null); on create it is simply omitted
  const submit = useSubmit(form, save, (v) => ({ name: v.name.trim(), nameEn: text(v.nameEn) ?? null, description: text(v.description) ?? null, descriptionEn: text(v.descriptionEn) ?? null, sortOrder: num(v.sortOrder) ?? 0, required: v.required, active: v.active }), onDone);
  return { form, submit, error: save.error, busy: save.isPending, editing };
}

function useRejectForm({ item, onDone }: { item: IReviewItemResponse | null; onDone: () => void }) {
  const save = useSend<object>("PATCH", `/api/admin/verification/reviews/${item?.id}`, ["/api/admin/verification", "/api/admin/properties"]);
  const form = useForm<{ reviewNote: string }>({ defaultValues: { reviewNote: "" } });
  useOpenReset(item !== null, () => { form.reset({ reviewNote: "" }); save.reset(); }, item?.id);
  const submit = useSubmit(form, save, (v) => ({ decision: "rejected", reviewNote: v.reviewNote.trim() }), onDone);
  return { form, submit, error: save.error, busy: save.isPending };
}

/** Platform staff: the criteria catalog and the queue of declarations waiting for a decision. */
export function VerificationStaffPage() {
  const me = useMe();
  if (!me.isPlatformAdmin) return <NotFound backTo="/" label="" />;
  return <StaffContent />;
}

function StaffContent() {
  const t = useTranslations("VerificationStaff");
  const c = useTranslations("Common");
  const site = useTranslations("Site");
  const crit = useCriterionText();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const reviews = useGet<IReviewListResponse>("/api/admin/verification/reviews", { status: "declared", page, pageSize: 20 });
  const criteria = useGet<ICriterionResponse[]>("/api/admin/verification/criteria");
  const invalidate = ["/api/admin/verification", "/api/admin/properties"];
  const approve = useSend<{ id: string; decision: "confirmed"; years: 1 | 2 }>("PATCH", (b) => `/api/admin/verification/reviews/${b.id}`, invalidate);
  const remove = useSend<string>("DELETE", (id) => `/api/admin/verification/criteria/${id}`, invalidate);
  const [target, setTarget] = useState<ICriterionResponse | "new" | null>(null);
  const criterionForm = useCriterionForm({ target, onDone: () => setTarget(null) });
  const [rejecting, setRejecting] = useState<IReviewItemResponse | null>(null);
  const rejectForm = useRejectForm({ item: rejecting, onDone: () => setRejecting(null) });

  return (
    <VStack gap={4}>
      <Heading level={1}>{t("title")}</Heading>
      <Section title={t("queue", { count: reviews.data?.total ?? 0 })}>
        {reviews.isPending ? <ListSkeleton /> : reviews.error ? <ErrorBox error={reviews.error} retry={() => void reviews.refetch()} /> : reviews.data.items.length === 0 ? <Empty title={t("queueEmpty")} /> : (
          <VStack gap={4}>
            {reviews.data.items.map((r) => (
              <HStack key={r.id} justify="between" align="start" gap={3} wrap="wrap">
                <VStack gap={1}>
                  <Text weight="semibold">{r.property.name}</Text>
                  <Text size="sm" color="secondary">{r.property.street}</Text>
                  <Tag label={crit(r.criterion).name} tone="info" />
                  {r.note && <Text size="sm">{r.note}</Text>}
                  <Text size="sm" color="secondary">{t("declaredOn", { date: formatDate(r.declaredAt) })}</Text>
                </VStack>
                <HStack gap={2}>
                  <Button variant="primary" label={t("confirmFor", { years: 1 })} onClick={() => approve.mutate({ id: r.id, decision: "confirmed", years: 1 })} />
                  <Button variant="primary" label={t("confirmFor", { years: 2 })} onClick={() => approve.mutate({ id: r.id, decision: "confirmed", years: 2 })} />
                  <Button variant="secondary" label={t("reject")} onClick={() => setRejecting(r)} />
                </HStack>
              </HStack>
            ))}
            {reviews.data.total > reviews.data.pageSize && (
              <HStack gap={2} justify="end">
                <Button variant="secondary" label={site("previous")} isDisabled={page <= 1} onClick={() => setPage(page - 1)} />
                <Button variant="secondary" label={site("next")} isDisabled={page * reviews.data.pageSize >= reviews.data.total} onClick={() => setPage(page + 1)} />
              </HStack>
            )}
          </VStack>
        )}
      </Section>
      <Section title={t("catalog")} action={<Button icon={<Plus size={16} />} variant="primary" label={t("addCriterion")} onClick={() => setTarget("new")} />}>
        {criteria.isPending ? <ListSkeleton /> : criteria.error ? <ErrorBox error={criteria.error} retry={() => void criteria.refetch()} /> : criteria.data.length === 0 ? <Empty title={t("catalogEmpty")} /> : (
          <VStack gap={3}>
            {criteria.data.map((k) => (
              <HStack key={k.id} justify="between" align="start" gap={3}>
                <VStack gap={1}>
                  <HStack gap={2} align="center" wrap="wrap">
                    <Text weight="semibold">{crit(k).name}</Text>
                    <Tag label={k.required ? t("required") : t("optional")} tone={k.required ? "info" : "neutral"} />
                    {!k.active && <Tag label={t("inactive")} tone="warning" />}
                  </HStack>
                  {crit(k).description && <Text size="sm" color="secondary">{crit(k).description}</Text>}
                </VStack>
                <RowActions actions={[
                  { id: "edit", label: c("edit"), icon: Pencil, onClick: () => setTarget(k) },
                  { id: "delete", label: c("delete"), icon: Trash2, destructive: true, onClick: () => confirm.ask({ title: t("deleteTitle", { name: k.name }), description: t("deleteBody"), actionLabel: c("delete"), onConfirm: () => remove.mutateAsync(k.id) }) },
                ]} />
              </HStack>
            ))}
          </VStack>
        )}
      </Section>
      <Modal open={target !== null} onClose={() => setTarget(null)}>
        <form noValidate onSubmit={criterionForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={criterionForm.editing ? t("editCriterion") : t("addCriterion")} onOpenChange={(o) => { if (!o) setTarget(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}>
              <VStack gap={4}>
                <FText control={criterionForm.form.control} name="name" label={t("nameVi")} required width="100%" />
                <FText control={criterionForm.form.control} name="nameEn" label={t("nameEn")} width="100%" />
                <FArea control={criterionForm.form.control} name="description" label={t("descriptionVi")} rows={2} width="100%" />
                <FArea control={criterionForm.form.control} name="descriptionEn" label={t("descriptionEn")} rows={2} width="100%" />
                <FText control={criterionForm.form.control} name="sortOrder" label={t("sortOrder")} width="100%" />
                <FCheck control={criterionForm.form.control} name="required" label={t("required")} hint={t("requiredHint")} />
                <FCheck control={criterionForm.form.control} name="active" label={t("active")} hint={t("activeHint")} />
              </VStack>
            </LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={criterionForm.error} busy={criterionForm.busy} submitLabel={c("save")} onCancel={() => setTarget(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      <Modal open={rejecting !== null} onClose={() => setRejecting(null)}>
        <form noValidate onSubmit={rejectForm.submit} className="flex min-h-0 flex-1 flex-col">
          <Layout
            height="fill"
            padding={5}
            header={<DialogHeader title={t("rejectTitle")} onOpenChange={(o) => { if (!o) setRejecting(null); }} />}
            content={<LayoutContent isScrollable style={{ paddingBlock: 16 }}><FArea control={rejectForm.form.control} name="reviewNote" label={t("rejectReason")} rows={3} required width="100%" /></LayoutContent>}
            footer={<LayoutFooter padding={5}><FormFooter error={rejectForm.error} busy={rejectForm.busy} submitLabel={t("reject")} onCancel={() => setRejecting(null)} /></LayoutFooter>}
          />
        </form>
      </Modal>
      {confirm.element}
    </VStack>
  );
}
