import { z } from "zod";

import { VitalSignsFlowError } from "@/server/application/vital-signs/vital-signs-errors";
import type { VitalSignsRepository } from "@/server/application/vital-signs/vital-signs-repository";

const acceptanceSchema = z.object({
  deviceCollectionSessionId: z.string().uuid(),
  readingId: z.string().uuid(),
}).strict();

export type PhysicalCollectionAcceptanceInput = z.infer<typeof acceptanceSchema>;

export async function acceptPhysicalDeviceCollectionForTriage(
  repository: VitalSignsRepository,
  triageId: string,
  raw: unknown,
): Promise<{ collectionSessionId: string; alreadyAccepted: boolean }> {
  const parsed = acceptanceSchema.safeParse(raw);
  if (!parsed.success) throw new VitalSignsFlowError("Selecione uma leitura v\u00e1lida para confirmar.");

  const result = await repository.acceptPhysicalDeviceCollection({ triageId, ...parsed.data });
  if (result.kind !== "ACCEPTED") throw new VitalSignsFlowError(result.message);
  return { collectionSessionId: result.collectionSessionId, alreadyAccepted: result.alreadyAccepted };
}
