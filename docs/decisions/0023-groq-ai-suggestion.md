# ADR 0023 — Sugestão experimental de IA sob solicitação profissional

- **Status:** Aceita para demonstração controlada
- **Relacionada:** ADR 0021 e ADR 0022

## Contexto

O painel já apresenta uma recomendação determinística e registra a decisão humana separadamente. Uma sugestão externa precisa permanecer rastreável à análise final e à coleta aceita, sem alterar esses registros.

## Decisão

A enfermagem autenticada solicita a sugestão no detalhe da triagem. A chamada ao Groq ocorre exclusivamente no servidor e apenas com `APP_MODE=demo`; o caso envia campos minimizados, sem nome, documento ou identificadores, e só usa valores da coleta associada ao `AnalysisRun` final. A queixa pode conter informação sensível, portanto a demonstração deve usar pacientes fictícios.

O resultado validado é persistido em `AiSuggestion`, com relações para `Triage`, `AnalysisRun` e `HardwareCollectionSession`, mais modelo e versão do prompt. Uma falha gera estado `UNAVAILABLE` e não impede o fluxo. A sugestão não atualiza `Triage.currentRecommendedPriority`, `Triage.finalHumanPriority` nem `NurseReview`. Não é diagnóstico, classificação clínica validada ou autorização para uso assistencial.

O acionamento é explícito em vez de automático após a coleta para que o envio a um provedor externo seja uma decisão profissional consciente. A chave permanece server-side em `GROQ_API_KEY`. Antes de qualquer uso com dados reais, devem ser avaliados privacidade, consentimento, segurança, validade e governança clínica fora do escopo desta demonstração.

## Consequências

- Uma coleta aceita mais recente gera nova análise determinística e pode receber uma nova sugestão; sugestões anteriores permanecem no histórico.
- O painel compara a sugestão com a recomendação atual, sempre requerendo revisão da enfermagem.
- O código não declara confiança percentual nem conexão com o provedor a partir do navegador.
- A migration de `AiSuggestion` precisa estar aplicada antes da versão correspondente ser publicada.
