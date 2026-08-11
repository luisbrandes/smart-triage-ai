import { Icon } from "@/shared/ui/icon";

const steps = ["Identificação", "Anamnese", "Sinais vitais", "Conclusão"] as const;

export function PatientSteps({ currentStep = 0 }: { currentStep?: number }) {
  return (
    <ol aria-label="Etapas da triagem" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, index) => (
        <li aria-current={index === currentStep ? "step" : undefined} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${index === currentStep ? "border-primary/35 bg-secondary/70" : "border-border bg-surface"}`} key={step}>
          <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${index <= currentStep ? "bg-primary text-primary-contrast" : "bg-secondary text-primary"}`}>
            {index < currentStep ? <Icon name="check" size={16} /> : index + 1}
          </span>
          <span className="text-sm font-medium">{step}</span>
        </li>
      ))}
    </ol>
  );
}
