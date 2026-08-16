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
  { dot: "bg-success", title: "Progredir", text: "Topo da faixa atingido com esforço compatível." },
  { dot: "bg-primary", title: "Acumular reps", text: "Ainda há espaço dentro da faixa." },
  { dot: "bg-warning", title: "Consolidar", text: "Repita a carga e firme a performance." },
  { dot: "bg-danger", title: "Recuperar", text: "Sinais de baixa recuperação: reduza a exigência." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            LM
          </span>
          <span className="text-sm font-semibold tracking-tight">LM Progress</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-4xl px-5 pb-20 pt-10">
        <section className="max-w-2xl">
          <p className="text-sm font-medium text-primary">Progressão de treino, sem achismo</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Você monta o treino. O LM Progress organiza sua progressão.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Registre séries, repetições, RIR e recuperação. Receba recomendações determinísticas e
            explicáveis — exercício por exercício. A decisão final continua sendo sua.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Criar conta grátis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        <section className="mt-14 grid gap-3 sm:grid-cols-2">
          {STATES.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${s.dot}`} />
                <p className="font-semibold">{s.title}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-2xl bg-info-soft p-6">
          <h2 className="text-lg font-semibold">Treino → registro → contexto → desempenho → progressão</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada exercício tem histórico e estado próprios. O check-in de sono, energia, estresse,
            dor e aderência contextualiza o desempenho — sem substituir o que você realmente
            executou.
          </p>
        </section>
      </main>
    </div>
  );
}
