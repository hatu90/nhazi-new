import type { IFileStorage } from "@/server/modules/storage/storage.port";

/**
 * Supabase Storage over its REST API (secret key; server-side only).
 * Two buckets: a PUBLIC one (property + draft images) and a PRIVATE one for tenant files under `leases/`.
 */
export class SupabaseFileStorage implements IFileStorage {
  constructor(
    private readonly url: string,
    private readonly serviceKey: string,
    private readonly publicBucket: string,
    private readonly privateBucket: string,
  ) {}

  private bucketFor(path: string) {
    return path.startsWith("leases/") ? this.privateBucket : this.publicBucket;
  }

  /** New `sb_secret_…` keys aren't JWTs: send them as `apikey` only. Legacy service_role JWTs also go in Authorization. */
  private get headers(): Record<string, string> {
    return this.serviceKey.startsWith("sb_") ? { apikey: this.serviceKey } : { Authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey };
  }
  private objectPath(path: string) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  async put(path: string, bytes: ArrayBuffer, contentType: string) {
    const res = await fetch(`${this.url}/storage/v1/object/${this.bucketFor(path)}/${this.objectPath(path)}`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": contentType, "x-upsert": "true" },
      body: bytes,
    });
    if (!res.ok) throw new Error(`Supabase upload failed: ${res.status} ${await res.text()}`);
  }

  async move(from: string, to: string) {
    const res = await fetch(`${this.url}/storage/v1/object/move`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ bucketId: this.bucketFor(from), sourceKey: from, destinationKey: to }),
    });
    if (!res.ok) throw new Error(`Supabase move failed: ${res.status} ${await res.text()}`);
  }

  publicUrl(path: string) {
    return `${this.url}/storage/v1/object/public/${this.publicBucket}/${this.objectPath(path)}`;
  }

  async signedUrl(path: string, expiresInSeconds: number) {
    const res = await fetch(`${this.url}/storage/v1/object/sign/${this.bucketFor(path)}/${this.objectPath(path)}`, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    });
    if (!res.ok) throw new Error(`Supabase sign failed: ${res.status} ${await res.text()}`);
    const { signedURL } = (await res.json()) as { signedURL: string };
    return `${this.url}/storage/v1${signedURL}`;
  }
}

export function createFileStorage(): IFileStorage {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return {
      put: async () => { throw new Error("File storage is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY)"); },
      move: async () => { throw new Error("File storage is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY)"); },
      publicUrl: () => { throw new Error("File storage is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY)"); },
      signedUrl: async () => { throw new Error("File storage is not configured (SUPABASE_URL / SUPABASE_SECRET_KEY)"); },
    };
  }
  return new SupabaseFileStorage(url.replace(/\/$/, ""), key, process.env.SUPABASE_STORAGE_BUCKET ?? "handly", process.env.SUPABASE_PRIVATE_BUCKET ?? "handly-private");
}
