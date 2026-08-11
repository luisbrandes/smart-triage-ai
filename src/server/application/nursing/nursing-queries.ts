import type { NursingQueueRepository } from "@/server/application/nursing/nursing-repository";
import type { NursingPriority, NursingQueueDto } from "@/server/application/nursing/nursing-types";

const priorityOrder: Record<NursingPriority, number> = { RED: 0, YELLOW: 1, GREEN: 2 };

export function sortNursingQueue<T extends { recommendedPriority: NursingPriority; enteredQueueAt: Date }>(items: T[]): T[] {
  return [...items].sort((left, right) => priorityOrder[left.recommendedPriority] - priorityOrder[right.recommendedPriority] || left.enteredQueueAt.getTime() - right.enteredQueueAt.getTime());
}

export async function listNursingQueue(repository: NursingQueueRepository, now = new Date()): Promise<NursingQueueDto> {
  const items = sortNursingQueue(await repository.listAwaitingReview(now));
  return {
    items,
    indicators: {
      awaitingReview: items.length,
      elevatedPriority: items.filter((item) => item.recommendedPriority === "RED").length,
      withVitalSigns: items.filter((item) => item.hasVitalSigns).length,
      oldestWaitingMinutes: items.length ? Math.max(...items.map((item) => item.waitingMinutes)) : null,
    },
  };
}

export function getNursingTriageDetail(repository: NursingQueueRepository, triageId: string, now = new Date()) {
  return repository.findAwaitingReviewDetail(triageId, now);
}

export function listNursingReferrals(repository: NursingQueueRepository, now = new Date()) {
  return repository.listReferred(now);
}

export function listCareQueue(repository: NursingQueueRepository, now = new Date()) {
  return repository.listCareQueue(now);
}
