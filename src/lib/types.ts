export type Decision = "PROGREDIR" | "ACUMULAR" | "CONSOLIDAR" | "RECUPERAR";

export interface Profile {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  height: number | null;
  weight: number | null;
  goal: string | null;
  experience_level: string | null;
  weekly_frequency: number | null;
  plan: string;
}

export interface Workout {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  user_id: string;
  exercise_name: string;
  position: number;
  sets: number;
  min_reps: number;
  max_reps: number;
  current_load: number;
  suggested_increment: number;
  target_rir: number;
}

export interface CheckIn {
  sleep_score: number;
  energy_score: number;
  stress_score: number;
  disposition_score: number;
  pain_score: number;
  adherence_score: number;
  note?: string;
}

export interface SetLog {
  set_number: number;
  reps: number | null;
  rir: number | null;
}

export interface PastSession {
  created_at: string;
  actual_load: number | null;
  position: number | null;
  sets: SetLog[];
}

export const DECISION_META: Record<
  Decision,
  { label: string; dot: string; badge: string; short: string }
> = {
  PROGREDIR: {
    label: "Progredir",
    dot: "bg-success",
    badge: "bg-success-soft text-success",
    short: "Condições para aumentar a carga.",
  },
  ACUMULAR: {
    label: "Acumular reps",
    dot: "bg-primary",
    badge: "bg-info-soft text-primary",
    short: "Mantenha a carga e busque mais repetições.",
  },
  CONSOLIDAR: {
    label: "Consolidar / repetir",
    dot: "bg-warning",
    badge: "bg-warning-soft text-warning-foreground",
    short: "Repita a carga atual para consolidar.",
  },
  RECUPERAR: {
    label: "Recuperar",
    dot: "bg-danger",
    badge: "bg-danger-soft text-danger",
    short: "Reduza a exigência e priorize recuperação.",
  },
};