import { getContainer } from "@/server/container";
import { ok, publicRoute } from "@/server/http/route";

export const GET = publicRoute(async () => ok(await getContainer().listPlans.execute()));
