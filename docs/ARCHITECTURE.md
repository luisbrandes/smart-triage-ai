# Arquitetura planejada

## Forma

Monólito modular em Next.js App Router, TypeScript, Prisma e PostgreSQL. É uma unidade de implantação com fronteiras internas; não usar microsserviços, CQRS, event sourcing completo, filas distribuídas ou infraestrutura sem necessidade V0.

## Fundação da aplicação

O Marco 1 usa App Router em `src/app`, com todo código de aplicação sob `src/`, alias `@/*` para `src/*`, React Server Components por padrão e Tailwind CSS v4 com configuração CSS-first/PostCSS. pnpm é o único gerenciador e `next dev --turbopack` é o comando de desenvolvimento.

O Marco 2 adiciona fundação visual por tokens CSS, componentes mínimos em `src/shared/ui`, estruturas compartilhadas em `src/shared/layout` e elementos específicos dos shells em `src/features`. No Marco 8, `/enfermagem` e `/enfermagem/triagens/[triageId]` tornam-se Server Components dinâmicos somente de leitura, sem estado global ou mutações.

## Módulos

| Módulo | Responsabilidade |
|---|---|
| `patient-intake` | triagem, identificação e retomada |
| `consent` | termos versionados e evidência de aceite |
| `anamnesis` | perguntas centralizadas, respostas e alertas |
| `vital-signs` | solicitações, coleções, medições e adaptadores |
| `hardware-integration` | `HardwareGateway`, sessões, normalização e adaptadores manual/simulado/futuro físico |
| `device-management` | catálogo/capacidades mínimos; somente registros fictícios na V0 |
| `triage-analysis` | contrato, regras versionadas, execuções e explicações |
| `nursing-queue` | projeção ordenada e consulta da fila |
| `nurse-review` | confirmação, reclassificação, recolha e encaminhamento |
| `queue-ticket` | geração e unicidade operacional de senha |
| `audit` | eventos append-only e consultas autorizadas |
| `demo-support` | fixtures fictícios, relógio/valores previsíveis e reset seguro |

Dependências cruzam módulos por contratos/casos de uso explícitos, não por acesso casual a tabelas internas.

## Camadas

- **Apresentação:** rotas, componentes e adaptação de entrada/saída; sem regras clínicas.
- **Casos de uso:** autorização, transações, orquestração, máquina de estados e auditoria.
- **Domínio:** entidades, invariantes, políticas e contratos puros.
- **Persistência:** repositórios Prisma e mapeamento PostgreSQL; detalhes não vazam ao domínio.
- **Integrações:** adaptadores manual/simulado e futuras interfaces externas.

Entradas são validadas na fronteira e novamente por invariantes relevantes. Mudança de estado, criação de recomendação/decisão e auditoria usam transação. Datas são armazenadas com instante inequívoco e exibidas no fuso configurado.

## Fronteiras especiais

O motor recebe snapshots/referências versionadas e retorna resultado discriminado; sua V0 determinística é substituível e testável isoladamente. Hardware segue exclusivamente:

```text
Casos de uso
    ↓
HardwareGateway
    ↓
ManualVitalSignsAdapter | SimulatedHardwareAdapter | futuro Esp32HardwareAdapter
```

Adaptadores declaram capacidades e convertem dados brutos em medições normalizadas. A dependência nunca se inverte; UI, domínio e motor não conhecem protocolo/ESP32. Auditoria é append-only, minimizada e criada pelos casos de uso, não pela UI.

## Fila e persistência

PostgreSQL é a fonte autoritativa. A fila usa casos de uso e DTOs explícitos em `src/server/application/nursing`; `PrismaNursingQueueRepository` seleciona somente campos necessários e restringe o estado a `AWAITING_NURSE_REVIEW`. A ordenação server-side é `RED`, `YELLOW`, `GREEN`, com desempate pelo instante mais antigo de emissão da senha. O detalhe e a linha do tempo são projeções sanitizadas e somente para leitura.

```text
src/app e src/features
    ↓
src/server/application (futuro)
    ↓
src/domain
    ↑
src/server/repositories (quando necessários)
    ↑
src/server/db e Prisma
```

Infraestrutura depende dos conceitos do domínio; o domínio nunca depende da infraestrutura. Não existem repositories ou casos de uso no Marco 3 porque ainda não há consumidor real.

## Consolidação do Marco 10

Paciente e enfermagem possuem sessões demonstrativas assinadas e separadas; autorização profissional é uma fronteira server-side usada pelo layout e Server Actions. A conclusão que alcança revisão coordena emissão de senha na mesma transação. O fingerprint pós-medição inclui identidade da sessão/tentativa, mantendo engine pura e workflow no caso de uso/repository. Auditoria continua síncrona e transacional, com proteção append-only no PostgreSQL; eventos internos genéricos foram rejeitados por não reduzirem acoplamento concreto.

## Estratégia de testes futura

Vitest em ambiente Node cobre a máquina de estados pura, incluindo transições inválidas, terminais, cancelamento, recolha e bloqueio de encaminhamento prematuro. Testes futuros de integração cobrirão transações, auditoria e persistência; E2E continua fora deste marco.
