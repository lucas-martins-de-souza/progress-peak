import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchExerciseHistory, fetchPerformanceSince, fetchWorkouts } from "@/lib/db";
import { recommend } from "@/lib/progression";
import { DECISION_META } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/progressao")({
  head: () => ({
    meta: [
      { title: "Relatório de progressão — LM Progress" },
      {
        name: "description",
        content:
          "Veja se você está evoluindo: PRs, evolução de carga, volume semanal e histórico por exercício.",
      },
      { property: "og:title", content: "Relatório de progressão — LM Progress" },
      {
        property: "og:description",
        content: "PRs, evolução de carga e volume semanal do seu treino.",
      },
    ],
  }),
  component: RelatorioPage,
});

const PERIODS = [
  { label: "Últimas 4 semanas", weeks: 4 },
  { label: "Últimas 8 semanas", weeks: 8 },
  { label: "Últimas 12 semanas", weeks: 12 },
];

const fmt = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");

function RelatorioPage() {
  const [weeks, setWeeks] = useState(8);
  const since = useMemo(
    () => new Date(Date.now() - weeks * 7 * 86_400_000).toISOString(),
    [weeks],
  );

  const workouts = useQuery({ queryKey: ["workouts"], queryFn: fetchWorkouts });
  const perf = useQuery({
    queryKey: ["performance", since],
    queryFn: () => fetchPerformanceSince(since),
  });

  const allExercises = (workouts.data ?? []).flatMap((w) =>
    w.workout_exercises.map((ex) => ({ ...ex, workoutName: w.name })),
  );
  const [exerciseId, setExerciseId] = useState("");
  useEffect(() => {
    if (!exerciseId && allExercises[0]) setExerciseId(allExercises[0].id);
  }, [allExercises, exerciseId]);

  const exercise = allExercises.find((e) => e.id === exerciseId);
  const history = useQuery({
    queryKey: ["history", exerciseId],
    queryFn: () => fetchExerciseHistory(exerciseId, 40),
    enabled: !!exerciseId,
  });

  // ---- KPIs do período ----
  const rows = perf.data ?? [];
  const kpi = useMemo(() => {
    const byExercise = new Map<string, { load: number; at: number }[]>();
    for (const r of rows) {
      const list = byExercise.get(r.workout_exercise_id) ?? [];
      list.push({ load: Number(r.actual_load ?? 0), at: new Date(r.created_at).getTime() });
      byExercise.set(r.workout_exercise_id, list);
    }
    let prs = 0;
    let firstSum = 0;
    let lastSum = 0;
    for (const list of byExercise.values()) {
      const asc = list.sort((a, b) => a.at - b.at);
      let best = 0;
      for (const p of asc) {
        if (p.load > best) {
          if (best > 0) prs++;
          best = p.load;
        }
      }
      if (asc.length > 1) {
        firstSum += asc[0]!.load;
        lastSum += asc[asc.length - 1]!.load;
      }
    }
    const evolution = firstSum > 0 ? ((lastSum - firstSum) / firstSum) * 100 : 0;
    const sessions = new Set(rows.map((r) => r.session_id)).size;
    return { prs, evolution, sessions };
  }, [rows]);

  // ---- Volume semanal ----
  const weekly = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.created_at);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const key = monday.toISOString();
      const reps = r.sets.reduce((a, s) => a + (s.reps ?? 0), 0);
      buckets.set(key, (buckets.get(key) ?? 0) + reps * Number(r.actual_load ?? 0));
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => ({
        semana: new Date(k).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        volume: Math.round(v),
      }));
  }, [rows]);

  const volumeDelta =
    weekly.length > 1 && weekly[0]!.volume > 0
      ? ((weekly[weekly.length - 1]!.volume - weekly[0]!.volume) / weekly[0]!.volume) * 100
      : 0;

  // ---- Série do exercício selecionado ----
  const series = (history.data ?? [])
    .slice()
    .reverse()
    .map((h) => {
      const reps = h.sets.reduce((a, s) => a + (s.reps ?? 0), 0);
      return {
        date: new Date(h.created_at).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        carga: Number(h.actual_load ?? 0),
        reps,
      };
    });

  const loadDelta =
    series.length > 1 ? series[series.length - 1]!.carga - series[0]!.carga : 0;

  const pr = (history.data ?? []).reduce<{ load: number; reps: number } | null>((best, h) => {
    const load = Number(h.actual_load ?? 0);
    const reps = Math.max(0, ...h.sets.map((s) => s.reps ?? 0));
    if (!best || load > best.load || (load === best.load && reps > best.reps)) {
      return { load, reps };
    }
    return best;
  }, null);

  const rec = exercise && history.data ? recommend(exercise, history.data, null) : null;
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="space-y-6 pb-4">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sua evolução</h1>
          <p className="text-sm text-muted-foreground">Relatório de progressão</p>
        </div>
        <select
          className="h-9 rounded-full border border-border bg-card px-3 text-sm font-medium shadow-card"
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
        >
          {PERIODS.map((p) => (
            <option key={p.weeks} value={p.weeks}>
              {p.label}
            </option>
          ))}
        </select>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Kpi label="PRs" value={`+${kpi.prs}`} tone="success" />
        <Kpi
          label="Evolução de carga"
          value={`${kpi.evolution >= 0 ? "+" : ""}${fmt(kpi.evolution)}%`}
          tone={kpi.evolution >= 0 ? "success" : "muted"}
        />
        <Kpi label="Treinos" value={String(kpi.sessions)} tone="muted" />
      </section>

      <section className="space-y-4">
        <select
          className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm font-medium shadow-card"
          value={exerciseId}
          onChange={(e) => setExerciseId(e.target.value)}
        >
          {allExercises.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.exercise_name}
            </option>
          ))}
        </select>

        {pr && pr.load > 0 && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
            <span className="flex size-10 items-center justify-center rounded-full bg-success-soft">
              <Trophy className="size-5 text-success" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                PR atual
              </p>
              <p className="text-lg font-semibold">
                {fmt(pr.load)} kg × {pr.reps}
              </p>
            </div>
            {rec && (
              <span
                className={`ml-auto rounded-full px-2.5 py-1 text-xs font-semibold ${DECISION_META[rec.decision].badge}`}
              >
                {DECISION_META[rec.decision].label}
              </span>
            )}
          </div>
        )}

        {series.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Ainda não há sessões registradas para este exercício.
          </p>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Carga ao longo do tempo</h2>
                <span className="text-sm font-semibold text-success">
                  {loadDelta >= 0 ? "+" : ""}
                  {fmt(loadDelta)} kg
                </span>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">desde o início do histórico</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <defs>
                      <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                      width={34}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip formatter={(v: number) => [`${fmt(v)} kg`, "Carga"]} />
                    <Area
                      type="monotone"
                      dataKey="carga"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      fill="url(#loadFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">Volume semanal</h2>
                <span className="text-xs font-medium text-muted-foreground">
                  {volumeDelta >= 0 ? "+" : ""}
                  {fmt(volumeDelta)}% no período
                </span>
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly}>
                    <XAxis
                      dataKey="semana"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip formatter={(v: number) => [`${v} kg`, "Volume"]} />
                    <Bar
                      dataKey="volume"
                      fill="var(--primary)"
                      radius={[6, 6, 0, 0]}
                      opacity={0.5}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                Repetições por sessão
              </h2>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <XAxis dataKey="date" hide />
                    <Tooltip formatter={(v: number) => [`${v} reps`, "Total"]} />
                    <Line
                      type="monotone"
                      dataKey="reps"
                      stroke="var(--muted-foreground)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-medium shadow-card"
            >
              Ver histórico completo
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${showHistory ? "rotate-180" : ""}`}
              />
            </button>

            {showHistory && (
              <div className="space-y-2 rounded-2xl border border-border bg-card p-5 text-sm shadow-card">
                {history.data!.map((h) => (
                  <div
                    key={h.created_at}
                    className="flex justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="text-right">
                      {fmt(Number(h.actual_load ?? 0))} kg ·{" "}
                      {h.sets
                        .map((s) => `${s.reps ?? "-"}${s.rir != null ? `(RIR ${s.rir})` : ""}`)
                        .join(" / ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className={`text-xl font-semibold ${tone === "success" ? "text-success" : "text-foreground"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}
