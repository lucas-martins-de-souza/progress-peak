import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  completeSession,
  fetchExerciseHistory,
  fetchWorkouts,
  saveExercisePerformance,
  startSession,
} from "@/lib/db";
import { readinessLabel, readinessScore, recommend } from "@/lib/progression";
import { DECISION_META, type CheckIn, type WorkoutExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/hoje")({
  head: () => ({
    meta: [
      { title: "Treino de hoje — LM Progress" },
      {
        name: "description",
        content:
          "Check-in de recuperação, recomendação de progressão por exercício e registro de séries e RIR.",
      },
      { property: "og:title", content: "Treino de hoje — LM Progress" },
      { property: "og:description", content: "Check-in, execução e registro do seu treino." },
    ],
  }),
  component: HojePage,
});

const DEFAULT_CHECKIN: CheckIn = {
  sleep_score: 3,
  energy_score: 3,
  stress_score: 3,
  disposition_score: 3,
  pain_score: 0,
  adherence_score: 3,
  note: "",
};

function HojePage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: fetchWorkouts });
  const [workoutId, setWorkoutId] = useState<string>("");
  const [checkIn, setCheckIn] = useState<CheckIn>(DEFAULT_CHECKIN);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!workoutId && workouts.data?.[0]) setWorkoutId(workouts.data[0].id);
  }, [workouts.data, workoutId]);

  const workout = workouts.data?.find((w) => w.id === workoutId);
  const readiness = readinessScore(checkIn);

  async function begin() {
    if (!userId || !workout) return;
    try {
      const s = await startSession(userId, workout.id, checkIn);
      setSessionId(s.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar treino.");
    }
  }

  async function finish() {
    if (!sessionId) return;
    await completeSession(sessionId);
    await queryClient.invalidateQueries();
    setFinished(true);
  }

  if (workouts.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  if (!workouts.data?.length) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Treino de hoje</h1>
        <p className="text-sm text-muted-foreground">
          Você precisa montar um treino antes de iniciar uma sessão.
        </p>
        <Button asChild>
          <Link to="/treinos">Montar treino</Link>
        </Button>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <h1 className="text-xl font-semibold">Treino finalizado</h1>
        <p className="text-sm text-muted-foreground">
          Seu desempenho foi registrado. As próximas recomendações já consideram esta sessão.
        </p>
        <Button asChild className="w-full">
          <Link to="/progressao">Ver progressão</Link>
        </Button>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check-in</h1>
          <p className="text-sm text-muted-foreground">
            Contextualiza seu desempenho. Não decide sozinho sua progressão.
          </p>
        </div>

        <div className="space-y-1.5 rounded-2xl border border-border bg-card p-5 shadow-card">
          <Label>Treino</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={workoutId}
            onChange={(e) => setWorkoutId(e.target.value)}
          >
            {workouts.data.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-card">
          <Scale label="Sono" value={checkIn.sleep_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, sleep_score: v })} />
          <Scale label="Energia" value={checkIn.energy_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, energy_score: v })} />
          <Scale label="Estresse" value={checkIn.stress_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, stress_score: v })} />
          <Scale label="Disposição para treinar" value={checkIn.disposition_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, disposition_score: v })} />
          <Scale label="Dor / desconforto" value={checkIn.pain_score} min={0} onChange={(v) => setCheckIn({ ...checkIn, pain_score: v })} />
          <Scale label="Aderência da semana anterior" value={checkIn.adherence_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, adherence_score: v })} />
          <div className="space-y-1.5">
            <Label>Como você está se sentindo hoje? (opcional)</Label>
            <Textarea
              value={checkIn.note ?? ""}
              onChange={(e) => setCheckIn({ ...checkIn, note: e.target.value })}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Prontidão estimada: <span className="font-medium text-foreground">{readinessLabel(readiness)}</span>
          </p>
          <Button className="w-full" onClick={begin}>
            Iniciar treino
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{workout?.name}</h1>
        <p className="text-sm text-muted-foreground">
          Prontidão: {readinessLabel(readiness)} · salvamento automático ativo
        </p>
      </div>

      {workout?.workout_exercises.map((ex) => (
        <ExerciseCard key={ex.id} exercise={ex} checkIn={checkIn} sessionId={sessionId} userId={userId!} />
      ))}

      <Button className="w-full" onClick={finish}>
        Finalizar treino
      </Button>
    </div>
  );
}

function Scale({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  const options = [];
  for (let i = min; i <= 5; i++) options.push(i);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 flex-1 rounded-lg border text-sm font-medium transition-colors ${
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-secondary"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  checkIn,
  sessionId,
  userId,
}: {
  exercise: WorkoutExercise;
  checkIn: CheckIn;
  sessionId: string;
  userId: string;
}) {
  const history = useQuery({
    queryKey: ["history", exercise.id],
    queryFn: () => fetchExerciseHistory(exercise.id),
  });

  const rec = useMemo(
    () => recommend(exercise, history.data ?? [], checkIn),
    [exercise, history.data, checkIn],
  );

  const [load, setLoad] = useState<number | null>(null);
  const [sets, setSets] = useState(
    Array.from({ length: exercise.sets }, (_, i) => ({
      set_number: i + 1,
      reps: null as number | null,
      rir: null as number | null,
    })),
  );

  useEffect(() => {
    if (load === null && history.data) setLoad(rec.suggestedLoad);
  }, [history.data, rec.suggestedLoad, load]);

  const actualLoad = load ?? Number(exercise.current_load);
  const meta = DECISION_META[rec.decision];

  useEffect(() => {
    if (!history.data) return;
    const t = setTimeout(() => {
      void saveExercisePerformance({
        userId,
        sessionId,
        exercise,
        suggestedLoad: rec.suggestedLoad,
        actualLoad,
        decision: rec.decision,
        rationale: rec.rationale,
        sets,
      }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sets, actualLoad, history.data]);

  function updateSet(index: number, key: "reps" | "rir", value: string) {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value === "" ? null : Number(value) } : s)),
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Exercício {exercise.position}</p>
          <h2 className="text-lg font-semibold">{exercise.exercise_name}</h2>
          <p className="text-sm text-muted-foreground">
            Última carga: {Number(exercise.current_load)} kg · {exercise.sets} × {exercise.min_reps}–
            {exercise.max_reps} · RIR alvo {exercise.target_rir}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}>
          {meta.label}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
        {rec.rationale}
        {rec.trendWarning && (
          <p className="mt-2 rounded-lg bg-warning-soft p-2 text-warning-foreground">
            {rec.trendWarning}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        <Label className="text-xs">
          Sugestão do sistema: {rec.suggestedLoad} kg — você decide a carga usada
        </Label>
        <Input
          type="number"
          step={0.5}
          value={load ?? ""}
          onChange={(e) => setLoad(e.target.value === "" ? null : Number(e.target.value))}
        />
      </div>

      <div className="mt-4 space-y-2">
        {sets.map((s, i) => (
          <div key={s.set_number} className="flex items-center gap-2">
            <span className="w-14 text-xs text-muted-foreground">Série {s.set_number}</span>
            <Input
              type="number"
              placeholder="reps"
              value={s.reps ?? ""}
              onChange={(e) => updateSet(i, "reps", e.target.value)}
            />
            <Input
              type="number"
              placeholder="RIR"
              value={s.rir ?? ""}
              onChange={(e) => updateSet(i, "rir", e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}