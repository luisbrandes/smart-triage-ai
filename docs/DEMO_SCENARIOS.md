# Cenários de demonstração

O Marco 9 torna funcionais confirmação, reclassificação, nova coleta e encaminhamento. A recomendação permanece intacta; decisões, sessões e análises são anexadas ao histórico.

## Regras comuns

Todos os nomes e identificadores são fictícios. O modo demonstração prepara o estado inicial, registra uma versão de termo e de regras, oferece reset idempotente e não depende de rede, hardware ou serviço externo. Cada execução gera novos identificadores e senha única no contexto da V0, preservando os eventos durante a execução.

## 1. Baixa prioridade sem sensores

- **Dados:** Lia Demo, 29 anos, sem plano; queixa leve, início recente, sem alertas, histórico/medicamentos/alergias negativos ou não informados.
- **Inicial:** nenhuma triagem ativa; termo demo vigente.
- **Ações:** identificar, consentir, responder anamnese e concluir.
- **Esperado:** regra demonstrativa gera verde, explica os fatores, não pede sinais vitais, gera senha e permanece aguardando revisão.
- **Repetibilidade:** reset restaura exatamente as respostas previstas; nunca afirmar segurança clínica pela ausência de coleta.
- **Regra V0:** nenhuma pergunta demo positiva e intensidade abaixo de 4 produz recomendação verde, sem sinais vitais, exclusivamente para demonstração.

## 2. Prioridade moderada com coleta simulada bem-sucedida

- **Dados:** Caio Demo, 46 anos, plano fictício; sintomas demonstrativos de intensidade relevante, sem alerta elevado.
- **Inicial:** triagem limpa e simulador disponível.
- **Ações:** concluir anamnese; selecionar adaptador simulado; observar conexão/progresso; receber frequência cardíaca e SpO₂ normalizadas.
- **Esperado:** análise preliminar solicita coleta; segunda análise mantém ou eleva para amarelo conforme conjunto de regras demo; ambas e todas as medições permanecem; a senha é emitida ao aguardar revisão.
- **Repetibilidade:** valores, progresso e resultado são predefinidos, rotulados `SIMULATED_DEVICE`, sem aleatoriedade e sem representar limiar clínico validado.
- **Regra V0:** intensidade 7 ou superior produz recomendação amarela e solicita coleta; intensidade de 4 a 6 produz amarela sem solicitação, sempre como regra fictícia.

## 3. Alerta elevado

- **Dados:** Rosa Demo, 67 anos; resposta afirmativa a um sinal de alerta explicitamente marcado como cenário demonstrativo.
- **Inicial:** regra demo e termo conhecidos.
- **Ações:** concluir identificação, consentimento e anamnese.
- **Esperado:** recomendação vermelha, motivo ligado à resposta e destaque na fila; revisão humana permanece pendente.
- **Repetibilidade:** o mesmo fixture aciona a mesma regra; a apresentação declara que não é validação clínica.
- **Regra V0:** qualquer pergunta demonstrativa de alerta respondida “sim” produz recomendação vermelha e solicita sinais vitais, sem equivalência com protocolo real.

## 4. Intervenção do enfermeiro

- **Dados:** uma triagem fictícia aguardando revisão com recomendação amarela.
- **Inicial:** usuário profissional de demonstração e detalhe aberto.
- **Ações:** revisar evidências, escolher prioridade diferente, informar justificativa e confirmar.
- **Esperado:** `NurseReview` registra classificação humana, ator, horário e justificativa; recomendação original não muda; auditoria mostra a intervenção; a triagem pode então ser encaminhada.
- **Repetibilidade:** reset recria a triagem pendente sem reaproveitar dados pessoais.

## 5. Nova coleta

- **Dados:** triagem fictícia aguardando revisão, com uma coleta e análise existentes.
- **Inicial:** detalhe profissional disponível.
- **Ações:** solicitar nova coleta; executar primeira sessão simulada com falha; repetir em nova sessão com sucesso; executar reavaliação.
- **Esperado:** estado percorre recollection/coleta/análise/revisão; as duas sessões/tentativas e recomendações anteriores permanecem; explicação identifica manutenção ou mudança.
- **Repetibilidade:** falha, repetição e sucesso são roteirizados deterministicamente.

## Variações obrigatórias de hardware

- **Falha com repetição:** o adaptador simulado conclui a primeira sessão como falha, exibe erro seguro e cria uma segunda sessão ao repetir; ambas aparecem no histórico.
- **Timeout com fallback manual:** uma sessão simulada expira; o usuário escolhe fallback, uma nova sessão `MANUAL` registra FC/SpO₂ e a auditoria evidencia a troca de origem. A triagem prossegue ou permanece disponível à revisão humana.

## Critérios transversais

Alternância clara entre painéis, layout coerente em desktop/tablet/totem, estados de carga/erro/vazio, relógio controlável para espera previsível e aviso visível de que a prioridade depende da enfermagem.

Para validar a conclusão, recarregue a tela e confirme a mesma senha; depois inicie nova demonstração, conclua outro fluxo e confirme nova triagem/senha sem remoção dos registros anteriores.

Para validar a enfermagem, conclua ao menos uma triagem sem sinais vitais e outra com coleta; confira ordem, senha, recomendações, justificativas, origem/leituras, tentativas e linha do tempo. Confirme que não existem botões de confirmar, reclassificar, recolher ou encaminhar.
