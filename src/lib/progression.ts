import type { CheckIn, Decision, PastSession, SetLog, WorkoutExercise } from "./types";

/** Contexto de recuperação percebida (check-in). Nunca é decisão por si só. */
export type RecoveryContext = "OPTIMAL" | "BELOW_OPTIMAL";
/** Leitura objetiva da performance real mais recente. */
export type PerformanceStatus = "EXCELLENT" | "IMPROVING" | "STABLE" | "DECLINING" | "UNKNOWN";

export interface Recommendation {
  decision: Decision;
  suggestedLoad: number;
  /** Short, user-facing message (1 line). */
  message: string;
  /** Full explanation of why this decision was made. */
  rationale: string;
  trendWarning?: string | undefined;
  /** Low history = "estabelecendo referência". */
  establishingBaseline: boolean;
  /** Contexto de recuperação registrado junto da decisão. */
  recoveryContext?: RecoveryContext;
  /** Leitura da performance real registrada junto da decisão. */
  performanceStatus?: PerformanceStatus;
  /** True quando recuperação percebida e performance real discordam. */
  discordance?: boolean;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Meta de repetições para hoje, derivada da última sessão real.
 * Progressão pequena e gradual; nunca ultrapassa max_reps.
 * Retorna null quando não faz sentido (sem histórico, carga nova, progredir/recuperar).
 */
export function targetReps(
  exercise: WorkoutExercise,
  last: PastSession | null,
  decision: Decision,
): number[] | null {
  if (!last) return null;
  if (decision === "PROGREDIR" || decision === "RECUPERAR") return null;
  if (Number(last.actual_load ?? 0) !== Number(exercise.current_load)) return null;
  const reps = last.sets.map((s) => s.reps ?? 0);
  if (reps.length === 0 || reps.every((r) => r <= 0)) return null;

  const top = Math.max(...reps);
  const atCeiling = reps.some((r) => r >= exercise.max_reps);

  if (atCeiling) {
    // Perto do teto da faixa: evolução mínima — sobe apenas a série mais baixa.
    const lowest = Math.min(...reps);
    if (lowest >= exercise.max_reps) return reps;
    const idx = reps.indexOf(lowest);
    return reps.map((r, i) => (i === idx ? Math.min(exercise.max_reps, r + 1) : r));
  }

  const uneven = reps.some((r) => r < top);
  if (uneven) {
    // Nivela as séries mais baixas em direção à melhor série da última sessão.
    return reps.map((r) => (r < top ? Math.min(exercise.max_reps, r + 1) : r));
  }
  // Séries já uniformes: evolução mínima na primeira série.
  return reps.map((r, i) => (i === 0 ? Math.min(exercise.max_reps, r + 1) : r));
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function totalReps(sets: SetLog[]): number {
  return sets.reduce((a, s) => a + (s.reps ?? 0), 0);
}

function repsOf(s: PastSession): number[] {
  return s.sets.map((x) => x.reps ?? 0).filter((r) => r > 0);
}

function rirsOf(s: PastSession): number[] {
  return s.sets.map((x) => x.rir).filter((r): r is number => r != null);
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
 * Counts relevant low-recovery signals. Recovery is never a simple average:
 * a single bad night is not enough to change a decision.
 */
export function recoverySignals(c: CheckIn | null): number {
  if (!c) return 0;
  let n = 0;
  if (c.sleep_score <= 2) n++;
  if (c.energy_score <= 2) n++;
  if (c.disposition_score <= 2) n++;
  if (c.stress_score >= 4) n++;
  if (c.adherence_score <= 2) n++;
  return n;
}

/** Sessions performed at the given load, most recent first, stopping at a load change. */
export function sessionsAtLoad(history: PastSession[], load: number): PastSession[] {
  const out: PastSession[] = [];
  for (const s of history) {
    if (Number(s.actual_load ?? 0) !== load) break;
    out.push(s);
  }
  return out;
}

/**
 * Persistent, relevant performance drop inside the SAME load cycle:
 * total reps falling in at least two consecutive sessions with a meaningful
 * magnitude (>= 8% from the best of the window).
 */
export function persistentDrop(sameLoad: PastSession[]): boolean {
  if (sameLoad.length < 3) return false;
  const [t1, t2, t3] = sameLoad.slice(0, 3).map((s) => totalReps(s.sets)) as [number, number, number];
  if (!(t1 < t2 && t2 < t3)) return false;
  return t3 > 0 && (t3 - t1) / t3 >= 0.08;
}

const DAY = 86_400_000;

/** True when the exercise has not been trained for a long time. */
export function longAbsence(history: PastSession[], days = 14): boolean {
  const last = history[0];
  if (!last) return false;
  return Date.now() - new Date(last.created_at).getTime() > days * DAY;
}

/**
 * Deterministic, explainable auto-regulated progression engine.
 *
 * Hierarchy: 1 safety (pain) -> 2 recovery -> 3 performance -> 4 trend -> 5 decision.
 * The check-in modulates; real performance is the main evidence to unlock progression.
 * history[0] must be the most recent session for this exercise.
 */
export function recommend(
  exercise: WorkoutExercise,
  history: PastSession[],
  checkIn: CheckIn | null,
): Recommendation {
  const load = Number(exercise.current_load) || 0;
  const increment = Number(exercise.suggested_increment) || 0;
  const pain = checkIn?.pain_score ?? 0;
  const lowSignals = recoverySignals(checkIn);
  const lowRecovery = lowSignals >= 3;

  const sameLoad = sessionsAtLoad(history, load);
  const dropping = persistentDrop(sameLoad);
  const establishingBaseline = sameLoad.length < 2;
  const trendWarning = dropping
    ? "Sua performance caiu em sessões consecutivas com a mesma carga."
    : undefined;

  // ---------- 1. SEGURANÇA ----------
  if (pain >= 4) {
    return {
      decision: "RECUPERAR",
      suggestedLoad: round(Math.max(0, load - increment)),
      message: "Dor elevada relatada. Reduza a exigência hoje.",
      rationale:
        "Você relatou dor/desconforto elevado neste momento. Segurança tem prioridade sobre progressão: reduza a exigência e priorize a recuperação.",
      trendWarning,
      establishingBaseline,
    };
  }

  // ---------- 2. RECUPERAÇÃO + 4. TENDÊNCIA (combinação para reduzir) ----------
  if (dropping && lowRecovery) {
    return {
      decision: "RECUPERAR",
      suggestedLoad: round(Math.max(0, load - increment)),
      message: "Performance caindo e recuperação baixa.",
      rationale:
        "Sua performance vem caindo em sessões consecutivas e sua recuperação está baixa. Vamos priorizar a recuperação antes de buscar nova progressão.",
      trendWarning,
      establishingBaseline,
    };
  }

  // Dor moderada: nunca libera progressão neste exercício.
  const moderatePain = pain === 3;

  // ---------- Retorno após ausência ----------
  if (longAbsence(history)) {
    return {
      decision: "CONSOLIDAR",
      suggestedLoad: load,
      message: "Retorno ao treino: consolide a última carga.",
      rationale:
        "Faz um tempo desde a última vez que você executou este exercício. Vamos retomar consolidando a última carga conhecida e reconstruir a progressão pelo desempenho real.",
      establishingBaseline,
    };
  }

  const last = history[0];

  // ---------- Sem histórico ----------
  if (!last) {
    return {
      decision: "CONSOLIDAR",
      suggestedLoad: load,
      message: "Estabelecendo referência.",
      rationale:
        "Primeira sessão registrada para este exercício. Mantenha a carga atual e estabeleça sua linha de base dentro da faixa de repetições.",
      establishingBaseline: true,
    };
  }

  // ---------- Novo ciclo de carga ----------
  const newCycle = sameLoad.length === 0 || Number(last.actual_load ?? 0) !== load;
  const priorLoad = history[sameLoad.length];
  const loadJustIncreased =
    sameLoad.length === 1 && priorLoad != null && Number(priorLoad.actual_load ?? 0) < load;
  if (newCycle) {
    return {
      decision: "ACUMULAR",
      suggestedLoad: load,
      message: "Novo ciclo nesta carga: busque mais repetições.",
      rationale: `Você iniciou um novo ciclo em ${load} kg. Isso não é regressão: acumule repetições dentro da faixa ${exercise.min_reps}–${exercise.max_reps} antes de pensar em aumentar novamente.`,
      establishingBaseline: true,
    };
  }

  // ---------- 3. PERFORMANCE ----------
  const reps = repsOf(last);
  const rirs = rirsOf(last);
  const minRep = reps.length ? Math.min(...reps) : 0;
  const avgRep = avg(reps);
  const nearTop =
    reps.length > 0 && minRep >= exercise.max_reps - 1 && avgRep >= exercise.max_reps - 0.7;
  const belowMin = reps.length > 0 && minRep < exercise.min_reps;
  const avgRir = rirs.length > 0 ? avg(rirs) : exercise.target_rir;
  const effortOk = avgRir <= exercise.target_rir + 0.5;

  const prev = sameLoad[1];
  const improving = prev ? totalReps(last.sets) > totalReps(prev.sets) : false;

  // Zona de progressão
  if (nearTop && effortOk) {
    if (dropping) {
      return {
        decision: "CONSOLIDAR",
        suggestedLoad: load,
        message: "Performance estável. Vamos consolidar antes de aumentar.",
        rationale:
          "Apesar do bom resultado da última sessão, a tendência recente é de queda. Consolide o movimento antes de buscar nova progressão.",
        trendWarning,
        establishingBaseline,
      };
    }
    if (lowRecovery || moderatePain) {
      return {
        decision: "CONSOLIDAR",
        suggestedLoad: load,
        message: moderatePain
          ? "Zona de progressão atingida, mas com desconforto relatado."
          : "Zona de progressão atingida, mas recuperação baixa hoje.",
        rationale: moderatePain
          ? "Você chegou à zona de progressão, porém relatou desconforto moderado. Por segurança, repita a carga e progrida quando o desconforto reduzir."
          : "Você chegou à zona de progressão, porém vários sinais de recuperação estão baixos hoje. Repita a carga para consolidar e progrida na próxima oportunidade.",
        establishingBaseline,
      };
    }
    return {
      decision: "PROGREDIR",
      suggestedLoad: round(load + increment),
      message: "Você atingiu a zona de progressão com esforço adequado.",
      rationale: `Sua performance ficou próxima do topo da faixa (${reps.join("/")}) com esforço compatível com o RIR alvo ${exercise.target_rir}. Progressão disponível.`,
      establishingBaseline,
    };
  }

  // Topo da faixa, mas esforço distante do alvo
  if (nearTop && !effortOk) {
    return {
      decision: "ACUMULAR",
      suggestedLoad: load,
      message: "Reps no topo, mas com esforço distante do RIR alvo.",
      rationale: `Você atingiu as repetições, porém o RIR médio (${round(avgRir)}) ficou acima do alvo (${exercise.target_rir}). Mantenha a carga e busque proximidade real da falha antes de progredir.`,
      establishingBaseline,
    };
  }

  // ---------- 4. TENDÊNCIA ----------
  if (dropping) {
    return {
      decision: "CONSOLIDAR",
      suggestedLoad: load,
      message: "Sua performance vem caindo. Vamos consolidar.",
      rationale:
        "Sua recuperação não indica necessidade de redução, mas sua performance vem caindo nas últimas sessões. Consolide a carga antes de aumentar a exigência.",
      trendWarning,
      establishingBaseline,
    };
  }

  if (loadJustIncreased) {
    return {
      decision: "ACUMULAR",
      suggestedLoad: load,
      message: "Novo ciclo nesta carga: busque mais repetições.",
      rationale: `Você iniciou um novo ciclo em ${load} kg. Isso não é regressão: acumule repetições dentro da faixa ${exercise.min_reps}–${exercise.max_reps} antes de aumentar novamente.`,
      establishingBaseline: true,
    };
  }

  if (belowMin) {
    return {
      decision: "CONSOLIDAR",
      suggestedLoad: load,
      message: "Abaixo da faixa mínima. Consolide a carga.",
      rationale: `Na última sessão você ficou abaixo de ${exercise.min_reps} repetições em pelo menos uma série. Repita a carga para consolidar a performance.`,
      establishingBaseline,
    };
  }

  if (improving || establishingBaseline) {
    return {
      decision: "ACUMULAR",
      suggestedLoad: load,
      message: "Mantenha a carga e busque mais repetições.",
      rationale: `Seu desempenho está evoluindo dentro da faixa ${exercise.min_reps}–${exercise.max_reps}. Mantenha a carga e avance gradualmente nas repetições.`,
      establishingBaseline,
    };
  }

  return {
    decision: "CONSOLIDAR",
    suggestedLoad: load,
    message: "Performance estável. Continue construindo desempenho.",
    rationale:
      "Sua performance está estável nas últimas sessões. Mantenha a carga e continue construindo desempenho — não há evidência para aumentar nem para reduzir.",
    establishingBaseline,
  };
}
