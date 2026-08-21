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
  {
    label: string;
    dot: string;
    badge: string;
    short: string;
    /** Cor de texto do estado. */
    text: string;
    /** Borda do bloco de estado. */
    border: string;
    /** Fundo tênue do bloco de estado. */
    bg: string;
  }
> = {
  PROGREDIR: {
    label: "PROGREDIR",
    dot: "bg-success",
    badge: "bg-success-soft text-success",
    short: "Você atingiu a zona de progressão.",
    text: "text-success",
    border: "border-success/35",
    bg: "bg-success-soft",
  },
  ACUMULAR: {
    label: "ACUMULAR REPS",
    dot: "bg-primary",
    badge: "bg-info-soft text-primary",
    short: "Continue acumulando repetições na carga atual.",
    text: "text-primary",
    border: "border-primary/35",
    bg: "bg-info-soft",
  },
  CONSOLIDAR: {
    label: "CONSOLIDAR",
    dot: "bg-warning",
    badge: "bg-warning-soft text-warning",
    short: "Mantenha a carga e estabilize a performance.",
    text: "text-warning",
    border: "border-warning/35",
    bg: "bg-warning-soft",
  },
  RECUPERAR: {
    label: "RECUPERAR",
    dot: "bg-danger",
    badge: "bg-danger-soft text-danger",
    short: "Reduza o esforço e retome gradualmente.",
    text: "text-danger",
    border: "border-danger/35",
    bg: "bg-danger-soft",
  },
};