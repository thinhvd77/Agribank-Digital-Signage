-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'screen_manager');

-- AlterTable: add role column (default admin) and screen_id FK
ALTER TABLE "users" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'admin';
ALTER TABLE "users" ADD COLUMN "screen_id" TEXT;

-- Backfill role from existing is_admin (all true → admin, which is the default)
-- No action needed since existing rows default to 'admin' on column add.

-- Drop the legacy is_admin column
ALTER TABLE "users" DROP COLUMN "is_admin";

-- Create unique constraint on screen_id so one screen has at most one manager
CREATE UNIQUE INDEX "users_screen_id_key" ON "users"("screen_id");

-- Add FK to screens
ALTER TABLE "users" ADD CONSTRAINT "users_screen_id_fkey"
  FOREIGN KEY ("screen_id") REFERENCES "screens"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
