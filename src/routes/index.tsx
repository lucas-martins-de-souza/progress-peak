import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LM Progress — progressão de treino baseada no seu desempenho" },
      {
        name: "description",
        content:
          "Você monta o treino. O LM Progress organiza sua progressão com recomendações explicáveis por exercício, baseadas no seu histórico real, RIR e recuperação.",
      },
      { property: "og:title", content: "LM Progress — progressão de treino inteligente" },
      {
        property: "og:description",
        content:
          "Registre séries, RIR e recuperação e receba recomendações de progressão individuais por exercício.",
      },
    ],
  }),
  component: Index,
});

const STATES = [
  {
    dot: "bg-success",
    text: "text-success",
    title: "Progredir",
    desc: "Topo da faixa atingido com esforço compatível.",
  },
  {
    dot: "bg-primary",
    text: "text-primary",
    title: "Acumular reps",
    desc: "Ainda há espaço dentro da faixa.",
  },
  {
    dot: "bg-warning",
    text: "text-warning",
    title: "Consolidar",
    desc: "Repita a carga e firme a performance.",
  },
  {
    dot: "bg-danger",
    text: "text-danger",
    title: "Recuperar",
    desc: "Sinais de baixa recuperação: reduza a exigência.",
  },
];

function Index() {
  return (
    <div className="relative min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
        <div className="flex items-center gap-2.5">
          <span className="data flex size-6 items-center justify-center border border-primary/50 bg-info-soft text-[10px] font-bold text-primary">
            LM
          </span>
          <span className="text-[13px] font-semibold uppercase tracking-[0.18em]">LM Progress</span>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-[11px] font-semibold uppercase tracking-[0.14em]"
        >
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="relative z-1 mx-auto max-w-4xl px-5 pb-24 pt-14">
        <section className="max-w-2xl">
          <p className="label-tech text-primary">Progressão de treino, sem achismo</p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Você monta o treino.
            <br />
            <span className="text-muted-foreground">O sistema organiza sua progressão.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
            Registre séries, repetições, RIR e recuperação. Receba recomendações determinísticas e
            explicáveis — exercício por exercício. A decisão final continua sendo sua.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 px-6 text-[12px] font-semibold uppercase tracking-[0.16em]"
            >
              <Link to="/auth">Criar conta grátis</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-6 text-[12px] font-semibold uppercase tracking-[0.16em]"
            >
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="mt-20 border-t border-border">
          <p className="label-tech py-5">Estados de progressão</p>
          <div className="grid divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-y-0">
            {STATES.map((s) => (
              <div key={s.title} className="flex gap-3 py-5 pr-5">
                <span className={`mt-1.5 h-8 w-0.5 shrink-0 ${s.dot}`} />
                <div>
                  <p
                    className={`text-[12px] font-bold uppercase tracking-[0.16em] ${s.text}`}
                  >
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 border-t border-border pt-8">
          <p className="data text-[11px] uppercase tracking-[0.16em] text-primary">
            treino → registro → contexto → desempenho → progressão
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cada exercício tem histórico e estado próprios. O check-in de sono, energia, estresse,
            dor e aderência contextualiza o desempenho — sem substituir o que você realmente
            executou.
          </p>
        </section>
      </main>
    </div>
  );
}
