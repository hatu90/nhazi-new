"use client";

import { api, errorMessage } from "@/client/lib/api";
import { useGet } from "@/client/lib/hooks";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { useRef, useState } from "react";

interface IUploaded {
  path: string;
  name: string;
}

function Thumb({ base, path, height, label, actions, selected }: { base: string; path: string; height: number; label: string; actions: React.ReactNode; selected?: boolean }) {
  const url = useGet<{ url: string }>(`${base}/files`, { path });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ height, borderRadius: 8, overflow: "hidden", background: "rgba(128,128,128,0.15)", outline: selected ? "2px solid currentColor" : undefined, outlineOffset: 2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url.data && <img src={url.data.url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{actions}</div>
    </div>
  );
}

/** One set of images for a property; one of them is the cover (header). `base` is `/api/admin/properties/:id` (or the draft area); values are storage keys. */
export function PropertyImages({ base, headerImage, images, onHeaderImage, onImages, onBusy }: { base: string; headerImage: string | null; images: string[]; onHeaderImage: (p: string | null) => void; onImages: (p: string[]) => void; onBusy: (b: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAll = (next: string[]) => {
    onImages(next);
    if (!next.includes(headerImage ?? "")) onHeaderImage(next[0] ?? null);
  };

  const upload = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setUploading(true);
    onBusy(true);
    setError(null);
    const done: string[] = [];
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        done.push((await api<IUploaded>(`${base}/uploads`, { method: "POST", body })).path);
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      onBusy(false);
      if (input.current) input.current.value = "";
    }
    if (done.length) {
      onImages([...images, ...done]);
      if (!headerImage) onHeaderImage(done[0]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Text color="secondary">JPG, PNG or WebP, up to 5 MB each. Pick one as the cover shown on the listing.</Text>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void upload(e.target.files)} />
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {images.map((p) => (
            <Thumb
              key={p}
              base={base}
              path={p}
              height={100}
              label="Property image"
              selected={p === headerImage}
              actions={
                <>
                  {p === headerImage ? <Text size="sm" weight="medium">Cover</Text> : <Button label="Set as cover" variant="secondary" size="sm" onClick={() => onHeaderImage(p)} />}
                  <Button label="Remove" variant="ghost" size="sm" onClick={() => setAll(images.filter((x) => x !== p))} />
                </>
              }
            />
          ))}
        </div>
      )}
      <div>
        <Button label={uploading ? "Uploading…" : "Add images"} variant="secondary" size="sm" onClick={() => input.current?.click()} />
      </div>
      {error && <Text color="accent">{error}</Text>}
    </div>
  );
}
