CREATE TABLE IF NOT EXISTS "qq_identities" (
    "id" UUID NOT NULL,
    "app_user_id" UUID NOT NULL,
    "app_id" VARCHAR(32) NOT NULL,
    "open_id" VARCHAR(128) NOT NULL,
    "union_id" VARCHAR(128),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "qq_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "qq_identities_app_id_open_id_key"
ON "qq_identities"("app_id", "open_id");

CREATE INDEX IF NOT EXISTS "qq_identities_union_id_idx"
ON "qq_identities"("union_id");

CREATE INDEX IF NOT EXISTS "qq_identities_app_user_id_idx"
ON "qq_identities"("app_user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'qq_identities_app_user_id_fkey'
    ) THEN
        ALTER TABLE "qq_identities"
        ADD CONSTRAINT "qq_identities_app_user_id_fkey"
        FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END
$$;
