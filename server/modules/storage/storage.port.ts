/** Port for file storage (public images + private lease files). Usecases depend on this; `infrastructure/` supplies the implementation (e.g. Supabase). */
export interface IFileStorage {
  /** Store `bytes` under `path` (overwrites). */
  put(path: string, bytes: ArrayBuffer, contentType: string): Promise<void>;
  /** Move an object (rename). */
  move(from: string, to: string): Promise<void>;
  /** Short-lived URL that lets the browser read a private file. */
  /** Permanent URL for a public file (property / draft images). Not for `leases/…`. */
  publicUrl(path: string): string;
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
}
