import { Outlet } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ProfileMenu } from "./ProfileMenu";
import { useProfile } from "@/lib/profile";
import { useStore } from "@/lib/store";
import { useInbound } from "@/lib/inbound";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import logoLight from "../../public/logo-light.png?url";
import logoDark from "../../public/logo-dark.png?url";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

export function AppLayout({ children }: { children?: ReactNode }) {
  const loggedIn = useProfile((s) => s.loggedIn);
  const loading = useProfile((s) => s.loading);
  const refreshProfile = useProfile((s) => s.refreshProfile);
  const syncAll = useStore((s) => s.syncAll);
  const syncInbound = useInbound((s) => s.syncAll);
  const ensureFinalizadoColumn = useStore((s) => s.ensureFinalizadoColumn);
  const [synced, setSynced] = useState(false);
  useTheme();

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (loggedIn && !synced) {
      syncAll();
      syncInbound();
      ensureFinalizadoColumn();
      setSynced(true);
    }
    if (!loggedIn) setSynced(false);
  }, [loggedIn, synced, syncAll, syncInbound, ensureFinalizadoColumn]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <>
        <LoginScreen />
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur md:px-6">
            <SidebarTrigger className="h-9 w-9" />
            <div className="ml-auto">
              <ProfileMenu />
            </div>
          </header>
          <main className="min-w-0 flex-1">{children ?? <Outlet />}</main>
        </div>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}

function LoginScreen() {
  const login = useProfile((s) => s.login);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { error: loginError } = await login(identifier, password);
      if (loginError) {
        const msg =
          typeof loginError === "string" ? loginError : "Erro ao conectar. Tente novamente.";
        setError(msg);
      }
    } catch (err) {
      setError("Erro ao conectar. Verifique sua conexão.");
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-xl"
      >
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <img src={logoLight} alt="Logo" className="h-10 w-10 dark:hidden" />
          <img src={logoDark} alt="Logo" className="hidden h-10 w-10 dark:block" />
        </div>
        <h1 className="text-center text-xl font-semibold tracking-tight">Operações Azime</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Faça login para acessar o sistema
        </p>

        <div className="mt-6 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Email"
              className="rounded-xl"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Senha
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="rounded-xl"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={!identifier || !password || submitting}
          className="mt-5 w-full rounded-xl"
        >
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
