import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
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

const fieldClass =
  "data h-10 rounded-sm border-border bg-transparent text-center text-sm focus-visible:border-primary";

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
    <div className="animate-rise space-y-8">
      <div>
        <p className="label-tech text-primary">Biblioteca</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Meus treinos</h1>
      </div>

      <div className="flex gap-2 border-y border-border py-4">
        <Input
          placeholder="Ex.: Treino A — Pernas"
          className="h-11 rounded-sm border-border bg-transparent text-sm focus-visible:border-primary"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button
          onClick={() => create.mutate()}
          disabled={!newName.trim() || !userId}
          className="h-11 shrink-0 px-4 text-[11px] font-semibold uppercase tracking-[0.14em]"
        >
          <Plus className="size-4" /> Criar
        </Button>
      </div>

      <div className="divide-y divide-border border-b border-border">
        {(workouts.data ?? []).map((w) => (
          <div key={w.id}>
            <div className="flex items-center justify-between gap-2 py-4">
              <button
                className="group flex flex-1 items-center gap-3 text-left"
                onClick={() => setOpenId(openId === w.id ? null : w.id)}
              >
                <ChevronDown
                  className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    openId === w.id ? "rotate-180 text-primary" : ""
                  }`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold">{w.name}</span>
                  <span className="data block text-[11px] text-muted-foreground">
                    {w.workout_exercises.length} exercícios · {weekdayLabels(w.weekdays)}
                  </span>
                </span>
              </button>
              <button
                className="rounded-sm p-2 text-muted-foreground transition-colors hover:text-danger"
                onClick={async () => {
                  await deleteWorkout(w.id);
                  refresh();
                }}
                aria-label="Excluir treino"
              >
                <Trash2 className="size-4" />
              </button>
            </div>


            {openId === w.id && (
              <div className="animate-rise space-y-3 pb-5">
                <WeekdayPicker workoutId={w.id} weekdays={w.weekdays} onChange={refresh} />

                {w.workout_exercises.map((ex) => (
                  <ExerciseEditor key={ex.id} exercise={ex} onChange={refresh} />
                ))}
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-sm border-dashed text-[11px] font-semibold uppercase tracking-[0.14em]"
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
      </div>

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
    <div className="space-y-1.5">
      <p className="label-tech text-[10px]">{label}</p>
      <Input
        type="number"
        step={step}
        className={fieldClass}
        value={String(form[key] ?? "")}
        onChange={(e) => field(key, Number(e.target.value) as never)}
        onBlur={() => persist({ [key]: Number(form[key]) } as Partial<WorkoutExercise>)}
      />
    </div>
  );

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        <span className="data flex size-6 shrink-0 items-center justify-center border border-border text-[11px] font-semibold text-muted-foreground">
          {form.position}
        </span>
        <Input
          className="h-10 rounded-sm border-transparent bg-transparent px-2 text-sm font-semibold focus-visible:border-primary"
          value={form.exercise_name}
          onChange={(e) => field("exercise_name", e.target.value)}
          onBlur={() => persist({ exercise_name: form.exercise_name })}
        />
        <button
          className="rounded-sm p-2 text-muted-foreground transition-colors hover:text-danger"
          onClick={async () => {
            await deleteExercise(exercise.id);
            onChange();
          }}
          aria-label="Excluir exercício"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {num("position", "Ordem")}
        {num("sets", "Séries")}
        {num("target_rir", "RIR alvo")}
        {num("min_reps", "Reps mín.")}
        {num("max_reps", "Reps máx.")}
        {num("current_load", "Carga (kg)", 0.5)}
      </div>
      <div className="mt-3">{num("suggested_increment", "Incremento sugerido (kg)", 0.5)}</div>
    </div>
  );
}
