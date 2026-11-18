import type { IAgreementRepository } from "@/server/modules/agreement/agreement.repository";
import {
  templateVersionsSchema,
  type IAddVersionCommand,
  type ICreateTemplateCommand,
  type ITemplateDetailResponse,
  type ITemplateListQuery,
  type ITemplateVersion,
  type IUpdateTemplateCommand,
} from "@/server/modules/agreement/agreement.schema";
import { ConflictError } from "@/server/shared/errors";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import type { Prisma, PrismaClient } from "../client";
import { isoDateTime, toJson } from "../mappers";

type Row = Prisma.AgreementTemplateGetPayload<object>;

const summary = (r: Row) => ({
  id: r.id,
  propertyId: r.propertyId,
  name: r.templateName,
  isDefault: r.isDefault,
  currentVersion: r.currentVersion,
  updatedAt: isoDateTime(r.updatedAt),
});

const toDetail = (r: Row): ITemplateDetailResponse => {
  const versions = templateVersionsSchema.parse(r.versions);
  const current = versions.find((v) => v.version === r.currentVersion) ?? versions[versions.length - 1];
  return {
    ...summary(r),
    versions: versions.map(({ version, createdAt, createdBy }) => ({ version, createdAt, createdBy })),
    currentData: current.data,
  };
};

const live = (propertyId: string, id?: string): Prisma.AgreementTemplateWhereInput => ({ propertyId, deletedAt: null, ...(id && { id }) });

export class PrismaAgreementRepository implements IAgreementRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(propertyId: string, q: ITemplateListQuery) {
    const where = live(propertyId);
    const [rows, total] = await Promise.all([
      this.db.agreementTemplate.findMany({ where, orderBy: [{ isDefault: "desc" }, { templateName: "asc" }], ...toSkipTake(q) }),
      this.db.agreementTemplate.count({ where }),
    ]);
    return paginated(rows.map(summary), total, q);
  }

  async findById(propertyId: string, templateId: string) {
    const r = await this.db.agreementTemplate.findFirst({ where: live(propertyId, templateId) });
    return r ? toDetail(r) : null;
  }

  async findVersion(propertyId: string, templateId: string, version: number) {
    const r = await this.db.agreementTemplate.findFirst({ where: live(propertyId, templateId) });
    const v = r && templateVersionsSchema.parse(r.versions).find((x) => x.version === version);
    return v ? { templateId, version: v.version, createdAt: v.createdAt, createdBy: v.createdBy, data: v.data } : null;
  }

  create(c: ICreateTemplateCommand) {
    return this.db.$transaction(async (tx) => {
      if (c.isDefault) await tx.agreementTemplate.updateMany({ where: { ...live(c.propertyId), isDefault: true }, data: { isDefault: false } });
      const first: ITemplateVersion = { version: 1, createdAt: new Date().toISOString(), createdBy: c.actor.accountId, data: c.data };
      const r = await tx.agreementTemplate.create({
        data: {
          propertyId: c.propertyId,
          templateName: c.name,
          versions: toJson([first]),
          currentVersion: 1,
          isDefault: c.isDefault,
          createdBy: c.actor.accountId,
        },
      });
      return toDetail(r);
    });
  }

  update(c: IUpdateTemplateCommand) {
    return this.db.$transaction(async (tx) => {
      if (!(await tx.agreementTemplate.count({ where: live(c.propertyId, c.templateId) }))) return null;
      if (c.isDefault) {
        await tx.agreementTemplate.updateMany({ where: { ...live(c.propertyId), isDefault: true, id: { not: c.templateId } }, data: { isDefault: false } });
      }
      const r = await tx.agreementTemplate.update({ where: { id: c.templateId }, data: { templateName: c.name, isDefault: c.isDefault } });
      return toDetail(r);
    });
  }

  async addVersion(c: IAddVersionCommand) {
    const row = await this.db.agreementTemplate.findFirst({ where: live(c.propertyId, c.templateId) });
    if (!row) return null;
    if (row.currentVersion !== c.baseVersion) {
      throw new ConflictError(`Template is at version ${row.currentVersion}; reload before saving`, "STALE_VERSION");
    }
    const next: ITemplateVersion = { version: row.currentVersion + 1, createdAt: new Date().toISOString(), createdBy: c.actor.accountId, data: c.data };
    const versions = [...templateVersionsSchema.parse(row.versions), next];
    // compare-and-set on currentVersion: a concurrent save makes count 0
    const r = await this.db.agreementTemplate.updateMany({
      where: { id: row.id, currentVersion: c.baseVersion },
      data: { versions: toJson(versions), currentVersion: next.version },
    });
    if (r.count === 0) throw new ConflictError("Template was changed meanwhile; reload before saving", "STALE_VERSION");
    return toDetail({ ...row, versions: versions as unknown as Row["versions"], currentVersion: next.version, updatedAt: new Date() });
  }

  async softDelete(propertyId: string, templateId: string) {
    const r = await this.db.agreementTemplate.updateMany({ where: live(propertyId, templateId), data: { deletedAt: new Date(), isDefault: false } });
    return r.count > 0;
  }
}
