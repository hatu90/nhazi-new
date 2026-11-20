import { label } from "@/client/lib/format";
import type { PropertyRole } from "@/client/lib/types";

const roles: PropertyRole[] = ["owner", "admin", "technician", "viewer"];
export const roleOptions = roles.map((r) => ({ value: r, label: label(r) }));
