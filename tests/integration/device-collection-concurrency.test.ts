import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/server/db/prisma";
import { PrismaDeviceCollectionSessionRepository } from "@/server/repositories/prisma-device-collection-session-repository";
import { PrismaDeviceReadingRepository } from "@/server/repositories/prisma-device-reading-repository";
import { PrismaPatientIntakeRepository } from "@/server/repositories/prisma-patient-intake-repository";

const deviceId = "integration-device-001";
const deviceCollection = new PrismaDeviceCollectionSessionRepository();
const readings = new PrismaDeviceReadingRepository();

describe("PostgreSQL: concorrência da coleta física", () => {
  beforeAll(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "AuditEvent", "Reading", "DeviceCollectionSession", "MedicalDevice", "Triage" CASCADE');
    await prisma.medicalDevice.create({ data: { externalIdentifier: deviceId, displayName: "Dispositivo de teste", isActive: true } });
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it("mantém somente uma sessão ACTIVE em dois starts simultâneos", async () => {
    const triageA = await prisma.triage.create({ data: { status: "VITAL_SIGNS_REQUIRED" } });
    const triageB = await prisma.triage.create({ data: { status: "VITAL_SIGNS_REQUIRED" } });
    const [left, right] = await Promise.all([deviceCollection.start(deviceId, triageA.id), deviceCollection.start(deviceId, triageB.id)]);
    expect([left, right].filter((result) => !("kind" in result))).toHaveLength(1);
    expect(await prisma.deviceCollectionSession.count({ where: { status: "ACTIVE" } })).toBe(1);
  });

  it("persiste uma única leitura para dois retries simultâneos do mesmo readingId", async () => {
    const session = await prisma.deviceCollectionSession.findFirstOrThrow({ where: { deviceId: (await prisma.medicalDevice.findUniqueOrThrow({ where: { externalIdentifier: deviceId } })).id, status: "ACTIVE" } });
    const input = { deviceId, sessionId: session.id, readingId: "integration-reading-001", bpm: 78, spo2: 98, temperatura: 36.7 };
    const [left, right] = await Promise.all([readings.record(input), readings.record(input)]);
    expect(left.kind).toBe("RECORDED");
    expect(right.kind).toBe("RECORDED");
    expect(await prisma.reading.count({ where: { externalReadingId: input.readingId } })).toBe(1);
  });

  it("mantém uma única espera em dois releases simultâneos", async () => {
    const active = await prisma.deviceCollectionSession.findFirstOrThrow({ where: { status: "ACTIVE" } });
    const [left, right] = await Promise.all([deviceCollection.release(deviceId, active.id), deviceCollection.release(deviceId, active.id)]);
    expect("kind" in left).toBe(false);
    expect("kind" in right).toBe(false);
    expect(await prisma.deviceCollectionSession.count({ where: { deviceId: active.deviceId, status: "WAITING" } })).toBe(1);
    expect(await prisma.deviceCollectionSession.count({ where: { id: active.id, status: "COMPLETED" } })).toBe(1);
  });

  it("mantém estado consistente entre reading e cancel", async () => {
    const triage = await prisma.triage.create({ data: { status: "VITAL_SIGNS_REQUIRED" } });
    const started = await deviceCollection.start(deviceId, triage.id);
    if ("kind" in started) throw new Error("sessão não iniciada");
    const input = { deviceId, sessionId: started.sessionId, readingId: "integration-reading-cancel-001", bpm: 80, spo2: 97, temperatura: 36.5 };
    await Promise.all([readings.record(input), deviceCollection.cancel(started.sessionId, triage.id)]);
    const session = await prisma.deviceCollectionSession.findUniqueOrThrow({ where: { id: started.sessionId } });
    expect(["ACTIVE", "CANCELLED"]).toContain(session.status);
    if (session.status === "CANCELLED") expect(await prisma.reading.count({ where: { externalReadingId: input.readingId } })).toBeLessThanOrEqual(1);
  });

  it("nova triagem cancela coleta técnica ativa sem apagar leituras anteriores", async () => {
    const previous = await prisma.triage.create({ data: { status: "VITAL_SIGNS_REQUIRED" } });
    const active = await prisma.deviceCollectionSession.findFirst({ where: { status: "ACTIVE" } });
    if (active) await deviceCollection.cancel(active.id, active.requestedByTriageId!);
    const started = await deviceCollection.start(deviceId, previous.id);
    if ("kind" in started) throw new Error("sessão não iniciada");
    const intake = new PrismaPatientIntakeRepository();
    const next = await intake.startNewDemo(previous.id);
    expect(next.triageId).not.toBe(previous.id);
    expect((await prisma.deviceCollectionSession.findUniqueOrThrow({ where: { id: started.sessionId } })).status).toBe("CANCELLED");
    expect(await prisma.deviceCollectionSession.count({ where: { status: "ACTIVE" } })).toBe(0);
    expect((await readings.record({ deviceId, sessionId: started.sessionId, readingId: "stale-session-reading", bpm: 78, spo2: 98, temperatura: 36.7 })).kind).toBe("SESSION_NOT_ACTIVE");
    expect(await prisma.triage.findUnique({ where: { id: previous.id } })).not.toBeNull();
    const restarted = await deviceCollection.start(deviceId, next.triageId);
    if ("kind" in restarted) throw new Error("nova sessão não iniciada");
    expect(restarted.sessionId).not.toBe(started.sessionId);
    await deviceCollection.cancel(restarted.sessionId, next.triageId);
  });

  it("nova coleta preserva a identidade da triagem e não cria paciente", async () => {
    const triage = await prisma.triage.create({ data: { status: "AWAITING_NURSE_REVIEW" } });
    const intake = new PrismaPatientIntakeRepository();
    await intake.requestRecollection(triage.id);
    await intake.requestRecollection(triage.id);
    const updated = await prisma.triage.findUniqueOrThrow({ where: { id: triage.id } });
    expect(updated.status).toBe("RECOLLECTION_REQUESTED");
    expect(updated.patientId).toBeNull();
    expect(await prisma.auditEvent.count({ where: { triageId: triage.id, action: "VITAL_SIGNS_RECOLLECTION_REQUESTED" } })).toBe(1);
    const attempt = await deviceCollection.start(deviceId, triage.id);
    if ("kind" in attempt) throw new Error("nova tentativa não iniciada");
    expect((await prisma.deviceCollectionSession.findUniqueOrThrow({ where: { id: attempt.sessionId } })).requestedByTriageId).toBe(triage.id);
    await deviceCollection.cancel(attempt.sessionId, triage.id);
  });
});
