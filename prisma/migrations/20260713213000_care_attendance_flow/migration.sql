ALTER TYPE "TriageStatus" ADD VALUE IF NOT EXISTS 'CARE_WAITING';
ALTER TYPE "TriageStatus" ADD VALUE IF NOT EXISTS 'CALLED';
ALTER TYPE "TriageStatus" ADD VALUE IF NOT EXISTS 'IN_SERVICE';
ALTER TYPE "TriageStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

CREATE TYPE "CareAttendanceStatus" AS ENUM ('WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "CareAttendance" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "status" "CareAttendanceStatus" NOT NULL DEFAULT 'WAITING',
    "destination" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "serviceStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "calledBy" TEXT,
    "serviceStartedBy" TEXT,
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CareAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareAttendance_triageId_key" ON "CareAttendance"("triageId");
CREATE INDEX "CareAttendance_status_queuedAt_idx" ON "CareAttendance"("status", "queuedAt");
ALTER TABLE "CareAttendance" ADD CONSTRAINT "CareAttendance_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "CareAttendance" ("id", "triageId", "status", "destination", "queuedAt", "calledAt", "calledBy", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, t."id",
       CASE WHEN t."status" = 'REFERRED_TO_CARE' THEN 'CALLED'::"CareAttendanceStatus" ELSE 'WAITING'::"CareAttendanceStatus" END,
       cr."destinationDescription",
       COALESCE(nr."reviewedAt", t."updatedAt"),
       CASE WHEN t."status" = 'REFERRED_TO_CARE' THEN COALESCE(cr."referredAt", t."updatedAt") ELSE NULL END,
       CASE WHEN t."status" = 'REFERRED_TO_CARE' THEN nr."professionalReference" ELSE NULL END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Triage" t
LEFT JOIN LATERAL (SELECT * FROM "NurseReview" n WHERE n."triageId" = t."id" ORDER BY n."reviewedAt" DESC LIMIT 1) nr ON TRUE
LEFT JOIN LATERAL (SELECT * FROM "CareReferral" c WHERE c."triageId" = t."id" AND c."status" = 'REFERRED' ORDER BY c."referredAt" DESC LIMIT 1) cr ON TRUE
WHERE t."status" IN ('CLASSIFIED', 'REFERRED_TO_CARE');

UPDATE "Triage" SET "status" = 'CARE_WAITING' WHERE "status" = 'CLASSIFIED';
UPDATE "Triage" SET "status" = 'CALLED' WHERE "status" = 'REFERRED_TO_CARE';
