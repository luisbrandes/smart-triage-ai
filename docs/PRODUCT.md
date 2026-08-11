# Produto

## Visão e problema

Smart Triage organiza a coleta inicial e dá à enfermagem uma visão rastreável de dados, alertas e recomendações. Busca reduzir lacunas e retrabalho na passagem entre autoatendimento e revisão profissional, sem automatizar decisão clínica.

## Usuários e painéis

- **Paciente:** pessoa orientada pela recepção a tablet/totem, com linguagem clara, etapas curtas, retomada e conclusão inequívoca.
- **Enfermagem:** profissional autorizado que acompanha fila, consulta evidências, decide a classificação e encaminha ao cuidado.
- **Operação de demonstração:** prepara dados fictícios, reinicia cenários e alterna entre painéis.

## Valor e contrato humano

O sistema centraliza identificação mínima, consentimento, anamnese, alertas e medições; aplica regras demonstrativas previsíveis; explica fatores; gera senha; e preserva a trilha até a decisão humana. A recomendação do motor e a classificação final são registros distintos. Reclassificação exige justificativa; nenhuma saída automática autoriza cuidado, diagnóstico ou prescrição.

## Hipóteses da V0

- Uma unidade operacional e senha única nesse contexto.
- Cadastro manual, sem operadora ou prontuário.
- Três prioridades visuais simplificadas: verde, amarelo e vermelho.
- Frequência cardíaca e SpO₂ manuais ou simuladas quando solicitadas.
- Motor determinístico substituível, ainda sem validação clínica.
- Fila atualizada por polling, revalidação ou ação manual controlada.
- Dados exclusivamente fictícios e cenários reiniciáveis.

## Limites

O produto não substitui recepção, enfermagem ou avaliação médica; não é protocolo oficial; não é autorizado para uso clínico real; não possui certificação regulatória nem conformidade jurídica atestada. Desfecho opcional é apenas registro demonstrativo, não módulo hospitalar.

## Papel do hardware

Hardware é somente uma fonte possível de medições. O `HardwareGateway` converte entradas manuais, simuladas ou futuramente físicas em medições normalizadas e rastreáveis. Dispositivo e adaptador não classificam prioridade, não executam decisão clínica e não enviam payload bruto ao motor. Indisponibilidade deve permitir repetição, fallback manual e revisão humana.
