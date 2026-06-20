ALTER TABLE "chat_conversations"
ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS "chat_conversations_app_user_id_deleted_at_idx"
ON "chat_conversations" ("app_user_id", "deleted_at");
