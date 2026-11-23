import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationError } from "@/server/shared/errors";
import type { IActor, IPropertyScope } from "@/server/shared/actor";
import { ROLES, type AccessPolicy } from "../access/access.policy";
import type { IUseCase } from "@/server/shared/usecase";
import type { ILeaseRepository } from "../lease/lease.repository";
import type { ILeaseDocument } from "../lease/lease.schema";
import type { ITenancyRepository } from "../tenancy/tenancy.repository";
import type { IFileStorage } from "./storage.port";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Does the content really look like the declared type? (the declared type comes from the client and cannot be trusted) */
const matchesSignature = (bytes: ArrayBuffer, type: string) => {
  const b = new Uint8Array(bytes.slice(0, 12));
  const starts = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  switch (type) {
    case "image/jpeg": return starts(0xff, 0xd8, 0xff);
    case "image/png": return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp": return starts(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    case "application/pdf": return starts(0x25, 0x50, 0x44, 0x46);
    default: return false;
  }
};

/** Type, emptiness, size and content check shared by every upload. Returns the file extension. */
const validateUpload = (c: { contentType: string; bytes: ArrayBuffer }, allowed: Record<string, string>, label: string) => {
  const ext = allowed[c.contentType];
  if (!ext) throw new ValidationError(allowed === IMAGE_TYPES ? "Only JPG, PNG or WebP images are allowed" : "Only JPG, PNG, WebP or PDF files are allowed");
  if (c.bytes.byteLength === 0) throw new ValidationError("The file is empty");
  if (c.bytes.byteLength > MAX_UPLOAD_BYTES) throw new ValidationError(`The ${label} must be 5 MB or smaller`);
  if (!matchesSignature(c.bytes, c.contentType)) throw new ValidationError("The file content does not match its type");
  return ext;
};

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
    const ext = validateUpload(c, TYPES, "file");
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

export interface IAddLeaseDocumentsCommand {
  actor: IActor;
  leaseId: string;
  documents: ILeaseDocument[];
}
/** Tenant: add files to the lease (ID photos, signed copies…). Only files stored under this lease are accepted; removing is for the landlord. */
export class AddLeaseDocumentsUseCase implements IUseCase<IAddLeaseDocumentsCommand, { documents: ILeaseDocument[] }> {
  constructor(private readonly leases: ILeaseRepository) {}
  async execute(c: IAddLeaseDocumentsCommand) {
    if (!(await this.leases.isTenant(c.actor.accountId, c.leaseId))) throw new NotFoundError("Lease");
    const prefix = leaseFilePrefix(c.leaseId);
    if (c.documents.some((d) => !d.path.startsWith(prefix) || d.path.includes(".."))) throw new ValidationError("Invalid document path");
    return { documents: await this.leases.addDocuments(c.leaseId, c.documents) };
  }
}

// Admin side of the same lease files (the lease must belong to the property).
export interface IUploadAdminLeaseFileCommand extends IPropertyScope {
  leaseId: string;
  name: string;
  contentType: string;
  bytes: ArrayBuffer;
}
export class UploadAdminLeaseFileUseCase implements IUseCase<IUploadAdminLeaseFileCommand, IUploadedFileResponse> {
  constructor(private readonly storage: IFileStorage, private readonly policy: AccessPolicy, private readonly tenancies: ITenancyRepository) {}
  async execute(c: IUploadAdminLeaseFileCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.manage);
    if (!(await this.tenancies.findCore(c.propertyId, c.leaseId))) throw new NotFoundError("Lease");
    const ext = validateUpload(c, TYPES, "file");
    const path = `${leaseFilePrefix(c.leaseId)}${randomUUID()}.${ext}`;
    await this.storage.put(path, c.bytes, c.contentType);
    return { path, name: c.name.slice(0, 200) };
  }
}

export interface IGetAdminLeaseFileUrlCommand extends IPropertyScope {
  leaseId: string;
  path: string;
}
export class GetAdminLeaseFileUrlUseCase implements IUseCase<IGetAdminLeaseFileUrlCommand, { url: string }> {
  constructor(private readonly storage: IFileStorage, private readonly policy: AccessPolicy, private readonly tenancies: ITenancyRepository) {}
  async execute(c: IGetAdminLeaseFileUrlCommand) {
    await this.policy.assertPropertyRole(c.actor, c.propertyId, ROLES.read);
    if (!(await this.tenancies.findCore(c.propertyId, c.leaseId))) throw new NotFoundError("Lease");
    if (!c.path.startsWith(leaseFilePrefix(c.leaseId)) || c.path.includes("..")) throw new NotFoundError("File");
    return { url: await this.storage.signedUrl(c.path, 300) };
  }
}

// ── property images (header image, gallery) ─────────────────────────────────────────
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
    const ext = validateUpload(c, IMAGE_TYPES, "image");
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
    const ext = validateUpload(c, IMAGE_TYPES, "image");
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
