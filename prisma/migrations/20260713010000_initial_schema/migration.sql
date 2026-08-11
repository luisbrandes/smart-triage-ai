-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RiskPriority" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "TriageStatus" AS ENUM ('DRAFT', 'IDENTIFICATION_IN_PROGRESS', 'ANAMNESIS_IN_PROGRESS', 'PRELIMINARY_ANALYSIS_PENDING', 'VITAL_SIGNS_REQUIRED', 'VITAL_SIGNS_IN_PROGRESS', 'FINAL_ANALYSIS_PENDING', 'AWAITING_NURSE_REVIEW', 'RECOLLECTION_REQUESTED', 'CLASSIFIED', 'REFERRED_TO_CARE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACCEPTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CollectionOrigin" AS ENUM ('MANUAL', 'SIMULATED_DEVICE', 'PHYSICAL_DEVICE');

-- CreateEnum
CREATE TYPE "HardwareCollectionStatus" AS ENUM ('PENDING', 'AWAITING_DEVICE', 'READY', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED', 'RECOLLECTION_REQUIRED');

-- CreateEnum
CREATE TYPE "DeviceOperationalStatus" AS ENUM ('UNKNOWN', 'UNAVAILABLE', 'AVAILABLE', 'CONNECTING', 'CONNECTED', 'PREPARING', 'COLLECTING', 'READING_COMPLETED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "VitalSignType" AS ENUM ('HEART_RATE', 'SPO2');

-- CreateEnum
CREATE TYPE "MeasurementTechnicalStatus" AS ENUM ('RECEIVED', 'TECHNICALLY_VALIDATED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED_BY_RECOLLECTION');

-- CreateEnum
CREATE TYPE "AnalysisRunType" AS ENUM ('PRELIMINARY', 'POST_VITAL_SIGNS');

-- CreateEnum
CREATE TYPE "AnalysisRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NurseReviewDecision" AS ENUM ('CONFIRMED', 'RECLASSIFIED');

-- CreateEnum
CREATE TYPE "QueueTicketStatus" AS ENUM ('ACTIVE', 'CALLED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CareReferralStatus" AS ENUM ('PENDING', 'REFERRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('PATIENT', 'NURSE', 'SYSTEM', 'DEMO_OPERATOR');

-- CreateEnum
CREATE TYPE "RuleSetStatus" AS ENUM ('DRAFT', 'EXPERIMENTAL', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "sex" TEXT,
    "documentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthPlanInformation" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hasHealthPlan" BOOLEAN NOT NULL,
    "planName" TEXT,
    "memberReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthPlanInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "triageId" TEXT,
    "termsVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "acceptanceOrigin" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Triage" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "status" "TriageStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "currentRecommendedPriority" "RiskPriority",
    "finalHumanPriority" "RiskPriority",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Triage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anamnesis" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "mainComplaint" TEXT NOT NULL,
    "additionalDescription" TEXT,
    "subjectiveIntensity" INTEGER,
    "symptomStartedAt" TIMESTAMP(3),
    "approximateDuration" TEXT,
    "declaredMedications" TEXT,
    "declaredAllergies" TEXT,
    "declaredPreexistingConditions" TEXT,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnamnesisAnswer" (
    "id" TEXT NOT NULL,
    "anamnesisId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionVersion" TEXT NOT NULL,
    "normalizedValue" JSONB NOT NULL,
    "answerText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnamnesisAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedFlagOccurrence" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedFlagOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueTicket" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "operationalDate" TIMESTAMP(3) NOT NULL,
    "sequenceNumber" INTEGER NOT NULL,
    "status" "QueueTicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSetVersion" (
    "id" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RuleSetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),

    CONSTRAINT "RuleSetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRun" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "ruleSetVersionId" TEXT NOT NULL,
    "runType" "AnalysisRunType" NOT NULL,
    "status" "AnalysisRunStatus" NOT NULL DEFAULT 'PENDING',
    "inputFingerprint" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "sanitizedErrorSummary" TEXT,
    "sanitizedInputSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRecommendation" (
    "id" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "recommendedPriority" "RiskPriority" NOT NULL,
    "requiresVitalSigns" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationReason" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalDevice" (
    "id" TEXT NOT NULL,
    "externalIdentifier" TEXT,
    "displayName" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "firmwareVersion" TEXT,
    "operationalStatus" "DeviceOperationalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCommunicationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCapability" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "vitalSignType" "VitalSignType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareCollectionSession" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "deviceId" TEXT,
    "origin" "CollectionOrigin" NOT NULL,
    "status" "HardwareCollectionStatus" NOT NULL DEFAULT 'PENDING',
    "attemptNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "sanitizedErrorSummary" TEXT,
    "sanitizedMetadata" JSONB,
    "initiatedBy" "ActorType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HardwareCollectionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitalSignMeasurement" (
    "id" TEXT NOT NULL,
    "collectionSessionId" TEXT NOT NULL,
    "vitalSignType" "VitalSignType" NOT NULL,
    "numericValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "origin" "CollectionOrigin" NOT NULL,
    "technicalStatus" "MeasurementTechnicalStatus" NOT NULL,
    "qualityDescription" TEXT,
    "measuredByDeviceAt" TIMESTAMP(3),
    "receivedByServerAt" TIMESTAMP(3) NOT NULL,
    "acceptedIntoFlowAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "externalMeasurementId" TEXT,
    "sequenceNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VitalSignMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HardwareError" (
    "id" TEXT NOT NULL,
    "collectionSessionId" TEXT NOT NULL,
    "errorCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sanitizedMessage" TEXT NOT NULL,
    "isRecoverable" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HardwareError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NurseReview" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "reviewedRecommendationId" TEXT,
    "confirmedPriority" "RiskPriority" NOT NULL,
    "decision" "NurseReviewDecision" NOT NULL,
    "justification" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "professionalReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NurseReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareReferral" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "status" "CareReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referredAt" TIMESTAMP(3),
    "destinationDescription" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "triageId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "actorReference" TEXT,
    "sanitizedMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HealthPlanInformation_patientId_createdAt_idx" ON "HealthPlanInformation"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_patientId_createdAt_idx" ON "ConsentRecord"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ConsentRecord_triageId_createdAt_idx" ON "ConsentRecord"("triageId", "createdAt");

-- CreateIndex
CREATE INDEX "Triage_status_createdAt_idx" ON "Triage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Triage_patientId_idx" ON "Triage"("patientId");

-- CreateIndex
CREATE INDEX "Anamnesis_triageId_createdAt_idx" ON "Anamnesis"("triageId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Anamnesis_triageId_version_key" ON "Anamnesis"("triageId", "version");

-- CreateIndex
CREATE INDEX "AnamnesisAnswer_anamnesisId_idx" ON "AnamnesisAnswer"("anamnesisId");

-- CreateIndex
CREATE UNIQUE INDEX "AnamnesisAnswer_anamnesisId_questionKey_questionVersion_key" ON "AnamnesisAnswer"("anamnesisId", "questionKey", "questionVersion");

-- CreateIndex
CREATE INDEX "RedFlagOccurrence_triageId_isActive_idx" ON "RedFlagOccurrence"("triageId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "QueueTicket_triageId_key" ON "QueueTicket"("triageId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueTicket_publicCode_key" ON "QueueTicket"("publicCode");

-- CreateIndex
CREATE INDEX "QueueTicket_status_operationalDate_sequenceNumber_idx" ON "QueueTicket"("status", "operationalDate", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QueueTicket_operationalDate_sequenceNumber_key" ON "QueueTicket"("operationalDate", "sequenceNumber");

-- CreateIndex
CREATE INDEX "RuleSetVersion_status_idx" ON "RuleSetVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSetVersion_stableKey_version_key" ON "RuleSetVersion"("stableKey", "version");

-- CreateIndex
CREATE INDEX "AnalysisRun_triageId_createdAt_idx" ON "AnalysisRun"("triageId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisRun_ruleSetVersionId_idx" ON "AnalysisRun"("ruleSetVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisRun_triageId_runType_ruleSetVersionId_inputFingerpr_key" ON "AnalysisRun"("triageId", "runType", "ruleSetVersionId", "inputFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisRecommendation_analysisRunId_key" ON "AnalysisRecommendation"("analysisRunId");

-- CreateIndex
CREATE INDEX "AnalysisRecommendation_analysisRunId_idx" ON "AnalysisRecommendation"("analysisRunId");

-- CreateIndex
CREATE INDEX "RecommendationReason_recommendationId_displayOrder_idx" ON "RecommendationReason"("recommendationId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationReason_recommendationId_reasonCode_key" ON "RecommendationReason"("recommendationId", "reasonCode");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalDevice_externalIdentifier_key" ON "MedicalDevice"("externalIdentifier");

-- CreateIndex
CREATE INDEX "MedicalDevice_externalIdentifier_idx" ON "MedicalDevice"("externalIdentifier");

-- CreateIndex
CREATE INDEX "MedicalDevice_operationalStatus_isActive_idx" ON "MedicalDevice"("operationalStatus", "isActive");

-- CreateIndex
CREATE INDEX "DeviceCapability_deviceId_idx" ON "DeviceCapability"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCapability_deviceId_vitalSignType_key" ON "DeviceCapability"("deviceId", "vitalSignType");

-- CreateIndex
CREATE INDEX "HardwareCollectionSession_triageId_createdAt_idx" ON "HardwareCollectionSession"("triageId", "createdAt");

-- CreateIndex
CREATE INDEX "HardwareCollectionSession_deviceId_idx" ON "HardwareCollectionSession"("deviceId");

-- CreateIndex
CREATE INDEX "HardwareCollectionSession_status_createdAt_idx" ON "HardwareCollectionSession"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HardwareCollectionSession_triageId_attemptNumber_key" ON "HardwareCollectionSession"("triageId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VitalSignMeasurement_externalMeasurementId_key" ON "VitalSignMeasurement"("externalMeasurementId");

-- CreateIndex
CREATE INDEX "VitalSignMeasurement_collectionSessionId_vitalSignType_tech_idx" ON "VitalSignMeasurement"("collectionSessionId", "vitalSignType", "technicalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "VitalSignMeasurement_collectionSessionId_sequenceNumber_key" ON "VitalSignMeasurement"("collectionSessionId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "HardwareError_collectionSessionId_createdAt_idx" ON "HardwareError"("collectionSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "NurseReview_triageId_reviewedAt_idx" ON "NurseReview"("triageId", "reviewedAt");

-- CreateIndex
CREATE INDEX "NurseReview_reviewedRecommendationId_idx" ON "NurseReview"("reviewedRecommendationId");

-- CreateIndex
CREATE INDEX "CareReferral_triageId_referredAt_idx" ON "CareReferral"("triageId", "referredAt");

-- CreateIndex
CREATE INDEX "CareReferral_status_createdAt_idx" ON "CareReferral"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_triageId_createdAt_idx" ON "AuditEvent"("triageId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "HealthPlanInformation" ADD CONSTRAINT "HealthPlanInformation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Triage" ADD CONSTRAINT "Triage_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anamnesis" ADD CONSTRAINT "Anamnesis_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAnswer" ADD CONSTRAINT "AnamnesisAnswer_anamnesisId_fkey" FOREIGN KEY ("anamnesisId") REFERENCES "Anamnesis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedFlagOccurrence" ADD CONSTRAINT "RedFlagOccurrence_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueTicket" ADD CONSTRAINT "QueueTicket_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_ruleSetVersionId_fkey" FOREIGN KEY ("ruleSetVersionId") REFERENCES "RuleSetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRecommendation" ADD CONSTRAINT "AnalysisRecommendation_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationReason" ADD CONSTRAINT "RecommendationReason_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "AnalysisRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCapability" ADD CONSTRAINT "DeviceCapability_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MedicalDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareCollectionSession" ADD CONSTRAINT "HardwareCollectionSession_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareCollectionSession" ADD CONSTRAINT "HardwareCollectionSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MedicalDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSignMeasurement" ADD CONSTRAINT "VitalSignMeasurement_collectionSessionId_fkey" FOREIGN KEY ("collectionSessionId") REFERENCES "HardwareCollectionSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HardwareError" ADD CONSTRAINT "HardwareError_collectionSessionId_fkey" FOREIGN KEY ("collectionSessionId") REFERENCES "HardwareCollectionSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseReview" ADD CONSTRAINT "NurseReview_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NurseReview" ADD CONSTRAINT "NurseReview_reviewedRecommendationId_fkey" FOREIGN KEY ("reviewedRecommendationId") REFERENCES "AnalysisRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareReferral" ADD CONSTRAINT "CareReferral_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve the current append-only audit invariant in the baseline.
CREATE OR REPLACE FUNCTION prevent_audit_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEvent_append_only"
BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
