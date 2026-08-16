import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, saveProfile } from "@/lib/db";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil — LM Progress" },
      {
        name: "description",
        content: "Seus dados de contextualização: objetivo, experiência e frequência semanal.",
      },
      { property: "og:title", content: "Perfil — LM Progress" },
      { property: "og:description", content: "Dados de contextualização do seu treino." },
    ],
  }),
  component: PerfilPage,
});

const GOALS = ["Hipertrofia", "Emagrecimento", "Recomposição corporal", "Força", "Manutenção", "Outro"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"];
const SEXES = ["Masculino", "Feminino", "Outro"];

function PerfilPage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function set<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      await saveProfile(userId, {
        name: form.name ?? "",
        age: form.age ?? null,
        sex: form.sex ?? null,
        height: form.height ?? null,
        weight: form.weight ?? null,
        goal: form.goal ?? null,
        experience_level: form.experience_level ?? null,
        weekly_frequency: form.weekly_frequency ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Perfil atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Idade</Label>
            <Input
              type="number"
              value={form.age ?? ""}
              onChange={(e) => set("age", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sexo</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.sex ?? ""}
              onChange={(e) => set("sex", e.target.value || null)}
            >
              <option value="">Selecione</option>
              {SEXES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Altura (cm)</Label>
            <Input
              type="number"
              value={form.height ?? ""}
              onChange={(e) => set("height", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Peso (kg)</Label>
            <Input
              type="number"
              value={form.weight ?? ""}
              onChange={(e) => set("weight", e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Objetivo</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.goal ?? ""}
            onChange={(e) => set("goal", e.target.value || null)}
          >
            <option value="">Selecione</option>
            {GOALS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Experiência</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.experience_level ?? ""}
              onChange={(e) => set("experience_level", e.target.value || null)}
            >
              <option value="">Selecione</option>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Frequência semanal</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.weekly_frequency ?? ""}
              onChange={(e) =>
                set("weekly_frequency", e.target.value === "" ? null : Number(e.target.value))
              }
            >
              <option value="">Selecione</option>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "dia" : "dias"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          Salvar perfil
        </Button>
      </div>

      <p className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">
        Esses dados contextualizam sua experiência no LM Progress. As decisões de progressão são
        baseadas principalmente no seu desempenho real e histórico de treino.
      </p>
    </div>
  );
}