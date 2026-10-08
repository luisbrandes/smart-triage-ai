import "dotenv/config";

import { cleanSimulationData, createSimulationPrisma, getSimulationCounts } from "./simulation/simulation-database";

async function main(): Promise<void> {
  const prisma = createSimulationPrisma();
  try {
    const removed = await cleanSimulationData(prisma);
    const remaining = await getSimulationCounts(prisma);
    if (Object.values(remaining).some((count) => count !== 0)) {
      throw new Error("A limpeza restrita terminou com registros experimentais remanescentes.");
    }
    console.info(`Simulação removida com segurança: ${removed.patients} pacientes, ${removed.triages} triagens, ${removed.analyses} análises e ${removed.readings} leituras.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Não foi possível limpar o lote experimental.");
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
});
