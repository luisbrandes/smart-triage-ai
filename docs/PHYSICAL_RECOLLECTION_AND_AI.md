# Recoleta física e sugestão experimental da IA

Esta evolução mantém três registros distintos: `Reading` é dado técnico bruto do ESP32; `VitalSignMeasurement` é BPM/SpO₂ da leitura explicitamente aceita; `AiSuggestion` é apoio externo experimental. A recomendação determinística (`AnalysisRun`/`AnalysisRecommendation`) e a decisão profissional (`NurseReview`) não são alteradas pela IA. Não há validação clínica nem autorização para uso assistencial real; use somente pessoas fictícias.

## Mesma pessoa, nova coleta

- Na tela `/paciente/coleta`, “Fazer nova coleta para esta pessoa” inicia outra sessão técnica após uma coleta concluída, sem aceitar a anterior. O `sessionId` novo não reutiliza o anterior.
- Depois de uma coleta aceita e analisada, `/paciente/triagem/concluida` oferece a mesma opção enquanto a triagem aguarda revisão. Uma transação muda a mesma `Triage` de `AWAITING_NURSE_REVIEW` para `RECOLLECTION_REQUESTED`, com auditoria. O cookie, `Patient`, anamnese, senha e análises anteriores permanecem. A nova leitura precisa novamente ser escolhida e aceita; somente então a nova análise determinística passa a ser a recomendação atual.
- Tentativas anteriores e sugestões anteriores permanecem no histórico. A enfermagem vê a coleta aceita mais recente e os horários. Temperatura, peso e altura opcionais são exibidos somente a partir do `Reading` físico selecionado; não são convertidos em medições clínicas aceitas nem usados pela regra determinística atual. Não há valor inventado para dado ausente.

## Nova triagem e firmware

“Iniciar nova triagem” cria outra `Triage` e invalida, em transação, sessões técnicas `ACTIVE` solicitadas pela triagem anterior. O histórico clínico anterior não é apagado nem recebe o status clínico `COMPLETED` (reservado ao fluxo de atendimento). O navegador usa uma chave de sessão local associada a `triageId` e `deviceId`; a coleta nova recebe outro UUID. Um POST de leitura com o UUID cancelado recebe erro de sessão não ativa.

O firmware deve continuar consultando `GET /api/device/session/current`: `ACTIVE` traz o UUID atual; `IDLE` ou um UUID diferente exigem parar a coleta anterior, limpar os valores anteriores do display e descartar o `sessionId` anterior. **O backend não pode apagar fisicamente o display sem essa lógica no firmware.** Esta mudança de firmware precisa ser implementada e verificada no equipamento real; não está incluída neste repositório. O contrato HTTP de start/readings/cancel/release não mudou.

## Encerramento pelo paciente

O banner das etapas do paciente oferece “Encerrar triagem”. A confirmação é explícita no navegador. A ação server-side, em transação, marca como `CANCELLED` somente os estados ainda em andamento, cancela as sessões técnicas `ACTIVE` vinculadas e registra auditoria minimizada. O cookie da triagem é removido depois da operação e o paciente retorna ao início. Como a triagem cancelada não fica em `AWAITING_NURSE_REVIEW`, ela não aparece na fila da enfermagem; registros técnicos permanecem para rastreabilidade e novas leituras são rejeitadas pelo estado cancelado.

“Voltar” permanece uma navegação comum entre etapas permitidas: não altera estado, não cria paciente e não cria sessão. Atualizar ou usar o histórico do navegador pode exibir uma etapa antiga, mas os guards server-side redirecionam para o estado persistido e nenhuma sessão de hardware é criada pela navegação.

## Sugestão da IA

- Na página de detalhe da enfermagem, profissional com sessão ativa aciona “Solicitar sugestão da IA”. A chamada é server-side para a API de chat completions do Groq, com `GROQ_API_KEY` não pública, modelo `llama-3.3-70b-versatile`, saída JSON validada e timeout de 6 segundos. Não há chamada do navegador ao Groq.
- Apenas em `APP_MODE=demo`. O payload contém idade/sexo quando disponíveis, queixa principal, intensidade/duração, alertas afirmativos, BPM/SpO₂ clinicamente aceitos, temperatura/peso/altura da leitura técnica selecionada quando disponíveis e prioridade atual do sistema. Nome, documento, IDs, token, histórico bruto e demais respostas livres não são enviados. A queixa ainda pode conter informação sensível: a demonstração deve usar somente dados fictícios. Para uso real seriam necessários revisão de privacidade/consentimento e validação clínica independentes.
- A resposta permite prioridade `RED/YELLOW/GREEN/BLUE`, atenção `HIGH/MODERATE/LOW`, conclusão curta e fatores. Não existe porcentagem de confiança. O resultado é associado à `Triage`, ao `AnalysisRun` final e à `HardwareCollectionSession` aceita, sem atualizar `currentRecommendedPriority` ou `finalHumanPriority`.
- Só há uma tentativa gravada por análise final. Falha, timeout, limite, chave ausente ou JSON inválido geram `UNAVAILABLE`; a classificação profissional continua normalmente. A página exibe comparação com a recomendação determinística e conserva o histórico de sugestões por coleta. Não se registra prompt, resposta bruta ou segredo em logs/auditoria.

## Verificação

Executar `prisma validate`, `prisma generate`, testes, lint, typecheck e build. A migration `20261019000000_ai_suggestion` deve ser aplicada **antes** de publicar a versão que consulta `AiSuggestion`. Testes de integração exigem `TEST_DATABASE_URL` isolada e migrada; nunca apontar esses testes ao banco de produção. O fluxo de display `IDLE`/UUID novo exige teste físico do firmware e não pode ser garantido por testes de backend.
