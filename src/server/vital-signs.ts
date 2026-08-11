import "server-only";

import { collectManualVitalSigns, collectSimulatedVitalSigns, completeVitalSigns } from "@/server/application/vital-signs/vital-signs-use-cases";
import { PrismaVitalSignsRepository } from "@/server/repositories/prisma-vital-signs-repository";
import { ManualVitalSignsAdapter } from "@/server/services/hardware/manual-vital-signs-adapter";
import { SimulatedHardwareAdapter } from "@/server/services/hardware/simulated-hardware-adapter";

const repository = new PrismaVitalSignsRepository();
const manual = new ManualVitalSignsAdapter();
const simulated = new SimulatedHardwareAdapter();

export const vitalSigns = {
  getFlow: (triageId: string) => repository.getFlow(triageId),
  collectManual: (triageId: string, input: unknown) => collectManualVitalSigns(repository, manual, triageId, input, process.env.APP_MODE),
  collectSimulated: (triageId: string, scenario: unknown) => collectSimulatedVitalSigns(repository, simulated, triageId, scenario, process.env.APP_MODE),
  complete: (triageId: string) => completeVitalSigns(repository, triageId, process.env.APP_MODE),
  findLatestFinal: (triageId: string) => repository.findLatestFinalAnalysis(triageId),
};
