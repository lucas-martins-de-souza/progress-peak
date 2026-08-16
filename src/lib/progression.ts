import type { CheckIn, Decision, PastSession, SetLog, WorkoutExercise } from "./types";

export interface Recommendation {
  decision: Decision;
  suggestedLoad: number;
  rationale: string;
  trendWarning?: string;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function totalReps(sets: SetLog[]): number {
  return sets.reduce((a, s) => a + (s.reps ?? 0), 0);
}

/** Readiness derived from the pre-workout check-in. Context only — never the sole driver. */
export function readinessScore(c: CheckIn | null): number {
  if (!c) return 3;
  const positive = avg([c.sleep_score, c.energy_score, c.disposition_score, c.adherence_score]);
  const negative = avg([c.stress_score, c.pain_score]);
  return Math.max(1, Math.min(5, positive - (negative - 1) * 0.5));
}

export function readinessLabel(score: number): string {
  if (score >= 4) return "Ótima";
  if (score >= 3.2) return "Boa";
  if (score >= 2.4) return "Intermediária";
  return "Baixa";
}

/**
 * Detects a persistent performance drop: total reps falling across the
 * last 3 sessions at the same load and same position in the workout.
 */
export function persistentDrop(history: PastSession[]): boolean {
  const recent = history.slice(0, 3);
  if (recent.length < 3) return false;
  const samePosition = recent.every((s) => s.position === recent[0]!.position);
  const sameLoad = recent.every((s) => s.actual_load === recent[0]!.actual_load);
  if (!samePosition || !sameLoad) return false;
  const [s1, s2, s3] = recent.map(totalReps) as [number, number, number];
  return s1 < s2 && s2 < s3;
}

/**
 * Deterministic, explainable progression engine.
 * history[0] must be the most recent session for this exercise.
 */
export function recommend(
  exercise: WorkoutExercise,
  history: PastSession[],
  checkIn: CheckIn | null,
): Recommendation {
  const load = Number(exercise.current_load) || 0;
  const increment = Number(exercise.suggested_increment) || 0;
  const readiness = readinessScore(checkIn);
  const last = history[0];
  const dropping = persistentDrop(history);
  const trendWarning = dropping
    ? "Performance em queda: seu desempenho caiu em sessões consecutivas com a mesma carga."
    : undefined;

  const highPain = (checkIn?.pain_score ?? 0) >= 4;
  const veryLowEnergy = (checkIn?.energy_score ?? 5) <= 1;

  if (highPain || veryLowEnergy || (dropping && readiness < 3)) {
    return {
      decision: "RECUPERAR",
      suggestedLoad: Math.max(0, load - increment),
      rationale: highPain
        ? "Você relatou dor/desconforto elevado. Reduza a exigência e priorize recuperação."
        : veryLowEnergy
          ? "Sua energia está muito baixa hoje. Reduza a exigência e trate a sessão como manutenção."
          : "Queda de desempenho em sessões consecutivas somada a recuperação ruim. Reduza a exigência antes de progredir.",
      trendWarning,
    };
  }

  if (!last) {
    return {
      decision: "ACUMULAR",
      suggestedLoad: load,
      rationale:
        "Primeira sessão registrada para este exercício. Mantenha a carga atual e estabeleça sua linha de base dentro da faixa de repetições.",
    };
  }

  const reps = last.sets.map((s) => s.reps ?? 0);
  const rirs = last.sets.map((s) => s.rir).filter((r): r is number => r != null);
  const hitTop = reps.length > 0 && reps.every((r) => r >= exercise.max_reps);
  const belowMin = reps.length > 0 && reps.some((r) => r < exercise.min_reps);
  const avgRir = rirs.length > 0 ? avg(rirs) : exercise.target_rir;
  const effortOk = avgRir <= exercise.target_rir + 0.5;
  const sameLoad = Number(last.actual_load) === load;

  if (dropping) {
    return {
      decision: "CONSOLIDAR",
      suggestedLoad: load,
      rationale:
        "A carga está sendo mantida, mas seu desempenho caiu em sessões consecutivas. Consolide o movimento antes de buscar nova progressão.",
      trendWarning,
    };
  }

  if (hitTop && effortOk && sameLoad) {
    if (readiness < 2.4) {
      return {
        decision: "CONSOLIDAR",
        suggestedLoad: load,
        rationale:
          "Você atingiu o topo da faixa, mas sua recuperação hoje está baixa. Repita a carga para consolidar antes de aumentar.",
      };
    }
    return {
      decision: "PROGREDIR",
      suggestedLoad: load + increment,
      rationale:
        "Você atingiu o topo da faixa em todas as séries e manteve esforço compatível com o RIR alvo.",
    };
  }

  if (belowMin) {
    return {
      decision: "CONSOLIDAR",
      suggestedLoad: load,
      rationale:
        "Na última sessão você ficou abaixo da faixa mínima em pelo menos uma série. Repita a carga para consolidar a performance.",
    };
  }

  if (readiness < 2.4) {
    return {
      decision: "CONSOLIDAR",
      suggestedLoad: load,
      rationale:
        "Sua recuperação está intermediária/baixa hoje. Vamos repetir a carga para consolidar sua performance.",
    };
  }

  return {
    decision: "ACUMULAR",
    suggestedLoad: load,
    rationale:
      "Ainda existe espaço dentro da faixa de repetições. Mantenha a carga e busque mais repetições.",
  };
}