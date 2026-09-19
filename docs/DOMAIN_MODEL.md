# Modelo conceitual de domínio

O modelo descreve responsabilidades e invariantes, sem tipos SQL. Identificadores, dados demográficos, respostas e medições são sensíveis; acesso, retenção e exposição devem seguir minimização. Registros históricos marcados como imutáveis só recebem correção por novo registro relacionado.

## Agregados e entidades

### Patient
Representa a pessoa fictícia identificada. Guarda nome, nascimento/idade, sexo informado quando relevante e identificador demonstrativo. Relaciona-se a triagens e informação de plano. Deve ter apenas dados necessários; existe enquanto a política de retenção permitir. Intake cria/associa; correções devem ser rastreáveis.

### HealthPlanInformation
Registra se há plano e, se houver, nome informado, ligado a paciente/triagem. Nome é proibido quando “não possui” e integração com operadora inexiste. É sensível, acompanha o ciclo da triagem e alterações relevantes são auditadas.

### ConsentRecord
Evidência de aceite: triagem, versão do termo, instante e contexto de captura. Uma triagem submetida exige consentimento válido. É sensível e histórico imutável; revogação futura deve criar evento, não apagar aceite.

### Triage
Raiz do fluxo: paciente, estado único, tempos e referências a anamnese, análises, ticket, revisão e encaminhamento. Só transita conforme máquina; não pode ser simultaneamente cancelada/fechada/ativa. Casos de uso avançam, retomam ou cancelam; estado e histórico são auditados.

### Anamnesis
Versão estruturada das informações submetidas: queixa, complemento, intensidade, início/duração, histórico, condições, medicamentos, alergias e observação. Pertence a uma triagem e agrega respostas/alertas. Submissão fecha uma versão; nova coleta/correção cria nova versão, nunca sobrescreve a usada em análise.

### AnamnesisAnswer
Resposta a pergunta centralizada, com identificador/versão da pergunta, valor e instante. Pertence à anamnese; obrigatoriedade depende da definição versionada. É sensível e imutável após submissão.

### RedFlag
Sinal de alerta identificado a partir de resposta e regra demonstrativa, com referência à origem e estado. Não é diagnóstico nem validação clínica. Pertence à anamnese/análise; identificação e eventual revisão são auditáveis e não apagam origem.

### VitalSignsCollection
Agrupa a necessidade funcional de obter sinais vitais para uma triagem. Pode possuir uma ou mais `HardwareCollectionSession`; não representa conexão ou dispositivo. Nova solicitação cria nova coleção; falhas e coleções antigas permanecem.

### MedicalDevice
Representa fonte física ou fictícia conhecida pela integração: identificadores interno/externo, tipo, nome, fabricante/modelo/firmware quando disponíveis, capacidades, estado técnico, última comunicação, adaptador e ativo/inativo. Não contém paciente nem decide risco. Na V0 é apenas registro fictício opcional; cadastro e gestão operacional ficam fora do escopo.

### DeviceCapability
Declara o que dispositivo/adaptador pode oferecer, sem presumir uniformidade: FC e SpO₂ na V0; temperatura, pressão e outras futuramente. Capacidades de seleção, disponibilidade, progresso ou cancelamento também podem ser opcionais e declaradas.

### HardwareCollectionSession
Tentativa controlada pelo `HardwareGateway`: identificador, triagem/coleção, adaptador/dispositivo, origem, medições esperadas/recebidas, início/fim, estado, erros, número de tentativa, ator, eventos e metadados técnicos minimizados. Nova tentativa/fallback cria sessão nova ou versão histórica explícita; nunca sobrescreve a anterior.

### DeviceCollectionSession
Sessão técnica da prova de conceito HTTP, vinculada a um dispositivo e não a paciente ou `Triage`. Tem estados `WAITING`, `ACTIVE`, `CANCELLED` e `COMPLETED`, instantes de início/término/cancelamento e várias `Reading`s. O banco permite somente uma sessão `ACTIVE` por dispositivo. Não é fonte de recomendação ou decisão clínica.

### Reading
Leitura técnica recebida via HTTP: dispositivo, sessão técnica opcional, BPM, SpO₂, temperatura e instante de recebimento. Com sessão informada, ela só é persistida se a sessão estiver `ACTIVE` e pertencer ao mesmo dispositivo. Não contém payload bruto, paciente ou triagem e não substitui `VitalSignMeasurement`.

### DeviceMeasurement
Representa medição recebida e sua passagem por normalização técnica: identificador, sessão, tipo, valor/unidade normalizados quando possíveis, três timestamps, origem, dispositivo, estado/qualidade, versão do adaptador, observação técnica e referência permitida ao bruto. Distingue recebida, tecnicamente validada, aceita, rejeitada e substituída; não é automaticamente usada pela triagem.

### RawDevicePayloadReference
Referência opcional a payload bruto mantido somente na integração quando retenção for permitida. Conteúdo bruto não pertence ao domínio nem chega ao motor. Política de retenção, acesso e proteção é decisão pendente.

### HardwareError
Falha estruturada de sessão/adaptador, com código seguro, fase, recuperabilidade e instante. Não contém dados pessoais desnecessários; timeout, desconexão, não autorização e payload inválido são exemplos técnicos.

### VitalSignMeasurement
Resultado normalizado aceito pelo fluxo: FC ou SpO₂, valor, unidade, horário normalizado, origem padronizada `MANUAL`, `SIMULATED_DEVICE` ou `PHYSICAL_DEVICE`, sessão/dispositivo quando aplicável, status/qualidade e referência à `DeviceMeasurement`. Só nasce após validação técnica e aceite do caso de uso; correção/repetição cria registro novo.

### AnalysisRun
Execução preliminar ou pós-medição: snapshot/referências de entrada, versão de regras, instante, status e erro seguro. Produz no máximo uma recomendação completa. Falhas são resultados auditáveis; repetição cria execução nova.

### AnalysisRecommendation
Saída provisória de uma execução: prioridade recomendada, necessidade de sinais vitais, alertas, estado/confiança somente se semanticamente definido. Nunca equivale à classificação humana. É imutável e aponta para razões.

### RecommendationReason
Explicação legível com código da regra e referência ao dado considerado, tipo de influência e texto de produto. Deve ser rastreável e não pode ser justificativa genérica. É imutável com a recomendação.

### RiskClassification
Vocabulário de prioridade verde/baixa, amarela/moderada e vermelha/elevada para V0. É simplificação visual, compartilhada por recomendação e decisão humana sem fundi-las; não representa protocolo oficial. Mudança do vocabulário exige decisão clínica/produto.

### NurseReview
Decisão profissional: triagem, recomendação consultada, classificação final, confirmar/reclassificar, justificativa obrigatória na mudança, ator e instante. Só profissional autorizado cria. É histórico imutável; revisão posterior vira novo registro.

### QueueTicket
Senha única no contexto operacional V0, triagem, instante e estado. Uma triagem tem no máximo uma senha ativa; geração ocorre ao entrar na fila. Não revela dado clínico e não é reutilizada dentro do contexto definido.

### CareReferral
Registro de encaminhamento após classificação humana: triagem, ator, instante e observação mínima. Não é prescrição ou gestão assistencial. É imutável; encerra o fluxo principal.

### Outcome
Rótulo demonstrativo opcional após encaminhamento, com tipo simples, instante e ator. Não cria prontuário, leito ou internação. Correções são novos registros/auditoria.

### AuditEvent
Registro append-only de ação: tipo, instante, ator/categoria, entidade, correlação e metadados minimizados. Não armazena conteúdo clínico identificável em texto livre. Abrange início, consentimento, etapas, anamnese, coletas, análises, recomendações, visualização profissional relevante, revisão, reclassificação, encaminhamento, nova coleta e fechamento.

### RuleSetVersion
Identidade imutável do conjunto de regras demonstrativas, estado e vigência. Cada análise referencia exatamente uma versão; publicação/substituição é controlada. Não pode ser rotulada como clinicamente validada sem processo formal futuro.

## Relações e invariantes globais

`Patient` possui triagens; `Triage` agrega versões de `Anamnesis`, coleções, execuções, ticket, revisões, encaminhamento e auditoria. Uma coleção possui sessões; sessão recebe dados brutos apenas na integração, produz `DeviceMeasurement` normalizada e, após aceite, `VitalSignMeasurement`. Separadamente, `MedicalDevice` possui sessões técnicas HTTP e suas `Reading`s. Análise referencia apenas medições aceitas e versões exatas. Operações críticas mudam estado, criam histórico e auditam atomicamente. Nenhuma projeção de fila é fonte autoritativa do domínio.

## Persistência inicial do Marco 3

O schema PostgreSQL materializa os conceitos principais com IDs UUID, timestamps UTC, relações `Restrict`, índices de consulta e enums estáveis. `RedFlag` é persistido como `RedFlagOccurrence`; `DeviceMeasurement` e a medição aceita são representados pelo ciclo de estado de `VitalSignMeasurement`, sem guardar payload bruto. Recomendação automática (`AnalysisRecommendation`) e decisão humana (`NurseReview`/`Triage.finalHumanPriority`) permanecem separadas. Alterações históricas criam novas execuções, sessões, medições ou revisões; não atualizam um registro anterior para fingir um novo evento.
