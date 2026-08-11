export type QueueTicketDto = {
  publicCode: string;
  operationalDate: string;
  sequenceNumber: number;
  status: "ACTIVE";
  issuedAt: Date;
  triageStatus: "AWAITING_NURSE_REVIEW";
};
