import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchExerciseHistory, fetchWorkouts } from "@/lib/db";
import { recommend } from "@/lib/progression";
import { DECISION_META } from "@/lib/types";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/progressao")({
  head: () => ({
    meta: [
      { title: "Progressão — LM Progress" },
      {
        name: "description",
        content: "Evolução individual por exercício: carga, repetições, volume e estado atual.",
      },
      { property: "og:title", content: "Progressão — LM Progress" },
      { property: "og:description", content: "Evolução de carga, repetições e volume por exercício." },
    ],
  }),
  component: ProgressaoPage,
});

function ProgressaoPage() {
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: fetchWorkouts });
  const [exerciseId, setExerciseId] = useState("");

  const allExercises = (workouts.data ?? []).flatMap((w) =>
    w.workout_exercises.map((ex) => ({ ...ex, workoutName: w.name })),
  );

  useEffect(() => {
    if (!exerciseId && allExercises[0]) setExerciseId(allExercises[0].id);
  }, [allExercises, exerciseId]);

  const exercise = allExercises.find((e) => e.id === exerciseId);
  const history = useQuery({
    queryKey: ["history", exerciseId],
    queryFn: () => fetchExerciseHistory(exerciseId, 20),
    enabled: !!exerciseId,
  });

  const rec = exercise && history.data ? recommend(exercise, history.data, null) : null;
  const chartData = (history.data ?? [])
    .slice()
    .reverse()
    .map((h) => {
      const reps = h.sets.reduce((a, s) => a + (s.reps ?? 0), 0);
      return {
        date: new Date(h.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        carga: Number(h.actual_load ?? 0),
        reps,
        volume: Number(h.actual_load ?? 0) * reps,
      };
    });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Progressão</h1>

      <div className="space-y-1.5 rounded-2xl border border-border bg-card p-5 shadow-card">
        <Label>Exercício</Label>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
        >
          {allExercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.workoutName} · {ex.exercise_name}
            </option>
          ))}
        </select>
      </div>

      {exercise && rec && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{exercise.exercise_name}</h2>
              <p className="text-sm text-muted-foreground">
                Carga atual: {Number(exercise.current_load)} kg · {exercise.sets} ×{" "}
                {exercise.min_reps}–{exercise.max_reps}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${DECISION_META[rec.decision].badge}`}
            >
              {DECISION_META[rec.decision].label}
            </span>
          </div>
          <p className="mt-3 rounded-xl bg-secondary p-3 text-sm text-muted-foreground">
            {rec.rationale} Próxima sugestão: {rec.suggestedLoad} kg.
          </p>
        </div>
      )}

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há sessões registradas para este exercício.
        </p>
      ) : (
        <>
          <Chart title="Carga ao longo do tempo" data={chartData} dataKey="carga" />
          <Chart title="Repetições ao longo do tempo" data={chartData} dataKey="reps" />
          <Chart title="Volume ao longo do tempo" data={chartData} dataKey="volume" />
        </>
      )}

      {(history.data ?? []).length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">Histórico</h3>
          <div className="space-y-2 text-sm">
            {history.data!.map((h) => (
              <div key={h.created_at} className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">
                  {new Date(h.created_at).toLocaleDateString("pt-BR")}
                </span>
                <span>
                  {Number(h.actual_load ?? 0)} kg ·{" "}
                  {h.sets.map((s) => `${s.reps ?? "-"}${s.rir != null ? `(RIR ${s.rir})` : ""}`).join(" / ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chart({
  title,
  data,
  dataKey,
}: {
  title: string;
  data: { date: string; carga: number; reps: number; volume: number }[];
  dataKey: "carga" | "reps" | "volume";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={34} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke="var(--primary)" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}