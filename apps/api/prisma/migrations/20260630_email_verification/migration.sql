ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP(3);

CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE INDEX "verification_tokens_user_id_idx" ON "verification_tokens"("user_id");
