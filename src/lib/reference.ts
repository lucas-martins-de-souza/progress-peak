import type { PastSession, WorkoutExercise } from "./types";
import { persistentDrop } from "./progression";

/** Estado da carga planejada em relação à carga de referência validada. */
export type LoadStatus = "REFERENCE" | "CONSOLIDATING" | "BELOW_REFERENCE" | "UNKNOWN";

export interface PersonalRecord {
  load: number;
  reps: number;
  at: string;
}

export interface LoadContext {
  /** Carga validada e sustentada usada como base de avaliação. */
  referenceLoad: number | null;
  /** Quantas exposições sustentaram a referência. */
  referenceSessions: number;
  /** Data da validação (sessão mais recente do bloco validado). */
  referenceValidatedAt: string | null;
  /** Melhor marca histórica (independente da referência). */
  personalRecord: PersonalRecord | null;
  /** Situação da carga planejada para hoje. */
  status: LoadStatus;
  /** True quando a carga de hoje está muito abaixo da referência. */
  belowReference: boolean;
}

/** Tolerância: reduções até 15% são interpretadas normalmente. */
const TOLERANCE = 0.15;

const loadOf = (s: PastSession) => Number(s.actual_load ?? 0);

/** Agrupa o histórico (mais recente primeiro) em blocos consecutivos de mesma carga. */
function loadBlocks(history: PastSession[]): PastSession[][] {
  const blocks: PastSession[][] = [];
  for (const s of history) {
    const current = blocks[blocks.length - 1];
    if (current && loadOf(current[0]!) === loadOf(s)) current.push(s);
    else blocks.push([s]);
  }
  return blocks;
}

/** Todas as séries cumpriram pelo menos o mínimo da faixa. */
function metMinimum(session: PastSession, minReps: number): boolean {
  const reps = session.sets.map((s) => s.reps ?? 0);
  if (reps.length === 0) return false;
  return reps.every((r) => r >= minReps);
}

/**
 * Uma carga é referência quando foi cumprida no mínimo da faixa em todas as
 * séries, em pelo menos 2 exposições recentes daquele exercício, sem queda
 * relevante que descaracterize a sustentação.
 */
export function referenceOf(
  exercise: WorkoutExercise,
  history: PastSession[],
): { load: number; sessions: number; validatedAt: string } | null {
  for (const block of loadBlocks(history)) {
    const valid = block.filter((s) => metMinimum(s, exercise.min_reps));
    if (valid.length >= 2 && !persistentDrop(block)) {
      return {
        load: loadOf(block[0]!),
        sessions: valid.length,
        validatedAt: block[0]!.created_at,
      };
    }
  }
  return null;
}

/** Melhor marca histórica: maior carga registrada e a melhor série nela. */
export function personalRecordOf(history: PastSession[]): PersonalRecord | null {
  let best: PersonalRecord | null = null;
  for (const s of history) {
    const load = loadOf(s);
    const reps = s.sets.map((x) => x.reps ?? 0).filter((r) => r > 0);
    if (load <= 0 || reps.length === 0) continue;
    const top = Math.max(...reps);
    if (!best || load > best.load || (load === best.load && top > best.reps)) {
      best = { load, reps: top, at: s.created_at };
    }
  }
  return best;
}

/** Camada de contexto de carga: referência, PR e situação da carga de hoje. */
export function loadContext(
  exercise: WorkoutExercise,
  history: PastSession[],
  plannedLoad: number,
): LoadContext {
  const ref = referenceOf(exercise, history);
  const pr = personalRecordOf(history);
  const referenceLoad = ref?.load ?? null;
  let status: LoadStatus = "UNKNOWN";
  if (referenceLoad != null) {
    if (plannedLoad < referenceLoad * (1 - TOLERANCE)) status = "BELOW_REFERENCE";
    else if (plannedLoad > referenceLoad) status = "CONSOLIDATING";
    else status = "REFERENCE";
  } else if (history.length > 0) {
    status = "CONSOLIDATING";
  }
  return {
    referenceLoad,
    referenceSessions: ref?.sessions ?? 0,
    referenceValidatedAt: ref?.validatedAt ?? null,
    personalRecord: pr,
    status,
    belowReference: status === "BELOW_REFERENCE",
  };
}
