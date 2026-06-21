CREATE TABLE "knowledge_document_catalog" (
    "id" VARCHAR(32) NOT NULL DEFAULT 'default',
    "documents" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "refreshed_at" TIMESTAMPTZ NOT NULL,
    "refresh_error" TEXT,
    "failed_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_document_catalog_pkey" PRIMARY KEY ("id")
);
