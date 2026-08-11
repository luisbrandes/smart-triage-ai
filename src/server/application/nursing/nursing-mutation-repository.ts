import type { ClassificationInput, RecollectionInput, ReferralInput } from "@/server/application/nursing/nursing-mutation-types";

export interface NursingMutationRepository {
  confirmClassification(triageId: string, actorReference: string): Promise<void>;
  reclassify(triageId: string, input: ClassificationInput, actorReference: string): Promise<void>;
  requestRecollection(triageId: string, input: RecollectionInput, actorReference: string): Promise<void>;
  referToCare(triageId: string, input: ReferralInput, actorReference: string): Promise<void>;
  callNext(actorReference: string): Promise<{ triageId: string; ticketCode: string } | null>;
  startCare(triageId: string, actorReference: string): Promise<void>;
  completeCare(triageId: string, actorReference: string): Promise<void>;
}
