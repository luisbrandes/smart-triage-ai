export class NursingMutationConflictError extends Error {
  constructor(message = "O estado da triagem mudou. Atualize a página e revise os dados antes de continuar.") {
    super(message);
    this.name = "NursingMutationConflictError";
  }
}
