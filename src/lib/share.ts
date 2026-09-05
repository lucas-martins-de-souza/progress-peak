import { supabase } from "@/integrations/supabase/client";
import type { Workout, WorkoutExercise } from "./types";

export const SHARE_FORMAT = "loadwise-workout";
export const SHARE_VERSION = 1;
export const SHARE_FILE_EXT = ".loadwise";

/** Estrutura do exercício compartilhada (sem cargas, PR, histórico ou dados pessoais). */
export interface SharedExercise {
  exercise_name: string;
  position: number;
  sets: number;
  min_reps: number;
  max_reps: number;
  target_rir: number;
  suggested_increment: number;
}

export interface SharedWorkout {
  name: string;
  weekdays: number[];
  exercises: SharedExercise[];
}

export interface ShareDocument {
  format: typeof SHARE_FORMAT;
  version: number;
  code?: string;
  workout: SharedWorkout;
}

export type WorkoutWithExercises = Workout & { workout_exercises: WorkoutExercise[] };

/** Extrai somente a estrutura do treino — nunca cargas, histórico ou identificadores da conta. */
export function toSharedWorkout(workout: WorkoutWithExercises): SharedWorkout {
  return {
    name: workout.name,
    weekdays: [...(workout.weekdays ?? [])].sort((a, b) => a - b),
    exercises: [...(workout.workout_exercises ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((ex, i) => ({
        exercise_name: ex.exercise_name,
        position: ex.position ?? i + 1,
        sets: ex.sets,
        min_reps: ex.min_reps,
        max_reps: ex.max_reps,
        target_rir: ex.target_rir,
        suggested_increment: ex.suggested_increment,
      })),
  };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `LW-${out}`;
}

export function normalizeCode(input: string): string | null {
  const raw = input.trim().toUpperCase();
  const fromUrl = raw.match(/(?:SHARE=|WORKOUT\/|LOADWISE:)?(LW-[A-Z0-9]{4,10})/);
  const code = fromUrl?.[1] ?? (raw.startsWith("LW-") ? raw : `LW-${raw.replace(/^LW/, "")}`);
  return /^LW-[A-Z0-9]{4,10}$/.test(code) ? code : null;
}

/** Conteúdo codificado no QR Code: apenas o código do compartilhamento. */
export function shareQrValue(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://loadwise.app";
  return `${origin}/treinos?share=${code}`;
}

/** Cria (ou reaproveita) o compartilhamento de um treino e devolve o código. */
export async function createShare(userId: string, workout: WorkoutWithExercises): Promise<string> {
  const payload = toSharedWorkout(workout);

  const { data: existing } = await supabase
    .from("workout_shares")
    .select("code")
    .eq("created_by", userId)
    .eq("payload->>name", payload.name)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const code = (existing as { code: string }).code;
    const { error: upErr } = await supabase
      .from("workout_shares")
      .update({ payload } as never)
      .eq("code", code);
    if (upErr) throw upErr;
    return code;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { error } = await supabase
      .from("workout_shares")
      .insert({ code, payload, created_by: userId } as never);
    if (!error) return code;
    if (error.code !== "23505") throw error;
  }
  throw new Error("Não foi possível gerar um código de compartilhamento.");
}

export async function fetchShare(code: string): Promise<SharedWorkout | null> {
  const { data, error } = await supabase
    .from("workout_shares")
    .select("payload")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const parsed = parseSharedWorkout((data as { payload: unknown }).payload);
  return parsed;
}

function isNum(v: unknown) {
  return typeof v === "number" && Number.isFinite(v);
}

/** Valida a estrutura recebida (arquivo, código ou QR). Devolve null quando inválida. */
export function parseSharedWorkout(value: unknown): SharedWorkout | null {
  if (!value || typeof value !== "object") return null;
  const w = value as Record<string, unknown>;
  if (typeof w["name"] !== "string" || !Array.isArray(w["exercises"])) return null;
  const weekdays = Array.isArray(w["weekdays"])
    ? (w["weekdays"] as unknown[]).filter(isNum).map(Number).filter((d) => d >= 0 && d <= 6)
    : [];
  const exercises: SharedExercise[] = [];
  for (const raw of w["exercises"] as unknown[]) {
    if (!raw || typeof raw !== "object") return null;
    const e = raw as Record<string, unknown>;
    if (typeof e["exercise_name"] !== "string") return null;
    exercises.push({
      exercise_name: e["exercise_name"],
      position: isNum(e["position"]) ? (e["position"] as number) : exercises.length + 1,
      sets: isNum(e["sets"]) ? (e["sets"] as number) : 3,
      min_reps: isNum(e["min_reps"]) ? (e["min_reps"] as number) : 8,
      max_reps: isNum(e["max_reps"]) ? (e["max_reps"] as number) : 12,
      target_rir: isNum(e["target_rir"]) ? (e["target_rir"] as number) : 2,
      suggested_increment: isNum(e["suggested_increment"]) ? (e["suggested_increment"] as number) : 2.5,
    });
  }
  return { name: w["name"], weekdays, exercises };
}

export function buildShareFile(workout: SharedWorkout, code?: string): { filename: string; content: string } {
  const doc: ShareDocument = { format: SHARE_FORMAT, version: SHARE_VERSION, workout };
  if (code) doc.code = code;
  const slug = workout.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return {
    filename: `${slug || "treino"}${SHARE_FILE_EXT}`,
    content: JSON.stringify(doc, null, 2),
  };
}

export type FileParseResult =
  | { ok: true; workout: SharedWorkout }
  | { ok: false; reason: "invalid" | "version" };

export function parseShareFile(text: string): FileParseResult {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (!doc || typeof doc !== "object") return { ok: false, reason: "invalid" };
  const d = doc as Record<string, unknown>;
  if (d["format"] !== SHARE_FORMAT) return { ok: false, reason: "invalid" };
  const version = d["version"];
  if (!isNum(version) || (version as number) < 1) return { ok: false, reason: "invalid" };
  if ((version as number) > SHARE_VERSION) return { ok: false, reason: "version" };
  const workout = parseSharedWorkout(d["workout"]);
  if (!workout) return { ok: false, reason: "invalid" };
  return { ok: true, workout };
}

/** Cria uma cópia independente do treino na conta de quem importou. */
export async function importSharedWorkout(
  userId: string,
  shared: SharedWorkout,
  sourceCode?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: userId,
      name: shared.name,
      weekdays: shared.weekdays,
      source_share_code: sourceCode ?? null,
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  const workoutId = (data as { id: string }).id;

  const rows = shared.exercises.map((ex, i) => ({
    workout_id: workoutId,
    user_id: userId,
    exercise_name: ex.exercise_name,
    position: ex.position ?? i + 1,
    sets: ex.sets,
    min_reps: ex.min_reps,
    max_reps: ex.max_reps,
    target_rir: ex.target_rir,
    suggested_increment: ex.suggested_increment,
    current_load: 0,
  }));
  if (rows.length > 0) {
    const { error: exErr } = await supabase.from("workout_exercises").insert(rows as never);
    if (exErr) throw exErr;
  }
  return workoutId;
}

/** Detecta se um treino equivalente já foi importado antes. */
export async function findExistingImport(shared: SharedWorkout, sourceCode?: string) {
  const { data, error } = await supabase.from("workouts").select("id, name, source_share_code");
  if (error) throw error;
  const list = (data ?? []) as { id: string; name: string; source_share_code: string | null }[];
  return (
    list.find((w) => (sourceCode ? w.source_share_code === sourceCode : false)) ??
    list.find((w) => w.name.trim().toLowerCase() === shared.name.trim().toLowerCase()) ??
    null
  );
}
