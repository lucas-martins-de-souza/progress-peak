import { supabase } from "@/integrations/supabase/client";
import type { CheckIn, PastSession, Profile, Workout, WorkoutExercise } from "./types";

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

export async function saveProfile(userId: string, patch: Partial<Profile>) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch } as never)
    .eq("id", userId);
  if (error) throw error;
}

export async function fetchWorkouts(): Promise<(Workout & { workout_exercises: WorkoutExercise[] })[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_exercises(*)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((w) => ({
    ...(w as unknown as Workout),
    workout_exercises: ((w as { workout_exercises: WorkoutExercise[] }).workout_exercises ?? []).sort(
      (a, b) => a.position - b.position,
    ),
  }));
}

export async function createWorkout(userId: string, name: string) {
  const { data, error } = await supabase
    .from("workouts")
    .insert({ user_id: userId, name } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as Workout;
}

export async function deleteWorkout(id: string) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertExercise(ex: Partial<WorkoutExercise> & { user_id: string; workout_id: string }) {
  const { error } = await supabase.from("workout_exercises").upsert(ex as never);
  if (error) throw error;
}

export async function deleteExercise(id: string) {
  const { error } = await supabase.from("workout_exercises").delete().eq("id", id);
  if (error) throw error;
}

export async function updateExercise(id: string, patch: Partial<WorkoutExercise>) {
  const { error } = await supabase.from("workout_exercises").update(patch as never).eq("id", id);
  if (error) throw error;
}

/** Last N sessions for one exercise, most recent first, with its sets. */
export async function fetchExerciseHistory(workoutExerciseId: string, limit = 10): Promise<PastSession[]> {
  const { data, error } = await supabase
    .from("exercise_performance")
    .select("created_at, actual_load, position, suggested_load, decision, set_performance(set_number, reps, rir)")
    .eq("workout_exercise_id", workoutExerciseId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as unknown as {
      created_at: string;
      actual_load: number | null;
      position: number | null;
      set_performance: { set_number: number; reps: number | null; rir: number | null }[];
    };
    return {
      created_at: r.created_at,
      actual_load: r.actual_load,
      position: r.position,
      sets: (r.set_performance ?? []).sort((a, b) => a.set_number - b.set_number),
    };
  });
}

export async function startSession(userId: string, workoutId: string, checkIn: CheckIn) {
  const { data, error } = await supabase
    .from("training_sessions")
    .insert({ user_id: userId, workout_id: workoutId, ...checkIn } as never)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as { id: string };
}

export async function saveExercisePerformance(payload: {
  userId: string;
  sessionId: string;
  exercise: WorkoutExercise;
  suggestedLoad: number;
  actualLoad: number;
  decision: string;
  rationale: string;
  sets: { set_number: number; reps: number | null; rir: number | null }[];
}) {
  const { data, error } = await supabase
    .from("exercise_performance")
    .upsert(
      {
        session_id: payload.sessionId,
        workout_exercise_id: payload.exercise.id,
        user_id: payload.userId,
        previous_load: payload.exercise.current_load,
        suggested_load: payload.suggestedLoad,
        actual_load: payload.actualLoad,
        decision: payload.decision,
        rationale: payload.rationale,
        position: payload.exercise.position,
      } as never,
      { onConflict: "session_id,workout_exercise_id" },
    )
    .select()
    .single();
  if (error) throw error;
  const perf = data as unknown as { id: string };

  await supabase.from("set_performance").delete().eq("exercise_performance_id", perf.id);
  const rows = payload.sets.map((s) => ({
    exercise_performance_id: perf.id,
    user_id: payload.userId,
    set_number: s.set_number,
    reps: s.reps,
    rir: s.rir,
  }));
  if (rows.length > 0) {
    const { error: setErr } = await supabase.from("set_performance").insert(rows as never);
    if (setErr) throw setErr;
  }
  // The load the user actually used becomes the new current load for the exercise.
  await updateExercise(payload.exercise.id, { current_load: payload.actualLoad });
  return perf.id;
}

export async function completeSession(sessionId: string) {
  const { error } = await supabase
    .from("training_sessions")
    .update({ completed_at: new Date().toISOString() } as never)
    .eq("id", sessionId);
  if (error) throw error;
}

export async function countSessions(): Promise<number> {
  const { count, error } = await supabase
    .from("training_sessions")
    .select("id", { count: "exact", head: true })
    .not("completed_at", "is", null);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchLastSession() {
  const { data, error } = await supabase
    .from("training_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (CheckIn & { id: string; workout_id: string; started_at: string; completed_at: string | null }) | null;
}