export const publicNavigation = {
  home: { label: "Início", href: "/" },
  patient: { label: "Painel do Paciente", href: "/acesso-paciente" },
  nursing: { label: "Painel da Enfermagem", href: "/acesso-enfermagem" },
} as const;

export const nursingNavigation = [
  { label: "Fila de triagem", href: "/enfermagem", icon: "queue" },
  { label: "Atendimento", href: "/enfermagem/atendimento", icon: "referral" },
] as const;
