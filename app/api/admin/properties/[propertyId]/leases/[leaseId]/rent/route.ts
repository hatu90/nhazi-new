import { getContainer } from "@/server/container";
import { adminRoute, created, parseBody, parseParams } from "@/server/http/route";
import { addRentPayloadSchema, toAddRentCommand } from "@/server/modules/tenancy/tenancy.schema";
import { idParamsSchema } from "@/server/shared/schema";

// POST: append a rent version (effectiveDate must be later than every existing one)
export const POST = adminRoute(async ({ request, params, scope }) => {
  const { leaseId } = parseParams(idParamsSchema("leaseId"), params);
  return created(await getContainer().addRentVersion.execute(toAddRentCommand(await parseBody(addRentPayloadSchema, request), scope, leaseId)));
});
