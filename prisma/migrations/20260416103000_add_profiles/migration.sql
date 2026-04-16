BEGIN;

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "screen_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create default profile for each existing screen
INSERT INTO "profiles" ("id", "screen_id", "name", "created_at", "updated_at")
SELECT
  CONCAT('default_', s."id"),
  s."id",
  'Default',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "screens" s;

-- Guard: each screen must have a default profile
DO $$
DECLARE
  screen_count INTEGER;
  default_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO screen_count FROM "screens";
  SELECT COUNT(*) INTO default_count FROM "profiles" WHERE "name" = 'Default';

  IF screen_count <> default_count THEN
    RAISE EXCEPTION 'Profile backfill incomplete: expected % defaults, got %', screen_count, default_count;
  END IF;
END $$;

-- Move playlist ownership from screen_id -> profile_id
ALTER TABLE "playlist_items" ADD COLUMN "profile_id" TEXT;

UPDATE "playlist_items" pi
SET "profile_id" = p."id"
FROM "profiles" p
WHERE p."screen_id" = pi."screen_id"
  AND p."name" = 'Default';

-- Guard: every playlist item must map to a profile before NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "playlist_items" WHERE "profile_id" IS NULL) THEN
    RAISE EXCEPTION 'Playlist item backfill incomplete: some rows have NULL profile_id';
  END IF;
END $$;

ALTER TABLE "playlist_items" ALTER COLUMN "profile_id" SET NOT NULL;

-- Drop old constraints/indexes based on screen_id
ALTER TABLE "playlist_items" DROP CONSTRAINT "playlist_items_screen_id_fkey";
DROP INDEX "playlist_items_screen_id_order_index_key";
DROP INDEX "playlist_items_screen_id_idx";
DROP INDEX "playlist_items_screen_id_order_index_idx";

ALTER TABLE "playlist_items" DROP COLUMN "screen_id";

-- Add new constraints/indexes based on profile_id
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "playlist_items_profile_id_idx" ON "playlist_items"("profile_id");
CREATE INDEX "playlist_items_profile_id_order_index_idx" ON "playlist_items"("profile_id", "order_index");
CREATE UNIQUE INDEX "playlist_items_profile_id_order_index_key" ON "playlist_items"("profile_id", "order_index");

-- Add active profile pointer to screens
ALTER TABLE "screens" ADD COLUMN "active_profile_id" TEXT;

UPDATE "screens" s
SET "active_profile_id" = p."id"
FROM "profiles" p
WHERE p."screen_id" = s."id"
  AND p."name" = 'Default';

-- Guard: every screen must have active_profile_id after backfill
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "screens" WHERE "active_profile_id" IS NULL) THEN
    RAISE EXCEPTION 'Active profile backfill incomplete: some screens have NULL active_profile_id';
  END IF;
END $$;

-- Guard: no orphan references in playlist_items.profile_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "playlist_items" pi
    LEFT JOIN "profiles" p ON p."id" = pi."profile_id"
    WHERE p."id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Data integrity error: playlist_items.profile_id contains orphan references';
  END IF;
END $$;

ALTER TABLE "screens" ADD CONSTRAINT "screens_active_profile_id_fkey" FOREIGN KEY ("active_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "profiles_screen_id_name_key" ON "profiles"("screen_id", "name");
CREATE INDEX "profiles_screen_id_idx" ON "profiles"("screen_id");
CREATE INDEX "screens_active_profile_id_idx" ON "screens"("active_profile_id");

COMMIT;
