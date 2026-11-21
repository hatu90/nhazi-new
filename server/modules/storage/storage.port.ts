/** Port for private file storage. Usecases depend on this; `infrastructure/` supplies the implementation (e.g. Supabase). */
export interface IFileStorage {
  /** Store `bytes` under `path` (overwrites). */
  put(path: string, bytes: ArrayBuffer, contentType: string): Promise<void>;
  /** Move an object (rename). */
  move(from: string, to: string): Promise<void>;
  /** Short-lived URL that lets the browser read a private file. */
  signedUrl(path: string, expiresInSeconds: number): Promise<string>;
}
