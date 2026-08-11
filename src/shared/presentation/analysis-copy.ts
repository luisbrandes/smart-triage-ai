const replacements: ReadonlyArray<readonly [string, string]> = [
  ["Pergunta demonstrativa respondida positivamente:", "Sinal de atenção informado:"],
  ["Intensidade subjetiva elevada informada para fins demonstrativos.", "Intensidade elevada informada pelo paciente."],
  ["Intensidade subjetiva intermediária informada para fins demonstrativos.", "Intensidade intermediária informada pelo paciente."],
  ["Nenhum fator das regras demonstrativas foi acionado pelas respostas informadas.", "Nenhum sinal adicional de atenção foi identificado nas respostas informadas."],
  ["Frequência cardíaca alcançou o marcador técnico fictício do ruleset demonstrativo.", "Frequência cardíaca sinalizada para atenção durante a revisão."],
  ["SpO₂ alcançou o marcador técnico fictício do ruleset demonstrativo.", "Saturação de oxigênio sinalizada para atenção durante a revisão."],
];

export function presentAnalysisReason(reason: string): string {
  return replacements.reduce((copy, [technical, product]) => copy.replace(technical, product), reason);
}
