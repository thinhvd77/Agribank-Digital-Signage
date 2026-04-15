-- CreateEnum
CREATE TYPE "ScreenStatus" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('video', 'image');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "resolution" TEXT,
    "status" "ScreenStatus" NOT NULL DEFAULT 'offline',
    "last_ping" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" "MediaType" NOT NULL,
    "file_size" BIGINT NOT NULL,
    "mime_type" TEXT,
    "duration" INTEGER,
    "dimensions" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_items" (
    "id" TEXT NOT NULL,
    "screen_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "screens_status_idx" ON "screens"("status");

-- CreateIndex
CREATE INDEX "media_file_type_idx" ON "media"("file_type");

-- CreateIndex
CREATE INDEX "media_created_at_idx" ON "media"("created_at" DESC);

-- CreateIndex
CREATE INDEX "playlist_items_screen_id_idx" ON "playlist_items"("screen_id");

-- CreateIndex
CREATE INDEX "playlist_items_screen_id_order_index_idx" ON "playlist_items"("screen_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_items_screen_id_order_index_key" ON "playlist_items"("screen_id", "order_index");

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_screen_id_fkey" FOREIGN KEY ("screen_id") REFERENCES "screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
