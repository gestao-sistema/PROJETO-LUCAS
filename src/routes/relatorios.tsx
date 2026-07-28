import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Origin, PurchaseOrder } from "@/lib/store";
import { useStore } from "@/lib/store";
import { useInbound, formatMoney } from "@/lib/inbound";
import { StageBadge, OriginBadge } from "@/components/StageBadge";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/relatorios")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { profile, loading } = useProfile.getState();
    if (loading) return;
    if (profile?.role !== "Admin") throw redirect({ to: "/pedidos" });
  },
  head: () => ({
    meta: [
      { title: "Relatórios — Operações Azime" },
      { name: "description", content: "Histórico de pedidos e fornecedores." },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const orders = useStore((s) => s.orders);
  const columns = useStore((s) => s.columns);
  const embarques = useInbound((s) => s.lots);
  const embarqueMap = useMemo(() => new Map(embarques.map((e) => [e.id, e])), [embarques]);

  const [origin, setOrigin] = useState<"todos" | Origin>("todos");
  const [supplier, setSupplier] = useState<string>("todos");
  const [stage, setStage] = useState<string>("todos");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const suppliers = useMemo(
    () => Array.from(new Set(orders.map((o) => o.supplier))).sort(),
    [orders],
  );

  const filtered = orders.filter((o) => {
    if (origin !== "todos" && o.origin !== origin) return false;
    if (supplier !== "todos" && o.supplier !== supplier) return false;
    if (stage !== "todos" && o.currentStage !== stage) return false;
    if (q && !o.code.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const open = orders.find((o) => o.id === openId) ?? null;

  function exportCsv() {
    const header = "Codigo,Fornecedor,Origem,Etapa,Valor,Moeda,Emissao,Previsao,VolumesRecebidos\n";
    const rows = filtered
      .map((o) => {
        const emb = embarqueMap.get(o.embarkId);
        const colLabel = columns.find((c) => c.id === o.currentStage)?.label ?? o.currentStage;
        return `${o.code},${o.supplier},${o.origin},${colLabel},${o.totalValue},${o.currency},${o.issueDate},${emb?.etaDate ?? ""},${o.volumesReceived}`;
      })
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorio-pedidos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Histórico de pedidos com filtros por origem, fornecedor e etapa.
          </p>
        </div>
        <Button onClick={exportCsv} variant="outline" className="rounded-full">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-4">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar código…"
            className="pl-9"
          />
        </div>
        <Select value={origin} onValueChange={(v) => setOrigin(v as typeof origin)}>
          <SelectTrigger>
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas origens</SelectItem>
            <SelectItem value="china">China</SelectItem>
            <SelectItem value="nacional">Nacional</SelectItem>
          </SelectContent>
        </Select>
        <Select value={supplier} onValueChange={setSupplier}>
          <SelectTrigger>
            <SelectValue placeholder="Fornecedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos fornecedores</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger>
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas etapas</SelectItem>
            {columns.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Código</th>
                <th className="px-5 py-3 font-medium">Origem</th>
                <th className="px-5 py-3 font-medium">Fornecedor</th>
                <th className="px-5 py-3 font-medium">Etapa</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Previsão</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const emb = embarqueMap.get(o.embarkId);
                return (
                  <tr
                    key={o.id}
                    onClick={() => setOpenId(o.id)}
                    className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/60"
                  >
                    <td className="px-5 py-3 font-medium">{o.code}</td>
                    <td className="px-5 py-3">
                      <OriginBadge origin={o.origin} />
                    </td>
                    <td className="px-5 py-3 text-foreground/80">{o.supplier}</td>
                    <td className="px-5 py-3">
                      <StageBadge stage={o.currentStage} />
                    </td>
                    <td className="px-5 py-3 tabular-nums">
                      {formatMoney(o.totalValue, o.currency as "USD" | "BRL")}
                    </td>
                    <td className="px-5 py-3 text-foreground/70">{emb?.etaDate ?? "—"}</td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      <FileText className="ml-auto h-4 w-4" />
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                    Nenhum pedido encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DocumentsDialog order={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function DocumentsDialog({ order, onClose }: { order: PurchaseOrder | null; onClose: () => void }) {
  const columns = useStore((s) => s.columns);
  const embarques = useInbound((s) => s.lots);
  const embarqueMap = useMemo(() => new Map(embarques.map((e) => [e.id, e])), [embarques]);

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg rounded-2xl border-border shadow-md">
        {order && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {order.code}
              </DialogTitle>
              <DialogDescription>
                {order.supplier} ·{" "}
                {columns.find((c) => c.id === order.currentStage)?.label ?? order.currentStage}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-4 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Valor
                  </div>
                  <div className="font-semibold tabular-nums">
                    {formatMoney(order.totalValue, order.currency as "USD" | "BRL")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Frete
                  </div>
                  <div className="font-semibold tabular-nums">
                    R$ {order.freightCost.toLocaleString("pt-BR")}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Emissão
                  </div>
                  <div className="font-medium">{order.issueDate}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Previsão (embarque)
                  </div>
                  <div className="font-medium">
                    {embarqueMap.get(order.embarkId)?.etaDate ?? "—"}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Embarque</h3>
                <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground/80">
                  <FileText className="mr-2 inline h-4 w-4 text-muted-foreground" />
                  {order.embarque}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Volumes recebidos</h3>
                <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  {order.volumesReceived} recebidos
                  {(() => {
                    const emb = embarqueMap.get(order.embarkId);
                    return emb ? ` · ${emb.volumesExpected} esperados (embarque)` : "";
                  })()}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Prioridade</h3>
                <div className="text-sm text-foreground/80">{order.priority ? "Sim" : "Não"}</div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
