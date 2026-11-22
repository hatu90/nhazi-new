"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/client/lib/api";
import { useGet } from "@/client/lib/hooks";
import type { ILeaseDocument } from "@/client/lib/types";
import { TextField } from "@/client/ui";
import { useErrorMessage } from "@/client/lib/use-error-message";

const isPdf = (path: string) => path.toLowerCase().endsWith(".pdf");

function FileTile({ base, doc, index, onRemove, onRename }: { base: string; doc: ILeaseDocument; index: number; onRemove?: () => void; onRename?: (name: string) => void }) {
  const t = useTranslations("Documents");
  const url = useGet<{ url: string }>(`${base}/files`, { path: doc.path });
  const [name, setName] = useState(doc.name);
  const label = doc.name || t("file", { n: index + 1 });
  return (
    <VStack gap={1}>
      <a
        href={url.data?.url}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 120, borderRadius: 8, overflow: "hidden", background: "rgba(128,128,128,0.15)" }}
      >
        {isPdf(doc.path) ? (
          <FileText size={32} aria-hidden />
        ) : (
          url.data && /* eslint-disable-next-line @next/next/no-img-element */ <img src={url.data.url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
      </a>
      {onRename ? (
        <div onBlur={() => name.trim() !== doc.name && onRename(name.trim())}>
          <TextField label={t("caption")} hideLabel value={name} onChange={setName} placeholder={t("captionPlaceholder")} maxLength={200} width="100%" />
        </div>
      ) : (
        <Text size="sm" color="secondary">{label}{isPdf(doc.path) ? " · PDF" : ""}</Text>
      )}
      {onRemove && <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} label={t("remove")} onClick={onRemove} />}
    </VStack>
  );
}

/**
 * Files attached to a lease (ID photos, signed copies…), each with a caption. `base` is the lease's API path (it serves `/uploads` and `/files`).
 * `onAdd` lets the viewer attach files; `onChange` (landlord only) also lets them rename and remove; with neither it is read-only.
 */
export function LeaseFiles({ base, documents, onAdd, onChange }: { base: string; documents: ILeaseDocument[]; onAdd?: (added: ILeaseDocument[]) => Promise<unknown>; onChange?: (next: ILeaseDocument[]) => Promise<unknown> }) {
  const t = useTranslations("Documents");
  const message = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  const upload = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    void run(async () => {
      const added: ILeaseDocument[] = [];
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const up = await api<{ path: string; name: string }>(`${base}/uploads`, { method: "POST", body });
        added.push({ path: up.path, name: up.name.replace(/\.[^.]+$/, "") });
      }
      await onAdd!(added);
    });
  };

  return (
    <VStack gap={3}>
      <HStack justify="between" align="center" gap={3}>
        <Text weight="semibold">{t("files")}</Text>
        {onAdd && (
          <>
            <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => upload(e.target.files)} />
            <Button icon={<Plus size={16} />} label={busy ? t("uploading") : t("addFiles")} size="sm" variant="secondary" isDisabled={busy} onClick={() => input.current?.click()} />
          </>
        )}
      </HStack>
      {onAdd && <Text size="sm" color="secondary">{t("hint")}</Text>}
      {documents.length === 0 ? (
        <Text color="secondary">{t("empty")}</Text>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {documents.map((d, i) => (
            <FileTile
              key={d.path}
              base={base}
              doc={d}
              index={i}
              onRemove={onChange ? () => void run(() => onChange(documents.filter((x) => x.path !== d.path))) : undefined}
              onRename={onChange ? (name) => void run(() => onChange(documents.map((x) => (x.path === d.path ? { ...x, name } : x)))) : undefined}
            />
          ))}
        </div>
      )}
      {error && <Text color="accent">{error}</Text>}
    </VStack>
  );
}
