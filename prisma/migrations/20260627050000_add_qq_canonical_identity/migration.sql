ALTER TABLE "qq_identities"
ADD COLUMN IF NOT EXISTS "canonical_id" VARCHAR(160),
ADD COLUMN IF NOT EXISTS "qq_number" VARCHAR(32),
ADD COLUMN IF NOT EXISTS "display_id" VARCHAR(32);

CREATE INDEX IF NOT EXISTS "qq_identities_canonical_id_idx"
ON "qq_identities"("canonical_id");
