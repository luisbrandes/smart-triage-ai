export class QueueTicketIssuanceError extends Error {
  constructor(message = "A triagem ainda não está pronta para receber uma senha.") {
    super(message);
    this.name = "QueueTicketIssuanceError";
  }
}
