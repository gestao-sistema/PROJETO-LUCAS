import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  closestCorners,
  closestCenter,
  pointerWithin,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  Settings,
  GripVertical,
  X,
  ExternalLink,
  CheckCircle2,
  Package,
  Boxes,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Embarque, InboundOrigin, InboundColumn } from "@/lib/inbound";
import { useInbound, ENTREGUE_STAGE_ID, formatMoney } from "@/lib/inbound";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useProfile } from "@/lib/profile";

export const Route = createFileRoute("/inbound")({
  beforeLoad: () => {
    const role = useProfile.getState().profile?.role;
    if (!["Admin", "Gerente", "Coordenador"].includes(role ?? ""))
      throw redirect({ to: "/pedidos" });
  },
  head: () => ({
    meta: [
      { title: "Logística Inbound — Operações Azime" },
      { name: "description", content: "Kanban modular de embarques inbound." },
    ],
  }),
  component: InboundPage,
});

function InboundPage() {
  const lots = useInbound((s) => s.lots);
  const columns = useInbound((s) => s.inboundColumns);
  const syncAll = useInbound((s) => s.syncAll);
  const [originFilter, setOriginFilter] = useState<"todos" | InboundOrigin>("todos");
  const [search, setSearch] = useState("");
  const [board, setBoard] = useState<"china" | "nacional">("china");
  const [openId, setOpenId] = useState<string | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const now = new Date();
  const [startDate, setStartDate] = useState(() =>
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() =>
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  );

  useEffect(() => {
    syncAll();
  }, [syncAll]);

  const boardCols = useMemo(
    () => columns.filter((c) => c.board === board).sort((a, b) => a.sortOrder - b.sortOrder),
    [columns, board],
  );

  const filtered = useMemo(() => {
    let list = originFilter === "todos" ? lots : lots.filter((l) => l.origin === originFilter);
    list = list.filter((l) => l.origin === board);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) => l.code.toLowerCase().includes(q) || l.supplier.toLowerCase().includes(q),
      );
    }
    if (startDate || endDate) {
      list = list.filter((l) => {
        const d = l.issueDate;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      });
    }
    return list;
  }, [lots, originFilter, search, board, startDate, endDate]);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Logística Inbound</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhamento de embarques — kanban modular.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} size="sm" className="rounded-full">
              <Plus className="h-4 w-4" /> Novo Embarque
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomizeOpen(true)}
              className="rounded-full"
            >
              <Settings className="h-4 w-4" /> Customizar
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-muted p-1">
            {(["china", "nacional"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBoard(b)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  board === b ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {b === "china" ? "China" : "Nacional"}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[16rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar embarque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-full border-border bg-muted/40 pl-9 text-sm"
            />
          </div>

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
              className="h-8 rounded-full px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" /> Limpar datas
            </Button>
          )}
        </div>
      </header>

      <KanbanBoard lots={filtered} columns={boardCols} board={board} onOpen={setOpenId} />

      <EmbarqueDetailDialog
        embarque={openId ? (lots.find((l) => l.id === openId) ?? null) : null}
        onClose={() => setOpenId(null)}
      />

      <CustomizeDialog open={customizeOpen} onOpenChange={setCustomizeOpen} board={board} />
      <CreateEmbarqueDialog open={createOpen} onOpenChange={setCreateOpen} board={board} />
    </div>
  );
}

/* ============== CREATE EMBARQUE DIALOG ============== */

function CreateEmbarqueDialog({
  open,
  onOpenChange,
  board,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  board: "china" | "nacional";
}) {
  const createLot = useInbound((s) => s.createLot);
  const suppliers = useStore((s) => s.suppliers);
  const [code, setCode] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [qtdPecas, setQtdPecas] = useState(0);
  const [qtdCaixas, setQtdCaixas] = useState(0);
  const [etaDate, setEtaDate] = useState(new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState("");

  const COMPANIES = ["Alinare", "Novitah"];

  function toggleSupplier(name: string) {
    setSelectedSuppliers((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  }

  function toggleCompany(name: string) {
    setSelectedCompanies((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name],
    );
  }

  function reset() {
    setCode("");
    setSelectedSuppliers([]);
    setSelectedCompanies([]);
    setTotalValue(0);
    setQtdPecas(0);
    setQtdCaixas(0);
    setEtaDate(new Date().toISOString().slice(0, 10));
    setObservacao("");
  }

  function submit() {
    if (!code.trim() || selectedSuppliers.length === 0) {
      toast.error("Informe código e ao menos um fornecedor.");
      return;
    }
    createLot({
      code: code.trim(),
      suppliers: selectedSuppliers,
      companies: selectedCompanies,
      origin: board,
      currency: board === "china" ? "USD" : "BRL",
      totalValue,
      volumesExpected: 0,
      qtdPecas,
      qtdCaixas,
      issueDate: new Date().toISOString().slice(0, 10),
      etaDate,
      observacao: observacao.trim() || undefined,
    });
    toast.success("Embarque criado.");
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
          <DialogTitle>Novo Embarque — {board === "china" ? "China" : "Nacional"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Código</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="rounded-xl" />
          </div>
          <div className="grid gap-2">
            <Label>Fornecedores</Label>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
              {suppliers.length === 0 ? (
                <span className="text-xs text-muted-foreground">Nenhum fornecedor cadastrado.</span>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {suppliers.map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-accent/40"
                    >
                      <Checkbox
                        checked={selectedSuppliers.includes(s.name)}
                        onCheckedChange={() => toggleSupplier(s.name)}
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Empresas</Label>
            <div className="flex gap-4">
              {COMPANIES.map((c) => (
                <label
                  key={c}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 text-sm hover:bg-accent/40"
                >
                  <Checkbox
                    checked={selectedCompanies.includes(c)}
                    onCheckedChange={() => toggleCompany(c)}
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>Valor Total</Label>
              <Input
                type="number"
                value={totalValue}
                onChange={(e) => setTotalValue(Number(e.target.value) || 0)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Qtd. Peças</Label>
              <Input
                type="number"
                value={qtdPecas}
                onChange={(e) => setQtdPecas(Number(e.target.value) || 0)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Qtd. Caixas</Label>
              <Input
                type="number"
                value={qtdCaixas}
                onChange={(e) => setQtdCaixas(Number(e.target.value) || 0)}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>ETA</Label>
            <Input
              type="date"
              value={etaDate}
              onChange={(e) => setEtaDate(e.target.value)}
              className="rounded-xl"
            />
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!code.trim() || selectedSuppliers.length === 0}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== KANBAN BOARD ============== */

function KanbanBoard({
  lots,
  columns,
  board,
  onOpen,
}: {
  lots: Embarque[];
  columns: InboundColumn[];
  board: "china" | "nacional";
  onOpen: (id: string) => void;
}) {
  const updateStage = useInbound((s) => s.updateStage);
  const setChegadaReal = useInbound((s) => s.setChegadaReal);
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollByAmount(dir: number) {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const activeLot = useMemo(() => lots.find((l) => l.id === activeId) ?? null, [lots, activeId]);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const lotId = String(active.id);
    const overId = String(over.id);
    const targetCol = columns.find((c) => c.id === overId);
    if (!targetCol) return;
    const lot = lots.find((l) => l.id === lotId);
    if (!lot || lot.stage === targetCol.id) return;

    const date = new Date().toISOString().slice(0, 10);
    const who = useProfile.getState().profile?.name ?? useProfile.getState().profile?.email;
    updateStage(lotId, { stage: targetCol.id, date, who });
    if (targetCol.isEntregue) {
      setChegadaReal(lotId, date);
    }
  }

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
        <div ref={scrollRef} className="no-scrollbar flex gap-4 overflow-x-auto pb-4 px-2">
          {columns.map((col) => (
            <KanbanColumnView
              key={col.id}
              col={col}
              lots={lots.filter((l) => l.stage === col.id)}
              onOpen={onOpen}
            />
          ))}
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
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumnView({
  col,
  lots,
  onOpen,
}: {
  col: InboundColumn;
  lots: Embarque[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-muted/30 ${
        isOver ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{col.label}</span>
          {col.isEntregue && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums">
          {lots.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2" style={{ maxHeight: "70vh" }}>
        {lots.map((lot) => (
          <EmbarqueCard key={lot.id} lot={lot} onOpen={() => onOpen(lot.id)} />
        ))}
        {lots.length === 0 && (
          <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
            Vazio
          </div>
        )}
      </div>
    </div>
  );
}

function EmbarqueCard({ lot, onOpen }: { lot: Embarque; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lot.id,
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
      onClick={onOpen}
      className="cursor-grab rounded-xl border border-border bg-card p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{lot.code}</span>
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-0.5 truncate text-xs text-muted-foreground">{lot.supplier}</div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Package className="h-3 w-3" /> {lot.qtdPecas} peças
        </span>
        <span className="flex items-center gap-1">
          <Boxes className="h-3 w-3" /> {lot.qtdCaixas} cx
        </span>
      </div>
      {lot.chegadaReal && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-600">
          <Calendar className="h-3 w-3" /> Chegou {lot.chegadaReal}
        </div>
      )}
    </div>
  );
}

/* ============== EMBARQUE DETAIL DIALOG ============== */

function EmbarqueDetailDialog({
  embarque,
  onClose,
}: {
  embarque: Embarque | null;
  onClose: () => void;
}) {
  const updateLot = useInbound((s) => s.updateLot);
  const setChegadaReal = useInbound((s) => s.setChegadaReal);
  const inboundCols = useInbound((s) => s.inboundColumns);
  const [obsDraft, setObsDraft] = useState("");

  useEffect(() => {
    setObsDraft(embarque?.observacao ?? "");
  }, [embarque?.id]);

  if (!embarque) return null;

  return (
    <Dialog open={!!embarque} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 gap-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="border-b border-border px-6 py-5 text-left space-y-1.5">
          <DialogTitle className="text-xl">{embarque.code}</DialogTitle>
          <DialogDescription>
            {embarque.supplier}
            {embarque.companies.length > 0 ? ` · ${embarque.companies.join(", ")}` : ""} ·{" "}
            {embarque.origin === "china" ? "China" : "Nacional"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detalhes" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="historico">Histórico ({embarque.history.length})</TabsTrigger>
          </TabsList>

          <TabsContent
            value="detalhes"
            className="flex-1 overflow-y-auto px-6 py-5 space-y-5 mt-0 data-[state=inactive]:hidden"
          >
            <Section title="Dados do Embarque">
              <DataGrid>
                <DataRow label="Código" value={embarque.code} />
                <DataRow label="Fornecedor" value={embarque.supplier} />
                {embarque.companies.length > 0 && (
                  <DataRow label="Empresas" value={embarque.companies.join(", ")} />
                )}
                <DataRow
                  label="Origem"
                  value={embarque.origin === "china" ? "China" : "Nacional"}
                />
                <DataRow label="Data Emissão" value={embarque.issueDate} />
                <DataRow label="ETA" value={embarque.etaDate} />
                <DataRow
                  label="Valor Total"
                  value={formatMoney(embarque.totalValue, embarque.currency)}
                />
                <DataRow label="Quantidade de Peças" value={String(embarque.qtdPecas)} />
                <DataRow label="Quantidade de Caixas" value={String(embarque.qtdCaixas)} />
                <DataRow
                  label="Data de Chegada Efetiva"
                  value={
                    <Input
                      type="date"
                      value={embarque.chegadaReal ?? ""}
                      onChange={(e) => setChegadaReal(embarque.id, e.target.value)}
                      className="h-8 w-auto rounded-full border-border bg-muted/40 px-2 text-xs"
                    />
                  }
                />
              </DataGrid>
            </Section>

            <Section title="Observação">
              <Textarea
                value={obsDraft}
                onChange={(e) => setObsDraft(e.target.value)}
                rows={2}
                className="rounded-xl"
                onBlur={() => updateLot(embarque.id, { observacao: obsDraft })}
              />
            </Section>

            {embarque.sharepointUrl && (
              <a
                href={embarque.sharepointUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir SharePoint
              </a>
            )}
          </TabsContent>

          <TabsContent
            value="historico"
            className="flex-1 overflow-y-auto px-6 py-5 mt-0 data-[state=inactive]:hidden"
          >
            <Section title="Histórico de Movimentações">
              {embarque.history.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem histórico.</div>
              ) : (
                <ul className="space-y-2">
                  {[...embarque.history].reverse().map((h, i) => {
                    const colLabel = inboundCols.find((c) => c.id === h.stage)?.label ?? h.stage;
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
      </DialogContent>
    </Dialog>
  );
}

/* ============== CUSTOMIZE DIALOG ============== */

function CustomizeDialog({
  open,
  onOpenChange,
  board,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  board: "china" | "nacional";
}) {
  const columns = useInbound((s) => s.inboundColumns);
  const lots = useInbound((s) => s.lots);
  const addInboundColumn = useInbound((s) => s.addInboundColumn);
  const renameInboundColumn = useInbound((s) => s.renameInboundColumn);
  const removeInboundColumn = useInbound((s) => s.removeInboundColumn);
  const reorderInboundColumns = useInbound((s) => s.reorderInboundColumns);
  const [newLabel, setNewLabel] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});

  const boardCols = columns
    .filter((c) => c.board === board)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const colIds = boardCols.map((c) => c.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  function handleColDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIdx = boardCols.findIndex((c) => c.id === String(active.id));
    const toIdx = boardCols.findIndex((c) => c.id === String(over.id));
    if (fromIdx === -1 || toIdx === -1) return;
    reorderInboundColumns(board, fromIdx, toIdx);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Customizar Kanban — {board === "china" ? "China" : "Nacional"}</DialogTitle>
          <DialogDescription>Adicione, renomeie, reordene ou remova colunas.</DialogDescription>
        </DialogHeader>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleColDragEnd}
        >
          <SortableContext items={colIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 py-2 max-h-[50vh] overflow-y-auto">
              {boardCols.map((col) => (
                <SortableColItem
                  key={col.id}
                  col={col}
                  editing={editing}
                  setEditing={setEditing}
                  renameInboundColumn={renameInboundColumn}
                  removeInboundColumn={removeInboundColumn}
                  lotsInCol={lots.filter((l) => l.stage === col.id).length}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className="flex gap-2">
          <Input
            placeholder="Nova coluna..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newLabel.trim()) {
                addInboundColumn(board, newLabel.trim());
                setNewLabel("");
              }
            }}
            className="rounded-xl"
          />
          <Button
            onClick={() => {
              if (newLabel.trim()) {
                addInboundColumn(board, newLabel.trim());
                setNewLabel("");
              }
            }}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SortableColItem({
  col,
  editing,
  setEditing,
  renameInboundColumn,
  removeInboundColumn,
  lotsInCol,
}: {
  col: InboundColumn;
  editing: Record<string, string>;
  setEditing: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  renameInboundColumn: (id: string, label: string) => void;
  removeInboundColumn: (id: string) => void;
  lotsInCol: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Input
        value={editing[col.id] ?? col.label}
        onChange={(e) => setEditing((prev) => ({ ...prev, [col.id]: e.target.value }))}
        onBlur={() => {
          if (editing[col.id] && editing[col.id] !== col.label) {
            renameInboundColumn(col.id, editing[col.id]);
          }
        }}
        className="h-8 flex-1 rounded-lg"
        disabled={col.isEntregue}
      />
      {col.isEntregue ? (
        <span className="text-[10px] text-emerald-600">fixa</span>
      ) : (
        <button
          onClick={() => {
            let msg = `Remover a coluna "${col.label}"?`;
            if (lotsInCol > 0) {
              msg += `\n\nEsta coluna possui ${lotsInCol} embarque(s). Eles serão realocados para outra coluna.`;
            }
            if (confirm(msg)) {
              removeInboundColumn(col.id);
              toast.success("Coluna removida.");
            }
          }}
          className="text-muted-foreground hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ============== UI HELPERS ============== */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DataGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>;
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  );
}
