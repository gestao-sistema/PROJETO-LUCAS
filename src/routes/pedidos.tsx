import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Plus,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  Flag,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { PurchaseOrder, TaskWeight, TeamMember, Origin } from "@/lib/store";
import { useStore, DONE_STAGE_ID, totalDivergences, findMember, stageShort } from "@/lib/store";
import { useInbound } from "@/lib/inbound";
import { useProfile } from "@/lib/profile";
import { StageBadge, OriginBadge } from "@/components/StageBadge";
import { toast } from "sonner";

export const Route = createFileRoute("/pedidos")({
  head: () => ({
    meta: [
      { title: "Dock-to-Stock — Operações Azime" },
      {
        name: "description",
        content: "Ciclo completo da mercadoria, da doca à prateleira, em Kanban ou Lista.",
      },
    ],
  }),
  component: DockToStockPage,
});

function DockToStockPage() {
  const orders = useStore((s) => s.orders);
  const columns = useStore((s) => s.columns);
  const moveStage = useStore((s) => s.moveStage);
  const embarques = useInbound((s) => s.lots);

  const [filter, setFilter] = useState<"todos" | Origin>("todos");
  const [embarkFilter, setEmbarkFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const now = new Date();
  const [startDate, setStartDate] = useState(() =>
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() =>
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  );
  const profile = useProfile((s) => s.profile);
  const userRole = profile?.role ?? "Auxiliar";
  const isRestricted = userRole === "Analista" || userRole === "Auxiliar";

  const embarqueMap = useMemo(() => new Map(embarques.map((e) => [e.id, e])), [embarques]);

  const filtered = useMemo(() => {
    let list = filter === "todos" ? orders : orders.filter((o) => o.origin === filter);
    if (embarkFilter !== "todos") list = list.filter((o) => o.embarkId === embarkFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          o.supplier.toLowerCase().includes(q) ||
          o.embarque.toLowerCase().includes(q),
      );
    }
    if (startDate || endDate) {
      list = list.filter((o) => {
        const d = o.issueDate;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }
    return list;
  }, [orders, filter, embarkFilter, search, startDate, endDate]);

  const active = orders.find((o) => o.id === openId) ?? null;

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dock-to-Stock</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ciclo da mercadoria — da doca à prateleira. Lotes subdividem um embarque.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FilterTabs value={filter} onChange={setFilter} />
            {!isRestricted && (
              <Button onClick={() => setCreateOpen(true)} className="rounded-full">
                <Plus className="h-4 w-4" /> Criar Lote
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[16rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por lote, fornecedor ou embarque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full border-border bg-muted/40 pl-9 text-sm placeholder:text-muted-foreground focus:bg-card"
            />
          </div>

          <Select value={embarkFilter} onValueChange={setEmbarkFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[14rem] rounded-full">
              <SelectValue placeholder="Embarque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos embarques</SelectItem>
              {embarques.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.code} · {e.supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

          <div className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
            <ViewBtn
              active={view === "kanban"}
              onClick={() => setView("kanban")}
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
              label="Kanban"
            />
            <ViewBtn
              active={view === "lista"}
              onClick={() => setView("lista")}
              icon={<ListIcon className="h-3.5 w-3.5" />}
              label="Lista"
            />
          </div>
        </div>
      </header>

      {columns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="text-sm font-medium">Nenhuma coluna configurada</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Vá em <span className="font-medium">Customização</span> para criar as colunas do kanban
            antes de adicionar lotes.
          </div>
        </div>
      ) : view === "kanban" ? (
        <KanbanBoard
          orders={filtered}
          embarqueMap={embarqueMap}
          onOpen={(id) => setOpenId(id)}
          onDrop={(id, stage) => moveStage(id, stage, profile?.name ?? profile?.email)}
        />
      ) : (
        <ListView orders={filtered} embarqueMap={embarqueMap} onOpen={(id) => setOpenId(id)} />
      )}

      {orders.length === 0 && columns.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <div className="text-sm font-medium">Nenhum lote ainda</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Crie um lote vinculado a um embarque para começar.
          </div>
        </div>
      )}

      <DetailSheet order={active} embarqueMap={embarqueMap} onClose={() => setOpenId(null)} />

      {createOpen && !isRestricted && (
        <CreateLoteDialog open={createOpen} onOpenChange={setCreateOpen} embarques={embarques} />
      )}
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function FilterTabs({
  value,
  onChange,
}: {
  value: "todos" | Origin;
  onChange: (v: "todos" | Origin) => void;
}) {
  const opts: { v: "todos" | Origin; l: string }[] = [
    { v: "todos", l: "Todos" },
    { v: "china", l: "China" },
    { v: "nacional", l: "Nacional" },
  ];
  return (
    <div className="inline-flex rounded-full bg-muted p-1">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            value === o.v
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

/* ============== KANBAN ============== */

function KanbanBoard({
  orders,
  embarqueMap,
  onOpen,
  onDrop,
}: {
  orders: PurchaseOrder[];
  embarqueMap: Map<string, import("@/lib/inbound").Embarque>;
  onOpen: (id: string) => void;
  onDrop: (id: string, stage: string) => void;
}) {
  const columns = useStore((s) => s.columns);
  const reorderColumns = useStore((s) => s.reorderColumns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeColIdx, setActiveColIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(dir: number) {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const grouped = useMemo(() => {
    const map: Record<string, PurchaseOrder[]> = {};
    for (const c of columns) map[c.id] = [];
    for (const o of orders) {
      if (map[o.currentStage]) map[o.currentStage].push(o);
    }
    return map;
  }, [orders, columns]);

  function handleDragStart(e: import("@dnd-kit/core").DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("colhdr-")) {
      setActiveColIdx(Number(id.replace("colhdr-", "")));
    } else {
      setActiveId(id);
    }
  }

  function handleDragEnd(e: import("@dnd-kit/core").DragEndEvent) {
    setActiveId(null);
    setActiveColIdx(null);
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    if (activeIdStr.startsWith("colhdr-")) {
      const fromIdx = Number(activeIdStr.replace("colhdr-", ""));
      let toIdx: number;
      if (overIdStr.startsWith("colhdr-")) {
        toIdx = Number(overIdStr.replace("colhdr-", ""));
      } else {
        const colIdx = columns.findIndex((c) => c.id === overIdStr);
        toIdx = colIdx >= 0 ? colIdx : NaN;
      }
      if (!Number.isNaN(fromIdx) && !Number.isNaN(toIdx) && fromIdx !== toIdx) {
        reorderColumns(fromIdx, toIdx);
      }
      return;
    }

    const isColumn = columns.some((c) => c.id === overIdStr);
    if (isColumn) {
      onDrop(activeIdStr, overIdStr);
      return;
    }

    if (overIdStr.startsWith("colhdr-")) {
      const idx = Number(overIdStr.replace("colhdr-", ""));
      if (!Number.isNaN(idx) && columns[idx]) {
        onDrop(activeIdStr, columns[idx].id);
        return;
      }
    }

    const targetOrder = orders.find((o) => o.id === overIdStr);
    if (targetOrder && targetOrder.id !== activeIdStr) {
      onDrop(activeIdStr, targetOrder.currentStage);
    }
  }

  const activeLot = orders.find((o) => o.id === activeId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 shadow-md backdrop-blur"
          onClick={() => scrollByAmount(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div ref={scrollRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-3 px-2">
          <SortableContext
            items={columns.map((_, i) => `colhdr-${i}`)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((col, colIdx) => {
              const stage = col.id;
              const items = grouped[stage] ?? [];
              return (
                <DroppableColumn
                  key={stage}
                  stage={stage}
                  colIdx={colIdx}
                  label={col.label}
                  count={items.length}
                >
                  {items.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border/70 px-3 py-8 text-center text-[11px] text-muted-foreground">
                      Solte um lote aqui
                    </div>
                  )}
                  <SortableContext
                    items={items.map((o) => o.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((o) => (
                      <SortableCard
                        key={o.id}
                        order={o}
                        embarqueMap={embarqueMap}
                        onClick={() => onOpen(o.id)}
                      />
                    ))}
                  </SortableContext>
                </DroppableColumn>
              );
            })}
          </SortableContext>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 h-8 w-8 rounded-full bg-background/80 shadow-md backdrop-blur"
          onClick={() => scrollByAmount(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <DragOverlay>
        {activeLot ? (
          <div className="w-72 rounded-xl border border-border bg-card p-3 shadow-lg opacity-90">
            <div className="text-sm font-semibold">{activeLot.code}</div>
            <div className="text-xs text-muted-foreground">{activeLot.supplier}</div>
          </div>
        ) : activeColIdx !== null ? (
          <div className="w-72 rounded-2xl border border-primary/40 bg-primary/5 p-2 shadow-lg opacity-90">
            <div className="px-2 py-1 text-sm font-semibold">{columns[activeColIdx]?.label}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  stage,
  colIdx,
  label,
  count,
  children,
}: {
  stage: string;
  colIdx: number;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col gap-2 rounded-2xl p-2 transition-colors ${
        isOver ? "bg-primary/5 ring-1 ring-primary/30" : ""
      }`}
    >
      <SortableColumnHandle id={`colhdr-${colIdx}`} label={label} count={count} />
      <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-border bg-muted/30 p-2">
        {children}
      </div>
    </div>
  );
}

function SortableColumnHandle({ id, label, count }: { id: string; label: string; count: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none" as const,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-center justify-between px-2 pt-1 active:cursor-grabbing"
    >
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function SortableCard({
  order,
  embarqueMap,
  onClick,
}: {
  order: PurchaseOrder;
  embarqueMap: Map<string, import("@/lib/inbound").Embarque>;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: order.id,
  });
  const columns = useStore((s) => s.columns);
  const pedras = useStore((s) => s.pedras);
  const dragGuard = useRef(false);
  const totalTasks = order.tasks.filter((t) => t.stage === order.currentStage).length;
  const doneTasks = order.tasks.filter((t) => t.stage === order.currentStage && t.done).length;
  const div = totalDivergences(order);
  const embarque = embarqueMap.get(order.embarkId);
  const pedra = pedras.find((p) => p.id === order.pedraId);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "none" as const,
    ...(pedra
      ? {
          backgroundColor: `color-mix(in srgb, ${pedra.cor} 10%, var(--card))`,
          border: `2px solid ${pedra.cor}`,
        }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (dragGuard.current) return;
        onClick();
      }}
      className="block w-full cursor-grab rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      {order.priority && (
        <div className="mb-1.5">
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            PRIORITÁRIO
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className="truncate text-sm font-semibold tracking-tight">{order.code}</span>
        <OriginBadge origin={order.origin} />
      </div>
      {embarque && (
        <div className="mt-0.5 truncate text-[11px] font-medium text-primary/80">
          Embarque: {embarque.code}
        </div>
      )}
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{order.supplier}</div>
      <div className="mt-2 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
        {pedra ? (
          <>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: pedra.cor }}
            />
            <span className="truncate">{pedra.nome}</span>
          </>
        ) : (
          <span>Sem pedra</span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">
          {order.volumesReceived}
          {embarque ? `/${embarque.qtdPecas}` : ""} peças
        </span>
        {div > 0 && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">
            {div} diverg.
          </span>
        )}
        {totalTasks > 0 && (
          <span className="text-muted-foreground tabular-nums">
            {doneTasks}/{totalTasks} ✓
          </span>
        )}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        Etapa: {stageShort(columns, order.currentStage)}
      </div>
    </div>
  );
}

/* ============== LISTA ============== */

function ListView({
  orders,
  embarqueMap,
  onOpen,
}: {
  orders: PurchaseOrder[];
  embarqueMap: Map<string, import("@/lib/inbound").Embarque>;
  onOpen: (id: string) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Nenhum lote encontrado para os filtros atuais.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3 font-medium">Lote</th>
              <th className="px-5 py-3 font-medium">Embarque</th>
              <th className="px-5 py-3 font-medium">Fornecedor</th>
              <th className="px-5 py-3 font-medium">Etapa</th>
              <th className="px-5 py-3 font-medium">Vol. Recebidos</th>
              <th className="px-5 py-3 font-medium">Diverg.</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const embarque = embarqueMap.get(o.embarkId);
              return (
                <tr
                  key={o.id}
                  onClick={() => onOpen(o.id)}
                  className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-accent/60"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{o.code}</span>
                      {o.priority && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          Prioritário
                        </span>
                      )}
                      <OriginBadge origin={o.origin} />
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {embarque ? (
                      <span>
                        <span className="font-medium text-foreground/80">{embarque.code}</span>
                        <span className="block text-[11px]">{embarque.supplier}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3 text-foreground/80">{o.supplier}</td>
                  <td className="px-5 py-3">
                    <StageBadge stage={o.currentStage} />
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {o.volumesReceived}
                    {embarque ? (
                      <span className="text-muted-foreground"> / {embarque.volumesExpected}</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
                    {totalDivergences(o) === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="font-semibold text-red-700">{totalDivergences(o)}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============== SHEET DE DETALHE ============== */

function DetailSheet({
  order,
  embarqueMap,
  onClose,
}: {
  order: PurchaseOrder | null;
  embarqueMap: Map<string, { code: string; supplier?: string; volumesExpected?: number }>;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl p-0 gap-0 flex flex-col">
        {order && <DetailBody order={order} embarqueMap={embarqueMap} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({
  order,
  embarqueMap,
  onClose,
}: {
  order: PurchaseOrder;
  embarqueMap: Map<string, { code: string; supplier?: string; volumesExpected?: number }>;
  onClose: () => void;
}) {
  const columns = useStore((s) => s.columns);
  const updateOrder = useStore((s) => s.updateOrder);
  const setLoteObservacao = useStore((s) => s.setLoteObservacao);
  const removeLote = useStore((s) => s.removeLote);
  const stageSaveRef = useRef<() => void>(() => {});
  const profile = useProfile((s) => s.profile);
  const isRestricted = profile?.role === "Analista" || profile?.role === "Auxiliar";
  const canEdit = !isRestricted;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [obsDraft, setObsDraft] = useState(order.observacao ?? "");
  const [codeDraft, setCodeDraft] = useState(order.code);
  const [embarqueDraft, setEmbarqueDraft] = useState(order.embarque);
  const [arrivalDraft, setArrivalDraft] = useState(order.arrivalDate ?? "");
  const [priorityDraft, setPriorityDraft] = useState(order.priority);
  const [financialDraft, setFinancialDraft] = useState(String(order.financialValue ?? 0));
  const [companyDraft, setCompanyDraft] = useState(order.company ?? "");

  const embarque = embarqueMap.get(order.embarkId);

  return (
    <>
      <DialogHeader className="border-b border-border px-6 py-5 text-left space-y-1.5">
        <div className="flex items-center gap-2">
          <OriginBadge origin={order.origin} />
          <StageBadge stage={order.currentStage} />
          {order.priority && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              Prioritário
            </span>
          )}
        </div>
        <DialogTitle className="pt-1 text-2xl font-semibold tracking-tight">
          {order.code}
        </DialogTitle>
        <DialogDescription>{order.supplier}</DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="detalhes" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-6 mt-4">
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({order.history.length})</TabsTrigger>
        </TabsList>

        <TabsContent
          value="detalhes"
          className="flex-1 overflow-y-auto px-6 py-6 space-y-8 mt-0 data-[state=inactive]:hidden"
        >
          <Section title="Dados do Lote">
            {canEdit ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome do Lote">
                    <Input
                      value={codeDraft}
                      onChange={(e) => setCodeDraft(e.target.value)}
                      onBlur={() => updateOrder(order.id, { code: codeDraft })}
                      className="rounded-xl"
                    />
                  </Field>
                  <Field label="Rastreio do embarque">
                    <Input
                      value={embarqueDraft}
                      onChange={(e) => setEmbarqueDraft(e.target.value)}
                      onBlur={() => updateOrder(order.id, { embarque: embarqueDraft })}
                      className="rounded-xl"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Fornecedor">
                    <Input
                      value={`${order.supplier} · ${order.origin === "china" ? "China" : "Nacional"}`}
                      disabled
                      className="rounded-xl opacity-60"
                    />
                  </Field>
                  <Field label="Embarque vinculado">
                    <Input
                      value={embarque ? `${embarque.code} · ${embarque.supplier}` : "—"}
                      disabled
                      className="rounded-xl opacity-60"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Data de Criação">
                    <Input value={order.issueDate} disabled className="rounded-xl opacity-60" />
                  </Field>
                  <Field label="Data de Chegada">
                    <Input
                      type="date"
                      value={arrivalDraft}
                      onChange={(e) => setArrivalDraft(e.target.value)}
                      onBlur={() =>
                        updateOrder(order.id, { arrivalDate: arrivalDraft || undefined })
                      }
                      className="rounded-xl"
                    />
                  </Field>
                  <Field label="Prioritário">
                    <button
                      type="button"
                      onClick={() => {
                        setPriorityDraft(!priorityDraft);
                        updateOrder(
                          order.id,
                          { priority: !priorityDraft },
                          profile?.name ?? profile?.email,
                        );
                      }}
                      className={`flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-sm transition ${priorityDraft ? "border-red-300 bg-red-50 text-red-700" : "border-border bg-muted/40 text-muted-foreground"}`}
                    >
                      {priorityDraft ? "Sim" : "Não"}
                    </button>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Volumes recebidos">
                    <Input
                      value={`${order.volumesReceived} recebidos${embarque ? ` · ${embarque.volumesExpected} esperados` : ""}`}
                      disabled
                      className="rounded-xl opacity-60"
                    />
                  </Field>
                  <Field label="Nota Fiscal de Entrada">
                    <Input
                      value={
                        order.invoice.numero
                          ? `Nº ${order.invoice.numero}${order.invoice.serie ? " · Série " + order.invoice.serie : ""}${order.invoice.data ? " · " + order.invoice.data : ""}`
                          : "Não lançada"
                      }
                      disabled
                      className="rounded-xl opacity-60"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor Financeiro">
                    <Input
                      type="number"
                      min={0}
                      value={financialDraft}
                      onChange={(e) => setFinancialDraft(e.target.value)}
                      onBlur={() =>
                        updateOrder(order.id, { financialValue: Number(financialDraft) || 0 })
                      }
                      className="rounded-xl"
                    />
                  </Field>
                  <Field label="Empresa Associada">
                    <Select
                      value={companyDraft}
                      onValueChange={(v) => {
                        setCompanyDraft(v);
                        updateOrder(order.id, { company: v });
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alinare">Alinare</SelectItem>
                        <SelectItem value="Novitah">Novitah</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>
            ) : (
              <DataGrid>
                <DataRow
                  label="Embarque vinculado"
                  value={embarque ? `${embarque.code} · ${embarque.supplier}` : "—"}
                />
                <DataRow label="Nome do Lote" value={order.code} />
                <DataRow label="Rastreio do embarque" value={order.embarque} />
                <DataRow
                  label="Fornecedor"
                  value={`${order.supplier} · ${order.origin === "china" ? "China" : "Nacional"}`}
                />
                <DataRow label="Empresa Associada" value={order.company ?? "—"} />
                <DataRow
                  label="Valor Financeiro"
                  value={
                    order.financialValue
                      ? order.financialValue.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "—"
                  }
                />
                <DataRow label="Data de Criação" value={order.issueDate} />
                <DataRow label="Data de Chegada" value={order.arrivalDate ?? "—"} />
                <DataRow
                  label="Volumes (Recebidos)"
                  value={`${order.volumesReceived} recebidos${embarque ? ` · ${embarque.volumesExpected} esperados (embarque)` : ""}`}
                />
                <DataRow
                  label="Nota Fiscal de Entrada"
                  value={
                    order.invoice.numero
                      ? `Nº ${order.invoice.numero}${order.invoice.serie ? " · Série " + order.invoice.serie : ""}${order.invoice.data ? " · " + order.invoice.data : ""}`
                      : "Não lançada"
                  }
                />
              </DataGrid>
            )}
          </Section>

          <Section title="Observação">
            <Textarea
              value={obsDraft}
              onChange={(e) => setObsDraft(e.target.value)}
              onBlur={() => setLoteObservacao(order.id, obsDraft, profile?.name ?? profile?.email)}
              rows={2}
              className="rounded-xl"
            />
          </Section>

          <Section title="SharePoint">
            <SharepointField
              url={order.sharepointUrl}
              onSave={(url) => {
                useStore.getState().setSharepointUrl(order.id, url);
                toast.success("Link do SharePoint salvo.");
              }}
            />
          </Section>

          <Section title="Atualizar dados da etapa">
            <StageForm
              order={order}
              onSave={(patch) => updateOrder(order.id, patch)}
              registerSave={(fn) => {
                stageSaveRef.current = fn;
              }}
            />
          </Section>

          <Section title="Tarefas do Lote">
            <TasksPanel order={order} />
          </Section>
        </TabsContent>

        <TabsContent
          value="historico"
          className="flex-1 overflow-y-auto px-6 py-6 mt-0 data-[state=inactive]:hidden"
        >
          <Section title="Histórico de Movimentações">
            {order.history.length === 0 ? (
              <div className="text-xs text-muted-foreground">Sem histórico.</div>
            ) : (
              <ul className="space-y-2">
                {[...order.history].reverse().map((h, i) => {
                  const colLabel = columns.find((c) => c.id === h.stage)?.label ?? h.stage;
                  return (
                    <li key={i} className="flex items-start gap-3 text-xs">
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{colLabel}</span>
                          <span className="tabular-nums text-muted-foreground">{h.date}</span>
                        </div>
                        {h.notes && <div className="text-muted-foreground mt-0.5">{h.notes}</div>}
                        {h.who && (
                          <div className="text-muted-foreground mt-0.5 italic">por {h.who}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-6 py-4">
        {!isRestricted && (
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            className="rounded-full"
          >
            <Trash2 className="h-4 w-4" /> Excluir Lote
          </Button>
        )}
        {order.currentStage === DONE_STAGE_ID ? (
          <span className="text-xs font-medium text-emerald-700">Lote finalizado</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Arraste o card no kanban para avançar
          </span>
        )}
        <Button
          onClick={() => {
            stageSaveRef.current();
            toast.success("Dados salvos.");
            onClose();
          }}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Salvar Dados
        </Button>
      </div>

      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        code={order.code}
        onConfirm={() => {
          removeLote(order.id);
          toast.success("Lote excluído.");
          onClose();
        }}
      />
    </>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  code,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  code: string;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) setTyped("");
  }, [open, code]);
  const match = typed.trim() === code;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir lote?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Para confirmar, digite exatamente:{" "}
            <strong>{code}</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={code}
          className="rounded-xl"
          autoFocus
        />
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!match}
            className="rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            onClick={onConfirm}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DataGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl className="divide-y divide-border rounded-2xl border border-border bg-card">{children}</dl>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StageForm({
  order,
  onSave,
  registerSave,
}: {
  order: PurchaseOrder;
  onSave: (patch: Partial<PurchaseOrder>) => void;
  registerSave?: (fn: () => void) => void;
}) {
  const [received, setReceived] = useState(order.volumesReceived);
  const [faltas, setFaltas] = useState(order.divergences.faltas);
  const [sobras, setSobras] = useState(order.divergences.sobras);
  const [avarias, setAvarias] = useState(order.divergences.avarias);
  const [obs, setObs] = useState(order.divergences.observacao ?? "");
  const [nfNum, setNfNum] = useState(order.invoice.numero ?? "");
  const [nfSerie, setNfSerie] = useState(order.invoice.serie ?? "");
  const [nfData, setNfData] = useState(order.invoice.data ?? "");

  function save() {
    onSave({
      volumesReceived: received,
      divergences: { faltas, sobras, avarias, observacao: obs || undefined },
      invoice: {
        numero: nfNum || undefined,
        serie: nfSerie || undefined,
        data: nfData || undefined,
        valor: order.invoice.valor,
      },
    });
  }

  useEffect(() => {
    registerSave?.(save);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Volumes recebidos">
          <Input
            type="number"
            value={received}
            onChange={(e) => setReceived(Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Faltas">
          <Input type="number" value={faltas} onChange={(e) => setFaltas(Number(e.target.value))} />
        </Field>
        <Field label="Sobras">
          <Input type="number" value={sobras} onChange={(e) => setSobras(Number(e.target.value))} />
        </Field>
        <Field label="Avarias">
          <Input
            type="number"
            value={avarias}
            onChange={(e) => setAvarias(Number(e.target.value))}
          />
        </Field>
      </div>
      <Field label="Observação da divergência">
        <Textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          className="min-h-16 rounded-xl"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="NF nº">
          <Input value={nfNum} onChange={(e) => setNfNum(e.target.value)} />
        </Field>
        <Field label="Série">
          <Input value={nfSerie} onChange={(e) => setNfSerie(e.target.value)} />
        </Field>
        <Field label="Data NF">
          <Input type="date" value={nfData} onChange={(e) => setNfData(e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

/* ============== TAREFAS ============== */

function TasksPanel({ order }: { order: PurchaseOrder }) {
  const columns = useStore((s) => s.columns);
  const team = useStore((s) => s.team);
  const toggleTask = useStore((s) => s.toggleTask);
  const assignTask = useStore((s) => s.assignTask);
  const setTaskDueDate = useStore((s) => s.setTaskDueDate);
  const addTask = useStore((s) => s.addTask);
  const removeTask = useStore((s) => s.removeTask);
  const profile = useProfile((s) => s.profile);
  const isRestricted = profile?.role === "Analista" || profile?.role === "Auxiliar";

  const [newTitle, setNewTitle] = useState("");
  const [newStage, setNewStage] = useState<string>(order.currentStage);
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [newWeight, setNewWeight] = useState<TaskWeight>(1);

  const selfMemberId = useMemo(() => {
    if (!isRestricted || !profile?.email) return "";
    return team.find((m) => m.email === profile.email)?.id ?? "";
  }, [isRestricted, profile, team]);

  const grouped = columns
    .map((c) => ({
      column: c,
      items: order.tasks.filter((t) => t.stage === c.id),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card">
        {grouped.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            Nenhuma tarefa neste lote ainda.
          </div>
        )}
        {grouped.map((g, gi) => (
          <div key={g.column.id} className={gi > 0 ? "border-t border-border" : ""}>
            <div className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {g.column.label}
            </div>
            <ul className="divide-y divide-border">
              {g.items.map((t) => {
                const member = findMember(t.assigneeId, team);
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Checkbox
                      checked={t.done}
                      onCheckedChange={() => {
                        if (isRestricted && t.assigneeId) {
                          const member = team.find((m) => m.email === profile?.email);
                          if (t.assigneeId !== member?.id) {
                            toast.error("Você só pode alternar suas próprias tarefas");
                            return;
                          }
                        }
                        toggleTask(order.id, t.id);
                      }}
                    />
                    <span
                      className={`flex-1 text-sm ${
                        t.done ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      P{t.weight}
                    </span>
                    <Select
                      value={t.assigneeId ?? "none"}
                      disabled={isRestricted}
                      onValueChange={(v) =>
                        assignTask(order.id, t.id, v === "none" ? undefined : v)
                      }
                    >
                      <SelectTrigger className="h-8 w-auto min-w-[8.5rem] gap-2 rounded-full border-border bg-muted/40 px-2 text-xs">
                        {member ? (
                          <span className="flex items-center gap-1.5">
                            <Avatar member={member} size={20} />
                            <span className="truncate">{member.name.split(" ")[0]}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Atribuir</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem responsável</SelectItem>
                        {team.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                        Prazo
                      </span>
                      <Input
                        type="date"
                        value={t.dueDate ?? ""}
                        onChange={(e) =>
                          setTaskDueDate(order.id, t.id, e.target.value || undefined)
                        }
                        disabled={isRestricted}
                        className="h-8 w-[8.5rem] rounded-full border-border bg-muted/40 px-2 text-xs disabled:opacity-60"
                      />
                    </div>
                    <button
                      onClick={() => removeTask(order.id, t.id)}
                      className="text-muted-foreground hover:text-red-600 disabled:text-muted/30 disabled:hover:text-muted/30"
                      aria-label="Remover tarefa"
                      disabled={isRestricted}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {!isRestricted && (
        <div className="rounded-2xl border border-dashed border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Nova tarefa..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="min-w-[12rem] flex-1 rounded-full"
            />
            <Select value={newStage} onValueChange={setNewStage}>
              <SelectTrigger className="h-9 w-auto min-w-[10rem] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(newWeight)}
              onValueChange={(v) => setNewWeight(Number(v) as TaskWeight)}
            >
              <SelectTrigger className="h-9 w-auto min-w-[6rem] rounded-full">
                <span className="text-xs">Peso {newWeight}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Peso 1</SelectItem>
                <SelectItem value="2">Peso 2</SelectItem>
                <SelectItem value="3">Peso 3</SelectItem>
              </SelectContent>
            </Select>
            {!isRestricted && (
              <Select
                value={newAssignee || "none"}
                onValueChange={(v) => setNewAssignee(v === "none" ? "" : v)}
              >
                <SelectTrigger className="h-9 w-auto min-w-[9rem] rounded-full">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              disabled={!newTitle.trim()}
              onClick={() => {
                addTask(
                  order.id,
                  newTitle.trim(),
                  newStage,
                  isRestricted ? selfMemberId || undefined : newAssignee || undefined,
                  newWeight,
                );
                setNewTitle("");
              }}
              className="rounded-full"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Avatar({
  member,
  size = 24,
}: {
  member: { name: string; color: string; avatar?: string };
  size?: number;
}) {
  const inits = member.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold text-white ${member.color}`}
    >
      <span className="relative z-0">{inits}</span>
      {member.avatar && (
        <img
          src={member.avatar}
          alt={member.name}
          className="absolute inset-0 z-10 h-full w-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </span>
  );
}

/* ============== SHAREPOINT ============== */

function SharepointField({ url, onSave }: { url: string; onSave: (url: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);

  useMemo(() => setDraft(url), [url]);

  if (url && !editing) {
    return (
      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 transition hover:bg-muted/40"
        >
          <div className="flex min-w-0 items-center gap-2">
            <ExternalLink className="h-4 w-4 shrink-0 text-sky-600" />
            <span className="truncate text-sm font-medium">{url}</span>
          </div>
        </a>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => setEditing(true)}
          >
            <LinkIcon className="h-3.5 w-3.5" /> Alterar link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} type="url" />
        <Button
          onClick={() => {
            onSave(draft.trim());
            setEditing(false);
          }}
          disabled={!draft.trim()}
          className="rounded-full"
        >
          Salvar
        </Button>
      </div>
      {url && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full"
          onClick={() => {
            setDraft(url);
            setEditing(false);
          }}
        >
          Cancelar
        </Button>
      )}
    </div>
  );
}

/* ============== CRIAR LOTE ============== */

function CreateLoteDialog({
  open,
  onOpenChange,
  embarques,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  embarques: import("@/lib/inbound").Embarque[];
}) {
  const createLote = useStore((s) => s.createLote);
  const pedras = useStore((s) => s.pedras);

  const [embarkId, setEmbarkId] = useState("");
  const [code, setCode] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [sharepointUrl, setSharepointUrl] = useState("");
  const [observacao, setObservacao] = useState("");
  const [priority, setPriority] = useState(false);
  const [skuCount, setSkuCount] = useState<number>(0);
  const [pedraId, setPedraId] = useState<string>("");
  const [financialValue, setFinancialValue] = useState<number>(0);
  const [company, setCompany] = useState<string>("");

  const selected = embarques.find((e) => e.id === embarkId) ?? null;
  const selectedPedra = pedras.find((p) => p.id === pedraId) ?? null;

  function reset() {
    setEmbarkId("");
    setCode("");
    setIssueDate(new Date().toISOString().slice(0, 10));
    setSharepointUrl("");
    setObservacao("");
    setPriority(false);
    setSkuCount(0);
    setPedraId("");
    setFinancialValue(0);
    setCompany("");
  }

  function submit() {
    if (!embarkId || !code || !selected) {
      toast.error("Selecione um embarque e informe o nome do lote.");
      return;
    }
    createLote({
      embarkId,
      code,
      supplier: selected.supplier,
      origin: selected.origin,
      embarque: `Embarque ${selected.code}`,
      issueDate,
      sharepointUrl: sharepointUrl.trim() || undefined,
      observacao: observacao.trim() || undefined,
      priority,
      skuCount,
      pedraId: pedraId || undefined,
      financialValue,
      company: company || undefined,
    });
    toast.success("Lote criado no dock-to-stock.");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-[520px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Novo Lote (Dock-to-Stock)</DialogTitle>
          <DialogDescription>
            Subdivisão de um embarque para a equipe trabalhar de forma fragmentada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Embarque vinculado</Label>
            <Select value={embarkId} onValueChange={setEmbarkId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um embarque" />
              </SelectTrigger>
              <SelectContent>
                {embarques.length === 0 ? (
                  <SelectItem value="_empty" disabled>
                    Nenhum embarque cadastrado
                  </SelectItem>
                ) : (
                  embarques.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.code} · {e.supplier}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Nome do Lote</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Quantidade de SKUs</Label>
              <Input
                type="number"
                min={0}
                value={skuCount}
                onChange={(e) => setSkuCount(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          {selected && (
            <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-3 text-xs">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Fornecedor
                </div>
                <div className="font-medium">{selected.supplier}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Peças (embarque)
                </div>
                <div className="font-medium">{selected.qtdPecas}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Caixas (embarque)
                </div>
                <div className="font-medium">{selected.qtdCaixas}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Pedra</Label>
              <Select value={pedraId} onValueChange={setPedraId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a pedra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem pedra</SelectItem>
                  {pedras.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ background: p.cor }}
                        />
                        {p.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Prioridade</Label>
              <Select
                value={priority ? "sim" : "nao"}
                onValueChange={(v) => setPriority(v === "sim")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Valor Financeiro</Label>
              <Input
                type="number"
                min={0}
                value={financialValue}
                onChange={(e) => setFinancialValue(Number(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Empresa Associada</Label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alinare">Alinare</SelectItem>
                  <SelectItem value="Novitah">Novitah</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Data de Criação</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              className="rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label>Link do SharePoint</Label>
            <Input
              value={sharepointUrl}
              onChange={(e) => setSharepointUrl(e.target.value)}
              type="url"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!embarkId || !code}>
            Criar Lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
