"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { formatMoney, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITenancyListResponse } from "@/client/lib/types";
import { num } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { useProperty } from "../property-layout";

interface Values {
  leaseId: string;
  title: string;
  dueDate: string;
  items: { title: string; amount: string }[];
}

const defaults = (): Values => ({ leaseId: "", title: "", dueDate: todayIso(), items: [{ title: "", amount: "" }] });

export function useInvoiceForm({ open, onDone }: { open: boolean; onDone: () => void }) {
  const { apiPath, to } = useProperty();
  const navigate = useNavigate();
  const leases = useGet<ITenancyListResponse>(apiPath("/leases"), { pageSize: 100 }, { enabled: open });
  const save = useSend<object, { id: string }>("POST", apiPath("/invoices"), [apiPath("/invoices")]);
  const form = useForm<Values>({ defaultValues: defaults() });
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); });
  const items = useFieldArray({ control: form.control, name: "items" });
  const watched = useWatch({ control: form.control, name: "items" });
  const total = watched.reduce((sum, r) => sum + (num(r.amount) ?? 0), 0);

  const submit = useSubmit(
    form,
    save,
    (v) => ({ leaseId: v.leaseId, kind: "other", title: v.title.trim(), dueDate: v.dueDate, items: v.items.map((r) => ({ title: r.title.trim(), kind: "other", amount: num(r.amount) ?? 0 })) }),
    (inv) => { onDone(); navigate(to(`invoices/${inv.id}`)); },
  );

  return { form, submit, error: save.error, busy: save.isPending, leases, items, total };
}

export function InvoiceFields({ x: { form, leases, items, total } }: { x: ReturnType<typeof useInvoiceForm> }) {
  const t = useTranslations("Invoices");
  const c = useTranslations("Common");
  return (
    <VStack gap={4}>
      <FSelect control={form.control} name="leaseId" label={t("lease")} required search options={(leases.data?.items ?? []).filter((l) => l.status !== "draft").map((l) => ({ value: l.id, label: `${l.unitName} · ${l.tenants.map((t) => t.displayName).join(", ")}` }))} width="100%" />
      <FText control={form.control} name="title" label={t("title")} required width="100%" />
      <FDate control={form.control} name="dueDate" label={t("dueDate")} required width="100%" />
      <VStack gap={3}>
        {items.fields.map((f, i) => (
          <VStack key={f.id} gap={2}>
            <FText control={form.control} name={`items.${i}.title`} label={t("line", { n: i + 1 })} required width="100%" />
            <FNumber control={form.control} name={`items.${i}.amount`} label={c("amount")} money required width="100%" />
            {items.fields.length > 1 && <HStack><Button label={t("removeLine")} variant="ghost" size="sm" onClick={() => items.remove(i)} /></HStack>}
          </VStack>
        ))}
        <HStack justify="between" align="center">
          <Button icon={<Plus size={16} />} label={t("addLine")} size="sm" variant="secondary" onClick={() => items.append({ title: "", amount: "" })} />
          <Text weight="semibold">{t("totalAmount", { amount: formatMoney(total) })}</Text>
        </HStack>
      </VStack>
    </VStack>
  );
}
