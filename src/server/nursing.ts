import "server-only";

import { getNursingTriageDetail, listCareQueue, listNursingQueue, listNursingReferrals } from "@/server/application/nursing/nursing-queries";
import { callNextPatient, completePatientCare, confirmTriageClassification, reclassifyTriage, referTriageToCare, requestVitalSignsRecollection, startPatientCare } from "@/server/application/nursing/nursing-mutations";
import { PrismaNursingQueueRepository } from "@/server/repositories/prisma-nursing-queue-repository";

const repository = new PrismaNursingQueueRepository();

export const nursing = {
  listQueue: () => listNursingQueue(repository),
  findDetail: (triageId: string) => getNursingTriageDetail(repository, triageId),
  listReferrals: () => listNursingReferrals(repository),
  listCareQueue: () => listCareQueue(repository),
  confirm: (triageId: string, actor: string) => confirmTriageClassification(repository, triageId, actor),
  reclassify: (triageId: string, input: unknown, actor: string) => reclassifyTriage(repository, triageId, input, actor),
  requestRecollection: (triageId: string, input: unknown, actor: string) => requestVitalSignsRecollection(repository, triageId, input, actor),
  refer: (triageId: string, input: unknown, actor: string) => referTriageToCare(repository, triageId, input, actor),
  callNext: (actor: string) => callNextPatient(repository, actor),
  startCare: (triageId: string, actor: string) => startPatientCare(repository, triageId, actor),
  completeCare: (triageId: string, actor: string) => completePatientCare(repository, triageId, actor),
};
