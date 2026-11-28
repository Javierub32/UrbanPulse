CREATE TABLE "Department" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE "Team" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "departmentId" UUID NOT NULL REFERENCES "Department" ("id"),
    "name" VARCHAR(255) NOT NULL,
    UNIQUE ("departmentId", "name")
);

ALTER TABLE "User" ADD COLUMN "teamId" UUID REFERENCES "Team" ("id");
ALTER TABLE "Assignment" ADD COLUMN "teamId" UUID REFERENCES "Team" ("id");
ALTER TABLE "Assignment" ADD CONSTRAINT "ck_Assignment_single_recipient"
    CHECK ("teamId" IS NULL OR "technicianId" IS NULL);

CREATE INDEX "idx_User_teamId" ON "User" ("teamId");
CREATE INDEX "idx_Assignment_teamId" ON "Assignment" ("teamId");

-- A direct assignment and a team assignment both grant access to the technician.
CREATE VIEW "IncidentTechnicianAccess" AS
    SELECT a."incidentId", a."technicianId" FROM "Assignment" a WHERE a."technicianId" IS NOT NULL
    UNION ALL
    SELECT a."incidentId", u."id" FROM "Assignment" a
    JOIN "User" u ON u."teamId" = a."teamId" AND u."role" = 'TECHNICIAN';

INSERT INTO "Department" ("id", "name") VALUES
    ('e8000000-0000-4000-8000-000000000001', 'Servicios urbanos'),
    ('e8000000-0000-4000-8000-000000000002', 'Movilidad');

INSERT INTO "Team" ("id", "departmentId", "name") VALUES
    ('e8100000-0000-4000-8000-000000000001', 'e8000000-0000-4000-8000-000000000001', 'Alumbrado'),
    ('e8100000-0000-4000-8000-000000000002', 'e8000000-0000-4000-8000-000000000001', 'Limpieza viaria'),
    ('e8100000-0000-4000-8000-000000000003', 'e8000000-0000-4000-8000-000000000002', 'Señalización');

UPDATE "User"
SET "teamId" = 'e8100000-0000-4000-8000-000000000001'
WHERE "id" IN ('f5300000-0000-4000-8000-000000000005', 'f5300000-0000-4000-8000-000000000006');

-- Reutiliza la credencial de demostración de V5 para los dos técnicos adicionales.
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "active", "createdAt", "teamId")
SELECT seed.id::uuid, seed.name, seed.email, source."passwordHash", 'TECHNICIAN', true,
       TIMESTAMP '2026-01-01 00:00:00', seed.team::uuid
FROM "User" source CROSS JOIN (VALUES
    ('e8200000-0000-4000-8000-000000000003', 'Técnico sintético 3', 'tecnico3@urbanpulse.invalid', 'e8100000-0000-4000-8000-000000000002'),
    ('e8200000-0000-4000-8000-000000000004', 'Técnico sintético 4', 'tecnico4@urbanpulse.invalid', 'e8100000-0000-4000-8000-000000000003')
) AS seed(id, name, email, team)
WHERE source."id" = 'f5300000-0000-4000-8000-000000000005';
