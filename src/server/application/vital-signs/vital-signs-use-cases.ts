import { createHash } from "node:crypto";

import { z } from "zod";

import { demoFinalAnalysisRuleSet } from "@/demo/analysis-rules";
import { runDeterministicFinalAnalysis } from "@/domain/analysis/analysis-engine";
import { DemoHardwareDisabledError } from "@/server/application/vital-signs/vital-signs-errors";
import type { VitalSignsRepository } from "@/server/application/vital-signs/vital-signs-repository";
import type { HardwareGateway } from "@/server/services/hardware/hardware-gateway";
import type { SimulationScenario } from "@/server/services/hardware/simulated-hardware-adapter";

const manualSchema = z.object({ heartRate: z.coerce.number().int(), spo2: z.coerce.number() });
const simulationSchema = z.enum(["success", "failure", "timeout", "invalid"]);

function assertDemo(appMode: string | undefined) { if (appMode !== "demo") throw new DemoHardwareDisabledError(); }

export async function collectManualVitalSigns(repository: VitalSignsRepository, gateway: HardwareGateway<{ heartRate: number; spo2: number }>, triageId: string, raw: unknown, appMode: string | undefined) {
  assertDemo(appMode);
  const parsed = manualSchema.safeParse(raw);
  if (!parsed.success) return { success: false as const, message: "Informe valores numéricos inteiros para FC e SpO₂." };
  const { collectionId } = await gateway.startCollection(parsed.data);
  return { success: true as const, flow: await repository.recordAttempt({ triageId, result: await gateway.getResult(collectionId) }) };
}

export async function collectSimulatedVitalSigns(repository: VitalSignsRepository, gateway: HardwareGateway<{ scenario: SimulationScenario }>, triageId: string, scenario: unknown, appMode: string | undefined) {
  assertDemo(appMode);
  const parsed = simulationSchema.safeParse(scenario);
  if (!parsed.success) return { success: false as const, message: "Selecione um cenário de simulação válido." };
  const { collectionId } = await gateway.startCollection({ scenario: parsed.data });
  return { success: true as const, flow: await repository.recordAttempt({ triageId, result: await gateway.getResult(collectionId) }) };
}

export function completeVitalSigns(repository: VitalSignsRepository, triageId: string, appMode: string | undefined) {
  assertDemo(appMode);
  return repository.completeAndAnalyze({
    triageId,
    ruleSetVersion: demoFinalAnalysisRuleSet.version,
    ruleSetDescription: demoFinalAnalysisRuleSet.description,
    evaluate: (input) => {
      const fingerprint = createHash("sha256").update(JSON.stringify({ ...input, ruleSetVersion: demoFinalAnalysisRuleSet.version })).digest("hex");
      return { fingerprint, result: runDeterministicFinalAnalysis(input, demoFinalAnalysisRuleSet, new Date()) };
    },
  });
}
