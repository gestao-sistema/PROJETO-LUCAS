import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo } from "react";
import { Truck, Target, DollarSign, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useStore, daysBetween, isLate, totalDivergences, DONE_STAGE_ID } from "@/lib/store";
import { useInbound } from "@/lib/inbound";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { profile, loading } = useProfile.getState();
    if (loading) return;
    if (profile?.role !== "Admin") throw redirect({ to: "/pedidos" });
  },
  head: () => ({
    meta: [
      { title: "Dashboard — Operações Azime" },
      {
        name: "description",
        content: "Visão executiva de pedidos em trânsito, OTIF e qualidade.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const orders = useStore((s) => s.orders);
  const embarques = useInbound((s) => s.lots);
  const embarqueMap = useMemo(() => new Map(embarques.map((e) => [e.id, e])), [embarques]);

  const doneId = DONE_STAGE_ID;

  const stats = useMemo(() => {
    const inFlow = orders.filter((o) => o.currentStage !== doneId);
    const finalized = orders.filter((o) => o.currentStage === doneId);

    const otifOk = finalized.filter((o) => {
      const emb = embarqueMap.get(o.embarkId);
      const done = o.history.find((h) => h.stage === doneId);
      return done && emb && done.date <= emb.etaDate;
    }).length;
    const otif = finalized.length ? Math.round((otifOk / finalized.length) * 100) : 0;

    const freightOrders = orders.filter((o) => o.freightCost > 0);
    const avgFreight = freightOrders.length
      ? Math.round(freightOrders.reduce((a, b) => a + b.freightCost, 0) / freightOrders.length)
      : 0;

    // volumes esperados vêm do embarque
    const totalExpected = orders.reduce(
      (a, b) => a + (embarqueMap.get(b.embarkId)?.volumesExpected ?? 0),
      0,
    );
    const totalDiv = orders.reduce((a, b) => a + totalDivergences(b), 0);
    const divRate = totalExpected ? Math.round((totalDiv / totalExpected) * 1000) / 10 : 0;

    return {
      inFlowCount: inFlow.length,
      otif,
      avgFreight,
      divRate,
    };
  }, [orders, embarqueMap, doneId]);

  const mix = useMemo(() => {
    const incoming = orders.filter((o) => o.currentStage !== doneId);
    const china = incoming
      .filter((o) => o.origin === "china")
      .reduce((a, b) => a + (embarqueMap.get(b.embarkId)?.volumesExpected ?? 0), 0);
    const nacional = incoming
      .filter((o) => o.origin === "nacional")
      .reduce((a, b) => a + (embarqueMap.get(b.embarkId)?.volumesExpected ?? 0), 0);
    return [
      { name: "China", value: china, fill: "var(--chart-china)" },
      { name: "Nacional", value: nacional, fill: "var(--chart-nacional)" },
    ];
  }, [orders, embarqueMap, doneId]);

  const leadTimes = useMemo(() => {
    const bySupplier = new Map<string, { sum: number; count: number }>();
    orders.forEach((o) => {
      const done = o.history.find((h) => h.stage === doneId);
      if (!done) return;
      const lead = daysBetween(o.issueDate, done.date);
      const cur = bySupplier.get(o.supplier) ?? { sum: 0, count: 0 };
      cur.sum += lead;
      cur.count += 1;
      bySupplier.set(o.supplier, cur);
    });
    return Array.from(bySupplier.entries())
      .map(([supplier, { sum, count }]) => ({
        supplier: supplier.length > 22 ? supplier.slice(0, 22) + "…" : supplier,
        dias: Math.round(sum / count),
      }))
      .sort((a, b) => b.dias - a.dias);
  }, [orders, doneId]);

  const lateOrders = orders.filter((o) => {
    const emb = embarqueMap.get(o.embarkId);
    return isLate(o, emb?.etaDate);
  });
  const withDivergences = orders.filter(
    (o) => totalDivergences(o) > 0 && o.currentStage !== doneId,
  );

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <header className="pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão executiva da logística de entrada — China e Nacional.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Truck}
          label="Lotes no fluxo"
          value={stats.inFlowCount.toString()}
          hint="Excluindo lotes já em estoque"
        />
        <Kpi
          icon={Target}
          label="OTIF geral"
          value={`${stats.otif}%`}
          hint="On-time, in-full (finalizados)"
          tone={stats.otif >= 90 ? "good" : stats.otif >= 75 ? "warn" : "bad"}
        />
        <Kpi
          icon={DollarSign}
          label="Frete médio / lote"
          value={`R$ ${stats.avgFreight.toLocaleString("pt-BR")}`}
          hint="Considera lotes com frete"
        />
        <Kpi
          icon={AlertTriangle}
          label="Taxa de divergência"
          value={`${stats.divRate}%`}
          hint="Faltas+Sobras+Avarias / Volumes"
          tone={stats.divRate <= 1 ? "good" : stats.divRate <= 3 ? "warn" : "bad"}
        />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Mix de estoque em chegada" subtitle="Itens por origem">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={mix}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {mix.map((m, i) => (
                    <Cell key={i} fill={m.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-center gap-6 text-sm">
            {mix.map((m) => {
              const total = mix.reduce((a, b) => a + b.value, 0) || 1;
              const pct = Math.round((m.value / total) * 100);
              return (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.fill }} />
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-semibold tabular-nums">{pct}%</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Lead time médio"
          subtitle="Dias da emissão à disponibilidade"
          className="lg:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={leadTimes} margin={{ left: -10, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="supplier"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="dias" fill="var(--chart-china)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Alerts
          icon={Clock}
          tone="amber"
          title="Pedidos atrasados"
          subtitle="Passaram da data prevista de entrega"
          empty="Nenhum pedido atrasado."
          items={lateOrders.map((o) => {
            const emb = embarqueMap.get(o.embarkId);
            const eta = emb?.etaDate ?? o.arrivalDate ?? new Date().toISOString().slice(0, 10);
            return {
              id: o.id,
              primary: o.code,
              secondary: `${o.supplier} · ${emb?.code ?? "—"}`,
              meta: `${Math.abs(daysBetween(eta, new Date().toISOString().slice(0, 10)))} dias`,
            };
          })}
        />
        <Alerts
          icon={ShieldAlert}
          tone="red"
          title="Lotes com divergência"
          subtitle="Faltas, sobras ou avarias em aberto"
          empty="Nenhum lote com divergência em aberto."
          items={withDivergences.map((o) => ({
            id: o.id,
            primary: o.code,
            secondary: o.supplier,
            meta: `${totalDivergences(o)} itens`,
          }))}
        />
      </section>

      {orders.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="text-sm font-medium">Sem dados para exibir</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Crie colunas em <span className="font-medium">Customização</span>, depois embarques e
            lotes para popular o dashboard.
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const valueColor =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-red-600"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${valueColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <div className="pb-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Alerts({
  icon: Icon,
  tone,
  title,
  subtitle,
  empty,
  items,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: "amber" | "red";
  title: string;
  subtitle: string;
  empty: string;
  items: { id: string; primary: string; secondary: string; meta: string }[];
}) {
  const iconBg = tone === "red" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700";
  const metaTone = tone === "red" ? "text-red-700" : "text-amber-700";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 pb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{it.primary}</div>
                <div className="truncate text-xs text-muted-foreground">{it.secondary}</div>
              </div>
              <span
                className={`shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums ${metaTone}`}
              >
                {it.meta}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
