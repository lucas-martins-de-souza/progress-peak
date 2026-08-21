import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Dumbbell, LayoutDashboard, LogOut, Play, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/hoje", label: "Hoje", icon: Play },
  { to: "/progressao", label: "Relatório", icon: BarChart3 },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center border border-primary/50 bg-info-soft text-[10px] font-bold text-primary data">
              LM
            </span>
            <span className="text-[13px] font-semibold uppercase tracking-[0.18em]">
              LM Progress
            </span>
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="relative z-1 mx-auto max-w-3xl px-5 pb-28 pt-7">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2 py-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground transition-colors duration-200 hover:text-foreground"
              activeProps={{ className: "text-primary" }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute inset-x-4 top-0 h-px transition-opacity duration-200 ${
                      isActive ? "bg-primary opacity-100" : "opacity-0"
                    }`}
                  />
                  <Icon className="size-[18px]" strokeWidth={1.75} />
                  {label}
                </>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
