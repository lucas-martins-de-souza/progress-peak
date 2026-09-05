import type { Workout } from "./types";

export const WEEKDAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 0, label: "Domingo", short: "Dom" },
];

/** Dia da semana atual (0 = domingo). */
export function todayWeekday(date = new Date()): number {
  return date.getDay();
}

/** Treinos programados pelo usuário para um dia da semana. */
export function workoutsForDay<T extends Workout>(workouts: T[], day: number): T[] {
  return workouts.filter((w) => (w.weekdays ?? []).includes(day));
}

export function weekdayLabels(days: number[] | null | undefined): string {
  const list = WEEKDAYS.filter((d) => (days ?? []).includes(d.value)).map((d) => d.short);
  return list.length > 0 ? list.join(" · ") : "Sem dias definidos";
}
