"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, withQuery } from "./api";

type Query = Record<string, string | number | boolean | null | undefined>;

/** GET `path` (with optional query string); cached under [path, query]. */
export function useGet<T>(path: string, query?: Query, options: { enabled?: boolean; keepPrevious?: boolean; refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: [path, query ?? {}],
    queryFn: () => api<T>(path, { query }),
    enabled: options.enabled ?? true,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    refetchInterval: options.refetchInterval,
  });
}

/**
 * Write to `path`, then refetch every cached query whose path starts with one of `invalidate`.
 * Call `.mutate(body)` / `.mutateAsync(body)`; for DELETE or body-less POSTs pass `undefined`.
 */
export function useSend<TBody = undefined, TRes = unknown>(method: "POST" | "PATCH" | "PUT" | "DELETE", path: string | ((body: TBody) => string), invalidate: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) => api<TRes>(typeof path === "function" ? path(body) : path, { method, body: body === undefined ? undefined : body }),
    onSuccess: () =>
      qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && invalidate.some((p) => (q.queryKey[0] as string).startsWith(p)) }),
  });
}

export { withQuery };
