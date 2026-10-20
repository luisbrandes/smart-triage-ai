import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDemoTriageId: vi.fn(),
  saveIdentification: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/demo-triage-session", () => ({
  clearDemoTriageId: vi.fn(),
  getDemoTriageId: mocks.getDemoTriageId,
  setDemoTriageId: vi.fn(),
}));
vi.mock("@/server/patient-intake", () => ({
  patientIntake: { saveIdentification: mocks.saveIdentification },
}));

import { saveIdentificationAction } from "@/app/paciente/triagem/actions";

function identificationFormData(): FormData {
  const formData = new FormData();
  formData.set("displayName", "Paciente Fictício");
  formData.set("birthDate", "1990-01-01");
  formData.set("hasHealthPlan", "no");
  formData.set("cpf", "CPF-NAO-UTILIZADO");
  formData.set("phone", "TELEFONE-NAO-UTILIZADO");
  formData.set("email", "EMAIL-NAO-UTILIZADO");
  formData.set("motherName", "MAE-NAO-UTILIZADA");
  formData.set("legalRepresentativeName", "RESPONSAVEL-NAO-UTILIZADO");
  formData.set("legalRepresentativePhone", "CONTATO-NAO-UTILIZADO");
  return formData;
}

describe("saveIdentificationAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getDemoTriageId.mockResolvedValue("triage-test-id");
    mocks.redirect.mockImplementation((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); });
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("só navega após a camada de aplicação confirmar o salvamento", async () => {
    let finishPersistence!: (result: { success: true }) => void;
    mocks.saveIdentification.mockReturnValue(new Promise<{ success: true }>((resolve) => { finishPersistence = resolve; }));

    const result = saveIdentificationAction({ message: "Erro anterior" }, identificationFormData());
    const navigation = expect(result).rejects.toThrow("NEXT_REDIRECT:/paciente/triagem/consentimento");
    await vi.waitFor(() => expect(mocks.saveIdentification).toHaveBeenCalledOnce());
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();

    finishPersistence({ success: true });
    await navigation;

    expect(mocks.saveIdentification).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/paciente/triagem/consentimento");
    expect(mocks.saveIdentification).toHaveBeenCalledWith("triage-test-id", {
      displayName: "Paciente Fictício",
      birthDate: "1990-01-01",
      sex: undefined,
      documentReference: undefined,
      hasHealthPlan: "no",
      planName: undefined,
    });
    expect(console.info).toHaveBeenCalledWith("patient_identification_save_succeeded", { triageId: "triage-test-id" });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("retorna os erros de validação para o estado consumido pelo formulário", async () => {
    const errors = { displayName: ["Informe um nome fictício."] };
    mocks.saveIdentification.mockResolvedValue({ success: false, errors });

    await expect(saveIdentificationAction({}, identificationFormData())).resolves.toEqual({ errors });
    expect(console.info).toHaveBeenCalledWith("patient_identification_save_rejected", {
      triageId: "triage-test-id",
      category: "validation",
      fields: ["displayName"],
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("retorna erro genérico para restrição de banco sem expor metadados", async () => {
    mocks.saveIdentification.mockRejectedValue({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta: { target: ["field"], value: "sensitive data" },
    });

    const state = await saveIdentificationAction({}, identificationFormData());

    expect(state.message).toBeDefined();
    expect(state.errors).toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("patient_identification_save_failed", {
      triageId: "triage-test-id",
      category: "database_constraint",
      errorName: "PrismaClientKnownRequestError",
      errorCode: "P2002",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("sensitive data");
  });

  it("retorna estado de erro sem falso sucesso quando a persistência falha", async () => {
    mocks.saveIdentification.mockRejectedValue({ name: "PrismaClientKnownRequestError", code: "P1001" });

    await expect(saveIdentificationAction({}, identificationFormData())).resolves.toEqual({
      message: "Não foi possível salvar a identificação. Tente novamente.",
    });
    expect(console.error).toHaveBeenCalledWith("patient_identification_save_failed", {
      triageId: "triage-test-id",
      category: "database_connection",
      errorName: "PrismaClientKnownRequestError",
      errorCode: "P1001",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  it("trata P2022 como falha de schema sem redirecionar nem expor metadados", async () => {
    mocks.saveIdentification.mockRejectedValue({
      name: "PrismaClientKnownRequestError",
      code: "P2022",
      meta: { modelName: "Patient", column: "Patient.cpf" },
      message: "column details must not be returned to the patient",
    });

    await expect(saveIdentificationAction({}, identificationFormData())).resolves.toEqual({
      message: "Não foi possível salvar a identificação. Tente novamente.",
    });
    expect(console.error).toHaveBeenCalledWith("patient_identification_save_failed", {
      triageId: "triage-test-id",
      category: "schema_migration",
      errorName: "PrismaClientKnownRequestError",
      errorCode: "P2022",
      schemaField: "Patient.cpf",
    });
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).toContain("Patient.cpf");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("column details");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("to be returned to the patient");
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  it("distingue sessão ausente sem tentar gravar", async () => {
    mocks.getDemoTriageId.mockResolvedValue(null);

    await expect(saveIdentificationAction({}, identificationFormData())).resolves.toEqual({
      message: "Inicie uma nova triagem.",
    });
    expect(mocks.saveIdentification).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith("patient_identification_save_rejected", { category: "session_missing" });
  });
});
