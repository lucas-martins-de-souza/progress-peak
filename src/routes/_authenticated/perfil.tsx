import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { fetchProfile, saveProfile } from "@/lib/db";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const selectClass =
  "h-11 w-full rounded-sm border border-border bg-transparent px-3 text-sm text-foreground transition-colors focus:border-primary focus:outline-none";
const inputClass =
  "data h-11 rounded-sm border-border bg-transparent text-sm focus-visible:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="label-tech">{label}</p>
      {children}
    </div>
  );
}

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
    <div className="animate-rise space-y-8">
      <div>
        <p className="label-tech text-primary">Atleta</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Perfil</h1>
      </div>

      <div className="space-y-6 border-t border-border pt-6">
        <Field label="Nome">
          <Input
            className={inputClass}
            value={form.name ?? ""}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Idade">
            <Input
              type="number"
              className={inputClass}
              value={form.age ?? ""}
              onChange={(e) => set("age", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Sexo">
            <select
              className={selectClass}
              value={form.sex ?? ""}
              onChange={(e) => set("sex", e.target.value || null)}
            >
              <option value="">Selecione</option>
              {SEXES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Altura (cm)">
            <Input
              type="number"
              className={inputClass}
              value={form.height ?? ""}
              onChange={(e) => set("height", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
          <Field label="Peso (kg)">
            <Input
              type="number"
              className={inputClass}
              value={form.weight ?? ""}
              onChange={(e) => set("weight", e.target.value === "" ? null : Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Objetivo">
          <select
            className={selectClass}
            value={form.goal ?? ""}
            onChange={(e) => set("goal", e.target.value || null)}
          >
            <option value="">Selecione</option>
            {GOALS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Experiência">
            <select
              className={selectClass}
              value={form.experience_level ?? ""}
              onChange={(e) => set("experience_level", e.target.value || null)}
            >
              <option value="">Selecione</option>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Frequência semanal">
            <select
              className={selectClass}
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
          </Field>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 w-full text-[12px] font-semibold uppercase tracking-[0.18em]"
        >
          Salvar perfil
        </Button>
      </div>

      <p className="border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
        Esses dados contextualizam sua experiência no LM Progress. As decisões de progressão são
        baseadas principalmente no seu desempenho real e histórico de treino.
      </p>
    </div>
  );
}
