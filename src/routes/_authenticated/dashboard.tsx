import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { countSessions, fetchLastSession, fetchProfile, fetchWorkouts } from "@/lib/db";
import { readinessLabel, readinessScore } from "@/lib/progression";
import { todayWeekday, workoutsForDay } from "@/lib/weekdays";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Início — LM Progress" },
      {
        name: "description",
        content: "Seu painel de progressão: próximo treino, prontidão e histórico de sessões.",
      },
      { property: "og:title", content: "Início — LM Progress" },
      { property: "og:description", content: "Próximo treino, prontidão e histórico de sessões." },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Dashboard() {
  const { userId } = useAuth();
  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: fetchWorkouts });
  const sessions = useQuery({ queryKey: ["sessions-count"], queryFn: countSessions });
  const last = useQuery({ queryKey: ["last-session"], queryFn: fetchLastSession });

  const nextWorkout = workoutsForDay(workouts.data ?? [], todayWeekday())[0];
  const readiness = last.data ? readinessScore(last.data) : null;

  return (
    <div className="animate-rise space-y-10">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight">
          {profile.data?.name?.trim() || "Atleta"}
        </h1>
        <p className="label-tech">{greeting()}</p>
      </div>

      <section className="relative border-l-2 border-primary pl-5">
        <p className="label-tech text-primary">Treino de hoje</p>
        <h2 className="mt-2 text-4xl font-bold leading-none tracking-tight">
          {nextWorkout?.name ?? "Nenhum treino programado"}
        </h2>
        <p className="data mt-3 text-sm text-muted-foreground">
          {nextWorkout
            ? `${nextWorkout.workout_exercises.length} exercícios`
            : "Você não possui treino programado para hoje."}
        </p>
        <div className="mt-6">
          {nextWorkout ? (
            <Button
              asChild
              className="h-12 w-full text-[12px] font-semibold uppercase tracking-[0.18em]"
            >
              <Link to="/hoje">
                Começar treino <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="h-12 w-full text-[12px] font-semibold uppercase tracking-[0.18em]"
            >
              <Link to="/treinos">Criar treino</Link>
            </Button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 divide-x divide-border border-y border-border">
        <Metric
          label="Prontidão"
          value={readiness ? readinessLabel(readiness) : "—"}
          hint="Último check-in"
        />
        <Metric
          label="Sessões"
          value={String(sessions.data ?? 0)}
          hint="Treinos finalizados"
          className="pl-5"
        />
      </section>

      <section>
        <p className="label-tech">Progressão</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Cada exercício progride no próprio ritmo. Abra o relatório para ver estado atual,
          histórico de cargas e repetições exercício por exercício.
        </p>
        <Link
          to="/progressao"
          className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary transition-opacity hover:opacity-70"
        >
          Ver relatório <ArrowRight className="size-3.5" />
        </Link>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  className = "",
}: {
  label: string;
  value: string;
  hint: string;
  className?: string;
}) {
  return (
    <div className={`py-5 pr-5 ${className}`}>
      <p className="label-tech">{label}</p>
      <p className="data mt-2 text-2xl font-bold leading-none">{value}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
