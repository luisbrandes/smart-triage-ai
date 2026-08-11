import type { NursingMutationRepository } from "@/server/application/nursing/nursing-mutation-repository";
import type { NursingMutationResult } from "@/server/application/nursing/nursing-mutation-types";
import { recollectionSchema, reclassificationSchema, referralSchema, validationErrors } from "@/server/application/nursing/nursing-validations";

export async function confirmTriageClassification(repository: NursingMutationRepository, triageId: string, actorReference: string): Promise<NursingMutationResult> {
  await repository.confirmClassification(triageId, actorReference);
  return { success: true, status: "CARE_WAITING" };
}

export async function reclassifyTriage(repository: NursingMutationRepository, triageId: string, raw: unknown, actorReference: string): Promise<NursingMutationResult> {
  const parsed = reclassificationSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Revise os dados da reclassificação.", errors: validationErrors(parsed.error) };
  await repository.reclassify(triageId, parsed.data, actorReference);
  return { success: true, status: "CARE_WAITING" };
}

export async function callNextPatient(repository: NursingMutationRepository, actorReference: string): Promise<NursingMutationResult> {
  const called = await repository.callNext(actorReference);
  return called ? { success: true, status: "CALLED", ticketCode: called.ticketCode } : { success: false, message: "Não há pacientes aguardando atendimento." };
}

export async function startPatientCare(repository: NursingMutationRepository, triageId: string, actorReference: string): Promise<NursingMutationResult> {
  await repository.startCare(triageId, actorReference);
  return { success: true, status: "IN_SERVICE" };
}

export async function completePatientCare(repository: NursingMutationRepository, triageId: string, actorReference: string): Promise<NursingMutationResult> {
  await repository.completeCare(triageId, actorReference);
  return { success: true, status: "COMPLETED" };
}

export async function requestVitalSignsRecollection(repository: NursingMutationRepository, triageId: string, raw: unknown, actorReference: string): Promise<NursingMutationResult> {
  const parsed = recollectionSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Revise o motivo da nova coleta.", errors: validationErrors(parsed.error) };
  await repository.requestRecollection(triageId, parsed.data, actorReference);
  return { success: true, status: "RECOLLECTION_REQUESTED" };
}

export async function referTriageToCare(repository: NursingMutationRepository, triageId: string, raw: unknown, actorReference: string): Promise<NursingMutationResult> {
  const parsed = referralSchema.safeParse(raw);
  if (!parsed.success) return { success: false, message: "Revise os dados do encaminhamento.", errors: validationErrors(parsed.error) };
  await repository.referToCare(triageId, parsed.data, actorReference);
  return { success: true, status: "REFERRED_TO_CARE" };
}
