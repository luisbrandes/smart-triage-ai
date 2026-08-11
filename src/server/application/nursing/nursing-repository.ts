import type { CareQueueItemDto, NursingQueueItemDto, NursingReferralItemDto, NursingTriageDetailDto } from "@/server/application/nursing/nursing-types";

export interface NursingQueueRepository {
  listAwaitingReview(now: Date): Promise<NursingQueueItemDto[]>;
  findAwaitingReviewDetail(triageId: string, now: Date): Promise<NursingTriageDetailDto | null>;
  listReferred(now: Date): Promise<NursingReferralItemDto[]>;
  listCareQueue(now: Date): Promise<CareQueueItemDto[]>;
}
