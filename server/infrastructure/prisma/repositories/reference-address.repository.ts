import type { IReferenceAddressRepository } from "@/server/modules/reference-address/reference-address.repository";
import {
  slugify,
  type IReferenceAddressLink,
  type IReferenceAddressSearchQuery,
} from "@/server/modules/reference-address/reference-address.schema";
import { ValidationError } from "@/server/shared/errors";
import { paginated, toSkipTake } from "@/server/shared/pagination";
import { Prisma, type PrismaClient } from "../client";

export const referenceAddressSelect = { id: true, name: true, slug: true } satisfies Prisma.ReferenceAddressSelect;

/** Find-or-create by slug. A concurrent create of the same slug falls back to a read (unique violation P2002). */
export const upsertReferenceAddress = async (db: Prisma.TransactionClient | PrismaClient, name: string) => {
  const slug = slugify(name);
  const existing = await db.referenceAddress.findUnique({ where: { slug }, select: referenceAddressSelect });
  if (existing) return existing;
  try {
    return await db.referenceAddress.create({ data: { name: name.trim(), slug }, select: referenceAddressSelect });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return db.referenceAddress.findUniqueOrThrow({ where: { slug }, select: referenceAddressSelect });
    }
    throw e;
  }
};

/** Turns property links ({id} | {name}, distance) into rows for property_reference_addresses; later duplicates win. */
export const resolveReferenceAddressLinks = async (db: Prisma.TransactionClient, links: IReferenceAddressLink[]) => {
  const byId = new Map<string, number | null>();
  for (const [i, link] of links.entries()) {
    let id = link.id;
    if (id) {
      if (!(await db.referenceAddress.findUnique({ where: { id }, select: { id: true } }))) {
        throw new ValidationError("Unknown reference address", { fieldErrors: { [`referenceAddresses.${i}.id`]: ["Unknown reference address"] } });
      }
    } else {
      id = (await upsertReferenceAddress(db, link.name!)).id;
    }
    byId.set(id, link.distance ?? null);
  }
  return [...byId].map(([referenceAddressId, distance]) => ({ referenceAddressId, distance }));
};

export class PrismaReferenceAddressRepository implements IReferenceAddressRepository {
  constructor(private readonly db: PrismaClient) {}

  async search(query: IReferenceAddressSearchQuery) {
    const { q } = query;
    // match the typed text as-is and as a slug, so "yen phong" finds "Khu công nghiệp Yên Phong"
    const slug = q ? slugify(q) : "";
    const where: Prisma.ReferenceAddressWhereInput = q
      ? { OR: [{ name: { contains: q, mode: "insensitive" } }, ...(slug ? [{ slug: { contains: slug } }] : [])] }
      : {};
    const [items, total] = await Promise.all([
      this.db.referenceAddress.findMany({ where, select: referenceAddressSelect, orderBy: [{ name: "asc" }, { id: "asc" }], ...toSkipTake(query) }),
      this.db.referenceAddress.count({ where }),
    ]);
    return paginated(items, total, query);
  }

  findOrCreate(name: string) {
    return upsertReferenceAddress(this.db, name);
  }
}
