-- Full-text search over a property's address (street, province, ward) and its nearby reference addresses.
-- Accent-insensitive ("Hà Nội" == "ha noi") via unaccent; kept up to date by triggers, indexed with GIN.
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE "properties" ADD COLUMN "search_vector" tsvector;

CREATE FUNCTION refresh_property_search(pid UUID) RETURNS void AS $$
  UPDATE "properties" p SET "search_vector" = to_tsvector('simple', unaccent(concat_ws(' ',
    p."property_name",
    p."street",
    p."ward"->>'name',
    p."province"->>'name',
    (SELECT string_agg(ra."name", ' ')
       FROM "property_reference_addresses" l
       JOIN "reference_addresses" ra ON ra."id" = l."reference_address_id"
      WHERE l."property_id" = p."id")
  )))
  WHERE p."id" = pid;
$$ LANGUAGE sql;

-- properties: after insert/update of the address columns
CREATE FUNCTION properties_search_trg() RETURNS trigger AS $$
BEGIN
  PERFORM refresh_property_search(NEW."id");
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER properties_search_refresh
  AFTER INSERT OR UPDATE OF "property_name", "street", "province", "ward" ON "properties"
  FOR EACH ROW EXECUTE FUNCTION properties_search_trg();

-- links: after any change
CREATE FUNCTION property_links_search_trg() RETURNS trigger AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN PERFORM refresh_property_search(OLD."property_id"); END IF;
  IF TG_OP <> 'DELETE' THEN PERFORM refresh_property_search(NEW."property_id"); END IF;
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER property_links_search_refresh
  AFTER INSERT OR UPDATE OR DELETE ON "property_reference_addresses"
  FOR EACH ROW EXECUTE FUNCTION property_links_search_trg();

-- reference address renamed: refresh every property near it
CREATE FUNCTION reference_addresses_search_trg() RETURNS trigger AS $$
BEGIN
  PERFORM refresh_property_search(l."property_id")
    FROM "property_reference_addresses" l WHERE l."reference_address_id" = NEW."id";
  RETURN NULL;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER reference_addresses_search_refresh
  AFTER UPDATE OF "name" ON "reference_addresses"
  FOR EACH ROW EXECUTE FUNCTION reference_addresses_search_trg();

-- backfill
SELECT refresh_property_search("id") FROM "properties";

CREATE INDEX "properties_search_vector_idx" ON "properties" USING GIN ("search_vector");
