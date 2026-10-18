import { describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { triage: { findFirst } } }));

import { PrismaNursingQueueRepository } from "@/server/repositories/prisma-nursing-queue-repository";

describe("projeção de coleta física para enfermagem", () => {
  it("mostra apenas a temperatura da leitura aceita e preserva histórico", async () => {
    const receivedAt = new Date("2026-01-01T10:00:00Z");
    findFirst.mockResolvedValueOnce({
      status: "AWAITING_NURSE_REVIEW", currentRecommendedPriority: "GREEN",
      patient: { displayName: "Pessoa Fictícia", birthDate: null, healthPlans: [] },
      queueTicket: { publicCode: "T-20260101-001" },
      anamneses: [{ mainComplaint: "Queixa fictícia", additionalDescription: null, subjectiveIntensity: 5, symptomStartedAt: null, approximateDuration: null, declaredAllergies: null, declaredMedications: null, declaredPreexistingConditions: null, answers: [] }],
      analysisRuns: [], nurseReviews: [], careReferrals: [], auditEvents: [],
      collectionSessions: [{
        attemptNumber: 1, origin: "PHYSICAL_DEVICE", status: "COMPLETED", startedAt: receivedAt, completedAt: receivedAt,
        measurements: [
          { vitalSignType: "HEART_RATE", numericValue: 78, unit: "bpm", technicalStatus: "ACCEPTED", externalMeasurementId: "accepted:HEART_RATE" },
          { vitalSignType: "SPO2", numericValue: 98, unit: "%", technicalStatus: "ACCEPTED", externalMeasurementId: "accepted:SPO2" },
        ],
        sourceDeviceCollectionSession: { readings: [
          { id: "earlier", temperature: 38, weight: null, height: null, receivedAt },
          { id: "accepted", temperature: 36.7, weight: null, height: null, receivedAt },
        ] },
      }],
    });
    const detail = await new PrismaNursingQueueRepository().findAwaitingReviewDetail("fictional-id", receivedAt);
    expect(detail?.collectionAttempts[0].physicalReading?.temperature).toBe(36.7);
    expect(detail?.collectionAttempts[0].current).toBe(true);
    expect(detail?.collectionAttempts[0].readings.map((reading) => reading.value)).toEqual([78, 98]);
  });
});
