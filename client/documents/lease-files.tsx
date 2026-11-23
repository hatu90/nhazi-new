"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { api } from "@/client/lib/api";
import { useGet } from "@/client/lib/hooks";
import type { ILeaseDocument } from "@/client/lib/types";
import { Modal, TextField } from "@/client/ui";
import { FormFooter } from "@/client/ui/rhf";
import { useErrorMessage } from "@/client/lib/use-error-message";

const isPdf = (path: string) => path.toLowerCase().endsWith(".pdf");

function FileRow({ base, doc, index, onRemove }: { base: string; doc: ILeaseDocument; index: number; onRemove?: () => void }) {
  const t = useTranslations("Documents");
  const url = useGet<{ url: string }>(`${base}/files`, { path: doc.path });
  const label = doc.name || t("file", { n: index + 1 });
  return (
    <HStack gap={3} align="center">
      <a
        href={url.data?.url}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: "rgba(128,128,128,0.15)" }}
      >
        {isPdf(doc.path) ? (
          <FileText size={24} aria-hidden />
        ) : (
          url.data && /* eslint-disable-next-line @next/next/no-img-element */ <img src={url.data.url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
      </a>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text>{label}</Text>
        {isPdf(doc.path) && <Text size="sm" color="secondary">PDF</Text>}
      </div>
      {onRemove && <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} label={t("remove")} onClick={onRemove} />}
    </HStack>
  );
}

/** Dialog to attach one file: pick it, give it a caption, upload. */
function UploadDialog({ base, open, onClose, onAdd }: { base: string; open: boolean; onClose: () => void; onAdd: (added: ILeaseDocument[]) => Promise<unknown> }) {
  const t = useTranslations("Documents");
  const message = useErrorMessage();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setFile(null);
    setName("");
    setError(null);
    onClose();
  };
  const pick = (f: File | null) => {
    if (!f) return;
    setFile(f);
    setError(null);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return setError(t("chooseFile"));
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const up = await api<{ path: string; name: string }>(`${base}/uploads`, { method: "POST", body });
      await onAdd([{ path: up.path, name: name.trim() || up.name.replace(/\.[^.]+$/, "") }]);
      close();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close}>
      <form noValidate onSubmit={(e) => void submit(e)} className="flex min-h-0 flex-1 flex-col">
        <Layout
          height="fill"
          padding={5}
          header={<DialogHeader title={t("addFile")} onOpenChange={(o) => { if (!o) close(); }} />}
          content={
            <LayoutContent isScrollable style={{ paddingBlock: 16 }}>
              <VStack gap={3}>
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0] ?? null); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24, textAlign: "center", cursor: "pointer", borderRadius: 12, border: "2px dashed rgba(128,128,128,0.5)", background: "rgba(128,128,128,0.08)" }}
                >
                  <input type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
                  {file ? <FileText size={28} aria-hidden /> : <Upload size={28} aria-hidden />}
                  <Text weight="semibold">{file ? file.name : t("dropzone")}</Text>
                  <Text size="sm" color="secondary">{file ? t("changeFile") : t("chooseFile")}</Text>
                </label>
                <Text size="sm" color="secondary">{t("hint")}</Text>
                <TextField label={t("caption")} value={name} onChange={setName} placeholder={t("captionPlaceholder")} maxLength={200} width="100%" />
              </VStack>
            </LayoutContent>
          }
          footer={<LayoutFooter padding={5}><FormFooter error={error} busy={busy} submitLabel={t("upload")} submitDisabled={!file} onCancel={close} /></LayoutFooter>}
        />
      </form>
    </Modal>
  );
}

/**
 * Files attached to a lease (ID photos, signed copies…), listed with their captions. `base` is the lease's API path (it serves `/uploads` and `/files`).
 * `onAdd` lets the viewer attach files through a dialog; `onChange` (landlord only) also lets them remove; with neither it is read-only.
 */
export function LeaseFiles({ base, documents, onAdd, onChange }: { base: string; documents: ILeaseDocument[]; onAdd?: (added: ILeaseDocument[]) => Promise<unknown>; onChange?: (next: ILeaseDocument[]) => Promise<unknown> }) {
  const t = useTranslations("Documents");
  const message = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    }
  };

  return (
    <VStack gap={3}>
      <HStack justify="between" align="center" gap={3}>
        <Text weight="semibold">{t("files")}</Text>
        {onAdd && <Button icon={<Plus size={16} />} label={t("addFile")} size="sm" variant="secondary" onClick={() => setOpen(true)} />}
      </HStack>
      {documents.length === 0 ? (
        <Text color="secondary">{t("empty")}</Text>
      ) : (
        <VStack gap={3}>
          {documents.map((d, i) => (
            <FileRow
              key={d.path}
              base={base}
              doc={d}
              index={i}
              onRemove={onChange ? () => void run(() => onChange(documents.filter((x) => x.path !== d.path))) : undefined}
            />
          ))}
        </VStack>
      )}
      {error && <Text color="accent">{error}</Text>}
      {onAdd && <UploadDialog base={base} open={open} onClose={() => setOpen(false)} onAdd={onAdd} />}
    </VStack>
  );
}
