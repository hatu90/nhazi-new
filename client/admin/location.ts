"use client";

import { useQuery } from "@tanstack/react-query";
import type { IProvince, IWard } from "@/client/lib/types";

const BASE = "https://provinces.open-api.vn/api/v2";
interface RawWard {
  name: string;
  code: number;
  codename: string;
  province_code: number;
}

/** Province / ward lists come from the public provinces API; the chosen ones are stored as a snapshot on the property. */
export function useProvinces() {
  return useQuery({
    queryKey: ["location", "provinces"],
    staleTime: Infinity,
    queryFn: async (): Promise<IProvince[]> => {
      const res = await fetch(`${BASE}/p/`);
      if (!res.ok) throw new Error("Could not load provinces");
      return ((await res.json()) as IProvince[]).map(({ code, name, codename }) => ({ code, name, codename }));
    },
  });
}

export function useWards(provinceCode: number | undefined) {
  return useQuery({
    queryKey: ["location", "wards", provinceCode],
    enabled: provinceCode !== undefined,
    staleTime: Infinity,
    queryFn: async (): Promise<IWard[]> => {
      const res = await fetch(`${BASE}/p/${provinceCode}?depth=2`);
      if (!res.ok) throw new Error("Could not load wards");
      const json = (await res.json()) as { wards: RawWard[] };
      return json.wards.map((w) => ({ code: w.code, name: w.name, codename: w.codename, provinceCode: w.province_code }));
    },
  });
}
