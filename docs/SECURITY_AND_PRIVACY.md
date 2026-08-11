# Segurança e privacidade

## Controles demonstrativos implementados no Marco 10

- Sessões HMAC distintas, `httpOnly`, `sameSite=strict`, expiração limitada e `secure` em produção.
- Credencial da enfermagem e segredo somente em variáveis server-side; nenhuma credencial pública/hardcoded.
- Layout e Server Actions profissionais exigem sessão; ator de auditoria deriva da sessão.
- Cookie do paciente contém somente referência opaca assinada à triagem atual.
- Auditoria rejeita update/delete no PostgreSQL; logs estruturados proíbem conteúdo clínico e identificável.

Esses controles são provisórios para demonstração e não representam conformidade, identidade corporativa ou autorização clínica.

## Postura

Dados de identificação e saúde são dados pessoais sensíveis. LGPD é requisito de projeto, mas esta documentação não comprova conformidade, base legal, certificação ou autorização clínica. Avaliação jurídica, clínica e de segurança permanece necessária.

## Controles obrigatórios

- Minimizar identificação, anamnese e metadados; tornar opcionais campos não essenciais e documentar finalidade.
- Registrar versão do termo, instante e contexto do consentimento; consentimento não substitui análise de base legal.
- Segregar rotas e capacidades de paciente e profissional; futura autenticação/autorização aplica menor privilégio, sessão segura e revisão de acesso.
- Proteger trânsito com TLS e dados em repouso com controles do banco/infraestrutura, segredos fora do repositório e backups protegidos.
- Proibir nome, documento, queixa, respostas e medições identificáveis em logs, analytics e mensagens de erro; usar correlação opaca.
- Usar somente dados fictícios em seed, testes, demonstrações e screenshots; reset não deve atingir ambiente real.
- Auditar início, consentimento, etapas, anamnese, coletas, motor, recomendações, visualização profissional relevante, decisões, nova coleta, encaminhamento e fechamento.
- Definir retenção, descarte, acesso do titular, revogação e resposta a incidentes antes de qualquer piloto; retenção está pendente.

## Auditoria

`AuditEvent` é append-only, com tipo, horário, ator/categoria, alvo, correlação e metadados mínimos. Acesso à trilha também é controlado. Eventos não duplicam conteúdo clínico. Integridade, retenção e exportação serão detalhadas antes da produção.

## Provedores e IA externa

Nenhum dado identificável pode ser enviado a IA, analytics, observabilidade ou provedor externo sem decisão arquitetural, finalidade, base legal, contrato, localização/transferência, minimização, segurança e controles aprovados. O motor V0 é local e determinístico. Riscos de terceiros incluem retenção secundária, treinamento indevido, transferência internacional, indisponibilidade e acesso não autorizado.

## Ameaças a tratar

Acesso cruzado entre painéis, enumeração de senha/triagem, exposição em logs, alteração concorrente, auditoria incompleta, reset demo perigoso, injeção, CSRF/XSS, sessão indevida e abuso de campos livres. Modelagem de ameaças e verificação técnica entram em marcos posteriores.

## Dispositivo e comunicação futura

Antes de hardware real, implementar e verificar identidade única, autenticação do dispositivo, autorização por unidade e credenciais rotacionáveis/revogáveis. Proteger contra dispositivo não autorizado, replay e dados adulterados; validar esquema, tipo, unidade, tamanho, frequência, ordem e duplicidade de payload. Nenhum valor é confiável apenas por vir de dispositivo.

Transmitir o mínimo, sem nome, documento ou anamnese desnecessários no dispositivo. Segredos fixos ou documentados no repositório são proibidos. Falhas de autenticação, conexão e validação devem ser registradas sem payload sensível. Políticas para retenção do bruto, topologia, protocolo, pareamento e offline são pendentes; nenhum desses controles está implementado neste Marco 0.

## Persistência local e seed

O Compose contém somente credenciais locais explícitas, proibidas em produção. `DATABASE_URL` é variável privada server-side e nunca usa prefixo público. O seed é determinístico, pequeno e marcado `DEMO`, `SIMULATED` e `EXPERIMENTAL`; não contém CPF, contato ou pessoa real. Snapshots/metadados são sanitizados e o schema não persiste payload bruto. Isso reduz risco, mas não comprova conformidade LGPD nem define retenção.
