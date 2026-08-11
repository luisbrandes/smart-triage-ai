# Critérios de aceite verificáveis

## Sinais vitais — Marco 6

- [x] Gateway comum atende coleta manual e simulação determinística.
- [x] Falha, timeout, leitura inválida, repetição e fallback preservam sessões.
- [x] Somente FC/SpO₂ aceitas entram na análise final, sem apagar a preliminar.
- [x] Fluxo termina em revisão pendente sem senha ou decisão humana.

## Motor demonstrativo — Marco 5

- [x] Motor puro recebe somente entrada normalizada e ruleset injetado, sem Prisma, Next.js ou React.
- [x] Regras fictícias estão centralizadas, versionadas e explicitamente não validadas em `src/demo`.
- [x] Cenários verde, amarelo e vermelho produzem razões previsíveis e decisão demo sobre sinais vitais.
- [x] Execução, recomendação, razões, prioridade atual, transição e auditoria são persistidas atomicamente.
- [x] Fingerprint e constraint única impedem duplicação de execução idêntica e preservam reanálises distintas.
- [x] `APP_MODE=production` bloqueia o motor demonstrativo.
- [x] Interface apresenta recomendação provisória, versão, justificativas e revisão humana obrigatória.
- [x] Nenhuma revisão humana, medição, senha, fila ou regra clínica real é criada.

## Intake funcional — Marco 4

- [x] Paciente inicia e retoma triagem por cookie `httpOnly` contendo somente ID opaco.
- [x] Identificação fictícia, plano, consentimento versionado e anamnese são validados no servidor e persistidos.
- [x] Nome/data/plano, aceite e perguntas obrigatórias possuem validações objetivas.
- [x] Conteúdo provisório está centralizado e explicitamente marcado em `src/demo`.
- [x] Fluxo percorre `IDENTIFICATION_IN_PROGRESS` e `ANAMNESIS_IN_PROGRESS` até `PRELIMINARY_ANALYSIS_PENDING`.
- [x] Auditoria registra somente início, identificação, consentimento, salvamento e conclusão, sem respostas clínicas nos metadados.
- [x] Server Actions não importam Prisma; repository e conexão permanecem server-only.
- [x] Atualização da página preserva retomada; nenhuma recomendação é criada.
- [x] Painel da enfermagem, motor, hardware, sinais vitais, senha e fila permanecem fora do marco.

## Persistência e domínio — Marco 3

- [x] PostgreSQL local possui Compose, volume, healthcheck e credenciais exclusivas de desenvolvimento.
- [x] Prisma ORM 7 usa gerador moderno, output explícito e adapter PostgreSQL server-only.
- [x] Schema relacional representa o domínio principal com UUIDs, enums, índices e exclusões restritivas.
- [x] Recomendação automática, decisão humana, sessões e medições permanecem historicamente separadas.
- [x] Migration inicial é versionada e aplicável em banco limpo.
- [x] Seed é determinístico, idempotente, fictício e cobre revisão humana, simulação, falha e fallback.
- [x] Máquina de estados pura não importa Prisma e rejeita transições inválidas/estados terminais.
- [x] Vitest roda em Node sem depender de PostgreSQL.
- [x] Prisma não é importado por app, features, shared ou domínio; nenhum Client Component foi criado.
- [x] Shells permanecem estáticos, sem Server Actions, Route Handlers ou acesso ao banco.

## Fundação visual e shells — Marco 2

- [x] Página institucional apresenta os dois painéis, fluxo assistivo e limites do produto.
- [x] Rotas `/paciente` e `/enfermagem` existem e são navegáveis a partir da página inicial.
- [x] Shell do paciente é adequado a mobile, tablet e totem; shell da enfermagem prioriza tablet e desktop.
- [x] Tokens CSS-first do Tailwind v4 centralizam cores, forma, sombras e medidas fundamentais.
- [x] Componentes compartilhados mínimos cobrem card, link-botão, badge, vazio, título, status e ícones.
- [x] Server Components são usados sem estado, efeito ou APIs do navegador.
- [x] HTML semântico, foco visível, rótulos textuais e alvos confortáveis estão contemplados.
- [x] Estados vazios não inventam pacientes, indicadores clínicos ou integração.
- [x] Aviso experimental e responsabilidade humana aparecem nos três contextos.
- [x] Não há formulário funcional, persistência, autenticação, motor, hardware ou regra clínica.

## Paciente e dados

- [ ] Paciente inicia, retoma e conclui uma triagem; cancelamento/erro não cria combinação inválida.
- [ ] Consentimento registra versão e instante antes da anamnese.
- [ ] Identificação mínima e informação coerente de plano ficam associadas à triagem.
- [ ] Anamnese persiste queixa, descrição, intensidade, início/duração, alertas, histórico, condições, medicamentos, alergias e complemento.
- [ ] Perguntas são centralizadas/versionáveis e alertas são rastreáveis às respostas.

## Análise e sinais vitais

- [ ] Motor gera recomendação preliminar explicável com versão de regras, sem linguagem diagnóstica.
- [ ] Decisão explícita determina necessidade de sinais vitais.
- [ ] Coleta manual e simulada usam o mesmo `HardwareGateway`; FC e SpO₂ preservam origem, unidade, timestamps e status visíveis.
- [ ] Origem simulada nunca é apresentada como dispositivo físico.
- [ ] O motor recebe apenas medições normalizadas, tecnicamente validadas e aceitas.
- [ ] Falha/indisponibilidade de coleta permite repetição e preserva tentativas.
- [ ] Falha simulada e timeout são exibidos; recuperação ou fallback manual registram nova sessão e mudança de origem.
- [ ] Nova coleta cria sessão nova; tentativa anterior permanece consultável.
- [ ] Nova recomendação pós-medição registra fatores de manutenção/alteração.
- [ ] Recomendações, razões, entradas e medições anteriores nunca são apagadas.
- [ ] Falha do motor é auditada, permite recuperação/revisão humana e não fabrica prioridade.
- [ ] Falha de hardware não apaga triagem nem elimina a revisão humana.

## Conclusão e enfermagem

- [x] Senha operacional única e idempotente é gerada em `AWAITING_NURSE_REVIEW`; conclusão informa revisão pendente sem apresentar prioridade definitiva.
- [x] Nova demonstração cria outra triagem e substitui o cookie sem apagar o fluxo ou a senha anterior.
- [x] Triagem aparece na fila com senha, resumo, idade, queixa, recomendação, status, espera, alerta e pendência.
- [x] Ordenação por prioridade e espera tem regra explícita e desempate determinístico.
- [x] Prioridades/alertas usam texto além de cor e são claros em desktop e tablet.
- [x] Detalhe somente para leitura exibe paciente, anamnese, alertas, medições/origens, análises, razões, regra e linha do tempo sanitizada.
- [x] Profissional confirma recomendação criando classificação humana separada.
- [x] Reclassificação exige e preserva justificativa, recomendação original, ator e instante.
- [x] Nova coleta cria sessão e análise novas sem apagar histórico.
- [x] Encaminhamento exige classificação humana e termina o fluxo principal sem fechar a triagem.

## Segurança, auditoria e robustez

- [x] Fluxos implementados geram auditoria minimizada e append-only; fechamento permanece fora do marco funcional.
- [x] Transições inválidas e alterações concorrentes críticas possuem constraints/transações e respostas seguras.
- [x] Painéis possuem sessões demonstrativas segregadas; logs estruturados aceitam somente campos não sensíveis.
- [ ] Interface nunca apresenta motor como diagnóstico, protocolo validado ou substituto profissional.
- [ ] Estados vazios, carga, erro, retomada e indisponibilidade possuem tratamento explícito.

## Demonstração e operação

- [ ] Cinco cenários em `DEMO_SCENARIOS.md` rodam sem serviço/hardware externo e podem ser resetados.
- [ ] Seeds, capturas e testes usam exclusivamente pessoas fictícias.
- [ ] Fluxos críticos passam por verificação de acessibilidade e viewport desktop/tablet/totem pertinente.
- [ ] Repositório possui instruções atuais para execução e demonstração quando a aplicação existir.
- [ ] Não existem módulos fora da V0 nem alegação de validação clínica, jurídica ou regulatória.

O MVP só é apresentável quando todos os itens obrigatórios acima têm evidência reproduzível e os testes futuros definidos para o Marco 12 passam.
