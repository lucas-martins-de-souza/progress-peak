import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { readinessLabel, readinessScore, recommend, sessionTarget } from "@/lib/progression";
import { todayWeekday, workoutsForDay } from "@/lib/weekdays";
import { loadContext } from "@/lib/reference";
import { DECISION_META, type CheckIn, type WorkoutExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const selectClass =
  "h-11 w-full rounded-sm border border-border bg-transparent px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none";

function HojePage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: fetchWorkouts });
  const [workoutId, setWorkoutId] = useState<string>("");
  const [checkIn, setCheckIn] = useState<CheckIn>(DEFAULT_CHECKIN);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  // A seleção do treino do dia usa APENAS a programação por dia da semana.
  const scheduled = useMemo(
    () => workoutsForDay(workouts.data ?? [], todayWeekday()),
    [workouts.data],
  );

  useEffect(() => {
    if (scheduled.length > 0 && !scheduled.some((w) => w.id === workoutId)) {
      setWorkoutId(scheduled[0]!.id);
    }
  }, [scheduled, workoutId]);

  const workout = scheduled.find((w) => w.id === workoutId);
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

  if (workouts.isLoading) return <p className="label-tech">Carregando…</p>;

  if (!workouts.data?.length) {
    return (
      <div className="animate-rise space-y-5">
        <h1 className="text-3xl font-bold tracking-tight">Treino de hoje</h1>
        <p className="text-sm text-muted-foreground">
          Você precisa montar um treino antes de iniciar uma sessão.
        </p>
        <Button asChild className="h-12 text-[12px] font-semibold uppercase tracking-[0.18em]">
          <Link to="/treinos">Montar treino</Link>
        </Button>
      </div>
    );
  }

  if (finished) {
    return <FinishedCard sessionId={sessionId!} workoutName={workout?.name ?? "Treino"} />;
  }

  if (!sessionId && scheduled.length === 0) {
    return (
      <div className="animate-rise space-y-5">
        <p className="label-tech text-primary">Treino de hoje</p>
        <h1 className="text-3xl font-bold tracking-tight">Nenhum treino programado</h1>
        <p className="text-sm text-muted-foreground">
          Você não possui treino programado para hoje. Defina os dias da semana de cada treino em
          Meus treinos.
        </p>
        <Button
          asChild
          variant="outline"
          className="h-12 text-[12px] font-semibold uppercase tracking-[0.18em]"
        >
          <Link to="/treinos">Programar dias</Link>
        </Button>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="animate-rise space-y-8">
        <div>
          <p className="label-tech text-primary">Check-in</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
            Como você chega para treinar hoje?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            O check-in contextualiza seu desempenho. Não decide sozinho sua progressão.
          </p>
        </div>

        <div className="space-y-2 border-t border-border pt-5">
          <p className="label-tech">Treino de hoje</p>
          {scheduled.length > 1 ? (
            <select
              className={selectClass}
              value={workoutId}
              onChange={(e) => setWorkoutId(e.target.value)}
            >
              {scheduled.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-lg font-semibold">{workout?.name}</p>
          )}
        </div>


        <div className="space-y-6">
          <Scale label="Sono" value={checkIn.sleep_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, sleep_score: v })} />
          <Scale label="Energia" value={checkIn.energy_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, energy_score: v })} />
          <Scale label="Estresse" value={checkIn.stress_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, stress_score: v })} />
          <Scale label="Disposição para treinar" value={checkIn.disposition_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, disposition_score: v })} />
          <Scale label="Dor / desconforto" value={checkIn.pain_score} min={0} tone="danger" onChange={(v) => setCheckIn({ ...checkIn, pain_score: v })} />
          <Scale label="Aderência da semana anterior" value={checkIn.adherence_score} min={1} onChange={(v) => setCheckIn({ ...checkIn, adherence_score: v })} />

          <div className="space-y-2">
            <p className="label-tech">Como você está se sentindo hoje? (opcional)</p>
            <Textarea
              className="min-h-20 rounded-sm border-border bg-transparent text-sm focus-visible:border-primary"
              value={checkIn.note ?? ""}
              onChange={(e) => setCheckIn({ ...checkIn, note: e.target.value })}
            />
          </div>
        </div>

        <div className="sticky bottom-20 space-y-3 border-t border-border bg-background/90 pt-4 backdrop-blur-xl">
          <div className="flex items-baseline justify-between">
            <p className="label-tech">Prontidão estimada</p>
            <p className="data text-base font-bold">{readinessLabel(readiness)}</p>
          </div>
          <Button
            className="h-12 w-full text-[12px] font-semibold uppercase tracking-[0.18em]"
            onClick={begin}
          >
            Iniciar treino
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-8">
      <div className="panel-raised relative overflow-hidden px-5 py-5 sm:px-6">
        <span className="absolute inset-y-0 left-0 w-px bg-primary" />
        <p className="label-tech text-primary">Sessão em andamento</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">{workout?.name}</h1>
        <p className="data mt-1.5 text-[11px] text-muted-foreground">
          Prontidão {readinessLabel(readiness)} · salvamento automático
        </p>
      </div>


      <div className="space-y-6">
        {workout?.workout_exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} checkIn={checkIn} sessionId={sessionId} userId={userId!} />
        ))}
      </div>

      <div className="sticky bottom-20 pt-1">
        <Button
          className="h-12 w-full text-[12px] font-semibold uppercase tracking-[0.18em] shadow-card"
          onClick={finish}
        >
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
  tone = "primary",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  tone?: "primary" | "danger";
  onChange: (v: number) => void;
}) {
  const options = [];
  for (let i = min; i <= 5; i++) options.push(i);
  // Dor só ganha destaque de alerta a partir de 3; 0-2 seguem o azul LM.
  const active =
    tone === "danger" && value >= 3
      ? "border-danger text-danger bg-danger-soft"
      : "border-primary text-primary bg-info-soft";
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between">
        <p className="label-tech">{label}</p>
        <span className="data text-sm font-bold">{value}</span>
      </div>
      <div className="flex gap-1.5">
        {options.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`data h-11 flex-1 rounded-sm border text-sm font-semibold transition-all duration-200 ${
              value === n
                ? active
                : "border-border text-muted-foreground hover:border-input hover:text-foreground"
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
    <div className="animate-rise space-y-8 pt-6 text-center">
      <span className="relative mx-auto flex size-14 items-center justify-center rounded-full border border-success/40 bg-success-soft text-success">
        <CheckCircle2 className="size-6" />
        <span className="pulse-ring absolute inset-0 rounded-full" />
      </span>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treino concluído</h1>
        <p className="label-tech mt-2">{workoutName}</p>
      </div>
      {summary.data && (
        <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
          <SummaryStat label="Exercícios" value={String(summary.data.exercises)} />
          <SummaryStat label="Séries" value={String(summary.data.sets)} />
          <SummaryStat label="Volume" value={`${summary.data.volume} kg`} />
        </div>
      )}
      <Button asChild className="h-12 w-full text-[12px] font-semibold uppercase tracking-[0.18em]">
        <Link to="/progressao">Ver relatório de progressão</Link>
      </Button>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-5">
      <p className="data text-xl font-bold leading-none">{value}</p>
      <p className="label-tech mt-2">{label}</p>
    </div>
  );
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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

  const hist = useMemo(() => history.data ?? [], [history.data]);
  // Referência validada + PR: camada de contexto, independente do motor.
  const baseCtx = useMemo(
    () => loadContext(exercise, hist, Number(exercise.current_load)),
    [exercise, hist],
  );
  // Se a carga registrada está muito abaixo da referência, o motor avalia a referência.
  const engineExercise = useMemo(
    () =>
      baseCtx.belowReference && baseCtx.referenceLoad != null
        ? { ...exercise, current_load: baseCtx.referenceLoad }
        : exercise,
    [exercise, baseCtx],
  );

  const rec = useMemo(
    () => recommend(engineExercise, hist, checkIn),
    [engineExercise, hist, checkIn],
  );

  const lastSession = history.data?.[0] ?? null;

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
  const ctx = useMemo(
    () => loadContext(exercise, hist, actualLoad),
    [exercise, hist, actualLoad],
  );
  const target = useMemo(
    () => sessionTarget(exercise, lastSession, rec.decision, actualLoad, ctx.referenceLoad),
    [exercise, lastSession, rec.decision, actualLoad, ctx.referenceLoad],
  );
  const newLoad =
    !ctx.belowReference && lastSession != null && actualLoad > Number(lastSession.actual_load ?? 0)
      ? actualLoad
      : null;
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
    <article className="panel-raised relative overflow-hidden">
      {/* 1. EXERCÍCIO */}
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            {exercise.exercise_name}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Chip>{exercise.sets} séries</Chip>
            <Chip>
              {exercise.min_reps}–{exercise.max_reps} reps
            </Chip>
            <Chip>RIR {exercise.target_rir}</Chip>
          </div>
        </div>
        <span className={`mt-1.5 flex size-2 shrink-0 rounded-full ${meta.dot} ${meta.text}`}>
          <span className="pulse-ring absolute size-2 rounded-full" />
        </span>
      </header>

      <div className="grid gap-px border-b border-border bg-border md:grid-cols-2">
        {/* 2. STATUS */}
        <div className={`relative bg-surface px-5 py-5 sm:px-6 ${meta.text}`}>
          <div className={`absolute inset-0 ${meta.bg}`} />
          <div className="relative">
            <p className="label-tech">Status de progressão</p>
            <p className={`mt-2 text-[17px] font-bold uppercase tracking-[0.14em] ${meta.text}`}>
              {meta.label}
            </p>
            <p className="mt-2 text-sm leading-snug text-foreground">{rec.message}</p>
            {rec.establishingBaseline && (
              <p className="mt-1 text-xs text-muted-foreground">Estabelecendo referência.</p>
            )}
            <button
              type="button"
              onClick={() => setDetails((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Por que essa recomendação?
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${details ? "rotate-180" : ""}`}
              />
            </button>
            {details && (
              <div className="animate-rise mt-2 border-l border-border pl-3 text-xs leading-relaxed text-muted-foreground">
                {rec.rationale}
                {rec.trendWarning && (
                  <span className="mt-2 block text-warning">{rec.trendWarning}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. META DE HOJE */}
        {target.reps ? (
          <div
            className={`tech-rings relative overflow-hidden bg-surface px-5 py-6 text-center sm:px-6 ${meta.text}`}
          >
            <div className={`absolute inset-0 ${meta.bg}`} />
            <div className="relative">
              <p className="label-tech text-center">Meta de hoje</p>
              <p
                className={`data mt-3 text-5xl font-bold leading-none tracking-tight sm:text-[3.4rem] ${meta.text}`}
                style={{ textShadow: "0 0 28px currentColor" }}
              >
                {target.reps.join(" / ")}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                Faixa: {exercise.min_reps} – {exercise.max_reps} reps
              </p>
              {target.message && (
                <p className="mt-2 text-xs font-medium text-foreground">{target.message}</p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Referência, não obrigação — registre o resultado real.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-surface px-5 py-6 text-center sm:px-6">
            <p className="label-tech">Meta de hoje</p>
            <p className="data mt-3 text-4xl font-bold leading-none text-muted-foreground">—</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Faixa: {exercise.min_reps} – {exercise.max_reps} reps
            </p>
          </div>
        )}
      </div>

      {newLoad != null && (
        <div className="neon-halo relative flex items-baseline justify-between border-b border-border bg-success-soft px-5 py-3.5 text-success sm:px-6">
          <p className="label-tech text-success">Nova carga sugerida</p>
          <p className="data text-xl font-bold leading-none text-success">{newLoad} kg</p>
        </div>
      )}

      {/* 4. ÚLTIMA SESSÃO / REFERÊNCIA / PR */}
      <div className="grid gap-px border-b border-border bg-border sm:grid-cols-3">
        {lastSession ? (
          <Stat
            label={`Última sessão · ${formatDay(lastSession.created_at)}`}
            value={lastSession.sets.map((s) => s.reps ?? "—").join(" / ")}
            hint={`${Number(lastSession.actual_load ?? 0)} kg`}
          />
        ) : (
          <Stat
            label="Primeira sessão registrada"
            value="—"
            hint="Vamos estabelecer sua referência."
          />
        )}
        <Stat
          label="Carga de referência"
          value={ctx.referenceLoad != null ? `${ctx.referenceLoad} kg` : "—"}
        />
        <Stat
          label="PR"
          value={
            ctx.personalRecord != null
              ? `${ctx.personalRecord.load} kg × ${ctx.personalRecord.reps}`
              : "—"
          }
        />
      </div>

      {ctx.belowReference && ctx.referenceLoad != null && (
        <div className="border-b border-border bg-warning-soft px-5 py-4 sm:px-6">
          <p className="label-tech text-warning">Carga abaixo da referência</p>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">
            Você utilizou uma carga abaixo da sua referência atual. O desempenho desta sessão será
            registrado, mas não representa uma nova progressão.
          </p>
          <p className="data mt-1.5 text-[11px] text-muted-foreground">
            Referência {ctx.referenceLoad} kg · utilizada {actualLoad} kg
          </p>
        </div>
      )}

      {!ctx.belowReference && ctx.status === "CONSOLIDATING" && lastSession != null && (
        <p className="border-b border-border px-5 py-3 text-[11px] text-muted-foreground sm:px-6">
          Nova carga em consolidação — ainda não é sua carga de referência.
        </p>
      )}

      {/* 5. CARGA UTILIZADA */}
      <div className="border-b border-border px-5 py-5 sm:px-6">
        <div className="flex items-baseline justify-between">
          <p className="label-tech">Carga utilizada hoje</p>
          <span className="data text-[11px] text-muted-foreground">
            {edited ? "ajustada por você" : `sugestão ${rec.suggestedLoad} kg`}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            onClick={() => nudge(-step)}
            aria-label="Diminuir carga"
          >
            <Minus className="size-5" />
          </button>
          <Input
            type="number"
            inputMode="decimal"
            step={0.5}
            className="data h-12 rounded-md border-border bg-surface-2 text-center text-2xl font-bold focus-visible:border-primary"
            value={load ?? ""}
            onChange={(e) => setLoad(e.target.value === "" ? null : Number(e.target.value))}
          />
          <button
            type="button"
            className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            onClick={() => nudge(step)}
            aria-label="Aumentar carga"
          >
            <Plus className="size-5" />
          </button>
        </div>
      </div>

      {/* 6. SÉRIES / REPS / RIR */}
      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="label-tech w-14">Série</span>
          <span className="label-tech flex-1 text-center">Reps</span>
          <span className="label-tech flex-1 text-center">RIR</span>
        </div>
        <div className="mt-2 space-y-2">
          {sets.map((s, i) => {
            const hit = target.reps?.[i] != null && (s.reps ?? 0) >= target.reps[i]!;
            return (
              <div key={s.set_number} className="flex items-center gap-2">
                <span className="data w-14 text-sm text-muted-foreground">{s.set_number}ª</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  className={`data h-12 flex-1 rounded-md border-border bg-surface-2 text-center text-lg font-semibold transition-colors focus-visible:border-primary ${
                    hit ? "border-success/60 text-success" : ""
                  }`}
                  placeholder={target.reps?.[i] != null ? String(target.reps[i]) : "—"}
                  value={s.reps ?? ""}
                  onChange={(e) => updateSet(i, "reps", e.target.value)}
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  className="data h-12 flex-1 rounded-md border-border bg-surface-2 text-center text-lg font-semibold focus-visible:border-primary"
                  placeholder="—"
                  value={s.rir ?? ""}
                  onChange={(e) => updateSet(i, "rir", e.target.value)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="data rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface px-5 py-4 sm:px-6">
      <p className="label-tech">{label}</p>
      <p className="data mt-1.5 text-xl font-bold leading-none">{value}</p>
      {hint && <p className="data mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

