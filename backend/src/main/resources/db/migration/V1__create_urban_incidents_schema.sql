-- Urban incident management database schema
-- Database: PostgreSQL 13+ with PostGIS
-- Naming convention: PascalCase tables/types, camelCase columns, English enum values.
-- Important: quoted identifiers are case-sensitive in PostgreSQL.
-- Run on a new database/schema; this is a CREATE script, not a migration.

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE "IncidentStatus" AS ENUM (
    'REPORTED', 'VALIDATED', 'REJECTED', 'ASSIGNED',
    'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'CLOSED'
);

CREATE TYPE "IncidentCategory" AS ENUM (
    'PUBLIC_ROAD',
    'STREET_LIGHTING',
    'TRAFFIC',
    'GREEN_AREAS',
    'CLEANING',
    'WASTE',
    'STREET_FURNITURE',
    'OTHER'
);

CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "UserRole" AS ENUM (
    'CITIZEN', 'OPERATOR', 'TECHNICIAN', 'ADMINISTRATOR', 'ANALYST'
);

CREATE TYPE "AssetType" AS ENUM (
    'TRAFFIC_LIGHT', 'WASTE_CONTAINER', 'FOUNTAIN', 'TRANSIT_STOP',
    'PARKING_AREA', 'GREEN_AREA', 'OTHER'
);

CREATE TYPE "ContextType" AS ENUM (
    'WEATHER', 'TRAFFIC', 'MOBILITY', 'EVENT', 'ENVIRONMENT',
    'DEMOGRAPHICS', 'SPATIAL_CONTEXT', 'OTHER'
);

CREATE TYPE "AttachmentType" AS ENUM ('PHOTO', 'VIDEO', 'DOCUMENT', 'OTHER');

CREATE TYPE "NotificationType" AS ENUM (
    'STATUS_CHANGED', 'ASSIGNMENT', 'COMMENT',
    'RESOLUTION', 'REOPENING', 'OTHER'
);

CREATE TYPE "AssociationType" AS ENUM ('EXPLICIT', 'PROXIMITY', 'OPERATOR');

CREATE TYPE "AssignmentStatus" AS ENUM (
    'PENDING', 'ACCEPTED', 'IN_PROGRESS',
    'COMPLETED', 'REJECTED', 'CANCELLED'
);

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE "User" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR,
    "email" VARCHAR,
	"passwordHash" VARCHAR,
    "role" "UserRole",
    "active" BOOLEAN,
    "createdAt" TIMESTAMP
);

CREATE TABLE "Incident" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "title" VARCHAR,
    "description" TEXT,
    "category" "IncidentCategory",
    "location" GEOMETRY,
    "normalizedAddress" VARCHAR,
    "neighborhood" VARCHAR,
    "district" VARCHAR,
    "priority" "Priority",
    "status" "IncidentStatus",
    "registeredAt" TIMESTAMP,
    "updatedAt" TIMESTAMP,
    CONSTRAINT "fk_Incident_user"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE TABLE "Attachment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "incidentId" UUID NOT NULL,
    "type" "AttachmentType",
    "url" VARCHAR,
    "name" VARCHAR,
    "size" BIGINT,
    "metadata" JSON,
    "createdAt" TIMESTAMP,
    CONSTRAINT "fk_Attachment_incident"
        FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id")
);

CREATE TABLE "UrbanAsset" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" "AssetType",
    "code" VARCHAR,
    "name" VARCHAR,
    "source" VARCHAR,
    "location" GEOMETRY,
    "metadata" JSON
);

CREATE TABLE "IncidentAssetAssociation" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "incidentId" UUID NOT NULL,
    "urbanAssetId" UUID NOT NULL,
    "distance" DECIMAL,
    "confidence" DECIMAL,
    "associationType" "AssociationType",
    CONSTRAINT "fk_IncidentAssetAssociation_incident"
        FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id"),
    CONSTRAINT "fk_IncidentAssetAssociation_urbanAsset"
        FOREIGN KEY ("urbanAssetId") REFERENCES "UrbanAsset" ("id")
);

CREATE TABLE "UrbanContext" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "incidentId" UUID NOT NULL,
    "type" "ContextType",
    "key" VARCHAR,
    "value" VARCHAR,
    "unit" VARCHAR,
    "geometry" GEOMETRY,
    "observedAt" TIMESTAMP,
    "ingestedAt" TIMESTAMP,
    "source" VARCHAR,
    "status" VARCHAR,
    "metadata" JSON,
    CONSTRAINT "fk_UrbanContext_incident"
        FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id")
);

COMMENT ON COLUMN "UrbanContext"."status" IS 'DataStatus';

CREATE TABLE "Assignment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "incidentId" UUID NOT NULL,
    "department" VARCHAR,
    "team" VARCHAR,
    "technicianId" UUID NOT NULL,
    "status" "AssignmentStatus",
    "assignedAt" TIMESTAMP,
    "startedAt" TIMESTAMP,
    "finishedAt" TIMESTAMP,
    CONSTRAINT "fk_Assignment_incident"
        FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id"),
    CONSTRAINT "fk_Assignment_technician"
        FOREIGN KEY ("technicianId") REFERENCES "User" ("id")
);

CREATE TABLE "StatusChange" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "incidentId" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "previousStatus" "IncidentStatus",
    "status" "IncidentStatus",
    "changedAt" TIMESTAMP,
    "reason" VARCHAR,
    "comment" TEXT,
    CONSTRAINT "fk_StatusChange_incident"
        FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id"),
    CONSTRAINT "fk_StatusChange_assignment"
        FOREIGN KEY ("assignmentId") REFERENCES "Assignment" ("id"),
    CONSTRAINT "fk_StatusChange_user"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

CREATE TABLE "Notification" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "incidentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType",
    "channel" VARCHAR,
    "message" TEXT,
    "status" VARCHAR,
    "createdAt" TIMESTAMP,
    "sentAt" TIMESTAMP,
    "deliveredAt" TIMESTAMP,
    CONSTRAINT "fk_Notification_incident"
        FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id"),
    CONSTRAINT "fk_Notification_user"
        FOREIGN KEY ("userId") REFERENCES "User" ("id")
);

COMMENT ON COLUMN "Notification"."status" IS 'DeliveryStatus';

CREATE TABLE "KnowledgeDocument" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR,
    "type" VARCHAR,
    "version" VARCHAR,
    "content" TEXT,
    "url" VARCHAR,
    "source" VARCHAR,
    "createdAt" TIMESTAMP,
    "metadata" JSON
);

COMMENT ON COLUMN "KnowledgeDocument"."type" IS 'DocumentType';

CREATE TABLE "IncidentKnowledgeDocument" (
    "incidentId" UUID NOT NULL,
    "knowledgeDocumentId" UUID NOT NULL,
    CONSTRAINT "pk_IncidentKnowledgeDocument"
        PRIMARY KEY ("incidentId", "knowledgeDocumentId"),
    CONSTRAINT "fk_IncidentKnowledgeDocument_incident"
        FOREIGN KEY ("incidentId") REFERENCES "Incident" ("id"),
    CONSTRAINT "fk_IncidentKnowledgeDocument_document"
        FOREIGN KEY ("knowledgeDocumentId") REFERENCES "KnowledgeDocument" ("id")
);

CREATE TABLE "ExternalObservation" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "urbanContextId" UUID NOT NULL,
    "source" VARCHAR,
    "type" VARCHAR,
    "value" VARCHAR,
    "unit" VARCHAR,
    "geometry" GEOMETRY,
    "observedAt" TIMESTAMP,
    "ingestedAt" TIMESTAMP,
    "quality" VARCHAR,
    "metadata" JSON,
    CONSTRAINT "fk_ExternalObservation_urbanContext"
        FOREIGN KEY ("urbanContextId") REFERENCES "UrbanContext" ("id")
);

COMMENT ON COLUMN "ExternalObservation"."quality" IS 'DataQuality';

-- ============================================================
-- FOREIGN KEY AND SPATIAL INDEXES
-- ============================================================

CREATE INDEX "idx_Incident_userId" ON "Incident" ("userId");
CREATE INDEX "idx_Attachment_incidentId" ON "Attachment" ("incidentId");
CREATE INDEX "idx_IncidentAssetAssociation_incidentId" ON "IncidentAssetAssociation" ("incidentId");
CREATE INDEX "idx_IncidentAssetAssociation_urbanAssetId" ON "IncidentAssetAssociation" ("urbanAssetId");
CREATE INDEX "idx_UrbanContext_incidentId" ON "UrbanContext" ("incidentId");
CREATE INDEX "idx_Assignment_incidentId" ON "Assignment" ("incidentId");
CREATE INDEX "idx_Assignment_technicianId" ON "Assignment" ("technicianId");
CREATE INDEX "idx_StatusChange_incidentId" ON "StatusChange" ("incidentId");
CREATE INDEX "idx_StatusChange_assignmentId" ON "StatusChange" ("assignmentId");
CREATE INDEX "idx_StatusChange_userId" ON "StatusChange" ("userId");
CREATE INDEX "idx_Notification_incidentId" ON "Notification" ("incidentId");
CREATE INDEX "idx_Notification_userId" ON "Notification" ("userId");
CREATE INDEX "idx_IncidentKnowledgeDocument_knowledgeDocumentId" ON "IncidentKnowledgeDocument" ("knowledgeDocumentId");
CREATE INDEX "idx_ExternalObservation_urbanContextId" ON "ExternalObservation" ("urbanContextId");

CREATE INDEX "idx_Incident_location" ON "Incident" USING GIST ("location");
CREATE INDEX "idx_UrbanAsset_location" ON "UrbanAsset" USING GIST ("location");
CREATE INDEX "idx_UrbanContext_geometry" ON "UrbanContext" USING GIST ("geometry");
CREATE INDEX "idx_ExternalObservation_geometry" ON "ExternalObservation" USING GIST ("geometry");

COMMIT;
