export class DemoAnalysisDisabledError extends Error {
  constructor() {
    super("O motor demonstrativo está bloqueado em modo de produção.");
    this.name = "DemoAnalysisDisabledError";
  }
}
