import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useInbound } from "@/lib/inbound";

export type Origin = "china" | "nacional";

// === Colunas do Kanban ===
export interface KanbanColumn {
  id: string;
  label: string;
  isFinalizado?: boolean;
  sortOrder?: number;
}

export const DONE_STAGE_ID = "finalizado";

export const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: "pre_chegada", label: "Pré-Chegada", sortOrder: 0 },
  { id: "recepcao", label: "Recepção de Volumes", sortOrder: 1 },
  { id: "conferencia", label: "Conferência & Quality Gate", sortOrder: 2 },
  { id: "preparo", label: "Preparo e Etiquetagem", sortOrder: 3 },
  { id: "lancamento_fiscal", label: "Lançamento Fiscal (NF-e)", sortOrder: 4 },
  { id: DONE_STAGE_ID, label: "Finalizado", isFinalizado: true, sortOrder: 5 },
];

export function stageShort(columns: KanbanColumn[], id: string): string {
  const col = columns.find((c) => c.id === id);
  const label = col?.label ?? id;
  return label.length > 16 ? label.slice(0, 16).trimEnd() + "…" : label;
}

export type Cargo = "Admin" | "Auxiliar" | "Analista" | "Gerente" | "Coordenador";

const ROLE_COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
];

export interface TeamMember {
  id: string;
  name: string;
  role: Cargo;
  color: string;
  email?: string;
  avatar?: string;
}

export type TaskWeight = 1 | 2 | 3;

export type TaskStatus = "nao_iniciada" | "em_processo" | "concluida";

// Tag criada pelo usuário (livre) ou automaticamente a partir de coluna kanban
export interface TaskTag {
  id: string;
  label: string;
  color: string;
  createdBy?: string;
  isColumn?: boolean; // true = tag gerada automaticamente a partir de coluna kanban
}

export interface BatchTask {
  id: string;
  title: string;
  stage: string;
  done: boolean;
  assigneeId?: string;
  weight: TaskWeight;
  createdAt: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  paused?: boolean;
  isPersonal?: boolean;
  status?: TaskStatus;
  parentId?: string; // sub-tarefa aponta para tarefa mãe
  tagId?: string; // tag de origem (gerada pelo usuário)
}

export interface StageEvent {
  stage: string;
  date: string;
  timestamp?: string;
  notes?: string;
  who?: string;
}

export interface Divergences {
  faltas: number;
  sobras: number;
  avarias: number;
  observacao?: string;
}

export interface InvoiceInfo {
  numero?: string;
  serie?: string;
  data?: string;
  valor?: number;
}

export interface PurchaseOrder {
  id: string;
  embarkId: string;
  code: string;
  supplier: string;
  origin: Origin;
  embarque: string;
  totalValue: number;
  currency: "USD" | "BRL" | "EUR";
  issueDate: string;
  arrivalDate?: string;
  volumesReceived: number;
  divergences: Divergences;
  invoice: InvoiceInfo;
  erpStatus: string;
  freightCost: number;
  currentStage: string;
  history: StageEvent[];
  tasks: BatchTask[];
  sharepointUrl: string;
  priority: boolean;
  observacao?: string;
  skuCount?: number;
  pedraId?: string;
  financialValue: number;
  company?: string;
}

export type Lote = PurchaseOrder;

export interface TaskTemplateItem {
  title: string;
  weight: TaskWeight;
  children?: string[]; // sub-tarefas do template (só título, sem peso próprio)
}
export type TaskTemplates = Record<string, TaskTemplateItem[]>;

// === Cadastros ===
export interface Supplier {
  id: string;
  name: string;
  origin?: Origin;
}

export interface CurrencyCadastro {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

export interface Pedra {
  id: string;
  nome: string;
  cor: string;
}

// === Mapping utilities (snake_case DB ↔ camelCase TS) ===

function mapPO(row: Record<string, unknown>): PurchaseOrder {
  return {
    id: row.id as string,
    embarkId: row.embark_id as string,
    code: row.code as string,
    supplier: row.supplier as string,
    origin: row.origin as Origin,
    embarque: row.embarque as string,
    totalValue: (row.total_value as number) ?? 0,
    currency: row.currency as "USD" | "BRL" | "EUR",
    issueDate: row.issue_date as string,
    arrivalDate: row.arrival_date as string | undefined,
    volumesReceived: (row.volumes_received as number) ?? 0,
    divergences: (row.divergences as Divergences) ?? { faltas: 0, sobras: 0, avarias: 0 },
    invoice: (row.invoice as InvoiceInfo) ?? {},
    erpStatus: (row.erp_status as string) ?? "pendente",
    freightCost: (row.freight_cost as number) ?? 0,
    currentStage: row.current_stage as string,
    history: (row.history as StageEvent[]) ?? [],
    tasks: (row.tasks as BatchTask[]) ?? [],
    sharepointUrl: (row.sharepoint_url as string) ?? "",
    priority: (row.priority as boolean) ?? false,
    observacao: row.observacao as string | undefined,
    skuCount: (row.sku_count as number) ?? 0,
    pedraId: row.pedra_id as string | undefined,
    financialValue: (row.financial_value as number) ?? 0,
    company: row.company as string | undefined,
  };
}

function unmapPO(po: PurchaseOrder): Record<string, unknown> {
  return {
    id: po.id,
    embark_id: po.embarkId,
    code: po.code,
    supplier: po.supplier,
    origin: po.origin,
    embarque: po.embarque,
    total_value: po.totalValue,
    currency: po.currency,
    issue_date: po.issueDate,
    arrival_date: po.arrivalDate ?? null,
    volumes_received: po.volumesReceived,
    divergences: po.divergences,
    invoice: po.invoice,
    erp_status: po.erpStatus,
    freight_cost: po.freightCost,
    current_stage: po.currentStage,
    history: po.history,
    tasks: po.tasks,
    sharepoint_url: po.sharepointUrl,
    priority: po.priority,
    observacao: po.observacao ?? null,
    sku_count: po.skuCount ?? 0,
    pedra_id: po.pedraId ?? null,
    financial_value: po.financialValue ?? 0,
    company: po.company ?? null,
  };
}

function mapColumn(row: Record<string, unknown>): KanbanColumn {
  return {
    id: row.id as string,
    label: row.label as string,
    isFinalizado: (row.is_finalizado as boolean) ?? false,
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

function mapTeam(row: Record<string, unknown>): TeamMember {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as Cargo,
    color: (row.color as string) ?? "bg-blue-500",
    email: row.email as string | undefined,
  };
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as string,
    name: row.name as string,
    origin: row.origin as Origin | undefined,
  };
}

function mapCurrency(row: Record<string, unknown>): CurrencyCadastro {
  return {
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    symbol: (row.symbol as string) ?? "$",
  };
}

function mapPersonalTask(row: Record<string, unknown>): PersonalTask {
  return {
    id: row.id as string,
    title: row.title as string,
    assigneeId: (row.assignee_id as string) ?? undefined,
    weight: row.weight as number as TaskWeight,
    status: row.status as string as TaskStatus,
    paused: (row.paused as boolean) ?? false,
    startedAt: (row.started_at as string) ?? undefined,
    completedAt: (row.completed_at as string) ?? undefined,
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    createdBy: (row.created_by as string) ?? undefined,
    parentId: (row.parent_id as string) ?? undefined,
    tagId: (row.tag_id as string) ?? undefined,
    dueDate: (row.due_date as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    links: (row.links as TaskLink[]) ?? [],
  };
}

function mapTaskTag(row: Record<string, unknown>): TaskTag {
  return {
    id: row.id as string,
    label: row.label as string,
    color: (row.color as string) ?? "bg-slate-500",
    createdBy: (row.created_by as string) ?? undefined,
    isColumn: (row.is_column as boolean) ?? false,
  };
}

// === Tasks helper ===
function tasksFromTemplate(templates: TaskTemplates, stage: string, baseDate: string): BatchTask[] {
  const tagId = stage ? `tag-col-${stage}` : undefined;
  const results: BatchTask[] = [];
  for (const [i, it] of (templates[stage] ?? []).entries()) {
    const parentId = `t-${stage}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
    results.push({
      id: parentId,
      title: it.title,
      stage,
      done: false,
      weight: it.weight,
      createdAt: baseDate,
      status: "nao_iniciada" as TaskStatus,
      tagId,
    });
    if (it.children?.length) {
      for (const [j, childTitle] of it.children.entries()) {
        results.push({
          id: `t-sub-${stage}-${Date.now()}-${i}-${j}-${Math.random().toString(36).slice(2, 6)}`,
          title: childTitle,
          stage,
          done: false,
          weight: 1 as TaskWeight,
          createdAt: baseDate,
          status: "nao_iniciada" as TaskStatus,
          parentId,
          tagId,
        });
      }
    }
  }
  return results;
}

// === Silent error handler ===
function dbError(error: unknown) {
  if (error) console.error("[db]", error);
}

// === Store ===
export interface TaskLink {
  title: string;
  url: string;
}

export interface PersonalTask {
  id: string;
  title: string;
  assigneeId?: string;
  weight: TaskWeight;
  status: TaskStatus;
  paused: boolean;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  createdBy?: string;
  parentId?: string; // se definido, esta tarefa é sub-tarefa
  tagId?: string; // tag de origem
  dueDate?: string; // data de entrega (opcional)
  notes?: string; // anotações livres
  links?: TaskLink[]; // links anexados { title, url }
}

interface State {
  orders: PurchaseOrder[];
  columns: KanbanColumn[];
  team: TeamMember[];
  templates: TaskTemplates;
  suppliers: Supplier[];
  currencies: CurrencyCadastro[];
  pedras: Pedra[];
  personalTasks: PersonalTask[];
  taskTags: TaskTag[];
  loading: boolean;
  syncAll: () => Promise<void>;
  // Colunas
  addColumn: (label: string) => void;
  renameColumn: (id: string, label: string) => void;
  removeColumn: (id: string) => void;
  reorderColumns: (fromIdx: number, toIdx: number) => void;
  ensureFinalizadoColumn: () => void;
  // Cadastros
  addSupplier: (name: string, origin?: Origin) => void;
  removeSupplier: (id: string) => void;
  addCurrency: (code: string, name: string, symbol: string) => void;
  removeCurrency: (id: string) => void;
  // Pedras
  addPedra: (nome: string, cor: string) => void;
  removePedra: (id: string) => void;
  // Colaboradores
  addColaborador: (name: string, role: Cargo, email?: string) => void;
  removeColaborador: (id: string) => Promise<void>;
  // Templates
  setTemplate: (stageId: string, items: TaskTemplateItem[]) => void;
  commitTemplate: (stageId: string) => void;
  reorderTemplateItems: (stageId: string, fromIdx: number, toIdx: number) => void;
  // Lotes
  moveStage: (id: string, nextStage: string, who?: string) => void;
  updateOrder: (id: string, patch: Partial<PurchaseOrder>, who?: string) => void;
  setLoteObservacao: (id: string, observacao: string, who?: string) => void;
  createLote: (
    data: Pick<
      PurchaseOrder,
      "embarkId" | "code" | "supplier" | "origin" | "embarque" | "issueDate" | "priority"
    > & {
      sharepointUrl?: string;
      observacao?: string;
      skuCount?: number;
      pedraId?: string;
      financialValue?: number;
      company?: string;
    },
  ) => string;
  removeLote: (id: string) => void;
  toggleTask: (orderId: string, taskId: string) => void;
  assignTask: (orderId: string, taskId: string, assigneeId?: string) => void;
  setTaskDueDate: (orderId: string, taskId: string, dueDate?: string) => void;
  setTaskStatus: (orderId: string, taskId: string, status: TaskStatus) => void;
  setTaskPaused: (orderId: string, taskId: string, paused: boolean) => void;
  setTaskWeight: (orderId: string, taskId: string, weight: TaskWeight) => void;
  addTask: (
    orderId: string,
    title: string,
    stage: string,
    assigneeId?: string,
    weight?: TaskWeight,
    dueDate?: string,
  ) => void;
  // Aplica templates retroativamente a TODOS os lotes não-finalizados.
  // Bug fix: ao alterar template em Customização, cards existentes não recebiam.
  applyTemplatesRetroactively: (stageId?: string) => void;
  addSubtask: (orderId: string, parentId: string, title: string, stage?: string) => void;
  addPersonalTask: (orderId: string, title: string, assigneeId: string) => void;
  addStandaloneTask: (
    title: string,
    assigneeId: string,
    options?: { dueDate?: string; tagId?: string; parentId?: string; createdBy?: string },
  ) => void;
  setStandaloneTaskStatus: (id: string, status: TaskStatus) => void;
  setStandaloneTaskPaused: (id: string, paused: boolean) => void;
  setStandaloneTaskWeight: (id: string, weight: TaskWeight) => void;
  removeStandaloneTask: (id: string) => void;
  setStandaloneTaskAssignee: (id: string, assigneeId: string | undefined) => void;
  setStandaloneTaskDueDate: (id: string, dueDate?: string) => void;
  setStandaloneTaskTag: (id: string, tagId?: string) => void;
  setStandaloneTaskNotes: (id: string, notes: string) => void;
  setStandaloneTaskLinks: (id: string, links: TaskLink[]) => void;
  setStandaloneTaskTitle: (id: string, title: string) => void;
  removeTask: (orderId: string, taskId: string) => void;
  setSharepointUrl: (id: string, url: string) => void;
  // Task tags
  addTaskTag: (label: string, color?: string) => string;
  removeTaskTag: (id: string) => void;
}

export const useStore = create<State>()((set, get) => ({
  orders: [],
  columns: [],
  team: [],
  templates: {},
  suppliers: [],
  currencies: [],
  pedras: [],
  personalTasks: [],
  taskTags: [],
  loading: false,

  syncAll: async () => {
    set({ loading: true });
    const [poRes, colRes, teamRes, supRes, curRes, tplRes, ptRes, pedraRes, profilesRes, tagsRes] =
      await Promise.all([
        supabase.from("purchase_orders").select("*"),
        supabase.from("kanban_columns").select("*").order("sort_order"),
        supabase.from("colaboradores").select("*"),
        supabase.from("suppliers").select("*"),
        supabase.from("currencies").select("*"),
        supabase.from("task_templates").select("*"),
        supabase.from("personal_tasks").select("*"),
        supabase.from("pedras").select("*"),
        supabase.from("profiles").select("email, avatar"),
        supabase.from("task_tags").select("*"),
      ]);

    dbError(poRes.error);
    dbError(colRes.error);
    dbError(teamRes.error);
    dbError(supRes.error);
    dbError(curRes.error);
    dbError(tplRes.error);
    dbError(ptRes.error);
    dbError(pedraRes.error);
    dbError(profilesRes.error);
    dbError(tagsRes.error);

    const avatarByEmail = new Map<string, string>();
    for (const p of profilesRes.data ?? []) {
      if (p.email && p.avatar) avatarByEmail.set(p.email as string, p.avatar as string);
    }

    const templates: TaskTemplates = {};
    for (const t of tplRes.data ?? []) {
      templates[t.stage as string] = (t.items as TaskTemplateItem[]) ?? [];
    }

    const team = (teamRes.data ?? []).map((row) => {
      const m = mapTeam(row);
      if (m.email && avatarByEmail.has(m.email)) m.avatar = avatarByEmail.get(m.email);
      return m;
    });

    set({
      orders: (poRes.data ?? []).map(mapPO),
      columns: (colRes.data ?? []).map(mapColumn),
      team,
      suppliers: (supRes.data ?? []).map(mapSupplier),
      currencies: (curRes.data ?? []).map(mapCurrency),
      pedras: (pedraRes.data ?? []).map((r) => ({
        id: r.id as string,
        nome: r.nome as string,
        cor: r.cor as string,
      })),
      templates,
      personalTasks: (ptRes.data ?? []).map(mapPersonalTask),
      taskTags: (tagsRes.data ?? []).map(mapTaskTag),
      loading: false,
    });
  },

  // === Colunas ===
  addColumn: (label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = `stage-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cols = get().columns;
    const finIdx = cols.findIndex((c) => c.isFinalizado);
    const sortOrder = finIdx >= 0 ? finIdx : cols.length;

    const tagId = `tag-col-${id}`;
    const colColors = [
      "bg-slate-500",
      "bg-blue-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-violet-500",
      "bg-rose-500",
      "bg-cyan-500",
      "bg-orange-500",
    ];
    const tagColor = colColors[get().columns.length % colColors.length];

    set((s) => {
      const col: KanbanColumn = { id, label: trimmed, sortOrder };
      const next = [...s.columns];
      if (finIdx >= 0) next.splice(finIdx, 0, col);
      else next.push(col);
      return {
        columns: next,
        templates: { ...s.templates, [id]: [] },
        taskTags: [...s.taskTags, { id: tagId, label: trimmed, color: tagColor, isColumn: true }],
      };
    });

    supabase
      .from("kanban_columns")
      .insert({ id, label: trimmed, sort_order: sortOrder, is_finalizado: false })
      .then(({ error }) => dbError(error));
    supabase
      .from("task_tags")
      .insert({ id: tagId, label: trimmed, color: tagColor, is_column: true })
      .then(({ error }) => dbError(error));
  },

  renameColumn: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const tagId = `tag-col-${id}`;
    set((s) => ({
      columns: s.columns.map((c) => (c.id === id ? { ...c, label: trimmed } : c)),
      taskTags: s.taskTags.map((t) => (t.id === tagId ? { ...t, label: trimmed } : t)),
    }));
    supabase
      .from("kanban_columns")
      .update({ label: trimmed })
      .eq("id", id)
      .then(({ error }) => dbError(error));
    supabase
      .from("task_tags")
      .update({ label: trimmed })
      .eq("id", tagId)
      .then(({ error }) => dbError(error));
  },

  removeColumn: (id) => {
    const col = get().columns.find((c) => c.id === id);
    if (!col || col.isFinalizado || get().columns.length <= 1) return;
    const cols = get().columns;
    const fallback = cols.find((c) => c.id !== id && !c.isFinalizado)?.id ?? cols[0].id;
    const tagId = `tag-col-${id}`;

    set((s) => {
      const nextTemplates = { ...s.templates };
      delete nextTemplates[id];
      return {
        columns: s.columns.filter((c) => c.id !== id),
        templates: nextTemplates,
        taskTags: s.taskTags.filter((t) => t.id !== tagId),
        orders: s.orders.map((o) =>
          o.currentStage !== id && !o.tasks.some((t) => t.stage === id)
            ? o
            : {
                ...o,
                currentStage: o.currentStage === id ? fallback : o.currentStage,
                tasks: o.tasks.filter((t) => t.stage !== id),
                history: o.history.filter((h) => h.stage !== id),
              },
        ),
      };
    });

    supabase
      .from("kanban_columns")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
    supabase
      .from("task_tags")
      .delete()
      .eq("id", tagId)
      .then(({ error }) => dbError(error));
  },

  reorderColumns: (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    set((s) => {
      const next = [...s.columns];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { columns: next.map((c, i) => ({ ...c, sortOrder: i })) };
    });

    const cols = get().columns;
    Promise.all(
      cols.map((c, i) => supabase.from("kanban_columns").update({ sort_order: i }).eq("id", c.id)),
    ).then(() => {});
  },

  ensureFinalizadoColumn: () => {
    if (get().columns.some((c) => c.isFinalizado)) return;
    const finCol: KanbanColumn = {
      id: DONE_STAGE_ID,
      label: "Finalizado",
      isFinalizado: true,
      sortOrder: 99,
    };
    set((s) => ({
      columns: [...s.columns, finCol],
      templates: { ...s.templates, [DONE_STAGE_ID]: s.templates[DONE_STAGE_ID] ?? [] },
    }));
    supabase
      .from("kanban_columns")
      .upsert({ id: DONE_STAGE_ID, label: "Finalizado", sort_order: 99, is_finalizado: true })
      .then(({ error }) => dbError(error));
  },

  // === Cadastros ===
  addSupplier: (name, origin) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `sup-${Date.now()}`;
    set((s) => ({ suppliers: [...s.suppliers, { id, name: trimmed, origin }] }));
    supabase
      .from("suppliers")
      .insert({ id, name: trimmed, origin: origin ?? null })
      .then(({ error }) => dbError(error));
  },

  removeSupplier: (id) => {
    set((s) => ({ suppliers: s.suppliers.filter((su) => su.id !== id) }));
    supabase
      .from("suppliers")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  addCurrency: (code, name, symbol) => {
    const id = `cur-${Date.now()}`;
    set((s) => ({
      currencies: [
        ...s.currencies,
        { id, code: code.trim(), name: name.trim(), symbol: symbol.trim() },
      ],
    }));
    supabase
      .from("currencies")
      .insert({ id, code: code.trim(), name: name.trim(), symbol: symbol.trim() })
      .then(({ error }) => dbError(error));
  },

  removeCurrency: (id) => {
    set((s) => ({ currencies: s.currencies.filter((c) => c.id !== id) }));
    supabase
      .from("currencies")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  // === Pedras ===
  addPedra: (nome, cor) => {
    const trimmed = nome.trim();
    if (!trimmed) return;
    const id = `ped-${Date.now()}`;
    set((s) => ({ pedras: [...s.pedras, { id, nome: trimmed, cor }] }));
    supabase
      .from("pedras")
      .insert({ id, nome: trimmed, cor })
      .then(({ error }) => dbError(error));
  },

  removePedra: (id) => {
    set((s) => ({ pedras: s.pedras.filter((p) => p.id !== id) }));
    supabase
      .from("pedras")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  // === Colaboradores ===
  addColaborador: (name, role, email) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `u-${Date.now()}`;
    const color = ROLE_COLORS[get().team.length % ROLE_COLORS.length];
    set((s) => ({ team: [...s.team, { id, name: trimmed, role, color, email }] }));
    supabase
      .from("colaboradores")
      .insert({ id, name: trimmed, role, color, email: email ?? null })
      .then(({ error }) => dbError(error));
  },

  removeColaborador: async (id) => {
    const member = get().team.find((m) => m.id === id);
    if (member?.email) {
      const { error } = await supabase.functions.invoke("admin-delete-user", {
        body: { email: member.email },
      });
      if (error) {
        console.error("Falha ao remover acesso do usuário:", error);
      }
    }
    set((s) => ({
      team: s.team.filter((m) => m.id !== id),
      orders: s.orders.map((o) => ({
        ...o,
        tasks: o.tasks.map((t) => (t.assigneeId === id ? { ...t, assigneeId: undefined } : t)),
      })),
    }));
    await supabase
      .from("colaboradores")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  // === Templates ===
  setTemplate: (stageId, items) => {
    set((s) => ({ templates: { ...s.templates, [stageId]: items } }));
  },

  commitTemplate: (stageId) => {
    const items = get().templates[stageId] ?? [];
    supabase
      .from("task_templates")
      .upsert({ stage: stageId, items }, { onConflict: "stage" })
      .then(({ error }) => dbError(error));
    get().applyTemplatesRetroactively(stageId);
  },

  // Aplica templates a todos os lotes não-finalizados.
  // Se stageId informado, só re-aplica para aquela coluna.
  applyTemplatesRetroactively: (stageId) => {
    const { templates, orders, columns } = get();
    const cols = stageId
      ? columns.filter((c) => c.id === stageId)
      : columns.filter((c) => !c.isFinalizado);
    if (cols.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const touched: PurchaseOrder[] = [];

    function dedupTasks(tasks: BatchTask[]): BatchTask[] {
      const byStage = new Map<string, BatchTask[]>();
      for (const t of tasks) {
        const arr = byStage.get(t.stage) ?? [];
        arr.push(t);
        byStage.set(t.stage, arr);
      }
      const result: BatchTask[] = [];
      for (const [, stageTasks] of byStage) {
        const seen = new Map<string, BatchTask>();
        for (const t of stageTasks) {
          const key = t.title.trim().toLowerCase();
          const existing = seen.get(key);
          if (!existing || (t.done && !existing.done) || t.id.length > existing.id.length) {
            seen.set(key, t);
          }
        }
        result.push(...seen.values());
      }
      return result;
    }

    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.currentStage === DONE_STAGE_ID) return o;
        let nextTasks = dedupTasks(o.tasks);
        for (const col of cols) {
          if (col.isFinalizado) continue;
          const tpls = templates[col.id] ?? [];
          const existingTitles = new Set(
            nextTasks
              .filter((t) => t.stage === col.id && !t.parentId)
              .map((t) => t.title.trim().toLowerCase()),
          );
          const additions: BatchTask[] = [];
          for (let i = 0; i < tpls.length; i++) {
            const tpl = tpls[i];
            if (existingTitles.has(tpl.title.trim().toLowerCase())) continue;
            const parentId = `t-${col.id}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
            additions.push({
              id: parentId,
              title: tpl.title,
              stage: col.id,
              done: false,
              weight: tpl.weight,
              createdAt: today,
              status: "nao_iniciada",
              tagId: `tag-col-${col.id}`,
            });
            if (tpl.children?.length) {
              for (let j = 0; j < tpl.children.length; j++) {
                additions.push({
                  id: `t-sub-${col.id}-${Date.now()}-${i}-${j}-${Math.random().toString(36).slice(2, 6)}`,
                  title: tpl.children[j],
                  stage: col.id,
                  done: false,
                  weight: 1 as TaskWeight,
                  createdAt: today,
                  status: "nao_iniciada",
                  parentId,
                  tagId: `tag-col-${col.id}`,
                });
              }
            }
          }
          if (additions.length > 0) {
            nextTasks = [...nextTasks, ...additions];
          }
        }
        if (nextTasks === o.tasks) return o;
        touched.push({ ...o, tasks: nextTasks });
        return { ...o, tasks: nextTasks };
      }),
    }));

    // Persistir mudanças (em paralelo)
    if (touched.length > 0) {
      Promise.all(
        touched.map((o) =>
          supabase.from("purchase_orders").update({ tasks: o.tasks }).eq("id", o.id),
        ),
      ).then((res) => res.forEach((r) => dbError(r?.error)));
    }
  },

  reorderTemplateItems: (stageId, fromIdx, toIdx) => {
    set((s) => {
      const items = [...(s.templates[stageId] ?? [])];
      if (fromIdx < 0 || fromIdx >= items.length || toIdx < 0 || toIdx >= items.length) return s;
      const [moved] = items.splice(fromIdx, 1);
      items.splice(toIdx, 0, moved);
      return { templates: { ...s.templates, [stageId]: items } };
    });
    const items = get().templates[stageId] ?? [];
    supabase
      .from("task_templates")
      .upsert({ stage: stageId, items }, { onConflict: "stage" })
      .then(({ error }) => dbError(error));
  },

  // === Lotes ===
  moveStage: (id, nextStage, who) => {
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id || o.currentStage === nextStage) return o;
        return {
          ...o,
          currentStage: nextStage,
          history: [...o.history, { stage: nextStage, date, timestamp: now, who }],
        };
      }),
    }));
    const order = get().orders.find((o) => o.id === id);
    if (order) {
      supabase
        .from("purchase_orders")
        .update({ current_stage: nextStage, history: order.history, tasks: order.tasks })
        .eq("id", id)
        .then(({ error }) => dbError(error));
    }
  },

  updateOrder: (id, patch, who) => {
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;
        const updated = { ...o, ...patch };
        if (patch.priority !== undefined && patch.priority !== o.priority) {
          updated.history = [
            ...o.history,
            {
              stage: o.currentStage,
              date,
              timestamp: now,
              notes: patch.priority ? "Marcado como prioritário." : "Prioridade removida.",
              who,
            },
          ];
        }
        return updated;
      }),
    }));
    const order = get().orders.find((o) => o.id === id);
    if (order) {
      supabase
        .from("purchase_orders")
        .update(unmapPO(order))
        .eq("id", id)
        .then(({ error }) => dbError(error));
    }
  },

  setLoteObservacao: (id, observacao, who) => {
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id
          ? {
              ...o,
              observacao,
              history: [
                ...o.history,
                {
                  stage: o.currentStage,
                  date,
                  timestamp: now,
                  notes: `Observação atualizada: "${observacao}"`,
                  who,
                },
              ],
            }
          : o,
      ),
    }));
    supabase
      .from("purchase_orders")
      .update({ observacao })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  createLote: (data) => {
    const existing = get().orders;
    if (existing.some((o) => o.code.toLowerCase() === data.code.toLowerCase())) {
      throw new Error("Já existe um lote com este nome.");
    }
    const id = `lot-${Date.now()}`;
    const date = new Date().toISOString().slice(0, 10);
    const firstCol = get().columns.find((c) => !c.isFinalizado)?.id ?? get().columns[0]?.id ?? "";
    const allCols = get().columns;
    const allTasks: BatchTask[] = [];
    for (const col of allCols) {
      if (col.isFinalizado) continue;
      const tpls = get().templates[col.id] ?? [];
      for (let i = 0; i < tpls.length; i++) {
        const parentId = `t-${col.id}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
        allTasks.push({
          id: parentId,
          title: tpls[i].title,
          stage: col.id,
          done: false,
          weight: tpls[i].weight,
          createdAt: date,
          status: "nao_iniciada",
        });
        if (tpls[i].children?.length) {
          for (let j = 0; j < tpls[i].children.length; j++) {
            allTasks.push({
              id: `t-sub-${col.id}-${Date.now()}-${i}-${j}-${Math.random().toString(36).slice(2, 6)}`,
              title: tpls[i].children![j],
              stage: col.id,
              done: false,
              weight: 1 as TaskWeight,
              createdAt: date,
              status: "nao_iniciada",
              parentId,
            });
          }
        }
      }
    }
    const newLote: PurchaseOrder = {
      id,
      embarkId: data.embarkId,
      code: data.code,
      supplier: data.supplier,
      origin: data.origin,
      embarque: data.embarque,
      totalValue: 0,
      currency: "USD",
      issueDate: data.issueDate,
      volumesReceived: 0,
      divergences: { faltas: 0, sobras: 0, avarias: 0 },
      invoice: {},
      erpStatus: "pendente",
      freightCost: 0,
      currentStage: firstCol,
      history: firstCol ? [{ stage: firstCol, date }] : [],
      tasks: allTasks,
      sharepointUrl: data.sharepointUrl ?? "",
      priority: data.priority,
      observacao: data.observacao,
      skuCount: data.skuCount,
      pedraId: data.pedraId,
      financialValue: data.financialValue ?? 0,
      company: data.company,
    };
    set((s) => ({ orders: [newLote, ...s.orders] }));
    supabase
      .from("purchase_orders")
      .insert(unmapPO(newLote))
      .then(({ error }) => dbError(error));
    return id;
  },

  removeLote: (id) => {
    const order = get().orders.find((o) => o.id === id);
    set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }));
    supabase
      .from("purchase_orders")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
    if (order?.embarkId) {
      useInbound.getState().removeLot(order.embarkId);
    }
  },

  toggleTask: (orderId, taskId) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id !== orderId
          ? o
          : {
              ...o,
              tasks: o.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      done: !t.done,
                      completedAt: !t.done ? new Date().toISOString() : undefined,
                      status: !t.done
                        ? ("concluida" as TaskStatus)
                        : ("nao_iniciada" as TaskStatus),
                    }
                  : t,
              ),
            },
      ),
    }));
    pushTasks(get(), orderId);
  },

  assignTask: (orderId, taskId, assigneeId) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id !== orderId
          ? o
          : {
              ...o,
              tasks: o.tasks.map((t) => (t.id === taskId ? { ...t, assigneeId } : t)),
            },
      ),
    }));
    pushTasks(get(), orderId);
  },

  setTaskDueDate: (orderId, taskId, dueDate) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id !== orderId
          ? o
          : {
              ...o,
              tasks: o.tasks.map((t) => (t.id === taskId ? { ...t, dueDate } : t)),
            },
      ),
    }));
    pushTasks(get(), orderId);
  },

  setTaskStatus: (orderId, taskId, status) => {
    const now = new Date().toISOString();
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id !== orderId
          ? o
          : {
              ...o,
              tasks: o.tasks.map((t) => {
                if (t.id !== taskId) return t;
                const patch: Partial<BatchTask> = { status };
                if (status === "em_processo") {
                  patch.startedAt = now;
                  patch.done = false;
                  patch.completedAt = undefined;
                  patch.paused = false;
                } else if (status === "concluida") {
                  patch.completedAt = now;
                  patch.done = true;
                  patch.paused = false;
                } else {
                  patch.paused = false;
                  if (t.status === "concluida") patch.done = false;
                }
                return { ...t, ...patch };
              }),
            },
      ),
    }));
    pushTasks(get(), orderId);
  },

  setTaskPaused: (orderId, taskId, paused) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id !== orderId
          ? o
          : {
              ...o,
              tasks: o.tasks.map((t) => (t.id === taskId ? { ...t, paused } : t)),
            },
      ),
    }));
    pushTasks(get(), orderId);
  },

  setTaskWeight: (orderId, taskId, weight) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id !== orderId
          ? o
          : {
              ...o,
              tasks: o.tasks.map((t) => (t.id === taskId ? { ...t, weight } : t)),
            },
      ),
    }));
    pushTasks(get(), orderId);
  },

  addTask: (orderId, title, stage, assigneeId, weight = 1, dueDate) => {
    const task: BatchTask = {
      id: `t-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      stage,
      done: false,
      assigneeId,
      weight,
      dueDate,
      createdAt: new Date().toISOString().slice(0, 10),
      status: "nao_iniciada",
    };
    set((s) => ({
      orders: s.orders.map((o) => (o.id !== orderId ? o : { ...o, tasks: [...o.tasks, task] })),
    }));
    pushTasks(get(), orderId);
  },

  addSubtask: (orderId, parentId, title, stage) => {
    const parentTask = get()
      .orders.find((o) => o.id === orderId)
      ?.tasks.find((t) => t.id === parentId);
    const targetStage = stage ?? parentTask?.stage ?? "";
    const sub: BatchTask = {
      id: `t-sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      stage: targetStage,
      done: false,
      weight: 1,
      createdAt: new Date().toISOString().slice(0, 10),
      status: "nao_iniciada",
      parentId,
    };
    set((s) => ({
      orders: s.orders.map((o) => (o.id !== orderId ? o : { ...o, tasks: [...o.tasks, sub] })),
    }));
    pushTasks(get(), orderId);
  },

  addPersonalTask: (orderId, title, assigneeId) => {
    const task: BatchTask = {
      id: `t-personal-${Date.now()}`,
      title,
      stage: "_personal",
      done: false,
      assigneeId,
      weight: 1,
      createdAt: new Date().toISOString().slice(0, 10),
      isPersonal: true,
      status: "nao_iniciada",
    };
    set((s) => ({
      orders: s.orders.map((o) => (o.id !== orderId ? o : { ...o, tasks: [...o.tasks, task] })),
    }));
    pushTasks(get(), orderId);
  },

  addStandaloneTask: (title, assigneeId, options) => {
    const id = `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const task: PersonalTask = {
      id,
      title,
      assigneeId,
      weight: 1,
      status: "nao_iniciada",
      paused: false,
      createdAt: new Date().toISOString(),
      dueDate: options?.dueDate,
      tagId: options?.tagId,
      parentId: options?.parentId,
      createdBy: options?.createdBy,
    };
    set((s) => ({ personalTasks: [...s.personalTasks, task] }));
    supabase
      .from("personal_tasks")
      .insert({
        id: task.id,
        title: task.title,
        assignee_id: task.assigneeId ?? null,
        weight: task.weight,
        status: task.status,
        paused: task.paused,
        created_at: task.createdAt,
        due_date: task.dueDate ?? null,
        tag_id: task.tagId ?? null,
        parent_id: task.parentId ?? null,
        created_by: task.createdBy ?? null,
      })
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskStatus: (id, status) => {
    set((s) => ({
      personalTasks: s.personalTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              startedAt:
                status === "em_processo" ? (t.startedAt ?? new Date().toISOString()) : t.startedAt,
              completedAt: status === "concluida" ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    }));
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { status };
    if (status === "em_processo") update["started_at"] = now;
    if (status === "concluida") update["completed_at"] = now;
    supabase
      .from("personal_tasks")
      .update(update)
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskPaused: (id, paused) => {
    set((s) => ({
      personalTasks: s.personalTasks.map((t) => (t.id === id ? { ...t, paused } : t)),
    }));
    supabase
      .from("personal_tasks")
      .update({ paused })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskWeight: (id, weight) => {
    set((s) => ({
      personalTasks: s.personalTasks.map((t) => (t.id === id ? { ...t, weight } : t)),
    }));
    supabase
      .from("personal_tasks")
      .update({ weight })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  removeStandaloneTask: (id) => {
    // Coleta mãe + sub-tarefas ANTES de filtrar o estado (otimista + DB em paralelo)
    const subIds = get()
      .personalTasks.filter((t) => t.parentId === id)
      .map((t) => t.id);
    const idsToDelete = [id, ...subIds];

    set((s) => ({
      personalTasks: s.personalTasks.filter((t) => !idsToDelete.includes(t.id)),
    }));
    supabase
      .from("personal_tasks")
      .delete()
      .in("id", idsToDelete)
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskAssignee: (id, assigneeId) => {
    set((s) => ({
      personalTasks: s.personalTasks.map((t) => (t.id === id ? { ...t, assigneeId } : t)),
    }));
    supabase
      .from("personal_tasks")
      .update({ assignee_id: assigneeId ?? null })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskDueDate: (id, dueDate) => {
    set((s) => ({
      personalTasks: s.personalTasks.map((t) => (t.id === id ? { ...t, dueDate } : t)),
    }));
    supabase
      .from("personal_tasks")
      .update({ due_date: dueDate ?? null })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskTag: (id, tagId) => {
    set((s) => ({
      personalTasks: s.personalTasks.map((t) => (t.id === id ? { ...t, tagId } : t)),
    }));
    supabase
      .from("personal_tasks")
      .update({ tag_id: tagId ?? null })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskNotes: (id, notes) => {
    set((s) => ({
      personalTasks: s.personalTasks.map((t) => (t.id === id ? { ...t, notes } : t)),
    }));
    supabase
      .from("personal_tasks")
      .update({ notes: notes || null })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskLinks: (id, links) => {
    set((s) => ({
      personalTasks: s.personalTasks.map((t) => (t.id === id ? { ...t, links } : t)),
    }));
    supabase
      .from("personal_tasks")
      .update({ links })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setStandaloneTaskTitle: (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    set((s) => ({
      personalTasks: s.personalTasks.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
    }));
    supabase
      .from("personal_tasks")
      .update({ title: trimmed })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  removeTask: (orderId, taskId) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id !== orderId ? o : { ...o, tasks: o.tasks.filter((t) => t.id !== taskId) },
      ),
    }));
    pushTasks(get(), orderId);
  },

  setSharepointUrl: (id, url) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, sharepointUrl: url } : o)),
    }));
    supabase
      .from("purchase_orders")
      .update({ sharepoint_url: url })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  // === Task tags ===
  addTaskTag: (label, color = "bg-slate-500") => {
    const trimmed = label.trim();
    if (!trimmed) return "";
    const id = `tag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ taskTags: [...s.taskTags, { id, label: trimmed, color, isColumn: false }] }));
    supabase
      .from("task_tags")
      .insert({ id, label: trimmed, color, is_column: false })
      .then(({ error }) => dbError(error));
    return id;
  },

  removeTaskTag: (id) => {
    const tag = get().taskTags.find((t) => t.id === id);
    if (tag?.isColumn) return; // tags de coluna não são removíveis manualmente
    set((s) => ({
      taskTags: s.taskTags.filter((t) => t.id !== id),
      // limpa referências em personal_tasks
      personalTasks: s.personalTasks.map((t) => (t.tagId === id ? { ...t, tagId: undefined } : t)),
    }));
    supabase
      .from("task_tags")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
    supabase
      .from("personal_tasks")
      .update({ tag_id: null })
      .eq("tag_id", id)
      .then(({ error }) => dbError(error));
  },
}));

function pushTasks(state: State, orderId: string) {
  const order = state.orders.find((o) => o.id === orderId);
  if (order) {
    supabase
      .from("purchase_orders")
      .update({ tasks: order.tasks })
      .eq("id", orderId)
      .then(({ error }) => dbError(error));
  }
}

// === Helpers ===
export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export function isLate(o: PurchaseOrder, etaDate?: string): boolean {
  const target = etaDate ?? o.arrivalDate;
  if (!target) return false;
  if (o.currentStage === DONE_STAGE_ID) return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  return target < todayStr;
}

export function totalDivergences(o: PurchaseOrder): number {
  return o.divergences.faltas + o.divergences.sobras + o.divergences.avarias;
}

export function findMember(id: string | undefined, team: TeamMember[]): TeamMember | undefined {
  return team.find((m) => m.id === id);
}

export function findMemberByEmail(email: string | undefined, team: TeamMember[]): TeamMember | undefined {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return team.find((m) => m.email?.trim().toLowerCase() === normalized);
}

export type Stage = string;
