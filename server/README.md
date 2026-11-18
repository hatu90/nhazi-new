# Backend architecture

    app/api/**/route.ts          route      parse (zod) -> build Command -> usecase.execute -> respond
    server/modules/<m>/          usecase    business rules; talks only to ports
        <m>.schema.ts                       zod schemas + I*Query / I*Payload / I*Command / I*Response types
        <m>.repository.ts                   port (interface) the usecases depend on
        <m>.usecases.ts                     one class per usecase, one `execute`
    server/infrastructure/       infra      Prisma/Postgres + Firebase implementations of the ports
    server/container.ts          wiring     the only file that knows usecases AND infrastructure
    server/http/route.ts         edge       auth wrappers, zod parsing, error -> JSON mapping
    server/shared/               kernel     errors, pagination, zod building blocks, IActor, IUseCase

Dependency direction (never reversed, so no cycles):
`route -> container -> usecase -> repository (port) <- infrastructure`. `*.schema.ts` imports only zod and `shared`.

## Conventions
- **GET**: `IxxxQuery` (zod-parsed from the query string) -> `IxxxResponse`.
- **POST/PATCH**: `IxxxPayload` (zod-parsed body, already trimmed/normalised) -> `toXxxCommand(payload, actor, ...)` -> `IxxxCommand` (what usecases and repositories receive).
- zod replaces entities: validation and transformation happen at the edge; repositories return response-shaped data.
- Errors: throw `NotFoundError | ForbiddenError | ConflictError | ValidationError | UnauthorizedError` anywhere; the edge maps them. Envelope: `{ data }` / `{ error: { code, message, details? } }`.
- Authorisation lives in usecases (`AccessPolicy` for property roles; tenant-scoped repository methods for leases).
- Routes: `/api/public` (no login, plus `register`), `/api/me`, `/api/admin` (property management), `/api/lease` (tenant).

## Endpoints
`/api/public`  properties (search, detail) · plans · register
`/api/me`  profile · subscription
`/api/lease/:leaseId`  tenant: lease, invoices (+detail), requests (create, list, cancel, comment)
`/api/admin/properties` (+ `/:propertyId/...`, role-checked per call)
- structure: units · handovers (default list per unit) · inventory-items · services (+ price versions) · meters · readings
- team: members (owner only) · agreement-templates (+ append-only versions)
- invitations: admin invites a phone to the team (owner only, with a role) or to a lease (as tenant); `/api/me/invitations` lists what was sent to my phone, accept / decline; admin can revoke. The account's phone number is the only credential, there is no token. Accepting adds `account_properties` / `account_leases` (an existing one is kept). Open invitations are unique per phone and target.
- billing calculator: `lib/billing/pricing.ts` is pure (no imports; the frontend runs the same file for its live calculator). Price = tiers over usage: plain (1 tier) or step (cost = Σ usage in tier × rate). Proration is a *suggestion* (`suggestAmount`: billing months from the period start's day-of-month; `prorate` by days for credits / refunds). The server never recomputes an amount the admin typed.
- lease lifecycle (one atomic step each, every suggested line overridable by key, see `lifecycle.schema.ts`):
  1. `POST …/leases` writes a **draft** (unit, start, rent, deposit, `firstPeriodEnd`, tenants); members / subscriptions / handovers / readings are added to it; `DELETE` throws a draft away; the tenant does not see it.
  2. `POST …/leases/:id/start` opens the first period (usages with frozen prices) + the `move_in` invoice (deposit, rent, non-meter services).
  3. `POST …/billing-periods/:id/close` closes at `endDate` (mid-term allowed) with closing `readings`; with `next` it opens the next period + `transition` invoice (next rent, services, this period's meter usage, credit for unused advance days).
  4. `POST …/leases/:id/subscriptions` mid-term: also creates the running period's usage and an invoice for the days left (non-meter).
  5. `POST …/leases/:id/close` ends the lease: closes the period, closing invoice, ends subscriptions + members, prefilled pending refund (unused rent / services by days + deposit, capped by what was paid).
  Price version of a usage = the one in force on its period's first day, frozen in `usages.price`.
- setup: `PATCH …/properties/:id` (images, header, rules, address), `POST …/{units,meters,services,inventory-items}/bulk` (1..200, all or nothing).
- leases: create draft (tenants by phone, members, handover snapshot, pinned template version) · rent versions · tenants · members · subscriptions · handovers
- money: invoices (manual) · payments · cancel · refunds (+ pay / cancel) · billing-periods (read)
- requests: list · update (status / assignee / priority) · comments

## Not built yet
- **Billing automation**: periods, usages and event invoices are written by the admin (the frontend calculates and pre-fills); nothing opens or
  closes a period on a schedule, and a subscription added in the middle of an open period gets no usage until the next one (bill it with a `kind = other` invoice).
  Refund proration is likewise typed by the admin.
- DB triggers (see `prisma/migrations/0002_constraints`). Rules enforced in usecases instead of triggers: reading monotonicity, payment <= owed
  (row-locked), invoice status from payments, refund caps (read-then-write: two concurrent refunds on the same invoice can both pass), subscription overlap.
- Subscribing to a SaaS plan / paying for it.

## Smoke test
    AUTH_DEV_BYPASS=1 npm run dev -- -p 3100      # in one terminal
    PART2=./smoke-part2.mjs,./smoke-part3.mjs,./smoke-part4.mjs,./smoke-part5.mjs node scripts/smoke.mjs  # in another (needs the local database)

## Add an endpoint
1. schema: add the Query/Payload zod schema, `I*` types and (for writes) `toXxxCommand`.
2. port: add the method to `<m>.repository.ts`; implement it in `infrastructure/prisma/repositories/`.
3. usecase: add the class; register it in `container.ts`.
4. route: `app/api/.../route.ts` using `publicRoute | identityRoute | authedRoute`.

## Local setup
    cp .env.example .env && npm run db:up && npm run db:migrate && npm run dev
With `AUTH_DEV_BYPASS=1` (never in production) send `Authorization: Bearer dev:<uid>[:<+84phone>]` instead of a Firebase token.

`prisma/schema.prisma` was generated once from `nhazi.dbml`; it is now the source of truth for code. `0002_constraints`
holds what Prisma cannot express (partial unique indexes, CHECKs, EXCLUDE). DB triggers are not written yet.
