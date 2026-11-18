import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type IPaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface IPaginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const toSkipTake = ({ page, pageSize }: IPaginationQuery) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
});

export const paginated = <T>(items: T[], total: number, q: IPaginationQuery): IPaginated<T> => ({
  items,
  total,
  page: q.page,
  pageSize: q.pageSize,
});
