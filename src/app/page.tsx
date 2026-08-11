import { AppHeader } from "@/shared/layout/app-header";
import { PageContainer } from "@/shared/layout/page-container";
import { publicNavigation } from "@/shared/config/navigation";
import { Badge } from "@/shared/ui/badge";
import { ButtonLink } from "@/shared/ui/button-link";
import { Card } from "@/shared/ui/card";
import { Icon, type IconName } from "@/shared/ui/icon";
import { SectionHeading } from "@/shared/ui/section-heading";

const panelDetails = [
  { title: "Painel do Paciente", description: "Uma jornada clara para a coleta inicial, pensada para tablet e totem.", icon: "patient", href: publicNavigation.patient.href, items: ["Identificação", "Anamnese", "Sinais vitais", "Conclusão da triagem"] },
  { title: "Painel da Enfermagem", description: "Uma visão operacional para revisão profissional e encaminhamento.", icon: "nursing", href: publicNavigation.nursing.href, items: ["Fila de triagens", "Análise dos dados", "Validação humana", "Encaminhamento"] },
] as const satisfies ReadonlyArray<{ title: string; description: string; icon: IconName; href: string; items: readonly string[] }>;

const flow = [
  { label: "Paciente", icon: "patient" },
  { label: "Coleta de informações", icon: "clipboard" },
  { label: "Recomendação assistiva", icon: "sparkle" },
  { label: "Revisão da enfermagem", icon: "nursing" },
] as const satisfies ReadonlyArray<{ label: string; icon: IconName }>;

const outcomes = [
  { title: "Coleta guiada", description: "Uma jornada simples para registrar informações essenciais sem sobrecarregar o paciente.", icon: "clipboard" },
  { title: "Sinais integrados", description: "Experiência preparada para receber dados de dispositivos e manter uma alternativa manual.", icon: "pulse" },
  { title: "Decisão humana", description: "A enfermagem recebe contexto organizado e continua responsável pela classificação final.", icon: "shield" },
] as const satisfies ReadonlyArray<{ title: string; description: string; icon: IconName }>;

export default function Home() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main>
        <PageContainer className="py-14 sm:py-24">
          <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]" aria-labelledby="hero-title">
            <div>
              <Badge variant="info">A jornada de triagem, conectada do início à decisão</Badge>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl" id="hero-title">Mais clareza para o paciente. Mais contexto para a enfermagem.</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-text-secondary">O Smart Triage transforma a coleta inicial em uma experiência guiada, organiza sinais vitais e entrega à enfermagem uma visão objetiva para apoiar decisões mais ágeis.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={publicNavigation.patient.href} size="large">Explorar jornada do paciente<Icon name="arrowRight" size={18} /></ButtonLink>
                <ButtonLink href={publicNavigation.nursing.href} size="large" variant="secondary">Acessar operação da enfermagem</ButtonLink>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-text-muted"><Icon name="privacy" size={16} />Acesso reservado ao time autorizado do projeto.</p>
            </div>
            <aside className="overflow-hidden rounded-xl border border-primary/15 bg-slate-900 text-white shadow-raised" aria-label="Visão da jornada Smart Triage">
              <div className="border-b border-white/10 p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Jornada em tempo real</p><h2 className="mt-2 text-xl font-semibold">Da informação à revisão profissional</h2></div>
              <ol className="space-y-1 p-4">
                {flow.map((item, index) => <li className="flex items-center gap-4 rounded-lg bg-white/[0.06] p-4" key={item.label}><span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><Icon name={item.icon} size={19} /></span><div className="min-w-0 flex-1"><span className="text-xs text-slate-400">Etapa {index + 1}</span><p className="font-medium">{item.label}</p></div>{index < flow.length - 1 ? <span className="size-2 rounded-full bg-emerald-400" /> : <Icon className="text-emerald-300" name="check" size={18} />}</li>)}
              </ol>
              <div className="flex items-center gap-2 border-t border-white/10 px-5 py-4 text-sm text-slate-300"><Icon className="text-emerald-300" name="shield" size={18} />Tecnologia assistiva com decisão humana</div>
            </aside>
          </section>
        </PageContainer>

        <section className="border-y border-border bg-surface py-14 sm:py-18" aria-labelledby="panels-title">
          <PageContainer>
            <SectionHeading eyebrow="Dois contextos, uma jornada" title="Uma experiência adequada para cada momento" description="O paciente informa o essencial; a enfermagem recebe uma visão organizada para revisão e encaminhamento." />
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {panelDetails.map((panel) => (
                <Card className="flex h-full flex-col p-6 sm:p-7" elevated key={panel.title}>
                  <span className="grid size-11 place-items-center rounded-md bg-secondary text-primary"><Icon name={panel.icon} size={23} /></span>
                  <h3 className="mt-5 text-xl font-semibold">{panel.title}</h3>
                  <p className="mt-2 leading-7 text-text-secondary">{panel.description}</p>
                  <ul className="my-6 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                    {panel.items.map((item) => <li className="flex items-center gap-2" key={item}><Icon className="text-success" name="check" size={16} />{item}</li>)}
                  </ul>
                  <ButtonLink className="mt-auto self-start" href={panel.href} variant="ghost">Acessar painel<Icon name="arrowRight" size={17} /></ButtonLink>
                </Card>
              ))}
            </div>
          </PageContainer>
        </section>

        <PageContainer className="py-14 sm:py-18">
          <SectionHeading eyebrow="Projetado para o cuidado" title="Menos fricção em cada etapa da triagem" description="Uma experiência única conecta quem informa, quem coleta e quem decide." />
          <div className="mt-8 grid gap-4 md:grid-cols-3">{outcomes.map((outcome) => <article className="rounded-lg border border-border bg-surface p-5 shadow-soft" key={outcome.title}><span className="grid size-10 place-items-center rounded-md bg-secondary text-primary"><Icon name={outcome.icon} size={21} /></span><h3 className="mt-4 font-semibold">{outcome.title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{outcome.description}</p></article>)}</div>
        </PageContainer>

        <PageContainer className="py-14 sm:py-18">
          <SectionHeading eyebrow="Jornada integrada" title="Uma passagem clara até a decisão humana" description="Informações estruturadas ajudam a equipe a identificar prioridades sem substituir a avaliação profissional." />
          <ol className="mt-8 grid gap-3 md:grid-cols-4">
            {flow.map((item, index) => (
              <li className="relative flex min-h-28 items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-soft" key={item.label}>
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Icon name={item.icon} size={21} /></span>
                <div><span className="text-xs font-semibold text-text-muted">0{index + 1}</span><p className="mt-1 text-sm font-semibold">{item.label}</p></div>
              </li>
            ))}
          </ol>

          <aside className="mt-10 flex flex-col gap-4 rounded-lg border border-primary/15 bg-secondary/60 p-5 text-sm leading-6 text-text-secondary sm:flex-row sm:items-start">
            <Icon className="mt-0.5 shrink-0 text-primary" name="shield" size={21} />
            <p><strong className="text-foreground">Tecnologia como apoio, pessoas no centro.</strong> O Smart Triage não realiza diagnóstico e não substitui profissionais de saúde habilitados.</p>
          </aside>
        </PageContainer>
      </main>
      <footer className="border-t border-border bg-surface py-6"><PageContainer className="flex flex-col gap-2 text-xs text-text-muted sm:flex-row sm:justify-between"><span>Smart Triage</span><span>Apoio à triagem com validação humana</span></PageContainer></footer>
    </div>
  );
}
