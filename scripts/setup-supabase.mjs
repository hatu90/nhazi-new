// Creates the Storage buckets (idempotent): a PUBLIC one for property images, a PRIVATE one for lease files.
// Usage: npm run supabase:setup
const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY");

const buckets = [
  { id: process.env.SUPABASE_STORAGE_BUCKET ?? "handly", public: true },
  { id: process.env.SUPABASE_PRIVATE_BUCKET ?? "handly-private", public: false },
];
for (const b of buckets) {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }), apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ id: b.id, name: b.id, public: b.public }),
  });
  const body = await res.text();
  if (res.ok) console.log(`Created ${b.public ? "public" : "private"} bucket "${b.id}"`);
  else if (res.status === 409 || /already exists/i.test(body)) console.log(`Bucket "${b.id}" already exists (check its public flag in the dashboard)`);
  else throw new Error(`Creating "${b.id}" failed: ${res.status} ${body}`);
}
