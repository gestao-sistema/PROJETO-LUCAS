import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export type InboundOrigin = "china" | "nacional";
export type CustomsChannel = "verde" | "amarelo" | "vermelho";

export const CHINA_STAGES = [
  "producao",
  "consolidacao",
  "transito_internacional",
  "desembaraco",
  "transito_domestico",
  "inspecao",
  "finalizado",
] as const;
export type ChinaStage = (typeof CHINA_STAGES)[number];

export const BR_STAGES = ["producao", "faturado", "transito", "inspecao", "finalizado"] as const;
export type BrStage = (typeof BR_STAGES)[number];

export type InboundStage = ChinaStage | BrStage;

export const STAGE_LABEL: Record<string, string> = {
  producao: "Em Produção",
  consolidacao: "Aguardando Consolidação",
  transito_internacional: "Em Trânsito Internacional",
  desembaraco: "Desembaraço Aduaneiro",
  transito_domestico: "Trânsito Doméstico",
  faturado: "Faturado / Aguardando Coleta",
  transito: "Em Trânsito Rodoviário",
  inspecao: "Recebido / Inspeção",
  finalizado: "Finalizado (Estoque)",
};

export const STAGE_SHORT: Record<string, string> = {
  producao: "Produção",
  consolidacao: "Consolidação",
  transito_internacional: "Trânsito Intl.",
  desembaraco: "Desembaraço",
  transito_domestico: "Trânsito Dom.",
  faturado: "Faturado",
  transito: "Em Trânsito",
  inspecao: "Inspeção",
  finalizado: "Finalizado",
};

export const STAGE_TONE: Record<string, string> = {
  producao: "bg-muted text-muted-foreground",
  consolidacao: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  transito_internacional: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  desembaraco: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300",
  transito_domestico: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  faturado: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  transito: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  inspecao: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  finalizado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export function stagesFor(origin: InboundOrigin): readonly InboundStage[] {
  return origin === "china" ? CHINA_STAGES : BR_STAGES;
}

export interface InboundHistoryEvent {
  stage: string;
  date: string;
  timestamp?: string;
  notes?: string;
  channel?: CustomsChannel;
  taxes?: number;
  despachante?: string;
  who?: string;
}

export interface Embarque {
  id: string;
  code: string;
  supplier: string;
  suppliers: string[];
  companies: string[];
  origin: InboundOrigin;
  currency: "USD" | "BRL";
  totalValue: number;
  issueDate: string;
  embarkDate: string;
  etaDate: string;
  volumesExpected: number;
  qtdPecas: number;
  qtdCaixas: number;
  chegadaReal?: string;
  stage: string;
  invoiceNumber?: string;
  invoiceValue?: number;
  customsChannel?: CustomsChannel;
  customsTaxes?: number;
  despachante?: string;
  notes?: string;
  observacao?: string;
  history: InboundHistoryEvent[];
  sharepointUrl: string;
}

export type InboundLot = Embarque;

function mapEmbarque(row: Record<string, unknown>): Embarque {
  const suppliersRaw = (row.suppliers as string[]) ?? null;
  const suppliers = suppliersRaw ?? (row.supplier ? [row.supplier as string] : []);
  return {
    id: row.id as string,
    code: row.code as string,
    supplier: suppliers.join(", "),
    suppliers,
    companies: (row.companies as string[]) ?? [],
    origin: row.origin as InboundOrigin,
    currency: row.currency as "USD" | "BRL",
    totalValue: (row.total_value as number) ?? 0,
    issueDate: row.issue_date as string,
    embarkDate: row.embark_date as string,
    etaDate: row.eta_date as string,
    volumesExpected: (row.volumes_expected as number) ?? 0,
    qtdPecas: (row.qtd_pecas as number) ?? 0,
    qtdCaixas: (row.qtd_caixas as number) ?? 0,
    chegadaReal: row.chegada_real as string | undefined,
    stage: row.stage as string,
    invoiceNumber: row.invoice_number as string | undefined,
    invoiceValue: row.invoice_value as number | undefined,
    customsChannel: row.customs_channel as CustomsChannel | undefined,
    customsTaxes: row.customs_taxes as number | undefined,
    despachante: row.despachante as string | undefined,
    notes: row.notes as string | undefined,
    observacao: row.observacao as string | undefined,
    history: (row.history as InboundHistoryEvent[]) ?? [],
    sharepointUrl: (row.sharepoint_url as string) ?? "",
  };
}

function unmapEmbarque(e: Embarque): Record<string, unknown> {
  return {
    id: e.id,
    code: e.code,
    supplier: e.suppliers[0] ?? "",
    suppliers: e.suppliers,
    companies: e.companies,
    origin: e.origin,
    currency: e.currency,
    total_value: e.totalValue,
    issue_date: e.issueDate,
    embark_date: e.embarkDate,
    eta_date: e.etaDate,
    volumes_expected: e.volumesExpected,
    qtd_pecas: e.qtdPecas,
    qtd_caixas: e.qtdCaixas,
    chegada_real: e.chegadaReal ?? null,
    stage: e.stage,
    invoice_number: e.invoiceNumber ?? null,
    invoice_value: e.invoiceValue ?? null,
    customs_channel: e.customsChannel ?? null,
    customs_taxes: e.customsTaxes ?? null,
    despachante: e.despachante ?? null,
    notes: e.notes ?? null,
    observacao: e.observacao ?? null,
    history: e.history,
    sharepoint_url: e.sharepointUrl,
  };
}

function dbError(error: unknown) {
  if (error) console.error("[db]", error);
}

export interface InboundColumn {
  id: string;
  label: string;
  sortOrder: number;
  isEntregue: boolean;
  board: "china" | "nacional";
}

export const ENTREGUE_STAGE_ID = "entregue";

function mapInboundColumn(row: Record<string, unknown>): InboundColumn {
  return {
    id: row.id as string,
    label: row.label as string,
    sortOrder: (row.sort_order as number) ?? 0,
    isEntregue: (row.is_entregue as boolean) ?? false,
    board: (row.board as "china" | "nacional") ?? "china",
  };
}

interface InboundState {
  lots: Embarque[];
  inboundColumns: InboundColumn[];
  loading: boolean;
  syncAll: () => Promise<void>;
  createLot: (data: {
    code: string;
    suppliers: string[];
    companies?: string[];
    origin: InboundOrigin;
    currency: "USD" | "BRL";
    totalValue: number;
    volumesExpected: number;
    qtdPecas?: number;
    qtdCaixas?: number;
    issueDate: string;
    etaDate: string;
    sharepointUrl?: string;
    observacao?: string;
  }) => string;
  updateStage: (
    id: string,
    payload: {
      stage: string;
      date: string;
      notes?: string;
      channel?: CustomsChannel;
      taxes?: number;
      despachante?: string;
      who?: string;
    },
  ) => void;
  setSharepointUrl: (id: string, url: string) => void;
  setObservacao: (id: string, observacao: string) => void;
  updateLot: (id: string, patch: Partial<Embarque>) => void;
  removeLot: (id: string) => void;
  setChegadaReal: (id: string, date: string) => void;
  addInboundColumn: (board: "china" | "nacional", label: string) => void;
  renameInboundColumn: (id: string, label: string) => void;
  removeInboundColumn: (id: string) => void;
  reorderInboundColumns: (board: "china" | "nacional", fromIdx: number, toIdx: number) => void;
}

export const useInbound = create<InboundState>()((set, get) => ({
  lots: [],
  inboundColumns: [],
  loading: false,

  syncAll: async () => {
    set({ loading: true });
    const [embRes, colRes] = await Promise.all([
      supabase.from("embarques").select("*"),
      supabase.from("inbound_columns").select("*").order("sort_order"),
    ]);
    dbError(embRes.error);
    dbError(colRes.error);
    set({
      lots: (embRes.data ?? []).map(mapEmbarque),
      inboundColumns: (colRes.data ?? []).map(mapInboundColumn),
      loading: false,
    });
  },

  createLot: (data) => {
    if (get().lots.some((l) => l.code.toLowerCase() === data.code.toLowerCase())) {
      throw new Error("Já existe um embarque com este número.");
    }
    const id = `in-${Date.now()}`;
    const initial = "producao";
    const date = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const embarque: Embarque = {
      id,
      code: data.code,
      supplier: data.suppliers.join(", "),
      suppliers: data.suppliers,
      companies: data.companies ?? [],
      origin: data.origin,
      currency: data.currency,
      totalValue: data.totalValue,
      issueDate: data.issueDate,
      embarkDate: date,
      etaDate: data.etaDate,
      volumesExpected: data.volumesExpected,
      qtdPecas: data.qtdPecas ?? 0,
      qtdCaixas: data.qtdCaixas ?? 0,
      stage: initial,
      observacao: data.observacao,
      history: [{ stage: initial, date, timestamp: now, notes: "Embarque cadastrado." }],
      sharepointUrl: data.sharepointUrl ?? "",
    };
    set((s) => ({ lots: [embarque, ...s.lots] }));
    supabase
      .from("embarques")
      .insert(unmapEmbarque(embarque))
      .then(({ error }) => dbError(error));
    return id;
  },

  updateStage: (id, payload) => {
    set((s) => ({
      lots: s.lots.map((l) =>
        l.id !== id
          ? l
          : {
              ...l,
              stage: payload.stage,
              customsChannel: payload.channel ?? l.customsChannel,
              customsTaxes: payload.taxes ?? l.customsTaxes,
              despachante: payload.despachante ?? l.despachante,
              notes: payload.notes ?? l.notes,
              history: [
                ...l.history,
                {
                  stage: payload.stage,
                  date: payload.date,
                  timestamp: new Date().toISOString(),
                  notes: payload.notes,
                  channel: payload.channel,
                  taxes: payload.taxes,
                  despachante: payload.despachante,
                  who: payload.who,
                },
              ],
            },
      ),
    }));
    const lot = get().lots.find((l) => l.id === id);
    if (lot) {
      supabase
        .from("embarques")
        .update(unmapEmbarque(lot))
        .eq("id", id)
        .then(({ error }) => dbError(error));
    }
  },

  setSharepointUrl: (id, url) => {
    set((s) => ({
      lots: s.lots.map((l) => (l.id === id ? { ...l, sharepointUrl: url } : l)),
    }));
    supabase
      .from("embarques")
      .update({ sharepoint_url: url })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setObservacao: (id, observacao) => {
    set((s) => ({
      lots: s.lots.map((l) => (l.id === id ? { ...l, observacao } : l)),
    }));
    supabase
      .from("embarques")
      .update({ observacao })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  updateLot: (id, patch) => {
    set((s) => ({
      lots: s.lots.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
    const lot = get().lots.find((l) => l.id === id);
    if (lot) {
      supabase
        .from("embarques")
        .update(unmapEmbarque(lot))
        .eq("id", id)
        .then(({ error }) => dbError(error));
    }
  },

  removeLot: (id) => {
    set((s) => ({ lots: s.lots.filter((l) => l.id !== id) }));
    supabase
      .from("embarques")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  setChegadaReal: (id, date) => {
    set((s) => ({
      lots: s.lots.map((l) => (l.id === id ? { ...l, chegadaReal: date } : l)),
    }));
    supabase
      .from("embarques")
      .update({ chegada_real: date })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  addInboundColumn: (board, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = `inb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const cols = get().inboundColumns.filter((c) => c.board === board);
    const entregueIdx = cols.findIndex((c) => c.isEntregue);
    const sortOrder = entregueIdx >= 0 ? entregueIdx : cols.length;
    const col: InboundColumn = { id, label: trimmed, sortOrder, isEntregue: false, board };
    set((s) => ({ inboundColumns: [...s.inboundColumns, col] }));
    supabase
      .from("inbound_columns")
      .insert({ id, label: trimmed, sort_order: sortOrder, is_entregue: false, board })
      .then(({ error }) => dbError(error));
  },

  renameInboundColumn: (id, label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    set((s) => ({
      inboundColumns: s.inboundColumns.map((c) => (c.id === id ? { ...c, label: trimmed } : c)),
    }));
    supabase
      .from("inbound_columns")
      .update({ label: trimmed })
      .eq("id", id)
      .then(({ error }) => dbError(error));
  },

  removeInboundColumn: (id) => {
    const col = get().inboundColumns.find((c) => c.id === id);
    if (!col || col.isEntregue) return;
    const cols = get().inboundColumns.filter((c) => c.board === col.board && c.id !== id);
    const fallback = cols.find((c) => !c.isEntregue)?.id ?? cols[0]?.id ?? "producao";
    set((s) => ({
      inboundColumns: s.inboundColumns.filter((c) => c.id !== id),
      lots: s.lots.map((l) => (l.stage !== id ? l : { ...l, stage: fallback })),
    }));
    supabase
      .from("inbound_columns")
      .delete()
      .eq("id", id)
      .then(({ error }) => dbError(error));
    supabase
      .from("embarques")
      .update({ stage: fallback })
      .eq("stage", id)
      .then(({ error }) => dbError(error));
  },

  reorderInboundColumns: (board, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    set((s) => {
      const boardCols = s.inboundColumns.filter((c) => c.board === board);
      const others = s.inboundColumns.filter((c) => c.board !== board);
      const next = [...boardCols];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const reindexed = next.map((c, i) => ({ ...c, sortOrder: i }));
      return { inboundColumns: [...others, ...reindexed] };
    });
    const cols = get().inboundColumns.filter((c) => c.board === board);
    Promise.all(
      cols.map((c, i) => supabase.from("inbound_columns").update({ sort_order: i }).eq("id", c.id)),
    ).then(() => {});
  },
}));

export function formatMoney(v: number, currency: "USD" | "BRL") {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency,
  }).format(v);
}

export const CHANNEL_TONE: Record<CustomsChannel, string> = {
  verde: "bg-emerald-100 text-emerald-800",
  amarelo: "bg-amber-100 text-amber-900",
  vermelho: "bg-red-100 text-red-800",
};

export const CHANNEL_LABEL: Record<CustomsChannel, string> = {
  verde: "Canal Verde",
  amarelo: "Canal Amarelo",
  vermelho: "Canal Vermelho",
};
