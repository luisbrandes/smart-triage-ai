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

  it.each([
    { target: ["cpf"] },
    { driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["cpf"] } } } },
  ])("apresenta CPF duplicado como erro de campo e registra categoria sanitizada: %j", async (meta) => {
    mocks.saveIdentification.mockRejectedValue({
      name: "PrismaClientKnownRequestError",
      code: "P2002",
      meta,
    });

    const state = await saveIdentificationAction({}, identificationFormData());

    expect(state.errors?.cpf).toBeDefined();
    expect(state.message).toBeUndefined();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("patient_identification_save_failed", {
      triageId: "triage-test-id",
      category: "duplicate_cpf",
      errorName: "PrismaClientKnownRequestError",
      errorCode: "P2002",
    });
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

  it("distingue sessão ausente sem tentar gravar", async () => {
    mocks.getDemoTriageId.mockResolvedValue(null);

    await expect(saveIdentificationAction({}, identificationFormData())).resolves.toEqual({
      message: "Inicie uma nova triagem.",
    });
    expect(mocks.saveIdentification).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith("patient_identification_save_rejected", { category: "session_missing" });
  });
});
