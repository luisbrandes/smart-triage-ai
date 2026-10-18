# Checklist do teste físico final

Use este roteiro somente depois de aplicar a migration no banco de produção e publicar a versão correspondente. Use dados de teste autorizados e não registre token, senha, nome ou documento em capturas/logs.

## Preparação

- [ ] Deploy publicado aponta para o banco de produção correto.
- [ ] Migration `20261018010000_ai_suggestion` aplicada.
- [ ] `TRIAGE_DEVICE_ID` corresponde ao dispositivo provisionado.
- [ ] ESP32 usa a URL HTTPS publicada, CA válida e token do dispositivo.
- [ ] Firmware consulta `/api/device/session/current` e trata `ACTIVE`, `IDLE` e UUID diferente.
- [ ] Firmware envia `sessionId` em `/api/readings` e `/api/triage/session/release`.

## Teste 1 — primeira coleta

1. [ ] Iniciar uma triagem no painel do paciente.
2. [ ] Avançar até `/paciente/coleta`.
3. [ ] Confirmar no ESP32 que `GET /api/device/session/current` retorna `ACTIVE` com UUID.
4. [ ] Medir com os sensores reais.
5. [ ] Confirmar envio de BPM, SpO₂ e temperatura.
6. [ ] Confirmar tela de coleta com os valores recebidos.
7. [ ] Liberar/finalizar a sessão.
8. [ ] Selecionar e confirmar uma leitura no paciente.
9. [ ] Abrir a triagem correspondente na enfermagem.
10. [ ] Confirmar BPM, SpO₂, temperatura real, horário e origem física.

## Teste 2 — recoleta na mesma triagem

1. [ ] Solicitar “Fazer nova coleta para esta pessoa”.
2. [ ] Confirmar que paciente e triagem permanecem os mesmos.
3. [ ] Confirmar novo `sessionId` no ESP32.
4. [ ] Realizar e enviar a segunda medição.
5. [ ] Confirmar que os novos valores aparecem na coleta atual.
6. [ ] Aceitar a segunda leitura.
7. [ ] No painel, confirmar que a coleta nova está marcada como mais recente.
8. [ ] Confirmar que a coleta anterior continua no histórico e não foi misturada.

## Teste 3 — nova triagem

1. [ ] Finalizar o fluxo anterior conforme o processo demonstrativo.
2. [ ] Clicar em “Iniciar nova triagem”.
3. [ ] Confirmar no ESP32 que a sessão anterior deixa de estar `ACTIVE`.
4. [ ] Confirmar que o firmware limpa BPM, SpO₂ e temperatura antigos.
5. [ ] Confirmar estado neutro `IDLE` até o paciente iniciar a coleta nova.
6. [ ] Criar a sessão nova no site.
7. [ ] Confirmar UUID diferente do anterior.
8. [ ] Realizar uma nova medição.
9. [ ] Confirmar que somente a nova triagem recebe os dados.

## Teste 4 — sugestão Groq

1. [ ] Finalizar uma coleta com BPM e SpO₂ aceitos.
2. [ ] Abrir o detalhe no painel de enfermagem.
3. [ ] Solicitar a sugestão da IA.
4. [ ] Confirmar prioridade sugerida, atenção, conclusão e fatores.
5. [ ] Confirmar que a recomendação oficial permanece igual.
6. [ ] Confirmar aviso de validação obrigatória pela enfermagem.
7. [ ] Confirmar que a sugestão está associada à coleta atual.

## Teste 5 — Groq indisponível

- [ ] Simular timeout, erro HTTP ou chave ausente apenas em ambiente de teste.
- [ ] Confirmar “Sugestão da IA indisponível no momento”.
- [ ] Confirmar que painel, triagem e classificação oficial continuam funcionando.
- [ ] Confirmar que nenhuma prioridade humana ou automática é alterada.

## Teste 6 — encerramento pelo paciente

1. [ ] Iniciar uma triagem e, antes de concluir, clicar em “Encerrar triagem”.
2. [ ] Escolher “Encerrar triagem” na confirmação.
3. [ ] Confirmar retorno ao início e cookie/contexto removido.
4. [ ] Se havia coleta ativa, confirmar no ESP32 que ela deixa de estar `ACTIVE` e que o display é limpo quando recebe `IDLE`.
5. [ ] Tentar enviar outra leitura com o UUID cancelado e confirmar rejeição.
6. [ ] Iniciar nova triagem e confirmar novo contexto e novo UUID.

## Evidência esperada

Anote somente horários, códigos HTTP e estados (`ACTIVE`, `IDLE`, `CANCELLED`, `COMPLETED`). Não capture tokens, credenciais, payloads clínicos completos ou identificadores pessoais.
