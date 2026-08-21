import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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

const selectClass =
  "h-10 w-full rounded-sm border border-border bg-transparent px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none";

const tooltipStyle = {
  backgroundColor: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "4px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  color: "var(--foreground)",
} as const;

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
    <div className="animate-rise space-y-8 pb-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="label-tech text-primary">Relatório</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Sua evolução</h1>
        </div>
        <select
          className="h-9 shrink-0 rounded-sm border border-border bg-transparent px-2 text-[11px] font-medium text-muted-foreground focus:border-primary focus:outline-none"
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

      <section className="grid grid-cols-3 divide-x divide-border border-y border-border">
        <Kpi label="PRs" value={`+${kpi.prs}`} tone="success" />
        <Kpi
          label="Evolução de carga"
          value={`${kpi.evolution >= 0 ? "+" : ""}${fmt(kpi.evolution)}%`}
          tone={kpi.evolution >= 0 ? "success" : "muted"}
          className="pl-5"
        />
        <Kpi label="Treinos" value={String(kpi.sessions)} tone="muted" className="pl-5" />
      </section>

      <section className="space-y-6">
        <div className="space-y-2">
          <p className="label-tech">Exercício</p>
          <select
            className={selectClass}
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            {allExercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.exercise_name}
              </option>
            ))}
          </select>
        </div>

        {pr && pr.load > 0 && (
          <div className="flex items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="label-tech">PR atual</p>
              <p className="data mt-1.5 text-2xl font-bold leading-none">
                {fmt(pr.load)} kg <span className="text-muted-foreground">× {pr.reps}</span>
              </p>
            </div>
            {rec && (
              <span
                className={`text-[11px] font-bold uppercase tracking-[0.14em] ${DECISION_META[rec.decision].text}`}
              >
                {DECISION_META[rec.decision].label}
              </span>
            )}
          </div>
        )}

        {series.length === 0 ? (
          <p className="border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Ainda não há sessões registradas para este exercício.
          </p>
        ) : (
          <>
            <Chart
              title="Carga"
              delta={`${loadDelta >= 0 ? "+" : ""}${fmt(loadDelta)} kg`}
              hint="desde o início do histórico"
              tone="success"
            >
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      width={30}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ stroke: "var(--border)" }}
                      formatter={(v: number) => [`${fmt(v)} kg`, "Carga"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="carga"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#loadFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Chart>

            <Chart
              title="Volume semanal"
              delta={`${volumeDelta >= 0 ? "+" : ""}${fmt(volumeDelta)}%`}
              hint="no período"
              tone="muted"
            >
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <XAxis
                      dataKey="semana"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "var(--surface-2)" }}
                      formatter={(v: number) => [`${v} kg`, "Volume"]}
                    />
                    <Bar dataKey="volume" fill="var(--primary)" opacity={0.55} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Chart>

            <Chart title="Repetições por sessão" tone="muted">
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <XAxis dataKey="date" hide />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ stroke: "var(--border)" }}
                      formatter={(v: number) => [`${v} reps`, "Total"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="reps"
                      stroke="var(--muted-foreground)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Chart>

            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between border-y border-border py-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Histórico completo
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`}
              />
            </button>

            {showHistory && (
              <div className="animate-rise divide-y divide-border border-b border-border text-sm">
                {history.data!.map((h) => (
                  <div key={h.created_at} className="flex justify-between gap-3 py-2.5">
                    <span className="data text-xs text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="data text-right text-xs">
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

function Chart({
  title,
  delta,
  hint,
  tone,
  children,
}: {
  title: string;
  delta?: string;
  hint?: string;
  tone: "success" | "muted";
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="label-tech">{title}</p>
        {delta && (
          <p className="data text-sm font-bold">
            <span className={tone === "success" ? "text-success" : "text-foreground"}>{delta}</span>
            {hint && <span className="ml-1.5 text-[10px] text-muted-foreground">{hint}</span>}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  className = "",
}: {
  label: string;
  value: string;
  tone: "success" | "muted";
  className?: string;
}) {
  return (
    <div className={`py-5 pr-3 ${className}`}>
      <p
        className={`data text-2xl font-bold leading-none ${tone === "success" ? "text-success" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="label-tech mt-2 leading-tight">{label}</p>
    </div>
  );
}
