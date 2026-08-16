import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  createWorkout,
  deleteExercise,
  deleteWorkout,
  fetchWorkouts,
  updateExercise,
  upsertExercise,
} from "@/lib/db";
import type { WorkoutExercise } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/treinos")({
  head: () => ({
    meta: [
      { title: "Meus treinos — LM Progress" },
      {
        name: "description",
        content: "Monte seus treinos: exercícios, séries, faixa de repetições, cargas e RIR alvo.",
      },
      { property: "og:title", content: "Meus treinos — LM Progress" },
      { property: "og:description", content: "Monte e edite seus próprios treinos." },
    ],
  }),
  component: TreinosPage,
});

function TreinosPage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: fetchWorkouts });
  const [newName, setNewName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["workouts"] });

  const create = useMutation({
    mutationFn: () => createWorkout(userId!, newName.trim()),
    onSuccess: () => {
      setNewName("");
      toast.success("Treino criado.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Meus treinos</h1>

      <div className="flex gap-2 rounded-2xl border border-border bg-card p-4 shadow-card">
        <Input
          placeholder="Ex.: Treino A — Pernas"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button onClick={() => create.mutate()} disabled={!newName.trim() || !userId}>
          <Plus className="size-4" /> Criar
        </Button>
      </div>

      {(workouts.data ?? []).map((w) => (
        <div key={w.id} className="rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between p-5">
            <button
              className="flex-1 text-left"
              onClick={() => setOpenId(openId === w.id ? null : w.id)}
            >
              <p className="font-semibold">{w.name}</p>
              <p className="text-sm text-muted-foreground">
                {w.workout_exercises.length} exercícios
              </p>
            </button>
            <div className="flex items-center gap-1">
              <button
                className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
                onClick={() => setOpenId(openId === w.id ? null : w.id)}
              >
                {openId === w.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              <button
                className="rounded-md p-2 text-danger hover:bg-danger-soft"
                onClick={async () => {
                  await deleteWorkout(w.id);
                  refresh();
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          {openId === w.id && (
            <div className="space-y-3 border-t border-border p-5">
              {w.workout_exercises.map((ex) => (
                <ExerciseEditor key={ex.id} exercise={ex} onChange={refresh} />
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  await upsertExercise({
                    user_id: userId!,
                    workout_id: w.id,
                    exercise_name: "Novo exercício",
                    position: w.workout_exercises.length + 1,
                    sets: 3,
                    min_reps: 10,
                    max_reps: 15,
                    current_load: 0,
                    suggested_increment: 2.5,
                    target_rir: 2,
                  });
                  refresh();
                }}
              >
                <Plus className="size-4" /> Adicionar exercício
              </Button>
            </div>
          )}
        </div>
      ))}

      {workouts.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Você ainda não criou nenhum treino. Comece pelo campo acima.
        </p>
      )}
    </div>
  );
}

function ExerciseEditor({
  exercise,
  onChange,
}: {
  exercise: WorkoutExercise;
  onChange: () => void;
}) {
  const [form, setForm] = useState(exercise);

  function field<K extends keyof WorkoutExercise>(key: K, value: WorkoutExercise[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function persist(patch: Partial<WorkoutExercise>) {
    await updateExercise(exercise.id, patch);
    onChange();
  }

  const num = (key: keyof WorkoutExercise, label: string, step = 1) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        step={step}
        value={String(form[key] ?? "")}
        onChange={(e) => field(key, Number(e.target.value) as never)}
        onBlur={() => persist({ [key]: Number(form[key]) } as Partial<WorkoutExercise>)}
      />
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold">
          {form.position}
        </span>
        <Input
          value={form.exercise_name}
          onChange={(e) => field("exercise_name", e.target.value)}
          onBlur={() => persist({ exercise_name: form.exercise_name })}
        />
        <button
          className="rounded-md p-2 text-danger hover:bg-danger-soft"
          onClick={async () => {
            await deleteExercise(exercise.id);
            onChange();
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {num("position", "Ordem")}
        {num("sets", "Séries")}
        {num("target_rir", "RIR alvo")}
        {num("min_reps", "Reps mín.")}
        {num("max_reps", "Reps máx.")}
        {num("current_load", "Carga (kg)", 0.5)}
      </div>
      <div className="mt-2 grid grid-cols-1">{num("suggested_increment", "Incremento sugerido (kg)", 0.5)}</div>
    </div>
  );
}