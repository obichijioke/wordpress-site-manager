-- CreateTable
CREATE TABLE "rss_feeds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rss_feeds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "automation_jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "rss_feed_id" TEXT,
    "topic" TEXT,
    "source_url" TEXT,
    "source_title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "generated_title" TEXT,
    "generated_content" TEXT,
    "generated_excerpt" TEXT,
    "wp_post_id" INTEGER,
    "published_at" DATETIME,
    "error_message" TEXT,
    "ai_model" TEXT,
    "tokens_used" INTEGER,
    "ai_cost" REAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "automation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "automation_jobs_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "automation_jobs_rss_feed_id_fkey" FOREIGN KEY ("rss_feed_id") REFERENCES "rss_feeds" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "rss_feeds_user_id_idx" ON "rss_feeds"("user_id");

-- CreateIndex
CREATE INDEX "automation_jobs_user_id_idx" ON "automation_jobs"("user_id");

-- CreateIndex
CREATE INDEX "automation_jobs_site_id_idx" ON "automation_jobs"("site_id");

-- CreateIndex
CREATE INDEX "automation_jobs_status_idx" ON "automation_jobs"("status");

-- CreateIndex
CREATE INDEX "automation_jobs_created_at_idx" ON "automation_jobs"("created_at");
