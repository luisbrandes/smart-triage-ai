export class VitalSignsFlowError extends Error {
  constructor(message = "A triagem não está pronta para esta operação de sinais vitais.") { super(message); this.name = "VitalSignsFlowError"; }
}

export class DemoHardwareDisabledError extends Error {
  constructor() { super("A coleta demonstrativa está bloqueada em modo de produção."); this.name = "DemoHardwareDisabledError"; }
}
