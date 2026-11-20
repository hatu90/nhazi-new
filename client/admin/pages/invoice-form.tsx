"use client";

import { formatMoney, todayIso } from "@/client/lib/format";
import { useGet, useSend } from "@/client/lib/hooks";
import type { ITenancyListResponse } from "@/client/lib/types";
import { num } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, FormBody, useSubmit } from "@/client/ui/rhf";
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

export function InvoiceForm({ onDone }: { onDone: () => void }) {
  const { apiPath, to } = useProperty();
  const navigate = useNavigate();
  const leases = useGet<ITenancyListResponse>(apiPath("/leases"), { pageSize: 100 });
  const save = useSend<object, { id: string }>("POST", apiPath("/invoices"), [apiPath("/invoices")]);
  const form = useForm<Values>({ defaultValues: { leaseId: "", title: "", dueDate: todayIso(), items: [{ title: "", amount: "" }] } });
  const items = useFieldArray({ control: form.control, name: "items" });
  const watched = useWatch({ control: form.control, name: "items" });
  const total = watched.reduce((sum, r) => sum + (num(r.amount) ?? 0), 0);

  const submit = useSubmit(
    form,
    save,
    (v) => ({ leaseId: v.leaseId, kind: "other", title: v.title.trim(), dueDate: v.dueDate, items: v.items.map((r) => ({ title: r.title.trim(), kind: "other", amount: num(r.amount) ?? 0 })) }),
    (inv) => { onDone(); navigate(to(`invoices/${inv.id}`)); },
  );

  return (
    <FormBody onSubmit={submit} error={save.error} busy={save.isPending} submitLabel="Create invoice" onCancel={onDone}>
      <FSelect control={form.control} name="leaseId" label="Lease" required search options={(leases.data?.items ?? []).filter((l) => l.status !== "draft").map((l) => ({ value: l.id, label: `${l.unitName} · ${l.tenants.map((t) => t.displayName).join(", ")}` }))} width="100%" />
      <FText control={form.control} name="title" label="Title" placeholder="Repair — broken faucet" required width="100%" />
      <FDate control={form.control} name="dueDate" label="Due date" required width="100%" />
      <VStack gap={3}>
        {items.fields.map((f, i) => (
          <VStack key={f.id} gap={2}>
            <FText control={form.control} name={`items.${i}.title`} label={`Line ${i + 1}`} required width="100%" />
            <FNumber control={form.control} name={`items.${i}.amount`} label="Amount (₫)" required width="100%" />
            {items.fields.length > 1 && <HStack><Button label="Remove line" variant="ghost" size="sm" onClick={() => items.remove(i)} /></HStack>}
          </VStack>
        ))}
        <HStack justify="between" align="center">
          <Button label="Add line" size="sm" variant="secondary" onClick={() => items.append({ title: "", amount: "" })} />
          <Text weight="semibold">Total {formatMoney(total)}</Text>
        </HStack>
      </VStack>
    </FormBody>
  );
}
