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
  type IPropertySummaryResponse,
} from "@/server/modules/property/property.schema";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import { Prisma, type PrismaClient } from "../client";
import { numOrNull } from "../mappers";
import { toUnit } from "./unit.repository";

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
  ],
});

export class PrismaPropertyRepository implements IPropertyRepository {
  constructor(private readonly db: PrismaClient) {}

  async search(query: IPropertySearchQuery) {
    const { q, provinceCode, wardCode, category, minPrice, maxPrice } = query;
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      ...(q && textSearch(q)),
      ...(category && { category }),
      ...(provinceCode && { province: { path: ["code"], equals: provinceCode } }),
      ...(wardCode && { ward: { path: ["code"], equals: wardCode } }),
      // price filter = overlap of [rentPriceFrom, rentPriceTo] with [minPrice, maxPrice]; unpriced properties never match
      ...(minPrice !== undefined && { rentPriceTo: { gte: minPrice } }),
      ...(maxPrice !== undefined && { rentPriceFrom: { lte: maxPrice } }),
    };
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
    return row ? toDetail(row) : null;
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

  async findAdminById(propertyId: string) {
    const row = await this.db.property.findFirst({ where: { id: propertyId, deletedAt: null }, select: detailSelect });
    return row ? toAdminDetail(row) : null;
  }

  async create(c: ICreatePropertyCommand) {
    const row = await this.db.property.create({
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
      },
      select: detailSelect,
    });
    return toAdminDetail(row);
  }

  async update(c: IUpdatePropertyCommand) {
    const row = await this.db.property.update({
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
      },
      select: detailSelect,
    });
    return toAdminDetail(row);
  }
}
