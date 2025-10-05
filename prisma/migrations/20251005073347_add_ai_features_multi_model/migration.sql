-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "openai_api_key" TEXT,
    "anthropic_api_key" TEXT,
    "default_provider" TEXT NOT NULL DEFAULT 'openai',
    "monthly_token_limit" INTEGER NOT NULL DEFAULT 100000,
    "enhance_model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "generate_model" TEXT NOT NULL DEFAULT 'gpt-4-turbo',
    "summarize_model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "seo_meta_model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "titles_model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "tone_model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "keywords_model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "translate_model" TEXT NOT NULL DEFAULT 'gpt-4-turbo',
    "alt_text_model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "outline_model" TEXT NOT NULL DEFAULT 'gpt-4-turbo',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "ai_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokens_used" INTEGER NOT NULL,
    "cost" REAL NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "custom_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'custom',
    "endpoint" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 2000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "custom_models_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_settings_user_id_key" ON "ai_settings"("user_id");

-- CreateIndex
CREATE INDEX "ai_usage_user_id_created_at_idx" ON "ai_usage"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "custom_models_user_id_identifier_key" ON "custom_models"("user_id", "identifier");
