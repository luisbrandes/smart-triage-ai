# Experimento controlado com 50 triagens

## Finalidade

Este experimento exercita o comportamento demonstrativo atual do Smart Triage com dados integralmente sintéticos. Ele não valida desempenho clínico, não mede acurácia diagnóstica e não substitui avaliação profissional. A expectativa registrada para cada caso representa somente a leitura independente das regras `V0-DEMO-RULESET-002` existentes no projeto.

## Conjunto de dados

- 10 pessoas fictícias com nomes brasileiros plausíveis e identificador iniciado por `SIM-EXP-2026-`.
- Exatamente 5 triagens por pessoa, totalizando 50.
- Chegadas controladas em intervalos de cinco minutos a partir de `2026-09-15T11:00:00Z`.
- Distribuição planejada pelas regras atuais: 15 verdes, 20 amarelas e 15 vermelhas.
- Cada cenário contém anamnese, três respostas de alerta, intensidade, FC, SpO₂ e temperatura.
- O dispositivo `ESP32-SIM-EXPERIMENT-001` é exclusivamente sintético e não possui credencial remota.

Os dados-fonte ficam em `scripts/simulation/simulation-data.ts`. As evidências observadas são gravadas em `artifacts/simulation/observed-results.json` somente depois do processamento real.

## Fluxo executado

Para cada triagem, o carregador:

1. cria a identificação sintética, consentimento e anamnese;
2. inicia uma `DeviceCollectionSession` pelo caso de uso existente;
3. valida e registra uma `Reading` com BPM, SpO₂ e temperatura;
4. libera a sessão técnica;
5. aceita explicitamente a leitura física no fluxo clínico, criando uma `HardwareCollectionSession` e duas `VitalSignMeasurement` aceitas;
6. executa `runDeterministicFinalAnalysis` com o conjunto de regras vigente;
7. persiste análise, recomendação, razões, senha e auditoria pelo repository de sinais vitais;
8. consulta a mesma projeção server-side usada pelas páginas da enfermagem.

O cadastro base é preparado diretamente pelo script porque o intake web atual sempre cria uma nova pessoa e ainda não oferece busca/reutilização de paciente. Isso permite testar cinco triagens ligadas à mesma pessoa sem alterar a aplicação.

Após capturar a fila inicial com 50 triagens, seis recomendações são confirmadas por meio dos casos de uso profissionais. A simulação chama dois casos vermelhos em ordem de chegada, conclui o primeiro e mantém o segundo como chamado. Isso permite observar a saída da fila de revisão e a entrada na fila de atendimento.

## Execução

Pré-condições:

- `APP_MODE=demo`;
- PostgreSQL local no loopback (`localhost`, `127.0.0.1` ou `::1`); scripts recusam destinos remotos;
- `DATABASE_URL` configurada;
- `DIRECT_DATABASE_URL` configurada quando a URL principal usa Prisma Accelerate;
- migrations aplicadas no banco de demonstração/desenvolvimento;
- nunca executar contra produção.

Comandos:

```bash
npm run simulation:clean
npm run simulation:load
```

`simulation:load` é idempotente: se encontrar o lote completo com 10 pessoas, 50 triagens, 50 análises e 50 leituras, encerra sem duplicar registros. Um lote parcial é recusado e deve ser removido explicitamente com `simulation:clean`.

`simulation:clean` localiza somente pacientes pelo prefixo exclusivo e o dispositivo sintético do experimento. A rotina remove suas relações em uma transação serializável e verifica que nenhum registro do lote permaneceu. Ela não trunca tabelas e não seleciona registros de pacientes sem o prefixo.

## O que pode ser observado na aplicação

- `/enfermagem`: triagens ainda em `AWAITING_NURSE_REVIEW`, ordenadas por recomendação e entrada na fila;
- `/enfermagem/triagens/[triageId]`: anamnese, recomendações, razões, FC, SpO₂, origem física e linha do tempo sanitizada;
- `/enfermagem/atendimento`: seis casos confirmados, incluindo estados `WAITING`, `CALLED` e `COMPLETED` após a carga.

A área da enfermagem exige a sessão demonstrativa configurada no ambiente. Temperatura permanece na leitura técnica e não aparece na medição clínica nem no detalhe profissional atual.

## Regras efetivamente avaliadas

- qualquer resposta positiva entre mudança súbita, dificuldade para respirar ou alteração de consciência recomenda `RED`;
- sem alerta positivo, intensidade igual ou superior a 4 recomenda `YELLOW`;
- quando a recomendação da anamnese seria `GREEN`, FC igual ou superior a 100 ou SpO₂ igual ou inferior a 95 eleva para `YELLOW`;
- sinais vitais não elevam uma recomendação a `RED`;
- temperatura, texto livre, idade, sexo e histórico anterior não entram no motor;
- múltiplos gatilhos acrescentam razões, mas não formam um escore cumulativo.

Esses critérios são artificiais e demonstrativos. Não correspondem a NEWS, Manchester ou protocolo clínico validado.

## Evidências e reprodutibilidade

O JSON observado preserva:

- entradas dos 50 casos;
- prioridade esperada pela especificação e prioridade retornada;
- razões persistidas;
- senha e posição inicial na fila;
- estados finais;
- leituras técnicas e medições clínicas aceitas;
- projeção inicial/final da fila de revisão;
- fila de atendimento antes e depois das chamadas;
- detalhes expostos pela camada de aplicação para cada triagem.

O relatório `Relatorio_Analise_Simulacao_SmartTriageIA.docx` foi produzido a partir desse arquivo, não de resultados hipotéticos.
