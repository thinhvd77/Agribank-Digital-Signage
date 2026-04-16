BEGIN;

ALTER TABLE "screens"
  ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "screens_deleted_at_idx"
  ON "screens"("deleted_at");

COMMIT;
