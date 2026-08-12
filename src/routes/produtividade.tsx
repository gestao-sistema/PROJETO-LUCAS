import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { TaskWeight, TaskStatus, BatchTask, PersonalTask, TaskLink, Cargo } from "@/lib/store";
import { useStore, findMember, DONE_STAGE_ID } from "@/lib/store";
import { useProfile } from "@/lib/profile";
import { Avatar } from "./pedidos";
import {
  Trophy,
  BarChart3,
  Users,
  User,
  GripVertical,
  Plus,
  Pause,
  Play,
  Clock,
  Calendar,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search as SearchIcon,
  UserPlus,
  AlertTriangle,
  Link2,
  ListTodo,
  StickyNote,
  X,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/produtividade")({
  head: () => ({
    meta: [
      { title: "Visão de Produtividade — Operações Azime" },
      {
        name: "description",
        content: "Ranking por peso e produtividade individual.",
      },
    ],
  }),
  component: ProdutividadePage,
});

const RANK_COLORS = [
  "var(--status-success)",
  "oklch(0.75 0.19 130)",
  "var(--status-warning)",
  "oklch(0.72 0.17 45)",
  "var(--status-danger)",
];

function taskKey(t: { orderId: string; id: string }) {
  return t.orderId ? `${t.orderId}-${t.id}` : `st-${t.id}`;
}

type EnrichedTask = BatchTask & {
  orderId: string;
  orderCode: string;
  supplier: string;
  orderPriority: boolean;
  columnLabel: string;
  _standalone?: boolean;
  tagLabel?: string;
  tagColor?: string;
  dueDate?: string;
  createdBy?: string;
};

function ProdutividadePage() {
  const orders = useStore((s) => s.orders);
  const columns = useStore((s) => s.columns);
  const team = useStore((s) => s.team);
  const profile = useProfile((s) => s.profile);
  const userRole = profile?.role ?? "Auxiliar";
  const showSectorTab = userRole !== "Auxiliar";

  const [view, setView] = useState<"setor" | "pessoal">(showSectorTab ? "setor" : "pessoal");

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <header className="pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Visão de Produtividade</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ranking por peso e produtividade individual com acompanhamento de tempo.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
        {showSectorTab && (
          <button
            onClick={() => setView("setor")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === "setor"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Produtividade do Setor
          </button>
        )}
        <button
          onClick={() => setView("pessoal")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            view === "pessoal"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          Produtividade Pessoal
        </button>
      </div>

      {view === "setor" ? (
        <SectorView team={team} orders={orders} columns={columns} />
      ) : (
        <PersonalView orders={orders} columns={columns} team={team} />
      )}
    </div>
  );
}

/* ============== DATE RANGE FILTER ============== */

function DateRangeFilter({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
}: {
  startDate: string;
  endDate: string;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        className="h-9 w-auto rounded-full"
      />
      <span className="text-xs text-muted-foreground">até</span>
      <Input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        className="h-9 w-auto rounded-full"
      />
      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStartDate("");
            setEndDate("");
          }}
          className="h-9 rounded-full px-2 text-xs"
        >
          Limpar
        </Button>
      )}
    </div>
  );
}

function inRange(dateStr: string | undefined, start: string, end: string): boolean {
  if (!start && !end) return true;
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

/* ============== SECTOR VIEW ============== */

function SectorView({
  team,
  orders,
  columns,
}: {
  team: ReturnType<typeof useStore.getState>["team"];
  orders: ReturnType<typeof useStore.getState>["orders"];
  columns: ReturnType<typeof useStore.getState>["columns"];
}) {
  const doneId = DONE_STAGE_ID;
  const now = new Date();
  const profile = useProfile((s) => s.profile);
  const userRole = (profile?.role ?? "Auxiliar") as Cargo;
  const canEditWeight =
    userRole === "Admin" || userRole === "Coordenador" || userRole === "Gerente";
  const storePersonalTasks = useStore((s) => s.personalTasks);
  const setStandaloneTaskWeight = useStore((s) => s.setStandaloneTaskWeight);
  const assignTask = useStore((s) => s.assignTask);
  const setStandaloneTaskAssignee = useStore((s) => s.setStandaloneTaskAssignee);
  const [startDate, setStartDate] = useState(() =>
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() =>
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  );
  const [listaPage, setListaPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [columnFilter, setColumnFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "personal" | "kanban">("all");
  const PAGE_SIZE = 10;

  const allTasks = useMemo(() => {
    const orderTasks = orders.flatMap((o) =>
      o.tasks.map((t) => ({
        ...t,
        orderId: o.id,
        orderCode: o.code,
        supplier: o.supplier,
        orderPriority: o.priority,
        columnLabel: columns.find((c) => c.id === t.stage)?.label ?? t.stage,
        _standalone: false as const,
      })),
    );
    const personalTasks = storePersonalTasks.map((t) => ({
      id: t.id,
      title: t.title,
      stage: "_personal",
      done: t.status === "concluida",
      status: t.status,
      assigneeId: t.assigneeId,
      weight: t.weight,
      createdAt: t.createdAt.slice(0, 10),
      startedAt: t.startedAt,
      completedAt: t.completedAt,
      paused: t.paused,
      orderId: "",
      orderCode: "Pessoal",
      supplier: "",
      orderPriority: false,
      columnLabel: "Tarefa pessoal",
      _standalone: true as const,
    }));
    return [...orderTasks, ...personalTasks];
  }, [orders, columns, storePersonalTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => inRange(t.createdAt, startDate, endDate));
  }, [allTasks, startDate, endDate]);

  const kpis = useMemo(() => {
    const total = filteredTasks.length;
    const nao = filteredTasks.filter(
      (t) => t.status === "nao_iniciada" || (!t.done && t.status !== "em_processo"),
    ).length;
    const em = filteredTasks.filter((t) => t.status === "em_processo").length;
    const fin = filteredTasks.filter((t) => t.done || t.status === "concluida").length;
    return { total, nao, em, fin };
  }, [filteredTasks]);

  const ranking = useMemo(() => {
    const map = new Map<
      string,
      { doneCount: number; doneWeight: number; pendingWeight: number; tasks: string[] }
    >();
    for (const t of filteredTasks) {
      if (!t.assigneeId) continue;
      const cur = map.get(t.assigneeId) ?? {
        doneCount: 0,
        doneWeight: 0,
        pendingWeight: 0,
        tasks: [],
      };
      if (t.done || t.status === "concluida") {
        cur.doneCount += 1;
        cur.doneWeight += t.weight;
      } else {
        cur.pendingWeight += t.weight;
      }
      if (cur.tasks.length < 6) cur.tasks.push(t.title);
      map.set(t.assigneeId, cur);
    }
    return Array.from(map.entries())
      .map(([id, data]) => {
        const member = findMember(id, team);
        return {
          id,
          name: member?.name ?? "—",
          color: member?.color ?? "bg-muted",
          avatar: member?.avatar,
          role: member?.role,
          ...data,
        };
      })
      .sort((a, b) => b.doneWeight - a.doneWeight);
  }, [filteredTasks, team]);

  const chartData = ranking
    .map((r) => ({
      name: r.name.split(" ")[0],
      peso: r.doneWeight,
      pendente: r.pendingWeight,
      feitas: r.doneCount,
    }))
    .sort((a, b) => b.peso + b.pendente - (a.peso + a.pendente));

  const showInsights = userRole === "Admin" || userRole === "Gerente" || userRole === "Coordenador";

  const workloadByMember = useMemo(() => {
    const map = new Map<string, { weight: number; count: number }>();
    for (const m of team) {
      map.set(m.id, { weight: 0, count: 0 });
    }
    for (const t of allTasks) {
      if (t.done || t.status === "concluida") continue;
      if (!t.assigneeId) continue;
      const cur = map.get(t.assigneeId);
      if (cur) {
        cur.weight += t.weight;
        cur.count += 1;
      }
    }
    return Array.from(map.entries())
      .map(([id, data]) => {
        const member = findMember(id, team);
        return {
          id,
          name: member?.name ?? "—",
          color: member?.color ?? "bg-muted",
          avatar: member?.avatar,
          role: member?.role,
          ...data,
        };
      })
      .sort((a, b) => a.weight - b.weight);
  }, [allTasks, team]);

  const mostAvailable = workloadByMember.length > 0 ? workloadByMember[0] : null;
  const mostOverloaded =
    workloadByMember.length > 1 ? workloadByMember[workloadByMember.length - 1] : null;

  const listaTasks = useMemo(() => {
    let result = filteredTasks;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.orderCode ?? "").toLowerCase().includes(q) ||
          (t.supplier ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => {
        const s: TaskStatus = t.status ?? (t.done ? "concluida" : "nao_iniciada");
        return s === statusFilter;
      });
    }
    if (memberFilter !== "all") {
      result = result.filter((t) => t.assigneeId === memberFilter);
    }
    if (columnFilter === "personal") {
      result = result.filter((t) => "_standalone" in t && t._standalone);
    } else if (columnFilter === "kanban") {
      result = result.filter((t) => !("_standalone" in t && t._standalone));
    } else if (columnFilter !== "all") {
      result = result.filter((t) => t.stage === columnFilter);
    }
    return result;
  }, [filteredTasks, search, statusFilter, memberFilter, columnFilter]);

  if (team.length === 0) return null;

  return (
    <section className="mb-8 space-y-4">
      {/* KPI CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total" value={kpis.total} />
        <KpiCard label="Não Iniciado" value={kpis.nao} />
        <KpiCard label="Em Processo" value={kpis.em} tone="warn" />
        <KpiCard label="Finalizado" value={kpis.fin} tone="good" />
      </div>

      {/* DATE RANGE FILTER */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      </div>

      {/* RANKING + CHART */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Ranking de Produtividade</h2>
          <p className="text-xs text-muted-foreground">
            Ranking por peso somado das tarefas concluídas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold tracking-tight">Ranking por peso</h3>
          </div>
          {ranking.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
              Nenhuma tarefa concluída com esses filtros.
            </div>
          ) : (
            <ul className="space-y-2">
              {ranking.map((r, i) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)] }}
                  >
                    {i + 1}
                  </span>
                  <Avatar member={{ name: r.name, color: r.color, avatar: r.avatar }} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-semibold">{r.name}</span>
                      <span className="ml-2 shrink-0 text-sm font-bold tabular-nums text-foreground">
                        {r.doneWeight}
                        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                          pts
                        </span>
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="tabular-nums text-emerald-600">
                        {r.doneCount} concluída{r.doneCount !== 1 ? "s" : ""}
                      </span>
                      {r.role && <span>· {r.role}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold tracking-tight">Atividades por Colaborador</h3>
          {chartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
              Sem dados
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 10, right: 16, top: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={70}
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
                  <Bar
                    dataKey="pendente"
                    stackId="a"
                    fill="var(--status-warning)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="peso"
                    stackId="a"
                    fill="var(--status-success)"
                    radius={[0, 8, 8, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-success)]" /> Concluído
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-warning)]" /> Pendente/Em
              Processo
            </span>
          </div>
        </div>
      </div>

      {/* STRATEGIC INSIGHT CARDS — Admin/Gerente/Coordenador only */}
      {showInsights &&
        mostAvailable &&
        mostOverloaded &&
        mostAvailable.id !== mostOverloaded.id && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InsightCard
              tone="good"
              title="Mais Disponível"
              icon={<UserPlus className="h-4 w-4" />}
              member={mostAvailable}
              recommendation="Menor carga pendente — pronto para novas atribuições."
            />
            <InsightCard
              tone="danger"
              title="Maior Sobrecarga"
              icon={<AlertTriangle className="h-4 w-4" />}
              member={mostOverloaded}
              recommendation="Maior acúmulo de pendências — considere redistribuir."
            />
          </div>
        )}

      {/* TASK LIST — FIXED BELOW RANKING */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-semibold tracking-tight">Lista de Tarefas</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
            {listaTasks.length}
          </span>
        </div>

        {/* FILTERS + SEARCH */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tarefa, lote ou fornecedor..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setListaPage(1);
              }}
              className="h-9 rounded-full pl-9"
            />
          </div>
          <Select
            value={memberFilter}
            onValueChange={(v) => {
              setMemberFilter(v);
              setListaPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-auto rounded-full min-w-[160px]">
              <SelectValue placeholder="Colaborador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os colaboradores</SelectItem>
              {team.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as "all" | TaskStatus);
              setListaPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-auto rounded-full min-w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="nao_iniciada">Não Iniciada</SelectItem>
              <SelectItem value="em_processo">Em Processo</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={columnFilter}
            onValueChange={(v) => {
              setColumnFilter(v);
              setListaPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-auto rounded-full min-w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="kanban">Apenas Kanban</SelectItem>
              <SelectItem value="personal">Apenas Pessoal</SelectItem>
              {columns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* TABLE */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Tarefa</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Lote</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Etapa</th>
                <th className="px-4 py-3 font-medium">Prio.</th>
                <th className="px-4 py-3 font-medium text-right">Peso</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {listaTasks.slice((listaPage - 1) * PAGE_SIZE, listaPage * PAGE_SIZE).map((t, i) => {
                const member = findMember(t.assigneeId, team);
                const isStandalone = "_standalone" in t && t._standalone;
                const status: TaskStatus = t.status ?? (t.done ? "concluida" : "nao_iniciada");
                const statusLabel =
                  status === "concluida"
                    ? "Concluída"
                    : status === "em_processo"
                      ? "Em Processo"
                      : "Não Iniciada";
                return (
                  <tr
                    key={`${t.orderId}-${t.id}-${i}`}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{t.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${isStandalone ? "bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"}`}
                      >
                        {isStandalone ? "Pessoal" : "Kanban"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {canEditWeight ? (
                        <Select
                          value={t.assigneeId ?? "__unassigned"}
                          onValueChange={(v) => {
                            const val = v === "__unassigned" ? undefined : v;
                            if (isStandalone) {
                              setStandaloneTaskAssignee(t.id, val);
                            } else {
                              assignTask(t.orderId, t.id, val);
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 w-36 text-xs">
                            <SelectValue placeholder="Sem responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unassigned">Sem responsável</SelectItem>
                            {team.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        (member?.name ?? "—")
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{t.orderCode}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.supplier || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.columnLabel}</td>
                    <td className="px-4 py-3">
                      {t.orderPriority ? (
                        <span className="inline-flex items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Sim
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isStandalone && canEditWeight ? (
                        <Select
                          value={String(t.weight)}
                          onValueChange={(v) =>
                            setStandaloneTaskWeight(t.id, Number(v) as TaskWeight)
                          }
                        >
                          <SelectTrigger className="h-8 w-16 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="tabular-nums">{t.weight}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          status === "concluida"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : status === "em_processo"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{t.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {listaTasks.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              Nenhuma tarefa encontrada com esses filtros.
            </div>
          )}
        </div>
        <Pagination
          page={listaPage}
          totalPages={Math.max(1, Math.ceil(listaTasks.length / PAGE_SIZE))}
          onPageChange={setListaPage}
        />
      </div>
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground tabular-nums">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

/* ============== PERSONAL VIEW ============== */

type PersonalBoxKey = "nao_feitas" | "em_processo" | "concluida";

const STATUS_BOXES: { key: PersonalBoxKey; label: string; accent: string; labelColor: string }[] = [
  {
    key: "nao_feitas",
    label: "Não Feitas",
    accent: "border-dashed",
    labelColor: "text-muted-foreground",
  },
  { key: "em_processo", label: "Em Processo", accent: "", labelColor: "text-amber-600" },
  {
    key: "concluida",
    label: "Concluídas",
    accent: "border-emerald-200 dark:border-emerald-900/40",
    labelColor: "text-emerald-600 dark:text-emerald-400",
  },
];

function PersonalView({
  orders,
  columns,
  team,
}: {
  orders: ReturnType<typeof useStore.getState>["orders"];
  columns: ReturnType<typeof useStore.getState>["columns"];
  team: ReturnType<typeof useStore.getState>["team"];
}) {
  const profile = useProfile((s) => s.profile);
  const role = (profile?.role ?? "Auxiliar") as Cargo;
  const isRestricted = role === "Analista" || role === "Auxiliar";

  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const setTaskPaused = useStore((s) => s.setTaskPaused);
  const toggleTask = useStore((s) => s.toggleTask);
  const addStandaloneTask = useStore((s) => s.addStandaloneTask);
  const setStandaloneTaskStatus = useStore((s) => s.setStandaloneTaskStatus);
  const setStandaloneTaskPaused = useStore((s) => s.setStandaloneTaskPaused);
  const removeStandaloneTask = useStore((s) => s.removeStandaloneTask);
  const storePersonalTasks = useStore((s) => s.personalTasks);
  const taskTags = useStore((s) => s.taskTags);

  const [selectedMemberId, setSelectedMemberId] = useState(team[0]?.id ?? "");
  const now = new Date();
  const [startDate, setStartDate] = useState(() =>
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() =>
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  );
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskTagId, setNewTaskTagId] = useState("");
  const [activeTask, setActiveTask] = useState<EnrichedTask | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [personalView, setPersonalView] = useState<"kanban" | "lista">("kanban");
  const [listaPage, setListaPage] = useState(1);
  const [listaSearch, setListaSearch] = useState("");
  const [listaStatusFilter, setListaStatusFilter] = useState<"all" | TaskStatus>("all");
  const PAGE_SIZE = 10;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    if (!team.some((m) => m.id === selectedMemberId)) {
      setSelectedMemberId(team[0]?.id ?? "");
    }
  }, [team, selectedMemberId]);

  const doneId = DONE_STAGE_ID;

  const orderTasks = useMemo(
    () =>
      orders.flatMap((o) =>
        o.tasks
          .filter((t) => t.assigneeId === selectedMemberId)
          .map((t): EnrichedTask => {
            const tag = taskTags.find((tg) => tg.id === t.tagId);
            return {
              ...t,
              orderId: o.id,
              orderCode: o.code,
              supplier: o.supplier,
              orderPriority: o.priority,
              columnLabel: columns.find((c) => c.id === t.stage)?.label ?? t.stage,
              tagLabel: tag?.label,
              tagColor: tag?.color,
            };
          }),
      ),
    [orders, selectedMemberId, columns, taskTags],
  );

  const standaloneTasks: (EnrichedTask & { _standalone: true })[] = useMemo(
    () =>
      storePersonalTasks
        .filter((t) => t.assigneeId === selectedMemberId)
        .map((t) => {
          const tag = taskTags.find((tg) => tg.id === t.tagId);
          return {
            id: t.id,
            title: t.title,
            stage: "_personal",
            done: t.status === "concluida",
            assigneeId: t.assigneeId,
            weight: t.weight,
            createdAt: t.createdAt.slice(0, 10),
            startedAt: t.startedAt,
            completedAt: t.completedAt,
            paused: t.paused,
            status: t.status,
            orderId: "",
            orderCode: "Pessoal",
            supplier: "",
            orderPriority: false,
            columnLabel: "Tarefa pessoal",
            _standalone: true as const,
            tagLabel: tag?.label,
            tagColor: tag?.color,
            dueDate: t.dueDate,
            parentId: t.parentId,
            tagId: t.tagId,
            createdBy: t.createdBy,
          };
        })
        // Subtarefas ficam encapsuladas no modal de detalhes — não viram card no board
        .filter((t) => !t.parentId),
    [storePersonalTasks, selectedMemberId, taskTags],
  );

  const allPersonalTasks = useMemo(
    () => [...orderTasks, ...standaloneTasks],
    [orderTasks, standaloneTasks],
  );

  const filteredTasks = useMemo(() => {
    return allPersonalTasks.filter((t) => inRange(t.createdAt, startDate, endDate));
  }, [allPersonalTasks, startDate, endDate]);

  const listaTasks = useMemo(() => {
    let result = filteredTasks;
    if (listaSearch.trim()) {
      const q = listaSearch.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.orderCode ?? "").toLowerCase().includes(q) ||
          (t.supplier ?? "").toLowerCase().includes(q),
      );
    }
    if (listaStatusFilter !== "all") {
      result = result.filter((t) => {
        const s: TaskStatus =
          (t as EnrichedTask).status ?? ((t as EnrichedTask).done ? "concluida" : "nao_iniciada");
        return s === listaStatusFilter;
      });
    }
    return result;
  }, [filteredTasks, listaSearch, listaStatusFilter]);

  const grouped = useMemo(() => {
    const map: Record<PersonalBoxKey, EnrichedTask[]> = {
      nao_feitas: [],
      em_processo: [],
      concluida: [],
    };
    for (const t of filteredTasks) {
      const status: TaskStatus = t.status ?? (t.done ? "concluida" : "nao_iniciada");
      if (status === "concluida") {
        map.concluida.push(t);
      } else if (status === "em_processo") {
        map.em_processo.push(t);
      } else {
        map.nao_feitas.push(t);
      }
    }
    return map;
  }, [filteredTasks]);

  const groupedByMother: Record<
    PersonalBoxKey,
    Map<string, { mother: EnrichedTask; subs: EnrichedTask[] }>
  > = useMemo(() => {
    const result: Record<
      PersonalBoxKey,
      Map<string, { mother: EnrichedTask; subs: EnrichedTask[] }>
    > = {
      nao_feitas: new Map(),
      em_processo: new Map(),
      concluida: new Map(),
    };
    const mothers = filteredTasks.filter((t) => !t.parentId);

    for (const boxKey of ["nao_feitas", "em_processo", "concluida"] as PersonalBoxKey[]) {
      const map = result[boxKey];
      for (const mother of mothers) {
        const subsInBox = filteredTasks.filter(
          (t) => t.parentId === mother.id && grouped[boxKey].includes(t),
        );
        if (subsInBox.length > 0) {
          map.set(mother.id, { mother, subs: subsInBox });
        }
      }
    }
    return result;
  }, [filteredTasks, grouped]);

  const kpis = useMemo(() => {
    const total = filteredTasks.length;
    const naoFeitas = grouped.nao_feitas.length;
    const em = grouped.em_processo.length;
    const con = grouped.concluida.length;
    const feitoCount = grouped.concluida.length;
    const naoFeitoCount = grouped.nao_feitas.length + grouped.em_processo.length;
    return { total, naoFeitas, em, con, feitoCount, naoFeitoCount };
  }, [grouped, filteredTasks]);

  const chartData = useMemo(
    () => [
      { name: "Feitas", count: kpis.feitoCount, fill: "var(--status-success)" },
      { name: "Não Feitas", count: grouped.nao_feitas.length, fill: "var(--status-neutral)" },
      { name: "Em Processo", count: grouped.em_processo.length, fill: "var(--status-warning)" },
    ],
    [kpis, grouped],
  );

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    for (const tasks of Object.values(grouped)) {
      const found = tasks.find((t) => taskKey(t) === id);
      if (found) {
        setActiveTask(found);
        break;
      }
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    let sourceBox: PersonalBoxKey | null = null;
    for (const [boxKey, tasks] of Object.entries(grouped) as [PersonalBoxKey, EnrichedTask[]][]) {
      if (tasks.some((t) => taskKey(t) === taskId)) {
        sourceBox = boxKey;
        break;
      }
    }
    if (!sourceBox) return;

    let targetBox: PersonalBoxKey | null = null;
    for (const boxKey of ["nao_feitas", "em_processo", "concluida"] as PersonalBoxKey[]) {
      if (overId === `box-${boxKey}`) {
        targetBox = boxKey;
        break;
      }
    }
    if (!targetBox && sourceBox) {
      for (const [boxKey, tasks] of Object.entries(grouped) as [PersonalBoxKey, EnrichedTask[]][]) {
        if (tasks.some((t) => taskKey(t) === overId)) {
          targetBox = boxKey;
          break;
        }
      }
    }
    if (!targetBox || targetBox === sourceBox) return;

    const task = filteredTasks.find((t) => taskKey(t) === taskId);
    if (!task) return;

    const targetStatus: TaskStatus =
      targetBox === "nao_feitas" ? "nao_iniciada" : (targetBox as TaskStatus);

    if (task.orderId) {
      setTaskStatus(task.orderId, task.id, targetStatus);
      if (targetStatus === "concluida") setTaskPaused(task.orderId, task.id, false);
    } else {
      setStandaloneTaskStatus(task.id, targetStatus);
      if (targetStatus === "concluida") setStandaloneTaskPaused(task.id, false);
    }
  }

  function handleAddPersonalTask() {
    if (!newTaskTitle.trim()) return;
    addStandaloneTask(newTaskTitle.trim(), selectedMemberId, {
      dueDate: newTaskDueDate || undefined,
      tagId: newTaskTagId || undefined,
      createdBy: profile?.id,
    });
    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskTagId("");
  }

  function handleStatusChange(orderId: string, taskId: string, status: TaskStatus) {
    if (!orderId) {
      setStandaloneTaskStatus(taskId, status);
    } else {
      setTaskStatus(orderId, taskId, status);
    }
  }

  function handlePause(orderId: string, taskId: string, paused: boolean) {
    if (!orderId) {
      setStandaloneTaskPaused(taskId, paused);
    } else {
      setTaskPaused(orderId, taskId, paused);
    }
  }

  function handleToggle(orderId: string, taskId: string) {
    if (!orderId) {
      const task = storePersonalTasks.find((t) => t.id === taskId);
      if (task) {
        const newStatus = task.status === "concluida" ? "nao_iniciada" : "concluida";
        setStandaloneTaskStatus(taskId, newStatus);
      }
    } else {
      toggleTask(orderId, taskId);
    }
  }

  function handleOpenDetail(task: EnrichedTask) {
    // Só tarefas pessoais (standalone) têm modal de detalhamento
    if ("_standalone" in task && task._standalone) {
      setDetailTaskId(task.id);
    }
  }

  const detailTask = detailTaskId
    ? (storePersonalTasks.find((t) => t.id === detailTaskId) ?? null)
    : null;

  function formatTime(startedAt?: string, completedAt?: string, paused?: boolean): string {
    if (!startedAt) return "—";
    const start = new Date(startedAt).getTime();
    const end = completedAt ? new Date(completedAt).getTime() : paused ? start : Date.now();
    const diff = Math.max(0, end - start);
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) return `${hrs}h ${remMins}m`;
    return `${mins}m`;
  }

  if (team.length === 0) {
    return (
      <section className="mb-8">
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <User className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium">Nenhum colaborador cadastrado</div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Selecionar colaborador" />
          </SelectTrigger>
          <SelectContent>
            {team.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
        <div className="flex items-center gap-2">
          <Button
            variant={personalView === "kanban" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setPersonalView("kanban")}
          >
            Kanban
          </Button>
          <Button
            variant={personalView === "lista" ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => {
              setPersonalView("lista");
              setListaPage(1);
            }}
          >
            Lista
          </Button>
        </div>
      </div>

      {personalView === "kanban" && (
        <>
          {/* CHARTS */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold tracking-tight">Resumo de Tarefas</h3>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Total" value={kpis.total} />
                <MiniStat label="Concluídas" value={kpis.con} tone="good" />
                <MiniStat label="Em Processo" value={kpis.em} tone="warn" />
                <MiniStat label="Não Feitas" value={kpis.naoFeitas} />
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold tracking-tight">
                Atividades: Feitas vs Não Feitas
              </h3>
              {kpis.feitoCount === 0 && kpis.naoFeitoCount === 0 ? (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                  Sem dados
                </div>
              ) : (
                <div className="h-40">
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="number"
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
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Bar key={i} dataKey="count" fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-success)]" /> Feitas (
                  {kpis.feitoCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-neutral)]" /> Não Feitas
                  ({grouped.nao_feitas.length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[var(--status-warning)]" /> Em Processo
                  ({grouped.em_processo.length})
                </span>
              </div>
            </div>
          </div>

          {/* ADD PERSONAL TASK (always available) */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Nova tarefa pessoal..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPersonalTask();
                  }
                }}
                className="rounded-full"
              />
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                placeholder="Data de entrega (opcional)"
                className="rounded-full"
              />
              <Select value={newTaskTagId} onValueChange={setNewTaskTagId}>
                <SelectTrigger className="h-9 rounded-full">
                  <SelectValue placeholder="Tag (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem tag</SelectItem>
                  {taskTags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                disabled={!newTaskTitle.trim()}
                onClick={handleAddPersonalTask}
                className="rounded-full"
              >
                <Plus className="h-4 w-4" /> Criar tarefa
              </Button>
            </div>
          </div>

          {/* TASK LIST WITH FILTERS BELOW CHARTS */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {STATUS_BOXES.map((box) => (
                <StatusBox
                  key={box.key}
                  status={box.key}
                  label={box.label}
                  accent={box.accent}
                  labelColor={box.labelColor}
                  tasks={grouped[box.key]}
                  groupedByMother={groupedByMother[box.key]}
                  taskTags={taskTags}
                  onStatusChange={handleStatusChange}
                  onPause={handlePause}
                  onToggle={handleToggle}
                  onDelete={removeStandaloneTask}
                  onOpenDetail={handleOpenDetail}
                  currentUserId={profile?.id}
                  userRole={role}
                  formatTime={formatTime}
                />
              ))}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div className="rounded-xl border border-border bg-card p-3 shadow-lg opacity-90">
                  <span className="text-sm font-medium">{activeTask.title}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {personalView === "lista" && (
        <div className="space-y-3">
          {/* FILTERS + SEARCH */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por tarefa, lote ou fornecedor..."
                value={listaSearch}
                onChange={(e) => {
                  setListaSearch(e.target.value);
                  setListaPage(1);
                }}
                className="h-9 rounded-full pl-9"
              />
            </div>
            <Select
              value={listaStatusFilter}
              onValueChange={(v) => {
                setListaStatusFilter(v as "all" | TaskStatus);
                setListaPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-auto rounded-full min-w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="nao_iniciada">Não Iniciada</SelectItem>
                <SelectItem value="em_processo">Em Processo</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TABLE */}
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Tarefa</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Lote</th>
                  <th className="px-4 py-3 font-medium">Fornecedor</th>
                  <th className="px-4 py-3 font-medium">Etapa</th>
                  <th className="px-4 py-3 font-medium">Prio.</th>
                  <th className="px-4 py-3 font-medium text-right">Peso</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {listaTasks
                  .slice((listaPage - 1) * PAGE_SIZE, listaPage * PAGE_SIZE)
                  .map((t, i) => {
                    const status = t.status ?? (t.done ? "concluida" : "nao_iniciada");
                    const statusLabel =
                      status === "concluida"
                        ? "Concluída"
                        : status === "em_processo"
                          ? "Em Processo"
                          : "Não Iniciada";
                    return (
                      <tr
                        key={`${t.orderId}-${t.id}-${i}`}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-medium">{t.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {"_standalone" in t && t._standalone ? "Pessoal" : "Lote"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{t.orderCode}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.supplier || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.columnLabel}</td>
                        <td className="px-4 py-3">
                          {t.orderPriority ? (
                            <span className="inline-flex items-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              Sim
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{t.weight}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              status === "concluida"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                : status === "em_processo"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {t.createdAt}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {listaTasks.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                Nenhuma tarefa encontrada com esses filtros.
              </div>
            )}
          </div>
          <Pagination
            page={listaPage}
            totalPages={Math.max(1, Math.ceil(listaTasks.length / PAGE_SIZE))}
            onPageChange={setListaPage}
          />
        </div>
      )}

      <PersonalTaskDetailDialog
        task={detailTask}
        open={detailTaskId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailTaskId(null);
        }}
        subtasks={storePersonalTasks.filter((t) => t.parentId === detailTaskId)}
      />
    </section>
  );
}

function StatusBox({
  status,
  label,
  accent,
  labelColor,
  tasks,
  groupedByMother,
  taskTags,
  onStatusChange,
  onPause,
  onToggle,
  onDelete,
  onOpenDetail,
  currentUserId,
  userRole,
  formatTime,
}: {
  status: PersonalBoxKey;
  label: string;
  accent: string;
  labelColor: string;
  tasks: EnrichedTask[];
  groupedByMother: Map<string, { mother: EnrichedTask; subs: EnrichedTask[] }>;
  taskTags: ReturnType<typeof useStore.getState>["taskTags"];
  onStatusChange: (orderId: string, taskId: string, status: TaskStatus) => void;
  onPause: (orderId: string, taskId: string, paused: boolean) => void;
  onToggle: (orderId: string, taskId: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (task: EnrichedTask) => void;
  currentUserId?: string;
  userRole?: string;
  formatTime: (startedAt?: string, completedAt?: string, paused?: boolean) => string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `box-${status}` });
  const nonSubtasks = tasks.filter((t) => !t.parentId);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl border bg-card p-5 shadow-sm transition-colors ${accent} ${
        isOver ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "border-border"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`text-sm font-semibold tracking-tight ${labelColor}`}>{label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
          {tasks.length}
        </span>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
          Nenhuma tarefa
        </div>
      ) : (
        <SortableContext
          items={tasks.map((t) => taskKey(t))}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5">
            {/* Tarefas sem sub-tarefas */}
            {nonSubtasks.map((t) => (
              <SortablePersonalTask
                key={`${t.orderId}-${t.id}`}
                task={t}
                status={status}
                taskTags={taskTags}
                onStatusChange={onStatusChange}
                onPause={onPause}
                onToggle={onToggle}
                onDelete={onDelete}
                onOpenDetail={onOpenDetail}
                currentUserId={currentUserId}
                userRole={userRole}
                formatTime={formatTime}
              />
            ))}

            {/* Grupos por tarefa (com sub-tarefas) */}
            {Array.from(groupedByMother.values()).map(({ mother, subs }) => (
              <li
                key={`mother-${mother.id}`}
                className="rounded-xl border border-border bg-background px-3 py-2 space-y-1"
              >
                {/* Header da tarefa */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{mother.title}</span>
                      {mother.tagLabel && mother.tagColor && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white ${mother.tagColor}`}
                        >
                          {mother.tagLabel}
                        </span>
                      )}
                    </div>
                    {mother.dueDate && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        Prazo: {mother.dueDate}
                      </div>
                    )}
                  </div>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    {subs.length}
                  </span>
                </div>

                {/* Sub-Tarefas */}
                {subs.map((sub) => (
                  <SortablePersonalTask
                    key={`${sub.orderId}-${sub.id}`}
                    task={sub}
                    status={status}
                    taskTags={taskTags}
                    onStatusChange={onStatusChange}
                    onPause={onPause}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onOpenDetail={onOpenDetail}
                    currentUserId={currentUserId}
                    userRole={userRole}
                    formatTime={formatTime}
                    isSubtask
                  />
                ))}
              </li>
            ))}
          </ul>
        </SortableContext>
      )}
    </div>
  );
}

function SortablePersonalTask({
  task,
  status,
  taskTags,
  onStatusChange,
  onPause,
  onToggle,
  onDelete,
  onOpenDetail,
  currentUserId,
  userRole,
  formatTime,
  isSubtask,
}: {
  task: EnrichedTask;
  status: PersonalBoxKey;
  taskTags: ReturnType<typeof useStore.getState>["taskTags"];
  onStatusChange: (orderId: string, taskId: string, status: TaskStatus) => void;
  onPause: (orderId: string, taskId: string, paused: boolean) => void;
  onToggle: (orderId: string, taskId: string) => void;
  onDelete: (id: string) => void;
  onOpenDetail: (task: EnrichedTask) => void;
  currentUserId?: string;
  userRole?: string;
  formatTime: (startedAt?: string, completedAt?: string, paused?: boolean) => string;
  isSubtask?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.orderId ? `${task.orderId}-${task.id}` : `st-${task.id}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none" as const,
  };
  const isPriority = task.orderPriority;
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = status !== "concluida" && task.dueDate !== undefined && task.dueDate < today;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-1 rounded-xl px-3 py-2 ${
        isSubtask
          ? ""
          : isOverdue
            ? "border border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
            : isPriority
              ? "border border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
              : "border border-border bg-background"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Checkbox
          checked={status === "concluida"}
          onCheckedChange={() => onToggle(task.orderId, task.id)}
        />
        {(() => {
          const isStandalone = "_standalone" in task && task._standalone;
          return (
            <div
              className={`min-w-0 flex-1 ${isStandalone ? "cursor-pointer" : ""}`}
              onClick={isStandalone ? () => onOpenDetail(task) : undefined}
              title={isStandalone ? "Ver detalhes" : undefined}
            >
              <div className="flex items-center gap-2">
                <span className={`truncate text-sm font-medium`}>{task.title}</span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {task.orderCode}
                </span>
                {task.tagLabel && task.tagColor && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white ${task.tagColor}`}
                  >
                    {task.tagLabel}
                  </span>
                )}
                {isOverdue && (
                  <span className="shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Em Atraso
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{task.columnLabel}</span>
                {task.startedAt && (
                  <span className="flex items-center gap-1 text-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(task.startedAt, task.completedAt, task.paused)}
                  </span>
                )}
                {task.dueDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {task.dueDate}
                  </span>
                )}
                {task.paused && status === "em_processo" && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Pause className="h-3 w-3" /> Pausado
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      {status !== "concluida" && (
        <div className="flex items-center gap-2 pl-9">
          {status === "em_processo" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              onClick={() => onPause(task.orderId, task.id, !task.paused)}
            >
              {task.paused ? <Play className="mr-1 h-3 w-3" /> : <Pause className="mr-1 h-3 w-3" />}
              {task.paused ? "Retomar" : "Pausar"}
            </Button>
          )}
          {status === "nao_feitas" && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              onClick={() => onStatusChange(task.orderId, task.id, "em_processo")}
            >
              <Play className="mr-1 h-3 w-3" /> Iniciar
            </Button>
          )}
          {"_standalone" in task &&
            task._standalone &&
            (task.createdBy === currentUserId ||
              (!task.createdBy && task.assigneeId === currentUserId) ||
              userRole === "Admin" ||
              userRole === "Gerente" ||
              userRole === "Coordenador") && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
        </div>
      )}
    </li>
  );
}

/* ============== PERSONAL TASK DETAIL DIALOG ============== */

const STATUS_LABEL: Record<TaskStatus, string> = {
  nao_iniciada: "Não Iniciada",
  em_processo: "Em Processo",
  concluida: "Concluída",
};

function PersonalTaskDetailDialog({
  task,
  open,
  onOpenChange,
  subtasks,
}: {
  task: PersonalTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtasks: PersonalTask[];
}) {
  const setStandaloneTaskNotes = useStore((s) => s.setStandaloneTaskNotes);
  const setStandaloneTaskLinks = useStore((s) => s.setStandaloneTaskLinks);
  const addStandaloneTask = useStore((s) => s.addStandaloneTask);
  const removeStandaloneTask = useStore((s) => s.removeStandaloneTask);
  const setStandaloneTaskStatus = useStore((s) => s.setStandaloneTaskStatus);

  const profile = useProfile((s) => s.profile);
  const currentUserId = profile?.id;
  const role = (profile?.role ?? "Auxiliar") as Cargo;
  const canManage = (ownerId?: string, fallbackId?: string) =>
    ownerId === currentUserId ||
    (!ownerId && fallbackId === currentUserId) ||
    role === "Admin" ||
    role === "Gerente" ||
    role === "Coordenador";

  const [notesDraft, setNotesDraft] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newSubtask, setNewSubtask] = useState("");

  // Sincroniza rascunho de anotações quando a tarefa muda/abre
  useEffect(() => {
    setNotesDraft(task?.notes ?? "");
  }, [task?.id, task?.notes]);

  if (!task) return null;

  const links = task.links ?? [];

  function saveNotes() {
    if (!task) return;
    if (notesDraft !== (task.notes ?? "")) {
      setStandaloneTaskNotes(task.id, notesDraft);
    }
  }

  function addLink() {
    if (!task) return;
    const url = newLinkUrl.trim();
    if (!url) return;
    const title = newLinkTitle.trim() || url;
    setStandaloneTaskLinks(task.id, [...links, { title, url }]);
    setNewLinkTitle("");
    setNewLinkUrl("");
  }

  function removeLink(idx: number) {
    if (!task) return;
    setStandaloneTaskLinks(
      task.id,
      links.filter((_, i) => i !== idx),
    );
  }

  function addSubtask() {
    if (!task) return;
    const title = newSubtask.trim();
    if (!title) return;
    addStandaloneTask(title, task.assigneeId ?? "", {
      parentId: task.id,
      createdBy: currentUserId,
    });
    setNewSubtask("");
  }

  function normalizeUrl(url: string) {
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{task.title}</DialogTitle>
          <span
            className={`mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              task.status === "concluida"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                : task.status === "em_processo"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {STATUS_LABEL[task.status]}
          </span>
        </DialogHeader>

        <div className="space-y-5">
          {/* ANOTAÇÕES */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5" /> Anotações
            </Label>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={saveNotes}
              placeholder="Escreva anotações sobre esta atividade..."
              rows={4}
              className="resize-y"
            />
          </div>

          {/* LINKS */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" /> Links
            </Label>
            {links.length > 0 && (
              <ul className="space-y-1.5">
                {links.map((link, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <a
                      href={normalizeUrl(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{link.title}</span>
                    </a>
                    <button
                      onClick={() => removeLink(i)}
                      className="shrink-0 text-muted-foreground hover:text-red-500"
                      aria-label="Remover link"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                placeholder="Título (opcional)"
                className="sm:w-40"
              />
              <Input
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="https://..."
                className="flex-1"
              />
              <Button variant="outline" disabled={!newLinkUrl.trim()} onClick={addLink}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>

          {/* SUBTAREFAS */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ListTodo className="h-3.5 w-3.5" /> Subtarefas
              {subtasks.length > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
                  {subtasks.filter((s) => s.status === "concluida").length}/{subtasks.length}
                </span>
              )}
            </Label>
            {subtasks.length > 0 && (
              <ul className="space-y-1.5">
                {subtasks.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <Checkbox
                      checked={sub.status === "concluida"}
                      onCheckedChange={() =>
                        setStandaloneTaskStatus(
                          sub.id,
                          sub.status === "concluida" ? "nao_iniciada" : "concluida",
                        )
                      }
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        sub.status === "concluida" ? "text-muted-foreground line-through" : ""
                      }`}
                    >
                      {sub.title}
                    </span>
                    {canManage(sub.createdBy, sub.assigneeId) && (
                      <button
                        onClick={() => removeStandaloneTask(sub.id)}
                        className="shrink-0 text-muted-foreground hover:text-red-500"
                        aria-label="Remover subtarefa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
                placeholder="Nova subtarefa..."
                className="flex-1"
              />
              <Button variant="outline" disabled={!newSubtask.trim()} onClick={addSubtask}>
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn" | "danger";
}) {
  const color =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-red-600"
          : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${color}`}>
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn" | "danger";
}) {
  const color =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "danger"
          ? "text-red-600"
          : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function InsightCard({
  tone,
  title,
  icon,
  member,
  recommendation,
}: {
  tone: "good" | "danger";
  title: string;
  icon: ReactNode;
  member: {
    id: string;
    name: string;
    color: string;
    avatar?: string;
    role?: string;
    weight: number;
    count: number;
  };
  recommendation: string;
}) {
  const borderClass =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
      : "border-red-500/30 bg-red-500/[0.04]";
  const iconClass =
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      : "bg-red-500/15 text-red-600 dark:text-red-400";
  const titleClass =
    tone === "good" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400";
  const valueClass =
    tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${borderClass}`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wide ${titleClass}`}>
          {title}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar
          member={{ name: member.name, color: member.color, avatar: member.avatar }}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">{member.name}</div>
          {member.role && <div className="text-[11px] text-muted-foreground">{member.role}</div>}
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold tabular-nums ${valueClass}`}>
            {member.weight}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">pts</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {member.count} {member.count === 1 ? "pendente" : "pendentes"}
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{recommendation}</p>
    </div>
  );
}
