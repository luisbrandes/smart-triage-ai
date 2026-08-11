export class PatientIntakeStateError extends Error {
  constructor(message = "A etapa da triagem não permite esta operação.") {
    super(message);
    this.name = "PatientIntakeStateError";
  }
}

export class PatientIntakeNotFoundError extends Error {
  constructor() {
    super("Triagem de demonstração não encontrada.");
    this.name = "PatientIntakeNotFoundError";
  }
}
