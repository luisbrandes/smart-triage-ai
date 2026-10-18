# Prompt para corrigir o firmware ESP32: troca de triagem e limpeza do display

Copie o texto abaixo para o chat que já conhece o código do ESP32. Anexe nesse chat os arquivos atuais do firmware (incluindo display, sensores, comunicação HTTP/TLS e configuração). Não cole Wi-Fi, token do dispositivo ou chave privada.

---

## Prompt

Você já conhece o firmware deste ESP32 e a conexão HTTPS com a API publicada do SmartTriageIA. Faça uma alteração pequena no código existente para impedir que valores e sessões de uma triagem anterior continuem ativos quando o backend liberar o equipamento para outra coleta.

### Contexto da API

- Base URL: `https://smart-triage-ai-teal.vercel.app`
- O firmware usa `GET /api/device/session/current`, autenticado com `Authorization: Bearer <DEVICE_TOKEN>`.
- Com trabalho disponível, a resposta é `{"status":"ACTIVE","sessionId":"<uuid>"}`.
- Sem coleta ativa, a resposta é `{"status":"IDLE","sessionId":null}`.
- O paciente pode cancelar uma coleta ou iniciar uma nova triagem no site. Nesses casos, a sessão técnica anterior fica cancelada e o endpoint passa a responder `IDLE` até a próxima sessão.
- Uma coleta nova recebe UUID próprio. O site mantém a leitura bruta vinculada à sessão e à triagem que a originou.
- Leituras usam `POST /api/readings`; o firmware já funcional não deve ter payload ou autenticação reescritos sem necessidade.
- Ao liberar depois de enviar as leituras, usar `POST /api/triage/session/release` com `{"deviceId":"ESP32-001","sessionId":"<uuid da sessão atual>"}`. Enviar o ID é importante para não concluir por engano outra sessão.

### Comportamento a implementar

1. Consulte `/api/device/session/current` periodicamente (intervalo atual entre 2 e 5 segundos) tanto em espera quanto durante uma coleta ativa. Preserve o fluxo de sensores já funcionando.
2. Em `IDLE`, pare qualquer aquisição ou envio associado à sessão anterior, descarte o `sessionId` local e limpe no display os valores que eram apresentados como atuais. Mostre um estado neutro de espera, sem BPM, SpO₂ ou temperatura antigos.
3. Se a API retornar um `sessionId` diferente do que o firmware está usando, encerre o ciclo antigo, descarte buffers e valores pendentes, gere identificadores novos para leituras e passe a trabalhar somente com o novo UUID. Não envie leituras antigas sob o novo ID.
4. Enquanto a resposta continuar `ACTIVE` com o mesmo UUID, não reinicie os sensores nem apague valores da coleta corrente. Só publique valores válidos produzidos pelos sensores reais.
5. Ao receber erro de rede temporário, mantenha a última tela coerente, mas não reenvie leituras antigas sem uma política de retry já segura. Ao receber `401`/`403`, interrompa o envio e sinalize erro de autorização sem imprimir token ou payload.
6. Ao terminar a coleta, associe cada `POST /api/readings` ao UUID atual e envie o mesmo UUID no `/release`. Depois descarte o UUID e aguarde o próximo ciclo.
7. Preserve o certificado CA/TLS, drivers, pinos, calibração, identificadores de configuração e método seguro de armazenamento já existentes. Nunca use TLS inseguro, dados simulados ou logs com Wi-Fi, token, payload clínico completo ou UUIDs.

### Limites

- Não altere a API, banco ou frontend.
- Não substitua o firmware inteiro se bastar ajustar a máquina de estados/polling.
- Não suponha modelo de placa, display, sensores, bibliotecas, pinos ou formato de valores; inspecione os arquivos anexados e pergunte apenas se algo indispensável estiver ausente.
- Não altere os drivers de sensor ou a lógica de medição já validada.
- Não invente testes de hardware que não executou. Diferencie compilação local de teste físico real.

### Entrega solicitada

1. Explique brevemente quais arquivos foram alterados e por quê.
2. Mostre os arquivos completos alterados ou um patch aplicável ao firmware anexado.
3. Explique a transição de estado para `IDLE`, UUID antigo e UUID novo.
4. Informe bibliotecas/versões somente se realmente mudarem.
5. Dê passos para compilar e testar: coleta concluída, cancelamento, início de outra triagem enquanto o display ainda tem valores, e uma nova coleta com UUID diferente.
6. Indique o que precisa ser observado no display e no servidor para confirmar que os valores antigos foram limpos e não foram enviados para a sessão nova.
7. Não inclua nenhum segredo real na resposta.

Arquivos atuais do firmware para análise:

```text
[ANEXE AQUI TODOS OS ARQUIVOS DO FIRMWARE ATUAL]
```

Dados que podem ser informados sem segredo:

```text
Placa ESP32: [modelo]
Framework/versão: [Arduino IDE, PlatformIO ou ESP-IDF]
Display: [modelo]
Sensores: [modelos]
```

---

O protocolo e o estado esperado do endpoint também estão em `docs/ESP32_API_CONTRACT.md` e `docs/VERCEL_REMOTE_HARDWARE_SETUP.md`.
