import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Dumbbell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { countSessions, fetchLastSession, fetchProfile, fetchWorkouts } from "@/lib/db";
import { readinessLabel, readinessScore } from "@/lib/progression";
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

  const nextWorkout = workouts.data?.[0];
  const readiness = last.data ? readinessScore(last.data) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {profile.data?.name?.trim() || "atleta"}
        </h1>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Próximo treino
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Dumbbell className="size-5 text-primary" />
          <p className="text-lg font-semibold">{nextWorkout?.name ?? "Nenhum treino criado"}</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {nextWorkout
            ? `${nextWorkout.workout_exercises.length} exercícios`
            : "Monte seu primeiro treino para começar."}
        </p>
        <div className="mt-4">
          {nextWorkout ? (
            <Button asChild className="w-full">
              <Link to="/hoje">
                Começar treino <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link to="/treinos">Criar treino</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs text-muted-foreground">Prontidão</p>
          <p className="mt-1 text-xl font-semibold">
            {readiness ? readinessLabel(readiness) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Baseada no último check-in</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <p className="text-xs text-muted-foreground">Treinos registrados</p>
          <p className="mt-1 text-xl font-semibold">{sessions.data ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">Sessões finalizadas</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-info-soft p-5">
        <p className="text-sm font-medium text-primary">Resumo da progressão</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada exercício progride no próprio ritmo. Abra a aba Progressão para ver o estado atual,
          histórico de cargas e repetições exercício por exercício.
        </p>
        <Link to="/progressao" className="mt-3 inline-flex text-sm font-medium text-primary">
          Ver progressão →
        </Link>
      </div>
    </div>
  );
}