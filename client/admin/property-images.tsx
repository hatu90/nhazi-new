"use client";

import { api, errorMessage } from "@/client/lib/api";
import { useGet } from "@/client/lib/hooks";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Text } from "@astryxdesign/core/Text";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

interface IUploaded {
  path: string;
  name: string;
}

function Thumb({ base, path, selected, onSelect, actions }: { base: string; path: string; selected: boolean; onSelect: () => void; actions: React.ReactNode }) {
  const url = useGet<{ url: string }>(`${base}/files`, { path });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={selected ? "Cover image" : "Set as cover image"}
        title={selected ? "Cover image" : "Click to set as cover"}
        onClick={onSelect}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
        style={{ position: "relative", flex: 1, height: 160, borderRadius: 8, overflow: "hidden", background: "rgba(128,128,128,0.15)", cursor: selected ? "default" : "pointer", outline: selected ? "2px solid currentColor" : undefined, outlineOffset: 2 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url.data && <img src={url.data.url} alt="Property image" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        {selected && <span style={{ position: "absolute", top: 8, left: 8, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: "rgba(0,0,0,0.65)", color: "#fff" }}>Cover</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{actions}</div>
    </div>
  );
}

/** Images for a property, one per row. One is the cover (header), picked by click; the arrows only reorder the gallery. `base` is `/api/admin/properties/:id` (or the draft area); values are storage keys. */
export function PropertyImages({ base, headerImage, images, onHeaderImage, onImages, onBusy }: { base: string; headerImage: string | null; images: string[]; onHeaderImage: (p: string | null) => void; onImages: (p: string[]) => void; onBusy: (b: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The cover is picked independently of the order; with no valid pick it defaults to the first image (so a lone image is the cover).
  const cover = headerImage && images.includes(headerImage) ? headerImage : (images[0] ?? null);
  const setAll = (next: string[]) => {
    onImages(next);
    if (!next.includes(cover ?? "")) onHeaderImage(next[0] ?? null);
  };
  const move = (i: number, by: -1 | 1) => {
    const next = [...images];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setAll(next);
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
    if (done.length) setAll([...images, ...done]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Text color="secondary">JPG, PNG or WebP, up to 5 MB. Click an image to set the cover.</Text>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void upload(e.target.files)} />
      {images.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {images.map((p, i) => (
            <Thumb
              key={p}
              base={base}
              path={p}
              selected={p === cover}
              onSelect={() => onHeaderImage(p)}
              actions={
                <>
                  <IconButton label="Move up" variant="ghost" icon={<ChevronUp />} isDisabled={i === 0} onClick={() => move(i, -1)} />
                  <IconButton label="Move down" variant="ghost" icon={<ChevronDown />} isDisabled={i === images.length - 1} onClick={() => move(i, 1)} />
                  <IconButton label="Remove image" variant="ghost" icon={<Trash2 />} onClick={() => setAll(images.filter((x) => x !== p))} />
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
