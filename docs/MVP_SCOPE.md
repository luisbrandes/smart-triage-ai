# Escopo da V0

## Obrigatório

- Jornada do paciente: início, cadastro manual, plano, consentimento versionado, anamnese estruturada, análise, eventual coleta, reavaliação, senha e conclusão.
- Anamnese: queixa, descrição, intensidade, início/duração, sinais de alerta, histórico rápido, condições, medicamentos, alergias e complemento opcional.
- Motor determinístico: recomendação preliminar e posterior, fatores vinculados a dados/regras, alertas, decisão de sinais vitais, estado significativo e versão de regras.
- Coleta manual e simulação determinística por adaptadores do mesmo `HardwareGateway`, com estado visível, origem, unidade, horário, status, falha/timeout, fallback manual e repetição histórica de frequência cardíaca e SpO₂.
- Fila e detalhe profissional com prioridade, espera, alertas, consentimento, respostas, medições, análises, regras e auditoria.
- Ações: confirmar, reclassificar com justificativa, solicitar nova coleta e encaminhar.
- Três prioridades demonstrativas, máquina de estados, histórico imutável, auditoria, erros, vazios, responsividade e acessibilidade crítica.
- Seeds fictícios, modo demo, reset e cinco cenários repetíveis, sem dependências externas.

## Opcional

- QR Code apenas visual e não funcional.
- Registro simples de desfecho após encaminhamento.
- Atualização manual adicional da fila.

## Fora do escopo

Conexão de coleta física vinculada à triagem, firmware, pareamento, provisionamento, gestão operacional de dispositivos, atualização remota, escolha de transporte além da entrada HTTP técnica documentada no ADR 0020, IA generativa ou ML decisório, NEWS/Manchester inventado ou protocolo validado, prontuário, operadoras, faturamento, diagnóstico, prescrição, leitos, internação completa, telemedicina, mensagens, app nativo, multiunidade, microsserviços, mensageria, autenticação corporativa avançada, certificação e produção clínica.

## Evolução futura

Integrações clínicas, hardware real, protocolos formalmente definidos e validados, identidade corporativa e múltiplas unidades só entram após decisão arquitetural, clínica, jurídica e de segurança específica.

## Controle de aumento de escopo

Uma proposta só entra na V0 se for necessária a um critério de aceite existente, couber no monólito e nos cenários, não exigir dependência externa e não simular validade clínica. Caso contrário, registre-a como evolução; mudança de contrato exige atualização deste documento, critérios, plano e ADR aplicável antes da implementação.
