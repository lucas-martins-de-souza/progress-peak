import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — LM Progress" },
      {
        name: "description",
        content:
          "Acesse sua conta LM Progress e continue registrando treinos, desempenho e progressão por exercício.",
      },
      { property: "og:title", content: "Entrar — LM Progress" },
      {
        property: "og:description",
        content: "Acesse sua conta e continue sua progressão de treino no LM Progress.",
      },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "h-11 rounded-sm border-border bg-transparent text-sm focus-visible:border-primary";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Vamos configurar seu perfil.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else toast.info("Confirme seu e-mail para acessar.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="animate-rise relative z-1 w-full max-w-sm">
        <div className="mb-9">
          <span className="data flex size-9 items-center justify-center border border-primary/50 bg-info-soft text-xs font-bold text-primary">
            LM
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">
            {mode === "signin" ? "Acessar conta" : "Criar conta"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você treina. Você decide o treino. O LM Progress cuida da progressão.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 border-t border-border pt-6">
          {mode === "signup" && (
            <div className="space-y-2">
              <label htmlFor="name" className="label-tech block">
                Nome
              </label>
              <Input
                id="name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="label-tech block">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="label-tech block">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button
            type="submit"
            className="h-12 w-full text-[12px] font-semibold uppercase tracking-[0.18em]"
            disabled={loading}
          >
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          className="h-12 w-full text-[12px] font-semibold uppercase tracking-[0.16em]"
          onClick={handleGoogle}
        >
          Continuar com Google
        </Button>

        <p className="mt-7 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <button
            type="button"
            className="font-semibold text-primary transition-opacity hover:opacity-70"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
