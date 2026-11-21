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

function Thumb({ base, path, height, label, actions }: { base: string; path: string; height: number; label: string; actions: React.ReactNode }) {
  const url = useGet<{ url: string }>(`${base}/files`, { path });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ height, borderRadius: 8, overflow: "hidden", background: "rgba(128,128,128,0.15)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url.data && <img src={url.data.url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{actions}</div>
    </div>
  );
}

/** Header image + gallery for an existing property. `base` is `/api/admin/properties/:id`; values are storage keys. */
export function PropertyImages({ base, headerImage, images, onHeaderImage, onImages, onBusy }: { base: string; headerImage: string | null; images: string[]; onHeaderImage: (p: string | null) => void; onImages: (p: string[]) => void; onBusy: (b: boolean) => void }) {
  const headerInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (list: FileList | null, input: HTMLInputElement | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return [];
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
      if (input) input.value = "";
    }
    return done;
  };

  const accept = "image/jpeg,image/png,image/webp";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Text weight="medium">Header image</Text>
        <Text color="secondary">Shown at the top of the listing (JPG, PNG or WebP, up to 5 MB).</Text>
        <input ref={headerInput} type="file" accept={accept} hidden onChange={(e) => void upload(e.target.files, e.target).then(([p]) => p && onHeaderImage(p))} />
        <div style={{ marginTop: 8 }}>
          {headerImage ? (
            <Thumb
              base={base}
              path={headerImage}
              height={160}
              label="Header image"
              actions={
                <>
                  <Button label="Replace" variant="secondary" size="sm" onClick={() => headerInput.current?.click()} />
                  <Button label="Remove" variant="ghost" size="sm" onClick={() => onHeaderImage(null)} />
                </>
              }
            />
          ) : (
            <Button label={uploading ? "Uploading…" : "Add header image"} variant="secondary" size="sm" onClick={() => headerInput.current?.click()} />
          )}
        </div>
      </div>
      <div>
        <Text weight="medium">Other images</Text>
        <input ref={galleryInput} type="file" multiple accept={accept} hidden onChange={(e) => void upload(e.target.files, e.target).then((p) => p.length && onImages([...images, ...p]))} />
        {images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8, marginTop: 8 }}>
            {images.map((p) => (
              <Thumb key={p} base={base} path={p} height={90} label="Property image" actions={<Button label="Remove" variant="ghost" size="sm" onClick={() => onImages(images.filter((x) => x !== p))} />} />
            ))}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          <Button label={uploading ? "Uploading…" : "Add images"} variant="secondary" size="sm" onClick={() => galleryInput.current?.click()} />
        </div>
      </div>
      {error && <Text color="accent">{error}</Text>}
    </div>
  );
}
