# Coleta de hardware no painel do paciente

`/paciente/coleta` é a etapa visual da coleta física. Ela só é acessível quando a triagem existente está em uma etapa de sinais vitais e não altera identificação, consentimento ou anamnese.

## Fluxo implementado

1. Ao abrir a página, o navegador chama `POST /api/triage/session/start` para o dispositivo configurado em `TRIAGE_DEVICE_ID`.
2. O UUID técnico retornado é mantido em `sessionStorage` do navegador. Nenhum valor clínico, paciente ou triagem é gravado no navegador.
3. A página consulta `GET /api/triage/session/[sessionId]` imediatamente e a cada dois segundos apenas enquanto o estado for `ACTIVE`.
4. O valor mais recente recebido é exibido para BPM, SpO₂ e temperatura. Campos sem leitura permanecem vazios; a tela não cria valores simulados.
5. O paciente pode cancelar com `POST /api/triage/session/cancel`. O polling para em `CANCELLED` ou `COMPLETED`.

O ESP32 encerra a coleta com `POST /api/triage/session/release`; o frontend então mostra o estado concluído.

As rotas do navegador exigem a sessão assinada da triagem e só consultam/cancelam sessões solicitadas por ela. O token do dispositivo nunca é enviado ao frontend.

## Aceite da coleta

Quando uma sessão técnica concluída possui uma leitura, a página apresenta os valores e permite confirmá-los. A confirmação envia somente os IDs da sessão técnica e da leitura por Server Action; a triagem é obtida no servidor pela sessão do paciente. O servidor relê e valida os dados persistidos, cria a tentativa clínica física e encaminha para a análise existente. Temperatura continua apenas como dado técnico nesta etapa.
