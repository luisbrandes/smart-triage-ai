# Motor de análise

## Papel e contrato conceitual

O motor V0 é um mecanismo demonstrativo, determinístico, previsível, auditável e substituível. Recebe uma solicitação versionada e devolve sucesso ou falha explícita. Não diagnostica, prescreve, decide cuidado ou implementa protocolo médico validado.

**Entradas:** identificador de triagem; fase preliminar ou pós-sinais vitais; snapshot versionado de anamnese e dados demográficos mínimos pertinentes; alertas derivados; somente medições normalizadas, tecnicamente validadas e aceitas de FC/SpO₂; versão exata do conjunto de regras.

**Saídas:** prioridade recomendada V0; necessidade de sinais vitais; alertas identificados; lista ordenada de razões com código de regra e referência ao dado; estado da análise; versão das regras. “Confiança” só existirá se tiver definição operacional testável; não será porcentagem decorativa.

O contrato interno deve permitir implementação determinística V0 e outras futuras sem alterar casos de uso. Persistência registra `AnalysisRun`, `AnalysisRecommendation` e razões; a interface do motor não conhece React, Prisma ou transporte.

O Marco 5 implementa o contrato como função pura em `src/domain/analysis`. As condições fictícias ficam somente em `src/demo/analysis-rules.ts`, versão `V0-DEMO-RULESET-001`: resposta positiva em pergunta demo recomenda vermelho e solicita sinais vitais; intensidade 7 ou superior recomenda amarelo e solicita coleta; intensidade de 4 a 6 recomenda amarelo sem coleta; ausência desses fatores recomenda verde sem coleta. Esses limiares são artifícios de demonstração, não critérios clínicos.

O caso de uso carrega somente catálogo, intensidade e respostas de alerta normalizadas. Um SHA-256 dessas entradas relevantes e da versão forma a chave de idempotência. A transação cria execução, recomendação, razões e auditoria e muda a triagem para `VITAL_SIGNS_REQUIRED` ou `AWAITING_NURSE_REVIEW`. Repetição idêntica retorna o registro existente; entrada diferente pode gerar nova execução histórica. `APP_MODE=production` bloqueia o motor demo.

O motor não conecta dispositivo, interpreta protocolo/payload bruto, normaliza valor, controla sessão, escolhe repetição/fallback nem conhece ESP32. Essas responsabilidades terminam no `HardwareGateway` e no caso de uso de coleta antes da análise.

## Execuções

- **Preliminar:** após anamnese, produz recomendação e decide se solicita FC/SpO₂.
- **Pós-medição:** usa nova coleção e preserva a preliminar; produz nova recomendação e razões que expliquem manutenção/alteração.
- **Repetição:** cria nova execução com correlação, nunca atualiza a anterior.

As regras ficam centralizadas, identificadas e cobertas futuramente por testes de tabela. Textos de exibição são separados da condição de domínio. As prioridades verde/amarelo/vermelho são linguagem visual simplificada.

## Explicabilidade e versionamento

Cada razão aponta a um dado coletado e código de regra: por exemplo, resposta de alerta, intensidade, faixa etária, duração, FC, SpO₂ ou combinação explicitamente identificada. O sistema mostra fatores usados e diferenças entre execuções. É proibido explicar com “a IA decidiu”. Uma execução referencia uma `RuleSetVersion` imutável; mudança gera versão nova e não recalcula histórico silenciosamente.

## Falhas e segurança

Entrada incompleta é rejeitada antes da execução. Timeout, exceção ou versão ausente geram execução falha com erro seguro e auditoria. Pode haver repetição controlada; se persistir, a triagem vai à revisão humana marcada como análise indisponível. A falha nunca fabrica prioridade nem bloqueia acesso profissional aos dados.

## Limite clínico

Os gatilhos concretos dependem de definição e validação clínica anteriores à implementação. Não escrever ou inferir limiares médicos a partir deste documento. NEWS, Manchester e qualquer protocolo real são proibidos sem adoção formal, licenciamento quando aplicável, evidência, governança e validação. Regra de cenário demo deve ser rotulada como tal e não extrapolada para uso clínico.

## Reanálise após sinais vitais

O Marco 6 usa `V0-DEMO-RULESET-002` e somente FC/SpO₂ aceitas. Seus marcadores são fictícios. A execução `POST_VITAL_SIGNS` preserva a preliminar e termina em revisão humana pendente.
