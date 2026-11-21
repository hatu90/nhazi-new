"use client";

import { api, errorMessage } from "@/client/lib/api";
import { formatMoney, todayIso } from "@/client/lib/format";
import { useSend } from "@/client/lib/hooks";
import type { PaymentMethod } from "@/client/lib/types";
import { num, text } from "@/client/ui/form";
import { FDate, FNumber, FSelect, FText, useOpenReset, useSubmit } from "@/client/ui/rhf";
import { VStack } from "@astryxdesign/core/Stack";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import { useLease } from "../lease-layout";

interface IAttachment {
  path: string;
  name: string;
}

/** The landlord confirms the payment before it counts towards the invoice. */
interface Values {
  amount: string;
  method: PaymentMethod;
  paidOn: string;
  reference: string;
}

export function useReportPaymentForm({ owed, open, onDone }: { owed: number; open: boolean; onDone: () => void }) {
  const { invoiceId = "" } = useParams();
  const { apiPath } = useLease();
  const save = useSend<object>("POST", apiPath(`/invoices/${invoiceId}/payments`), [apiPath("/invoices")]);
  const defaults = (): Values => ({ amount: String(owed), method: "bank_transfer", paidOn: todayIso(), reference: "" });
  const form = useForm<Values>({ defaultValues: defaults() });
  const [files, setFiles] = useState<IAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useOpenReset(open, () => { form.reset(defaults()); save.reset(); setFiles([]); setUploadError(null); });

  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of Array.from(list)) {
        const body = new FormData();
        body.append("file", file);
        const uploaded = await api<IAttachment>(apiPath("/uploads"), { method: "POST", body });
        setFiles((f) => [...f, uploaded]);
      }
    } catch (e) {
      setUploadError(errorMessage(e));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const submit = useSubmit(form, save, (v) => ({ amount: num(v.amount), method: v.method, paidOn: v.paidOn, reference: text(v.reference), evidence: files.map((f) => f.path) }), onDone);
  return { form, submit, error: save.error, busy: save.isPending || uploading, owed, files, setFiles, uploading, uploadError, input, pick };
}

export function ReportPaymentFields({ x: { form, owed, files, setFiles, uploading, uploadError, input, pick } }: { x: ReturnType<typeof useReportPaymentForm> }) {
  return (
    <VStack gap={4}>
      <FNumber control={form.control} name="amount" label="Amount (₫)" hint={`Outstanding: ${formatMoney(owed)}`} required width="100%" />
      <FSelect control={form.control} name="method" label="Method" options={[{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }]} width="100%" />
      <FDate control={form.control} name="paidOn" label="Paid on" required width="100%" />
      <FText control={form.control} name="reference" label="Reference" hint="Bank reference, receipt number… The landlord confirms it before it counts." width="100%" />
      <div>
        <Text weight="medium">Attachment</Text>
        <Text color="secondary">Receipt or transfer screenshot (JPG, PNG, WebP or PDF, up to 5 MB each).</Text>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => void pick(e.target.files)} />
        {files.map((f) => (
          <div key={f.path} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <Text>{f.name}</Text>
            <Button label="Remove" variant="ghost" size="sm" onClick={() => setFiles((all) => all.filter((x) => x.path !== f.path))} />
          </div>
        ))}
        {uploadError && <Text color="accent">{uploadError}</Text>}
        <div style={{ marginTop: 8 }}>
          <Button label={uploading ? "Uploading…" : "Add file"} variant="secondary" size="sm" onClick={() => input.current?.click()} />
        </div>
      </div>
    </VStack>
  );
}
