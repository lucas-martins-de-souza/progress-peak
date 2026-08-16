import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Dumbbell, LayoutDashboard, LogOut, Play, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/hoje", label: "Hoje", icon: Play },
  { to: "/progressao", label: "Progressão", icon: BarChart3 },
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
              LM
            </span>
            <span className="text-sm font-semibold tracking-tight">LM Progress</span>
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-stretch justify-between px-2 py-1.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium text-muted-foreground transition-colors"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}