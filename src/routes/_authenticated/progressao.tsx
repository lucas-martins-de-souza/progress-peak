import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Dumbbell, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
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

const fmtVolume = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n);

const selectClass =
  "h-14 w-full appearance-none rounded-lg border border-border bg-surface/70 px-14 pr-11 text-sm font-semibold text-foreground outline-none backdrop-blur-xl transition-colors hover:bg-surface-2/70 focus:border-success";

const tooltipStyle = {
  backgroundColor: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
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

  const rows = perf.data ?? [];
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
        semana: `Semana de ${new Date(k).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
        volume: Math.round(v),
      }));
  }, [rows]);

  const volumeDelta =
    weekly.length > 1 && weekly[0]!.volume > 0
      ? ((weekly[weekly.length - 1]!.volume - weekly[0]!.volume) / weekly[0]!.volume) * 100
      : 0;

  // A curva usa o melhor registro de cada semana para mostrar tendência sem ruído entre sessões.
  const weeklyLoad = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const h of history.data ?? []) {
      const d = new Date(h.created_at);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);
      const key = monday.toISOString();
      buckets.set(key, Math.max(buckets.get(key) ?? 0, Number(h.actual_load ?? 0)));
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, carga]) => ({
        semana: `Semana de ${new Date(key).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
        carga,
      }));
  }, [history.data]);

  const loadDelta =
    weeklyLoad.length > 1
      ? weeklyLoad[weeklyLoad.length - 1]!.carga - weeklyLoad[0]!.carga
      : 0;

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
    <div className="animate-rise space-y-6 pb-6 [font-family:'Hind',sans-serif]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-success">Relatório</p>
          <h1 className="mt-2 font-['Archivo_Black'] text-3xl tracking-normal text-foreground">Sua evolução</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seu progresso, sem distrações.</p>
        </div>
        <select
          aria-label="Período do relatório"
          className="h-10 w-full rounded-lg border border-border bg-surface/70 px-3 text-xs font-semibold text-muted-foreground outline-none backdrop-blur-xl transition-colors focus:border-success sm:w-auto"
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

      <section className="space-y-5">
        <div className="relative">
          <Dumbbell className="pointer-events-none absolute left-4 top-1/2 z-10 size-5 -translate-y-1/2 text-success" />
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
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        {pr && pr.load > 0 && (
          <div className="relative overflow-hidden rounded-lg border border-success/30 bg-surface/70 p-5 shadow-card backdrop-blur-xl sm:p-6">
            <div className="absolute inset-y-0 left-0 w-1 bg-success" />
            <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">PR atual</p>
              <p className="data mt-2 text-3xl font-bold leading-none text-foreground sm:text-4xl">
                {fmt(pr.load)} <span className="text-base text-success">kg</span>
                <span className="ml-2 text-lg text-muted-foreground">× {pr.reps}</span>
              </p>
            </div>
            {rec && (
              <span
                className={`rounded-md border border-current/25 bg-background/30 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] ${DECISION_META[rec.decision].text}`}
              >
                {DECISION_META[rec.decision].label}
              </span>
            )}
            </div>
          </div>
        )}

        {weeklyLoad.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted-foreground">
            Ainda não há sessões registradas para este exercício.
          </p>
        ) : (
          <>
            <Chart
              title="Evolução da carga"
              delta={`${loadDelta >= 0 ? "+" : ""}${fmt(loadDelta)} kg`}
              hint="no período"
              tone={loadDelta >= 0 ? "success" : "muted"}
            >
              <div className="h-52 sm:h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyLoad} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--success)" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="var(--success)" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.55} />
                    <XAxis
                      dataKey="semana"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value: string) => value.replace("Semana de ", "")}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      width={38}
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
                      stroke="var(--success)"
                      strokeWidth={2.5}
                      fill="url(#loadFill)"
                      activeDot={{ r: 5, fill: "var(--success)", stroke: "var(--background)", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Chart>

            <Chart
              title="Volume semanal"
              delta={`${volumeDelta >= 0 ? "+" : ""}${fmt(volumeDelta)}%`}
              hint="no período"
              tone={volumeDelta >= 0 ? "success" : "muted"}
            >
              <div className="h-44 sm:h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 10, right: 8, bottom: 0, left: -8 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.45} />
                    <XAxis dataKey="semana" hide />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                      tickFormatter={(value: number) => fmtVolume(value)}
                      width={48}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ fill: "var(--surface-2)" }}
                      formatter={(v: number) => [`${fmtVolume(v)} kg`, "Volume"]}
                    />
                    <Bar dataKey="volume" fill="var(--primary)" opacity={0.78} maxBarSize={44} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Chart>

            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowHistory((v) => !v)}
              className="h-12 w-full justify-between rounded-lg border border-border bg-surface/50 px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground hover:bg-surface-2"
            >
              Histórico completo
              <ChevronDown
                className={`size-4 transition-transform duration-200 ${showHistory ? "rotate-180" : ""}`}
              />
            </Button>

            {showHistory && (
              <div className="animate-rise divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface/40 text-sm">
                {(history.data ?? []).map((h) => (
                  <div key={h.created_at} className="grid grid-cols-[auto_1fr] items-center gap-5 px-4 py-4 sm:grid-cols-[7rem_6rem_1fr]">
                    <span className="data text-xs font-semibold text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString("pt-BR")}
                    </span>
                    <span className="data text-right text-sm font-bold text-foreground sm:text-left">
                      {fmt(Number(h.actual_load ?? 0))} kg
                    </span>
                    <span className="data col-span-2 text-right text-xs text-muted-foreground sm:col-span-1">
                      {h.sets.map((s) => s.reps ?? "-").join(" / ")} reps
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
    <div className="rounded-lg border border-border bg-surface/55 p-4 shadow-card backdrop-blur-xl sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">Comparação semanal</p>
        </div>
        {delta && (
          <div className="flex items-center gap-2 text-right">
            {tone === "success" ? (
              <TrendingUp className="size-4 text-success" />
            ) : (
              <TrendingDown className="size-4 text-muted-foreground" />
            )}
            <p className="data text-sm font-bold">
              <span className={tone === "success" ? "text-success" : "text-foreground"}>{delta}</span>
              {hint && <span className="block text-[9px] font-medium text-muted-foreground">{hint}</span>}
            </p>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
