CREATE TABLE "parsed_uploads" (
    "id" UUID NOT NULL,
    "app_user_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "extension" VARCHAR(24) NOT NULL,
    "size" INTEGER NOT NULL,
    "extracted_text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "parsed_uploads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "parsed_uploads_app_user_id_created_at_idx"
ON "parsed_uploads"("app_user_id", "created_at");

ALTER TABLE "parsed_uploads"
ADD CONSTRAINT "parsed_uploads_app_user_id_fkey"
FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;