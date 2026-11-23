import type { IPropertyRepository } from "@/server/modules/property/property.repository";
import {
  provinceSchema,
  wardSchema,
  type IAdminPropertyDetail,
  type IAdminPropertyListQuery,
  type ICreatePropertyCommand,
  type IUpdatePropertyCommand,
  type IPropertyDetailResponse,
  type IPropertySearchQuery,
  type IPublicPropertyDetail,
  type IPropertySummaryResponse,
} from "@/server/modules/property/property.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import { Prisma, type PrismaClient } from "../client";
import { numOrNull } from "../mappers";
import { referenceAddressSelect, resolveReferenceAddressLinks } from "./reference-address.repository";
import { slugify } from "@/server/modules/reference-address/reference-address.schema";
import { pricesSchema } from "@/server/modules/service/service.schema";
import { deriveStatus } from "@/server/modules/verification/verification.rules";
import { toUnit } from "./unit.repository";
import { today as todayStr } from "@/server/modules/lease/lease.rules";

const unitWhere = { deletedAt: null } as const;

const summarySelect = {
  id: true,
  propertyName: true,
  category: true,
  street: true,
  province: true,
  ward: true,
  rentPriceFrom: true,
  rentPriceTo: true,
  rentNegotiable: true,
  headerImage: true,
  verificationResults: { where: { endedAt: null }, select: { expiresAt: true }, take: 1 },
  verifications: { where: { status: { in: ["declared", "confirmed"] }, criterion: { active: true } }, select: { id: true }, take: 1 },
  referenceAddresses: {
    select: { distance: true, referenceAddress: { select: referenceAddressSelect } },
    orderBy: [{ distance: { sort: "asc", nulls: "last" } }, { referenceAddress: { name: "asc" } }],
  },
  _count: { select: { units: { where: unitWhere } } },
} satisfies Prisma.PropertySelect;

const detailSelect = {
  ...summarySelect,
  images: true,
  rules: true,
  documents: true,
  units: { where: unitWhere, orderBy: [{ floor: "asc" }, { unitName: "asc" }] },
} satisfies Prisma.PropertySelect;

type SummaryRow = Prisma.PropertyGetPayload<{ select: typeof summarySelect }>;
type DetailRow = Prisma.PropertyGetPayload<{ select: typeof detailSelect }>;

/** zod parses the stored JSON snapshots, so a corrupt row fails loudly instead of leaking. */
const toSummary = (r: SummaryRow): IPropertySummaryResponse => ({
  id: r.id,
  name: r.propertyName,
  category: r.category,
  street: r.street,
  province: provinceSchema.parse(r.province),
  ward: wardSchema.parse(r.ward),
  rentPriceFrom: numOrNull(r.rentPriceFrom),
  rentPriceTo: numOrNull(r.rentPriceTo),
  rentNegotiable: r.rentNegotiable,
  headerImage: r.headerImage,
  unitCount: r._count.units,
  verificationStatus: deriveStatus(r.verificationResults[0]?.expiresAt ?? null, r.verifications.length > 0),
  verificationExpiresAt: r.verificationResults[0] && r.verificationResults[0].expiresAt > new Date() ? r.verificationResults[0].expiresAt.toISOString() : null,
  referenceAddresses: r.referenceAddresses.map((l) => ({ ...l.referenceAddress, distance: l.distance })),
});

const toDetail = (r: DetailRow): IPropertyDetailResponse => ({
  ...toSummary(r),
  images: r.images,
  rules: r.rules,
  units: r.units.map(toUnit),
});

const toAdminDetail = (r: DetailRow): IAdminPropertyDetail => ({
  ...toDetail(r),
  documents: Array.isArray(r.documents) ? r.documents : [],
});

const textSearch = (q: string): Prisma.PropertyWhereInput => ({
  OR: [
    { propertyName: { contains: q, mode: "insensitive" } },
    { street: { contains: q, mode: "insensitive" } },
    { referenceAddresses: { some: { referenceAddress: { name: { contains: q, mode: "insensitive" } } } } },
    ...(slugify(q) ? [{ referenceAddresses: { some: { referenceAddress: { slug: { contains: slugify(q) } } } } }] : []),
  ],
});

/** "Hà Nội" -> "ha:* & noi:*": accent-stripped prefix tokens for to_tsquery. Null when nothing searchable remains. */
const toTsQuery = (q: string) => {
  const tokens = q
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return tokens.length ? tokens.map((t) => `${t}:*`).join(" & ") : null;
};

export class PrismaPropertyRepository implements IPropertyRepository {
  constructor(private readonly db: PrismaClient) {}

  async search(query: IPropertySearchQuery) {
    const { q, provinceCode, wardCode, category, minPrice, maxPrice, referenceAddress } = query;
    let ids: string[] | undefined;
    if (q) {
      const tsq = toTsQuery(q);
      const rows = tsq
        ? await this.db.$queryRaw<{ id: string }[]>`SELECT id FROM properties WHERE deleted_at IS NULL AND search_vector @@ to_tsquery('simple', ${tsq})`
        : [];
      ids = rows.map((r) => r.id);
    }
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(ids && { id: { in: ids } }),
      ...(category && { category }),
      ...(referenceAddress && { referenceAddresses: { some: { referenceAddress: { slug: referenceAddress } } } }),
      ...(provinceCode && { province: { path: ["code"], equals: provinceCode } }),
      ...(wardCode && { ward: { path: ["code"], equals: wardCode } }),
      // price filter = overlap of [rentPriceFrom, rentPriceTo] with [minPrice, maxPrice]; unpriced properties never match
      ...(minPrice !== undefined && { rentPriceTo: { gte: minPrice } }),
      ...(maxPrice !== undefined && { rentPriceFrom: { lte: maxPrice } }),
    };
    if (referenceAddress) {
      // "near X": nearest first (unknown distance last), so page through the links of X rather than the properties
      const linkWhere: Prisma.PropertyReferenceAddressWhereInput = { referenceAddress: { slug: referenceAddress }, property: where };
      const [links, total] = await Promise.all([
        this.db.propertyReferenceAddress.findMany({
          where: linkWhere,
          select: { property: { select: summarySelect } },
          orderBy: [{ distance: { sort: "asc", nulls: "last" } }, { propertyId: "asc" }],
          ...toSkipTake(query),
        }),
        this.db.propertyReferenceAddress.count({ where: linkWhere }),
      ]);
      return paginated(links.map((l) => toSummary(l.property)), total, query);
    }
    const [rows, total] = await Promise.all([
      this.db.property.findMany({
        where,
        select: summarySelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        ...toSkipTake(query),
      }),
      this.db.property.count({ where }),
    ]);
    return paginated(rows.map(toSummary), total, query);
  }

  async findPublicById(propertyId: string) {
    const row = await this.db.property.findFirst({ where: { id: propertyId, deletedAt: null }, select: detailSelect });
    if (!row) return null;
    const todayIso = todayStr();
    const today = new Date(todayIso);
    const [occupied, items, services] = await Promise.all([
      this.db.lease.findMany({
        where: {
          propertyId,
          deletedAt: null,
          activatedAt: { not: null },
          terminatedAt: null,
          startDate: { lte: today },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
        },
        select: { unitId: true },
        distinct: ["unitId"],
      }),
      this.db.inventoryItem.findMany({ where: { propertyId, deletedAt: null }, select: { inventoryName: true }, orderBy: { inventoryName: "asc" } }),
      this.db.service.findMany({ where: { propertyId, deletedAt: null }, orderBy: [{ usageBase: "asc" }, { serviceName: "asc" }] }),
    ]);
    const occupiedIds = new Set(occupied.map((l) => l.unitId));
    const emptyUnitIds = row.units.filter((u) => !occupiedIds.has(u.id)).map((u) => u.id);
    return {
      ...toDetail(row),
      emptyUnitCount: emptyUnitIds.length,
      emptyUnitIds,
      inventoryItems: items.map((i) => i.inventoryName),
      services: services.map((s) => ({
        name: s.serviceName,
        usageBase: s.usageBase,
        unitOfMeasure: s.unitOfMeasure,
        description: s.description,
        // latest version already in force (versions are ascending by effectiveDate)
        tiers: pricesSchema.parse(s.prices).filter((v) => v.effectiveDate <= todayIso).at(-1)?.tiers ?? [],
      })),
    } satisfies IPublicPropertyDetail;
  }

  async listManaged(accountId: string, query: IAdminPropertyListQuery) {
    const where: Prisma.AccountPropertyWhereInput = {
      accountId,
      property: { deletedAt: null, ...(query.q && textSearch(query.q)) },
    };
    const [rows, total] = await Promise.all([
      this.db.accountProperty.findMany({
        where,
        select: { role: true, property: { select: summarySelect } },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        ...toSkipTake(query),
      }),
      this.db.accountProperty.count({ where }),
    ]);
    return paginated(rows.map((m) => ({ ...toSummary(m.property), role: m.role })), total, query);
  }

  async hasLeases(propertyId: string) {
    return (await this.db.lease.count({ where: { propertyId, deletedAt: null } })) > 0;
  }

  async softDelete(propertyId: string) {
    const r = await this.db.property.updateMany({ where: { id: propertyId, deletedAt: null }, data: { deletedAt: new Date() } });
    return r.count > 0;
  }

  async findAdminById(propertyId: string) {
    const row = await this.db.property.findFirst({ where: { id: propertyId, deletedAt: null }, select: detailSelect });
    return row ? toAdminDetail(row) : null;
  }

  async create(c: ICreatePropertyCommand) {
    const row = await this.db.$transaction(async (tx) => {
      const links = await resolveReferenceAddressLinks(tx, c.referenceAddresses);
      return tx.property.create({
      data: {
        propertyName: c.name,
        category: c.category,
        street: c.street,
        province: c.province,
        ward: c.ward,
        rentPriceFrom: c.rentPriceFrom,
        rentPriceTo: c.rentPriceTo,
        rentNegotiable: c.rentNegotiable,
        headerImage: c.headerImage,
        images: c.images,
        rules: c.rules,
        accountProperties: { create: { accountId: c.actor.accountId, role: "owner" } },
        referenceAddresses: { create: links },
      },
      select: detailSelect,
      });
    });
    return toAdminDetail(row);
  }

  async update(c: IUpdatePropertyCommand) {
    const row = await this.db.$transaction(async (tx) => {
      const links = c.referenceAddresses && (await resolveReferenceAddressLinks(tx, c.referenceAddresses));
      return tx.property.update({
      where: { id: c.propertyId },
      data: {
        propertyName: c.name,
        category: c.category,
        street: c.street,
        province: c.province,
        ward: c.ward,
        rentPriceFrom: c.rentPriceFrom,
        rentPriceTo: c.rentPriceTo,
        rentNegotiable: c.rentNegotiable,
        headerImage: c.headerImage,
        images: c.images,
        rules: c.rules,
        ...(links && { referenceAddresses: { deleteMany: {}, create: links } }),
      },
      select: detailSelect,
      });
    });
    return toAdminDetail(row);
  }
}
