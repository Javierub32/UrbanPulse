ALTER TABLE "Assignment"
    ALTER COLUMN "technicianId" DROP NOT NULL,
    ADD CONSTRAINT "ck_Assignment_has_destination" CHECK (
        "technicianId" IS NOT NULL
        OR NULLIF(btrim("department"), '') IS NOT NULL
        OR NULLIF(btrim("team"), '') IS NOT NULL
    );
