import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  completeSession,
  fetchExerciseHistory,
  fetchSessionSummary,
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
    return <FinishedCard sessionId={sessionId!} workoutName={workout?.name ?? "Treino"} />;
  }

  if (!sessionId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Check-in</h1>
          <p className="text-sm text-muted-foreground">
            O check-in contextualiza seu desempenho. Não decide sozinho sua progressão.
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

      <div className="sticky bottom-20 pt-1">
        <Button className="h-12 w-full rounded-xl text-base shadow-card" onClick={finish}>
          Finalizar treino
        </Button>
      </div>
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
            className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition-colors ${
              value === n
                ? "border-primary bg-primary text-primary-foreground shadow-card"
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

function FinishedCard({ sessionId, workoutName }: { sessionId: string; workoutName: string }) {
  const summary = useQuery({
    queryKey: ["session-summary", sessionId],
    queryFn: () => fetchSessionSummary(sessionId),
  });

  return (
    <div className="space-y-5 rounded-3xl border border-border bg-card p-7 text-center shadow-card">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft">
        <CheckCircle2 className="size-7 text-success" />
      </span>
      <div>
        <h1 className="text-xl font-semibold">Treino concluído</h1>
        <p className="text-sm text-muted-foreground">{workoutName}</p>
      </div>
      {summary.data && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <SummaryStat label="Exercícios" value={String(summary.data.exercises)} />
          <SummaryStat label="Séries" value={String(summary.data.sets)} />
          <SummaryStat label="Volume" value={`${summary.data.volume} kg`} />
        </div>
      )}
      <Button asChild className="w-full">
        <Link to="/progressao">Ver relatório de progressão</Link>
      </Button>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <p className="text-base font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
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
  const [details, setDetails] = useState(false);
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
  const step = Number(exercise.suggested_increment) || 2.5;
  const edited = load !== null && load !== rec.suggestedLoad;

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

  const nudge = (delta: number) =>
    setLoad((prev) => Math.max(0, Math.round(((prev ?? actualLoad) + delta) * 100) / 100));

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{exercise.exercise_name}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {exercise.sets} × {exercise.min_reps}–{exercise.max_reps} · RIR alvo{" "}
            {exercise.target_rir}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
        >
          <span className={`size-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-foreground">{rec.message}</p>
      {rec.establishingBaseline && (
        <p className="mt-1 text-xs text-muted-foreground">Estabelecendo referência.</p>
      )}

      <button
        type="button"
        onClick={() => setDetails((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary"
      >
        Por que essa recomendação?
        <ChevronDown className={`size-3.5 transition-transform ${details ? "rotate-180" : ""}`} />
      </button>
      {details && (
        <p className="mt-2 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
          {rec.rationale}
          {rec.trendWarning && (
            <span className="mt-2 block rounded-lg bg-warning-soft p-2 text-warning-foreground">
              {rec.trendWarning}
            </span>
          )}
        </p>
      )}

      <div className="mt-4 rounded-2xl bg-secondary/60 p-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            Carga utilizada · sugestão {rec.suggestedLoad} kg
          </Label>
          {edited && <span className="text-[11px] font-medium text-primary">ajustada por você</span>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-xl"
            onClick={() => nudge(-step)}
            aria-label="Diminuir carga"
          >
            <Minus className="size-4" />
          </Button>
          <Input
            type="number"
            inputMode="decimal"
            step={0.5}
            className="h-10 text-center text-base font-semibold"
            value={load ?? ""}
            onChange={(e) => setLoad(e.target.value === "" ? null : Number(e.target.value))}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0 rounded-xl"
            onClick={() => nudge(step)}
            aria-label="Aumentar carga"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span className="w-14">Série</span>
          <span className="flex-1 text-center">Reps</span>
          <span className="flex-1 text-center">RIR</span>
        </div>
        {sets.map((s, i) => (
          <div key={s.set_number} className="flex items-center gap-2">
            <span className="w-14 text-sm font-medium text-muted-foreground">{s.set_number}ª</span>
            <Input
              type="number"
              inputMode="numeric"
              className="h-10 flex-1 text-center"
              placeholder="—"
              value={s.reps ?? ""}
              onChange={(e) => updateSet(i, "reps", e.target.value)}
            />
            <Input
              type="number"
              inputMode="numeric"
              className="h-10 flex-1 text-center"
              placeholder="—"
              value={s.rir ?? ""}
              onChange={(e) => updateSet(i, "rir", e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
