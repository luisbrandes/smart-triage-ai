import { Card } from "@/shared/ui/card";
import { Icon, type IconName } from "@/shared/ui/icon";

type IndicatorValues = { awaitingReview: number; elevatedPriority: number; withVitalSigns: number; oldestWait: string };

export function OperationalIndicators({ values }: { values: IndicatorValues }) {
  const indicators = [
    { label: "Aguardando revisão", value: String(values.awaitingReview), note: "Triagens na fila", icon: "queue" },
    { label: "Recomendação elevada", value: String(values.elevatedPriority), note: "Requer atenção", icon: "alert" },
    { label: "Com sinais vitais", value: String(values.withVitalSigns), note: "FC e SpO₂ coletadas", icon: "pulse" },
    { label: "Maior tempo de espera", value: values.oldestWait, note: "Desde a emissão da senha", icon: "clock" },
  ] as const satisfies ReadonlyArray<{ label: string; value: string; note: string; icon: IconName }>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {indicators.map((indicator) => (
        <Card className="p-4" key={indicator.label}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium leading-5 text-text-secondary">{indicator.label}</p>
              <p className="mt-2 text-2xl font-semibold">{indicator.value}</p>
              <p className="mt-1 text-xs text-text-muted">{indicator.note}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-md bg-secondary text-primary"><Icon name={indicator.icon} size={19} /></span>
          </div>
        </Card>
      ))}
    </div>
  );
}
