-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_content_drafts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "category_id" TEXT,
    "featured_image" TEXT,
    "tags" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "content_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "content_drafts_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "content_drafts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_content_drafts" ("content", "created_at", "id", "metadata", "site_id", "status", "title", "type", "updated_at", "user_id") SELECT "content", "created_at", "id", "metadata", "site_id", "status", "title", "type", "updated_at", "user_id" FROM "content_drafts";
DROP TABLE "content_drafts";
ALTER TABLE "new_content_drafts" RENAME TO "content_drafts";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
