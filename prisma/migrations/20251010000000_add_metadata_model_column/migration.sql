-- Add metadata_model column to ai_settings table
ALTER TABLE "ai_settings" ADD COLUMN "metadata_model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo';
