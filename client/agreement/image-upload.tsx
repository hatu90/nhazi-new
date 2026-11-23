"use client";

import { useTranslations } from "next-intl";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/client/lib/api";
import { useGet } from "@/client/lib/hooks";
import { useErrorMessage } from "@/client/lib/use-error-message";
import { useFilesBase } from "./fill-context";

/** A stored image of the lease (value = its storage path), loaded through the lease's signed-URL endpoint. Nothing when there is no path. */
export function StoredImage({ path, height, alt }: { path: string; height: number; alt: string }) {
  const base = useFilesBase();
  const url = useGet<{ url: string }>(`${base}/files`, { path }, { enabled: !!base && !!path });
  if (!path || !url.data) return <div style={{ height: path ? height : undefined }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url.data.url} alt={alt} style={{ display: "block", maxWidth: "100%", maxHeight: height, objectFit: "contain" }} />;
}

/** Form input: pick an image, it is uploaded to the lease right away and its path becomes the value. */
export function ImageUploader({ label, value, onChange, height }: { label: string; value: string; onChange: (v: string) => void; height: number }) {
  const t = useTranslations("Agreements");
  const message = useErrorMessage();
  const base = useFilesBase();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file || !base) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const up = await api<{ path: string }>(`${base}/uploads`, { method: "POST", body });
      onChange(up.path);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <VStack gap={2}>
      <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => void pick(e.target.files?.[0])} />
      {value && <StoredImage path={value} height={height} alt={label} />}
      <HStack gap={2}>
        <Button type="button" size="sm" variant="secondary" icon={<ImagePlus size={14} />} label={busy ? t("uploading") : value ? t("replaceImage") : t("uploadImage")} isDisabled={busy || !base} onClick={() => input.current?.click()} />
        {value && <Button type="button" size="sm" variant="ghost" icon={<Trash2 size={14} />} label={t("removeImage")} isDisabled={busy} onClick={() => onChange("")} />}
      </HStack>
      {error && <Text size="sm" color="accent">{error}</Text>}
    </VStack>
  );
}
