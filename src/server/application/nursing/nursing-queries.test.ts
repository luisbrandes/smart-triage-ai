import { describe, expect, it } from "vitest";

import type { NursingQueueRepository } from "@/server/application/nursing/nursing-repository";
import { getNursingTriageDetail, listNursingQueue, sortNursingQueue } from "@/server/application/nursing/nursing-queries";
import type { NursingQueueItemDto, NursingTriageDetailDto } from "@/server/application/nursing/nursing-types";

const item = (triageId: string, priority: NursingQueueItemDto["recommendedPriority"], enteredQueueAt: string): NursingQueueItemDto => ({ triageId, ticketCode: `T-DEMO-${triageId}`, displayName: "Pessoa Fictícia", ageYears: 30, mainComplaint: "Queixa fictícia", recommendedPriority: priority, enteredQueueAt: new Date(enteredQueueAt), waitingMinutes: 10, hasVitalSigns: false, hasDemoAlert: priority === "RED" });

class NursingRepositoryStub implements NursingQueueRepository {
  constructor(public items: NursingQueueItemDto[] = [], public detail: NursingTriageDetailDto | null = null) {}
  async listAwaitingReview() { return this.items; }
  async findAwaitingReviewDetail() { return this.detail; }
  async listReferred() { return []; }
  async listCareQueue() { return []; }
}

describe("fila da enfermagem", () => {
  it("consulta somente a projeção já restrita a aguardando revisão", async () => {
    const eligible = item("awaiting", "YELLOW", "2026-01-01T08:00:00Z");
    const records = [{ status: "AWAITING_NURSE_REVIEW", value: eligible }, { status: "CLASSIFIED", value: item("classified", "RED", "2026-01-01T07:00:00Z") }];
    const repository = new NursingRepositoryStub(records.filter((record) => record.status === "AWAITING_NURSE_REVIEW").map((record) => record.value));
    const result = await listNursingQueue(repository);
    expect(result.items.map((entry) => entry.triageId)).toEqual(["awaiting"]);
  });

  it("ordena prioridade e desempata pela entrada mais antiga", () => {
    const sorted = sortNursingQueue([item("green", "GREEN", "2026-01-01T08:00:00Z"), item("red-new", "RED", "2026-01-01T09:00:00Z"), item("yellow", "YELLOW", "2026-01-01T07:00:00Z"), item("red-old", "RED", "2026-01-01T08:00:00Z")]);
    expect(sorted.map((entry) => entry.triageId)).toEqual(["red-old", "red-new", "yellow", "green"]);
  });

  it("retorna fila vazia e indicadores reais zerados", async () => {
    const result = await listNursingQueue(new NursingRepositoryStub());
    expect(result.items).toEqual([]);
    expect(result.indicators).toEqual({ awaitingReview: 0, elevatedPriority: 0, withVitalSigns: 0, oldestWaitingMinutes: null });
  });

  it("DTO da fila não inclui documento, respostas ou campos técnicos", async () => {
    const result = await listNursingQueue(new NursingRepositoryStub([item("1", "GREEN", "2026-01-01T08:00:00Z")]));
    expect(Object.keys(result.items[0]).sort()).toEqual(["ageYears", "displayName", "enteredQueueAt", "hasDemoAlert", "hasVitalSigns", "mainComplaint", "recommendedPriority", "ticketCode", "triageId", "waitingMinutes"].sort());
  });

  it("trata detalhe inexistente ou fora do estado permitido como ausente", async () => {
    await expect(getNursingTriageDetail(new NursingRepositoryStub(), "unknown")).resolves.toBeNull();
  });

  it("preserva detalhe completo, duas análises e histórico de tentativas", async () => {
    const detail: NursingTriageDetailDto = {
      ticketCode: "T-20260101-001", status: "AWAITING_NURSE_REVIEW", displayName: "Pessoa Fictícia", ageYears: 42, healthPlan: "Plano Fictício",
      anamnesis: { mainComplaint: "Queixa fictícia", additionalDescription: "Descrição fictícia", subjectiveIntensity: 7, symptomStartedAt: null, approximateDuration: "Duas horas fictícias", declaredAllergies: "Não informadas", declaredMedications: "Não informados", declaredPreexistingConditions: "Não informadas", demoAlerts: [{ questionKey: "DEMO_ALERT", answer: "no" }] },
      analyses: [{ type: "FINAL", priority: "YELLOW", rulesetVersion: "DEMO-002", executedAt: new Date("2026-01-01T08:20:00Z"), reasons: ["Recomendação final"] }],
      currentRecommendedPriority: "YELLOW",
      humanDecision: null, referral: null,
      collectionAttempts: [
        { attemptNumber: 1, origin: "SIMULATED_DEVICE", status: "FAILED", startedAt: new Date("2026-01-01T08:12:00Z"), readings: [] },
        { attemptNumber: 2, origin: "MANUAL", status: "COMPLETED", startedAt: new Date("2026-01-01T08:15:00Z"), readings: [{ type: "HEART_RATE", value: 80, unit: "bpm", accepted: true }, { type: "SPO2", value: 98, unit: "%", accepted: true }] },
      ],
      timeline: [{ label: "Triagem iniciada", occurredAt: new Date("2026-01-01T08:00:00Z") }],
    };
    const result = await getNursingTriageDetail(new NursingRepositoryStub([], detail), "triage");
    expect(result?.analyses.map((analysis) => analysis.type)).toEqual(["FINAL"]);
    expect(result?.collectionAttempts).toHaveLength(2);
    expect(result?.collectionAttempts[1].readings).toHaveLength(2);
    expect(Object.keys(result ?? {})).not.toContain("documentReference");
  });

  it("representa triagem sem sinais vitais sem inventar tentativas", async () => {
    const detail = { ticketCode: "T-20260101-002", status: "AWAITING_NURSE_REVIEW" as const, displayName: "Pessoa Fictícia", ageYears: null, healthPlan: null, anamnesis: { mainComplaint: "Queixa fictícia", additionalDescription: null, subjectiveIntensity: 2, symptomStartedAt: null, approximateDuration: "Uma hora fictícia", declaredAllergies: null, declaredMedications: null, declaredPreexistingConditions: null, demoAlerts: [] }, analyses: [{ type: "FINAL" as const, priority: "GREEN" as const, rulesetVersion: "DEMO-002", executedAt: new Date(), reasons: [] }], currentRecommendedPriority: "GREEN" as const, humanDecision: null, referral: null, collectionAttempts: [], timeline: [] };
    const result = await getNursingTriageDetail(new NursingRepositoryStub([], detail), "triage");
    expect(result?.collectionAttempts).toEqual([]);
    expect(result?.analyses).toHaveLength(1);
  });
});
