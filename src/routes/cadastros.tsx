import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Building2, Coins, Users, UserPlus, Gem } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Cargo, Origin } from "@/lib/store";
import { useStore } from "@/lib/store";
import { useProfile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { Avatar } from "./pedidos";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastros")({
  beforeLoad: () => {
    const role = useProfile.getState().profile?.role;
    if (!["Admin", "Gerente", "Coordenador"].includes(role ?? ""))
      throw redirect({ to: "/pedidos" });
  },
  head: () => ({
    meta: [
      { title: "Cadastros — Operações Azime" },
      {
        name: "description",
        content: "Cadastro de fornecedores, moedas e colaboradores.",
      },
    ],
  }),
  component: CadastrosPage,
});

type Tab = "fornecedores" | "moedas" | "colaboradores" | "pedras";

function CadastrosPage() {
  const [tab, setTab] = useState<Tab>("fornecedores");

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "fornecedores", label: "Fornecedores", icon: Building2 },
    { id: "moedas", label: "Moedas", icon: Coins },
    { id: "colaboradores", label: "Colaboradores", icon: Users },
    { id: "pedras", label: "Pedras", icon: Gem },
  ];

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <header className="pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Cadastros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie fornecedores, moedas e colaboradores do sistema.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-full bg-muted p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "fornecedores" && <FornecedoresSection />}
      {tab === "moedas" && <MoedasSection />}
      {tab === "colaboradores" && <ColaboradoresSection />}
      {tab === "pedras" && <PedrasSection />}
    </div>
  );
}

/* ============== PEDRAS (#11) ============== */

const PEDRA_PRESETS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#6b7280",
  "#0f172a",
];

function PedrasSection() {
  const pedras = useStore((s) => s.pedras);
  const addPedra = useStore((s) => s.addPedra);
  const removePedra = useStore((s) => s.removePedra);

  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(PEDRA_PRESETS[0]);

  function add() {
    if (!nome.trim()) return;
    addPedra(nome.trim(), cor);
    setNome("");
    toast.success("Pedra cadastrada.");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> Nova pedra
        </div>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Nome
            </Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Cor</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-xl border border-border"
              />
              <Input
                value={cor}
                onChange={(e) => {
                  if (/^#[0-9a-f]{6}$/i.test(e.target.value)) setCor(e.target.value);
                }}
                className="flex-1 rounded-xl font-mono text-sm"
                placeholder="#000000"
              />
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {PEDRA_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCor(c)}
                  className={`h-7 w-7 rounded-full transition ${
                    cor === c ? "ring-2 ring-offset-2 ring-foreground" : ""
                  }`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <Button disabled={!nome.trim()} onClick={add} className="w-full rounded-xl">
            <Plus className="h-4 w-4" /> Cadastrar
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2">
        {pedras.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Gem className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-medium">Nenhuma pedra cadastrada</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Cadastre pedras para etiquetar lotes por cor.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {pedras.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 rounded-lg border-l-4"
                    style={{
                      background: `color-mix(in srgb, ${p.cor} 15%, white)`,
                      borderLeftColor: p.cor,
                    }}
                  />
                  <div className="text-sm font-semibold">{p.nome}</div>
                  <span className="font-mono text-xs text-muted-foreground">{p.cor}</span>
                </div>
                <button
                  onClick={() => {
                    removePedra(p.id);
                    toast.success("Pedra removida.");
                  }}
                  className="text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== FORNECEDORES (#3: nome + país origem only) ============== */

function FornecedoresSection() {
  const suppliers = useStore((s) => s.suppliers);
  const addSupplier = useStore((s) => s.addSupplier);
  const removeSupplier = useStore((s) => s.removeSupplier);

  const [name, setName] = useState("");
  const [origin, setOrigin] = useState<Origin>("china");

  function add() {
    if (!name.trim()) return;
    addSupplier(name.trim(), origin);
    setName("");
    setOrigin("china");
    toast.success("Fornecedor cadastrado.");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> Novo fornecedor
        </div>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Nome
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              País de origem
            </Label>
            <Select value={origin} onValueChange={(v) => setOrigin(v as Origin)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="china">China</SelectItem>
                <SelectItem value="nacional">Nacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={!name.trim()} onClick={add} className="w-full rounded-xl">
            <Plus className="h-4 w-4" /> Cadastrar
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2">
        {suppliers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Building2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-medium">Nenhum fornecedor</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Cadastre fornecedores para agilizar a criação de embarques.
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="w-0" />
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.origin === "china" ? "China" : "Nacional"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          removeSupplier(s.id);
                          toast.success("Fornecedor removido.");
                        }}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== MOEDAS ============== */

function MoedasSection() {
  const currencies = useStore((s) => s.currencies);
  const addCurrency = useStore((s) => s.addCurrency);
  const removeCurrency = useStore((s) => s.removeCurrency);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  function add() {
    if (!code.trim() || !name.trim()) return;
    addCurrency(code.trim(), name.trim(), symbol.trim() || "$");
    setCode("");
    setName("");
    setSymbol("");
    toast.success("Moeda cadastrada.");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Plus className="h-3.5 w-3.5" /> Nova moeda
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Código
              </Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Símbolo
              </Label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Nome
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <Button
            disabled={!code.trim() || !name.trim()}
            onClick={add}
            className="w-full rounded-xl"
          >
            <Plus className="h-4 w-4" /> Cadastrar
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2">
        {currencies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Coins className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-medium">Nenhuma moeda cadastrada</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Cadastre moedas para uso nos embarques e lotes.
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Símbolo</th>
                  <th className="w-0" />
                </tr>
              </thead>
              <tbody>
                {currencies.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3 font-semibold">{c.code}</td>
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.symbol}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          removeCurrency(c.id);
                          toast.success("Moeda removida.");
                        }}
                        className="text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== COLABORADORES (#4, #17) ============== */

function ColaboradoresSection() {
  const team = useStore((s) => s.team);
  const addColaborador = useStore((s) => s.addColaborador);
  const removeColaborador = useStore((s) => s.removeColaborador);
  const syncAll = useStore((s) => s.syncAll);

  const [name, setName] = useState("");
  const [role, setRole] = useState<Cargo>("Auxiliar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function add() {
    if (!name.trim() || !email.trim()) return;
    if (password !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (!email.trim().endsWith("@azime.com.br")) {
      toast.error("Use um e-mail institucional (@azime.com.br).");
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { email: email.trim(), password, name: name.trim(), role },
      });

      if (error) {
        let msg = "Erro desconhecido.";
        try {
          const body = await (error as any).context?.json?.();
          msg = body?.error ?? error.message;
        } catch {
          msg = error.message;
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      toast.success("Colaborador criado com acesso ao sistema.");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setRole("Auxiliar");
      await syncAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar colaborador.");
    }
    setCreating(false);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <UserPlus className="h-3.5 w-3.5" /> Novo colaborador
        </div>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Nome
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Cargo
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v as Cargo)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                <SelectItem value="Analista">Analista</SelectItem>
                <SelectItem value="Gerente">Gerente</SelectItem>
                <SelectItem value="Coordenador">Coordenador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              E-mail institucional
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@azime.com.br"
              className="rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Senha
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Confirmar senha
              </Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <Button
            disabled={!name.trim() || !email.trim() || !password || creating}
            onClick={add}
            className="w-full rounded-xl"
          >
            {creating ? (
              "Criando..."
            ) : (
              <>
                <Plus className="h-4 w-4" /> Cadastrar
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="lg:col-span-2">
        {team.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <div className="text-sm font-medium">Nenhum colaborador</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Cadastre colaboradores para atribuir tarefas e acessar o sistema.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {team.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <Avatar member={m} size={40} />
                  <div>
                    <div className="text-sm font-semibold">{m.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                        {m.role}
                      </span>
                      {m.email && <span>{m.email}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (confirm(`Remover ${m.name}?`)) {
                      try {
                        await removeColaborador(m.id);
                        toast.success("Colaborador removido.");
                      } catch {
                        toast.error("Erro ao remover colaborador.");
                      }
                    }
                  }}
                  className="text-muted-foreground hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
