import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IActor, IPropertyScope } from "@/server/shared/actor";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IUseCase } from "@/server/shared/usecase";
import type { ILeaseRepository } from "../lease/lease.repository";
import type { IFileStorage } from "./storage.port";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Files a tenant uploads live under their lease, so a path alone says who may read it. */
export const leaseFilePrefix = (leaseId: string) => `leases/${leaseId}/`;

export interface IUploadLeaseFileCommand {
  actor: IActor;
  leaseId: string;
  name: string;
  contentType: string;
  bytes: ArrayBuffer;
}
export interface IUploadedFileResponse {
  path: string;
  name: string;
}

export class UploadLeaseFileUseCase implements IUseCase<IUploadLeaseFileCommand, IUploadedFileResponse> {
  constructor(private readonly storage: IFileStorage, private readonly leases: ILeaseRepository) {}
  async execute(c: IUploadLeaseFileCommand) {
    if (!(await this.leases.isTenant(c.actor.accountId, c.leaseId))) throw new NotFoundError("Lease");
    const ext = TYPES[c.contentType];
    if (!ext) throw new ValidationError("Only JPG, PNG, WebP or PDF files are allowed");
    if (c.bytes.byteLength === 0) throw new ValidationError("The file is empty");
    if (c.bytes.byteLength > MAX_UPLOAD_BYTES) throw new ValidationError("The file must be 5 MB or smaller");
    const path = `${leaseFilePrefix(c.leaseId)}${randomUUID()}.${ext}`;
    await this.storage.put(path, c.bytes, c.contentType);
    return { path, name: c.name.slice(0, 200) };
  }
}

export interface IGetLeaseFileUrlCommand {
  actor: IActor;
  leaseId: string;
  path: string;
}
export class GetLeaseFileUrlUseCase implements IUseCase<IGetLeaseFileUrlCommand, { url: string }> {
  constructor(private readonly storage: IFileStorage, private readonly leases: ILeaseRepository) {}
  async execute(c: IGetLeaseFileUrlCommand) {
    if (!(await this.leases.isTenant(c.actor.accountId, c.leaseId))) throw new NotFoundError("Lease");
    if (!c.path.startsWith(leaseFilePrefix(c.leaseId)) || c.path.includes("..")) throw new NotFoundError("File");
    return { url: await this.storage.signedUrl(c.path, 300) };
  }
}

// ── property images (header image, gallery) ─────────────────────────────────────────
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const propertyFilePrefix = (propertyId: string) => `properties/${propertyId}/`;

export interface IUploadPropertyImageCommand extends IPropertyScope {
  name: string;
  contentType: string;
  bytes: ArrayBuffer;
}
export class UploadPropertyImageUseCase implements IUseCase<IUploadPropertyImageCommand, IUploadedFileResponse> {
  constructor(private readonly storage: IFileStorage, private readonly policy: AccessPolicy) {}
  async execute(c: IUploadPropertyImageCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    const ext = IMAGE_TYPES[c.contentType];
    if (!ext) throw new ValidationError("Only JPG, PNG or WebP images are allowed");
    if (c.bytes.byteLength === 0) throw new ValidationError("The file is empty");
    if (c.bytes.byteLength > MAX_UPLOAD_BYTES) throw new ValidationError("The image must be 5 MB or smaller");
    const path = `${propertyFilePrefix(c.propertyId)}${randomUUID()}.${ext}`;
    await this.storage.put(path, c.bytes, c.contentType);
    return { path, name: c.name.slice(0, 200) };
  }
}

export interface IGetPropertyFileUrlCommand extends IPropertyScope {
  path: string;
}
export class GetPropertyFileUrlUseCase implements IUseCase<IGetPropertyFileUrlCommand, { url: string }> {
  constructor(private readonly storage: IFileStorage, private readonly policy: AccessPolicy) {}
  async execute(c: IGetPropertyFileUrlCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    if (!c.path.startsWith(propertyFilePrefix(c.propertyId)) || c.path.includes("..")) throw new NotFoundError("File");
    return { url: this.storage.publicUrl(c.path) };
  }
}

// ── draft images: uploaded while creating a property, before it has an id ───────────
/** Account-scoped staging area; the create-property use case moves these files under the new property. */
export const draftFilePrefix = (accountId: string) => `uploads/${accountId}/`;

export class UploadDraftImageUseCase implements IUseCase<{ actor: IActor; name: string; contentType: string; bytes: ArrayBuffer }, IUploadedFileResponse> {
  constructor(private readonly storage: IFileStorage) {}
  async execute(c: { actor: IActor; name: string; contentType: string; bytes: ArrayBuffer }) {
    const ext = IMAGE_TYPES[c.contentType];
    if (!ext) throw new ValidationError("Only JPG, PNG or WebP images are allowed");
    if (c.bytes.byteLength === 0) throw new ValidationError("The file is empty");
    if (c.bytes.byteLength > MAX_UPLOAD_BYTES) throw new ValidationError("The image must be 5 MB or smaller");
    const path = `${draftFilePrefix(c.actor.accountId)}${randomUUID()}.${ext}`;
    await this.storage.put(path, c.bytes, c.contentType);
    return { path, name: c.name.slice(0, 200) };
  }
}

export class GetDraftFileUrlUseCase implements IUseCase<{ actor: IActor; path: string }, { url: string }> {
  constructor(private readonly storage: IFileStorage) {}
  async execute({ actor, path }: { actor: IActor; path: string }) {
    if (!path.startsWith(draftFilePrefix(actor.accountId)) || path.includes("..")) throw new NotFoundError("File");
    return { url: this.storage.publicUrl(path) };
  }
}
