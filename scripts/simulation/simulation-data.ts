export const SIMULATION_VERSION = "SMARTTRIAGE-EXPERIMENT-2026-01";
export const SIMULATION_REFERENCE_PREFIX = "SIM-EXP-2026-";
export const SIMULATION_DEVICE_EXTERNAL_ID = "ESP32-SIM-EXPERIMENT-001";
export const SIMULATION_DEVICE_ID = "a0000000-0000-4000-8000-000000000001";
export const SIMULATION_BASE_TIME = new Date("2026-09-15T11:00:00.000Z");

export type SimulationPriority = "GREEN" | "YELLOW" | "RED";

export type SimulationPatient = {
  key: string;
  id: string;
  displayName: string;
  birthDate: string;
  sex: string;
  documentReference: string;
  hasHealthPlan: boolean;
  planName?: string;
};

export type SimulationCase = {
  key: string;
  triageId: string;
  patientKey: string;
  arrivalOffsetMinutes: number;
  mainComplaint: string;
  additionalDescription: string;
  subjectiveIntensity: number;
  approximateDuration: string;
  declaredAllergies?: string;
  declaredMedications?: string;
  declaredPreexistingConditions?: string;
  alerts: {
    suddenChange: "yes" | "no";
    breathing: "yes" | "no";
    consciousness: "yes" | "no";
  };
  vitals: { bpm: number; spo2: number; temperatura: number };
  expectedPriority: SimulationPriority;
  experimentalFocus: string;
};

export const simulationPatients: readonly SimulationPatient[] = [
  { key: "P01", id: "a1000000-0000-4000-8000-000000000001", displayName: "Marina Duarte Campos", birthDate: "2010-03-22", sex: "Feminino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P01`, hasHealthPlan: false },
  { key: "P02", id: "a1000000-0000-4000-8000-000000000002", displayName: "Gabriel Nogueira Freitas", birthDate: "2002-07-11", sex: "Masculino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P02`, hasHealthPlan: true, planName: "Plano Horizonte Fictício" },
  { key: "P03", id: "a1000000-0000-4000-8000-000000000003", displayName: "Helena Pires Albuquerque", birthDate: "1992-01-30", sex: "Feminino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P03`, hasHealthPlan: true, planName: "Plano Aurora Fictício" },
  { key: "P04", id: "a1000000-0000-4000-8000-000000000004", displayName: "Rafael Monteiro Salles", birthDate: "1981-05-09", sex: "Masculino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P04`, hasHealthPlan: false },
  { key: "P05", id: "a1000000-0000-4000-8000-000000000005", displayName: "Camila Azevedo Rocha", birthDate: "1997-10-18", sex: "Feminino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P05`, hasHealthPlan: true, planName: "Plano Ipê Fictício" },
  { key: "P06", id: "a1000000-0000-4000-8000-000000000006", displayName: "Bruno Teixeira Lemos", birthDate: "1969-12-02", sex: "Masculino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P06`, hasHealthPlan: false },
  { key: "P07", id: "a1000000-0000-4000-8000-000000000007", displayName: "Teresa Falcão Menezes", birthDate: "1958-04-14", sex: "Feminino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P07`, hasHealthPlan: true, planName: "Plano Cedro Fictício" },
  { key: "P08", id: "a1000000-0000-4000-8000-000000000008", displayName: "Eduardo Vale Ribeiro", birthDate: "1950-08-27", sex: "Masculino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P08`, hasHealthPlan: false },
  { key: "P09", id: "a1000000-0000-4000-8000-000000000009", displayName: "Aline Barros Tavares", birthDate: "1985-02-06", sex: "Feminino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P09`, hasHealthPlan: true, planName: "Plano Veredas Fictício" },
  { key: "P10", id: "a1000000-0000-4000-8000-000000000010", displayName: "Caetano Moura Rezende", birthDate: "1974-06-19", sex: "Masculino", documentReference: `${SIMULATION_REFERENCE_PREFIX}P10`, hasHealthPlan: false },
] as const;

function triageId(sequence: number): string {
  return `a2000000-0000-4000-8000-${sequence.toString().padStart(12, "0")}`;
}

type CaseInput = Omit<SimulationCase, "key" | "triageId" | "patientKey" | "arrivalOffsetMinutes">;

function scenario(sequence: number, input: CaseInput): SimulationCase {
  return {
    key: `SIM-${sequence.toString().padStart(3, "0")}`,
    triageId: triageId(sequence),
    patientKey: `P${(((sequence - 1) % 10) + 1).toString().padStart(2, "0")}`,
    arrivalOffsetMinutes: (sequence - 1) * 5,
    ...input,
  };
}

const noAlerts = { suddenChange: "no", breathing: "no", consciousness: "no" } as const;

export const simulationCases: readonly SimulationCase[] = [
  scenario(1, { mainComplaint: "Dor de cabeça leve", additionalDescription: "Desconforto gradual após período prolongado de estudo, sem outros sinais percebidos.", subjectiveIntensity: 2, approximateDuration: "há 3 horas", alerts: noAlerts, vitals: { bpm: 76, spo2: 99, temperatura: 36.4 }, expectedPriority: "GREEN", experimentalFocus: "Sintomas leves e sinais dentro das faixas técnicas usuais do cenário." }),
  scenario(2, { mainComplaint: "Tosse seca persistente", additionalDescription: "Tosse sem dificuldade para respirar e sem mudança súbita percebida.", subjectiveIntensity: 5, approximateDuration: "há 2 dias", alerts: noAlerts, vitals: { bpm: 88, spo2: 98, temperatura: 37.1 }, expectedPriority: "YELLOW", experimentalFocus: "Intensidade intermediária isolada." }),
  scenario(3, { mainComplaint: "Dor torácica de início súbito", additionalDescription: "Desconforto começou de forma abrupta durante repouso.", subjectiveIntensity: 8, approximateDuration: "há 25 minutos", alerts: { ...noAlerts, suddenChange: "yes" }, vitals: { bpm: 96, spo2: 97, temperatura: 36.6 }, expectedPriority: "RED", experimentalFocus: "Alerta de mudança súbita com sinais não sinalizados pelo motor." }),
  scenario(4, { mainComplaint: "Congestão nasal", additionalDescription: "Coriza e congestão leves, sem piora súbita.", subjectiveIntensity: 1, approximateDuration: "desde ontem", alerts: noAlerts, vitals: { bpm: 72, spo2: 99, temperatura: 36.7 }, expectedPriority: "GREEN", experimentalFocus: "Baixa intensidade e ausência de alertas." }),
  scenario(5, { mainComplaint: "Mal-estar leve", additionalDescription: "Queixa pouco intensa, sem falta de ar ou alteração de consciência.", subjectiveIntensity: 2, approximateDuration: "há 1 hora", alerts: noAlerts, vitals: { bpm: 105, spo2: 98, temperatura: 36.8 }, expectedPriority: "YELLOW", experimentalFocus: "Sintomas leves com frequência cardíaca no limiar demonstrativo." }),
  scenario(6, { mainComplaint: "Sensação de falta de ar", additionalDescription: "Relata dificuldade percebida para respirar durante atividade habitual.", subjectiveIntensity: 7, approximateDuration: "há 40 minutos", alerts: { ...noAlerts, breathing: "yes" }, vitals: { bpm: 112, spo2: 93, temperatura: 37.3 }, expectedPriority: "RED", experimentalFocus: "Alerta respiratório acompanhado de duas alterações técnicas." }),
  scenario(7, { mainComplaint: "Dor muscular após exercício", additionalDescription: "Desconforto localizado após atividade esportiva, sem trauma importante.", subjectiveIntensity: 3, approximateDuration: "há 5 horas", alerts: noAlerts, vitals: { bpm: 80, spo2: 98, temperatura: 36.5 }, expectedPriority: "GREEN", experimentalFocus: "Caso leve sem gatilho demonstrativo." }),
  scenario(8, { mainComplaint: "Calafrios e indisposição", additionalDescription: "Refere sensação febril, mantendo respiração sem dificuldade.", subjectiveIntensity: 6, approximateDuration: "desde a madrugada", alerts: noAlerts, vitals: { bpm: 94, spo2: 97, temperatura: 38.2 }, expectedPriority: "YELLOW", experimentalFocus: "Intensidade intermediária com temperatura elevada não consumida pelo motor." }),
  scenario(9, { mainComplaint: "Tontura após desmaio", additionalDescription: "Relata episódio breve de perda percebida de consciência antes da chegada.", subjectiveIntensity: 6, approximateDuration: "há 50 minutos", alerts: { ...noAlerts, consciousness: "yes" }, vitals: { bpm: 84, spo2: 98, temperatura: 36.3 }, expectedPriority: "RED", experimentalFocus: "Alerta de consciência com sinais não sinalizados." }),
  scenario(10, { mainComplaint: "Náusea leve", additionalDescription: "Náusea sem vômitos persistentes e sem sinais de alerta informados.", subjectiveIntensity: 2, approximateDuration: "há 2 horas", alerts: noAlerts, vitals: { bpm: 74, spo2: 99, temperatura: 36.6 }, expectedPriority: "GREEN", experimentalFocus: "Caso de referência de baixa prioridade demonstrativa." }),

  scenario(11, { mainComplaint: "Palpitação isolada", additionalDescription: "Percepção de batimentos acelerados, sem falta de ar ou desmaio.", subjectiveIntensity: 3, approximateDuration: "há 20 minutos", alerts: noAlerts, vitals: { bpm: 110, spo2: 98, temperatura: 36.5 }, expectedPriority: "YELLOW", experimentalFocus: "Frequência cardíaca alterada isoladamente." }),
  scenario(12, { mainComplaint: "Coceira localizada", additionalDescription: "Irritação pequena no antebraço, sem progressão percebida.", subjectiveIntensity: 2, approximateDuration: "desde a manhã", alerts: noAlerts, vitals: { bpm: 78, spo2: 99, temperatura: 36.4 }, expectedPriority: "GREEN", experimentalFocus: "Queixa diferente com entradas equivalentes a caso leve." }),
  scenario(13, { mainComplaint: "Dor abdominal súbita", additionalDescription: "Dor começou de modo abrupto e permaneceu intensa.", subjectiveIntensity: 8, approximateDuration: "há 35 minutos", alerts: { ...noAlerts, suddenChange: "yes" }, vitals: { bpm: 92, spo2: 98, temperatura: 37.0 }, expectedPriority: "RED", experimentalFocus: "Alerta súbito como determinante, independentemente do texto clínico." }),
  scenario(14, { mainComplaint: "Dor de garganta intensa", additionalDescription: "Desconforto ao engolir, sem dificuldade respiratória percebida.", subjectiveIntensity: 7, approximateDuration: "há 1 dia", alerts: noAlerts, vitals: { bpm: 90, spo2: 97, temperatura: 37.8 }, expectedPriority: "YELLOW", experimentalFocus: "Intensidade alta sem alerta positivo." }),
  scenario(15, { mainComplaint: "Desconforto no ouvido", additionalDescription: "Sensação de pressão leve, sem secreção relatada.", subjectiveIntensity: 3, approximateDuration: "há 6 horas", alerts: noAlerts, vitals: { bpm: 70, spo2: 99, temperatura: 36.8 }, expectedPriority: "GREEN", experimentalFocus: "Baixa intensidade com sinais não sinalizados." }),
  scenario(16, { mainComplaint: "Respiração difícil em repouso", additionalDescription: "Percebe esforço para respirar mesmo sentado.", subjectiveIntensity: 9, approximateDuration: "há 15 minutos", alerts: { ...noAlerts, breathing: "yes" }, vitals: { bpm: 118, spo2: 91, temperatura: 37.2 }, expectedPriority: "RED", experimentalFocus: "Alerta respiratório e sinais técnicos combinados." }),
  scenario(17, { mainComplaint: "Cansaço ao caminhar", additionalDescription: "Cansaço novo em percurso curto, sem alerta declarado.", subjectiveIntensity: 3, approximateDuration: "desde ontem", alerts: noAlerts, vitals: { bpm: 86, spo2: 94, temperatura: 36.7 }, expectedPriority: "YELLOW", experimentalFocus: "SpO₂ isolada abaixo do limiar demonstrativo." }),
  scenario(18, { mainComplaint: "Dor lombar leve", additionalDescription: "Desconforto após permanecer sentado por várias horas.", subjectiveIntensity: 3, approximateDuration: "há 4 horas", alerts: noAlerts, vitals: { bpm: 76, spo2: 98, temperatura: 36.5 }, expectedPriority: "GREEN", experimentalFocus: "Caso leve repetido para o mesmo paciente em outro atendimento." }),
  scenario(19, { mainComplaint: "Confusão percebida por acompanhante", additionalDescription: "Relato fictício de alteração recente do estado de consciência.", subjectiveIntensity: 5, approximateDuration: "há 30 minutos", alerts: { ...noAlerts, consciousness: "yes" }, vitals: { bpm: 88, spo2: 97, temperatura: 36.9 }, expectedPriority: "RED", experimentalFocus: "Alerta de consciência com intensidade intermediária." }),
  scenario(20, { mainComplaint: "Fraqueza e indisposição", additionalDescription: "Vários desconfortos moderados, sem respostas positivas de alerta.", subjectiveIntensity: 5, approximateDuration: "há 3 horas", alerts: noAlerts, vitals: { bpm: 102, spo2: 95, temperatura: 38.0 }, expectedPriority: "YELLOW", experimentalFocus: "Múltiplas alterações moderadas sem efeito cumulativo adicional." }),

  scenario(21, { mainComplaint: "Dor intensa de início recente", additionalDescription: "Queixa importante com mudança súbita, apesar de sinais não sinalizados.", subjectiveIntensity: 9, approximateDuration: "há 20 minutos", alerts: { ...noAlerts, suddenChange: "yes" }, vitals: { bpm: 82, spo2: 99, temperatura: 36.6 }, expectedPriority: "RED", experimentalFocus: "Sintoma grave descrito e alerta positivo com sinais normais." }),
  scenario(22, { mainComplaint: "Dor pélvica intensa", additionalDescription: "Dor contínua sem desmaio, falta de ar ou mudança súbita declarada.", subjectiveIntensity: 8, approximateDuration: "há 2 horas", alerts: noAlerts, vitals: { bpm: 96, spo2: 98, temperatura: 37.0 }, expectedPriority: "YELLOW", experimentalFocus: "Intensidade alta sozinha não alcança vermelho." }),
  scenario(23, { mainComplaint: "Azia leve após refeição", additionalDescription: "Queimação discreta, sem progressão e sem sinais de alerta.", subjectiveIntensity: 2, approximateDuration: "há 1 hora", alerts: noAlerts, vitals: { bpm: 74, spo2: 99, temperatura: 36.7 }, expectedPriority: "GREEN", experimentalFocus: "Controle de baixa prioridade." }),
  scenario(24, { mainComplaint: "Chiado e dificuldade respiratória", additionalDescription: "Relata dificuldade percebida para respirar e piora recente.", subjectiveIntensity: 6, approximateDuration: "há 45 minutos", alerts: { ...noAlerts, breathing: "yes" }, vitals: { bpm: 108, spo2: 92, temperatura: 37.1 }, expectedPriority: "RED", experimentalFocus: "Alerta respiratório domina intensidade e sinais." }),
  scenario(25, { mainComplaint: "Sonolência e cansaço", additionalDescription: "Cansaço sem desmaio ou mudança súbita declarada.", subjectiveIntensity: 3, approximateDuration: "desde a manhã", alerts: noAlerts, vitals: { bpm: 82, spo2: 93, temperatura: 36.8 }, expectedPriority: "YELLOW", experimentalFocus: "SpO₂ alterada com baixa intensidade." }),
  scenario(26, { mainComplaint: "Dor leve no punho", additionalDescription: "Desconforto após esforço doméstico, sem limitação importante.", subjectiveIntensity: 2, approximateDuration: "há 5 horas", alerts: noAlerts, vitals: { bpm: 72, spo2: 98, temperatura: 36.4 }, expectedPriority: "GREEN", experimentalFocus: "Novo atendimento do mesmo paciente sem reutilizar histórico." }),
  scenario(27, { mainComplaint: "Episódio de desorientação", additionalDescription: "Alteração percebida de consciência já resolvida no momento da coleta.", subjectiveIntensity: 4, approximateDuration: "há 1 hora", alerts: { ...noAlerts, consciousness: "yes" }, vitals: { bpm: 80, spo2: 98, temperatura: 36.5 }, expectedPriority: "RED", experimentalFocus: "Alerta positivo prevalece mesmo quando o episódio cessou." }),
  scenario(28, { mainComplaint: "Tremor e palpitação", additionalDescription: "Tremor acompanhado de batimentos acelerados, sem alerta positivo.", subjectiveIntensity: 3, approximateDuration: "há 30 minutos", alerts: noAlerts, vitals: { bpm: 120, spo2: 97, temperatura: 36.9 }, expectedPriority: "YELLOW", experimentalFocus: "Frequência cardíaca elevada isolada." }),
  scenario(29, { mainComplaint: "Irritação ocular leve", additionalDescription: "Ardor após exposição a vento, sem alteração súbita importante.", subjectiveIntensity: 2, approximateDuration: "há 2 horas", alerts: noAlerts, vitals: { bpm: 76, spo2: 99, temperatura: 36.6 }, expectedPriority: "GREEN", experimentalFocus: "Consistência entre queixas leves distintas." }),
  scenario(30, { mainComplaint: "Dor após queda", additionalDescription: "Dor começou imediatamente após queda fictícia e foi percebida como mudança súbita.", subjectiveIntensity: 7, approximateDuration: "há 40 minutos", alerts: { ...noAlerts, suddenChange: "yes" }, vitals: { bpm: 98, spo2: 97, temperatura: 36.5 }, expectedPriority: "RED", experimentalFocus: "Alerta súbito em contexto de trauma descrito." }),

  scenario(31, { mainComplaint: "Cansaço após noite mal dormida", additionalDescription: "Fadiga leve sem outros sinais percebidos.", subjectiveIntensity: 2, approximateDuration: "desde o despertar", alerts: noAlerts, vitals: { bpm: 78, spo2: 98, temperatura: 36.3 }, expectedPriority: "GREEN", experimentalFocus: "Caso leve em adolescente; idade não entra no motor." }),
  scenario(32, { mainComplaint: "Aperto no peito com falta de ar", additionalDescription: "Aperto acompanhado de dificuldade percebida para respirar.", subjectiveIntensity: 8, approximateDuration: "há 10 minutos", alerts: { ...noAlerts, breathing: "yes" }, vitals: { bpm: 104, spo2: 94, temperatura: 36.7 }, expectedPriority: "RED", experimentalFocus: "Alerta respiratório em paciente diferente com padrão semelhante." }),
  scenario(33, { mainComplaint: "Dor abdominal moderada", additionalDescription: "Dor progressiva, sem mudança súbita ou perda de consciência.", subjectiveIntensity: 4, approximateDuration: "há 4 horas", alerts: noAlerts, vitals: { bpm: 84, spo2: 98, temperatura: 37.2 }, expectedPriority: "YELLOW", experimentalFocus: "Limite inferior de intensidade intermediária." }),
  scenario(34, { mainComplaint: "Pequena escoriação", additionalDescription: "Lesão superficial após contato com móvel, sem piora percebida.", subjectiveIntensity: 1, approximateDuration: "há 2 horas", alerts: noAlerts, vitals: { bpm: 72, spo2: 99, temperatura: 36.5 }, expectedPriority: "GREEN", experimentalFocus: "Prioridade por regra independe do tipo textual da queixa." }),
  scenario(35, { mainComplaint: "Dor cervical súbita", additionalDescription: "Dor intensa percebida de forma abrupta ao movimentar a cabeça.", subjectiveIntensity: 8, approximateDuration: "há 30 minutos", alerts: { ...noAlerts, suddenChange: "yes" }, vitals: { bpm: 90, spo2: 98, temperatura: 36.6 }, expectedPriority: "RED", experimentalFocus: "Mesmo alerta produz o mesmo resultado em paciente distinto." }),
  scenario(36, { mainComplaint: "Ansiedade e coração acelerado", additionalDescription: "Sensação de ansiedade sem falta de ar ou alteração de consciência.", subjectiveIntensity: 3, approximateDuration: "há 1 hora", alerts: noAlerts, vitals: { bpm: 100, spo2: 98, temperatura: 36.7 }, expectedPriority: "YELLOW", experimentalFocus: "Valor exatamente no limiar demonstrativo de FC." }),
  scenario(37, { mainComplaint: "Desconforto leve no joelho", additionalDescription: "Dor discreta ao caminhar, sem trauma súbito relatado.", subjectiveIntensity: 3, approximateDuration: "há 1 dia", alerts: noAlerts, vitals: { bpm: 74, spo2: 98, temperatura: 36.4 }, expectedPriority: "GREEN", experimentalFocus: "Histórico prévio do paciente não altera nova triagem leve." }),
  scenario(38, { mainComplaint: "Queda com breve desmaio", additionalDescription: "Relata perda percebida de consciência após a queda.", subjectiveIntensity: 7, approximateDuration: "há 25 minutos", alerts: { ...noAlerts, consciousness: "yes" }, vitals: { bpm: 92, spo2: 96, temperatura: 36.5 }, expectedPriority: "RED", experimentalFocus: "Alerta de consciência em cenário textual diferente." }),
  scenario(39, { mainComplaint: "Fadiga aos esforços", additionalDescription: "Cansaço moderado sem resposta positiva aos alertas demonstrativos.", subjectiveIntensity: 3, approximateDuration: "há 3 dias", alerts: noAlerts, vitals: { bpm: 88, spo2: 95, temperatura: 36.8 }, expectedPriority: "YELLOW", experimentalFocus: "SpO₂ exatamente no limiar demonstrativo." }),
  scenario(40, { mainComplaint: "Desconforto digestivo leve", additionalDescription: "Sensação de estômago pesado após refeição, sem alerta.", subjectiveIntensity: 2, approximateDuration: "há 2 horas", alerts: noAlerts, vitals: { bpm: 76, spo2: 99, temperatura: 36.6 }, expectedPriority: "GREEN", experimentalFocus: "FIFO entre casos verdes e independência entre pacientes." }),

  scenario(41, { mainComplaint: "Febre alta referida", additionalDescription: "Temperatura elevada na leitura, mas baixa intensidade e alertas negativos.", subjectiveIntensity: 3, approximateDuration: "desde a madrugada", alerts: noAlerts, vitals: { bpm: 88, spo2: 98, temperatura: 40.0 }, expectedPriority: "GREEN", experimentalFocus: "Temperatura extrema isolada é preservada tecnicamente, mas ignorada pelo motor." }),
  scenario(42, { mainComplaint: "Palpitação muito intensa", additionalDescription: "Batimentos muito acelerados sem resposta positiva aos alertas.", subjectiveIntensity: 2, approximateDuration: "há 15 minutos", alerts: noAlerts, vitals: { bpm: 220, spo2: 98, temperatura: 36.6 }, expectedPriority: "YELLOW", experimentalFocus: "FC extrema isolada eleva apenas de verde para amarelo." }),
  scenario(43, { mainComplaint: "Dor incapacitante sem alertas", additionalDescription: "Intensidade máxima informada, sem mudança súbita, falta de ar ou alteração de consciência.", subjectiveIntensity: 10, approximateDuration: "há 1 hora", alerts: noAlerts, vitals: { bpm: 90, spo2: 98, temperatura: 36.9 }, expectedPriority: "YELLOW", experimentalFocus: "Intensidade máxima não produz vermelho sem alerta." }),
  scenario(44, { mainComplaint: "Mal-estar com alterações combinadas", additionalDescription: "Queixa moderada com FC e SpO₂ nos limiares de atenção.", subjectiveIntensity: 5, approximateDuration: "há 2 horas", alerts: noAlerts, vitals: { bpm: 110, spo2: 94, temperatura: 38.4 }, expectedPriority: "YELLOW", experimentalFocus: "Múltiplos gatilhos amarelos não se acumulam para vermelho." }),
  scenario(45, { mainComplaint: "Falta de ar súbita", additionalDescription: "Dificuldade respiratória percebida com início abrupto.", subjectiveIntensity: 9, approximateDuration: "há 12 minutos", alerts: { suddenChange: "yes", breathing: "yes", consciousness: "no" }, vitals: { bpm: 130, spo2: 88, temperatura: 37.0 }, expectedPriority: "RED", experimentalFocus: "Dois alertas positivos e dois sinais alterados; razões devem ser acumuladas." }),
  scenario(46, { mainComplaint: "Leitura baixa de saturação isolada", additionalDescription: "Sem alerta positivo e com desconforto subjetivo leve.", subjectiveIntensity: 2, approximateDuration: "há 20 minutos", alerts: noAlerts, vitals: { bpm: 78, spo2: 50, temperatura: 36.5 }, expectedPriority: "YELLOW", experimentalFocus: "SpO₂ no mínimo técnico aceito não gera vermelho." }),
  scenario(47, { mainComplaint: "Aceleração cardíaca isolada", additionalDescription: "Sem falta de ar, desmaio ou mudança súbita percebida.", subjectiveIntensity: 2, approximateDuration: "há 10 minutos", alerts: noAlerts, vitals: { bpm: 240, spo2: 99, temperatura: 36.7 }, expectedPriority: "YELLOW", experimentalFocus: "FC no máximo técnico aceito não gera vermelho." }),
  scenario(48, { mainComplaint: "Dor generalizada moderada", additionalDescription: "Dor persistente sem respostas positivas de alerta.", subjectiveIntensity: 6, approximateDuration: "há 6 horas", alerts: noAlerts, vitals: { bpm: 98, spo2: 96, temperatura: 37.5 }, expectedPriority: "YELLOW", experimentalFocus: "Intensidade intermediária sem alteração técnica." }),
  scenario(49, { mainComplaint: "Queda súbita com desorientação", additionalDescription: "Mudança abrupta acompanhada de alteração percebida de consciência.", subjectiveIntensity: 6, approximateDuration: "há 18 minutos", alerts: { suddenChange: "yes", breathing: "no", consciousness: "yes" }, vitals: { bpm: 86, spo2: 98, temperatura: 36.4 }, expectedPriority: "RED", experimentalFocus: "Dois alertas positivos com sinais não sinalizados." }),
  scenario(50, { mainComplaint: "Cansaço com sinais alterados", additionalDescription: "Sintomas leves, sem alertas, com FC elevada e SpO₂ reduzida.", subjectiveIntensity: 3, approximateDuration: "há 45 minutos", alerts: noAlerts, vitals: { bpm: 110, spo2: 92, temperatura: 37.1 }, expectedPriority: "YELLOW", experimentalFocus: "Duas alterações técnicas sem efeito cumulativo além de amarelo." }),
] as const;

export function simulationArrivalAt(item: SimulationCase): Date {
  return new Date(SIMULATION_BASE_TIME.getTime() + item.arrivalOffsetMinutes * 60_000);
}

export function expectedPriorityFromCurrentDemoRules(item: SimulationCase): SimulationPriority {
  if (Object.values(item.alerts).includes("yes")) return "RED";
  if (item.subjectiveIntensity >= 4) return "YELLOW";
  if (item.vitals.bpm >= 100 || item.vitals.spo2 <= 95) return "YELLOW";
  return "GREEN";
}
