import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Columns3,
  Weight,
  GripVertical,
  Tag,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KanbanColumn, TaskTemplateItem, TaskWeight, PersonalTask } from "@/lib/store";
import { useStore } from "@/lib/store";
import { useProfile } from "@/lib/profile";
import { toast } from "sonner";

const EMPTY_TEMPLATES: TaskTemplateItem[] = [];

export const Route = createFileRoute("/templates")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const { profile, loading } = useProfile.getState();
    if (loading) return;
    if (!["Admin", "Gerente", "Coordenador"].includes(profile?.role ?? "")) {
      throw redirect({ to: "/pedidos" });
    }
  },
  head: () => ({
    meta: [
      { title: "Customização — Operações Azime" },
      {
        name: "description",
        content:
          "Crie colunas do kanban, tarefas por coluna com peso e reordene por drag-and-drop.",
      },
    ],
  }),
  component: CustomizacaoPage,
});

function CustomizacaoPage() {
  const columns = useStore((s) => s.columns);

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <header className="pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Customização</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monte o fluxo do Dock-to-Stock: colunas, tarefas com peso e ordenação por arrastar.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard icon={Columns3} label="Colunas" value={columns.length} />
        <SummaryCard
          icon={Weight}
          label="Tarefas modelo"
          value={columns.reduce(
            (a, c) => a + (useStore.getState().templates[c.id]?.length ?? 0),
            0,
          )}
        />
      </div>

      <div className="mt-6 space-y-4">
        <TabsSection />
      </div>
    </div>
  );
}

const TAB_OPTIONS = [
  { id: "columns" as const, label: "Colunas Kanban", icon: Columns3 },
  { id: "tasks" as const, label: "Tarefas", icon: Weight },
] as const;

type TabId = (typeof TAB_OPTIONS)[number]["id"];

function TabsSection() {
  const [activeTab, setActiveTab] = useState<TabId>("columns");
  return (
    <>
      <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-sm">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{activeTab === "columns" ? <ColumnsSection /> : <TasksSection />}</div>
    </>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

/* ============== COLUNAS + TAREFAS POR COLUNA ============== */

function ColumnsSection() {
  const columns = useStore((s) => s.columns);
  const addColumn = useStore((s) => s.addColumn);
  const reorderColumns = useStore((s) => s.reorderColumns);
  const [newCol, setNewCol] = useState("");

  const colSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  const colIds = columns.map((c) => c.id);

  function add() {
    if (!newCol.trim()) return;
    addColumn(newCol.trim());
    setNewCol("");
    toast.success("Coluna criada.");
  }

  function handleColDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIdx = columns.findIndex((c) => c.id === active.id);
    const toIdx = columns.findIndex((c) => c.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;
    reorderColumns(fromIdx, toIdx);
    toast.success("Colunas reordenadas.");
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Colunas do Kanban</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {columns.length}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Nova coluna (ex: Qualidade)..."
          value={newCol}
          onChange={(e) => setNewCol(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="rounded-full"
        />
        <Button disabled={!newCol.trim()} onClick={add} className="rounded-full">
          <Plus className="h-4 w-4" /> Adicionar coluna
        </Button>
      </div>

      {columns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Columns3 className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium">Nenhuma coluna ainda</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Crie a primeira coluna para montar o fluxo do Dock-to-Stock.
          </div>
        </div>
      ) : (
        <DndContext
          sensors={colSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleColDragEnd}
        >
          <SortableContext items={colIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {columns.map((col) => (
                <ColumnCard key={col.id} column={col} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function ColumnCard({ column }: { column: KanbanColumn }) {
  const renameColumn = useStore((s) => s.renameColumn);
  const removeColumn = useStore((s) => s.removeColumn);
  const templates = useStore((s) => s.templates[column.id] ?? EMPTY_TEMPLATES);
  const setTemplate = useStore((s) => s.setTemplate);
  const commitTemplate = useStore((s) => s.commitTemplate);
  const reorderTemplateItems = useStore((s) => s.reorderTemplateItems);
  const columns = useStore((s) => s.columns);
  const orders = useStore((s) => s.orders);

  const [draftTitle, setDraftTitle] = useState("");
  const [draftWeight, setDraftWeight] = useState<TaskWeight>(1);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(column.label);

  const colSortable = useSortable({ id: column.id });
  const colStyle = {
    transform: CSS.Transform.toString(colSortable.transform),
    transition: colSortable.transition,
    opacity: colSortable.isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function addTask() {
    if (!draftTitle.trim()) return;
    setTemplate(column.id, [...templates, { title: draftTitle.trim(), weight: draftWeight }]);
    commitTemplate(column.id);
    setDraftTitle("");
    setDraftWeight(1);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIdx = Number(String(active.id).replace("tpl-", ""));
    const toIdx = Number(String(over.id).replace("tpl-", ""));
    reorderTemplateItems(column.id, fromIdx, toIdx);
  }

  const sortableIds = templates.map((_, i) => `tpl-${i}`);

  return (
    <div
      ref={colSortable.setNodeRef}
      style={colStyle}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <header className="flex items-center justify-between pb-3">
        <button
          {...colSortable.attributes}
          {...colSortable.listeners}
          className="mr-2 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Arrastar coluna"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {editingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="h-8 max-w-[16rem]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  renameColumn(column.id, nameDraft);
                  setEditingName(false);
                }
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-8"
              onClick={() => {
                renameColumn(column.id, nameDraft);
                setEditingName(false);
              }}
            >
              OK
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              setNameDraft(column.label);
              setEditingName(true);
            }}
            className="text-left text-sm font-semibold tracking-tight hover:underline"
          >
            {column.label}
            {column.isFinalizado && (
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                Finalizado
              </span>
            )}
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            {templates.length} tarefa{templates.length === 1 ? "" : "s"}
          </span>
          {!column.isFinalizado && columns.length > 1 && (
            <button
              onClick={() => {
                const lotsInCol = orders.filter((o) => o.currentStage === column.id);
                const tasksInCol = orders.reduce(
                  (sum, o) => sum + o.tasks.filter((t) => t.stage === column.id).length,
                  0,
                );
                let msg = `Remover a coluna "${column.label}"?`;
                if (lotsInCol.length > 0 || tasksInCol > 0) {
                  msg += `\n\nEsta coluna possui ${lotsInCol.length} lote(s)`;
                  if (tasksInCol > 0) msg += ` e ${tasksInCol} tarefa(s)`;
                  msg += ".\nOs lotes serão realocados e as tarefas desta etapa serão removidas.";
                }
                if (confirm(msg)) {
                  removeColumn(column.id);
                  toast.success("Coluna removida.");
                }
              }}
              className="text-muted-foreground hover:text-red-600"
              aria-label="Remover coluna"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-border bg-background px-4 py-4 text-center text-xs text-muted-foreground">
          Nenhuma tarefa modelo nesta coluna.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <ul className="divide-y divide-border rounded-xl border border-border bg-background">
              {templates.map((it, i) => (
                <SortableTemplateItem
                  key={`${i}-${it.title}`}
                  id={`tpl-${i}`}
                  title={it.title}
                  weight={it.weight}
                  children={it.children}
                  onTitleChange={(title) => {
                    const next = [...templates];
                    next[i] = { ...next[i], title };
                    setTemplate(column.id, next);
                  }}
                  onTitleCommit={() => commitTemplate(column.id)}
                  onWeightChange={(w) => {
                    const next = [...templates];
                    next[i] = { ...next[i], weight: w };
                    setTemplate(column.id, next);
                  }}
                  onWeightCommit={() => commitTemplate(column.id)}
                  onAddChild={(childTitle) => {
                    const next = [...templates];
                    next[i] = { ...next[i], children: [...(next[i].children ?? []), childTitle] };
                    setTemplate(column.id, next);
                    commitTemplate(column.id);
                  }}
                  onRemoveChild={(childIdx) => {
                    const next = [...templates];
                    next[i] = {
                      ...next[i],
                      children: (next[i].children ?? []).filter((_, idx) => idx !== childIdx),
                    };
                    setTemplate(column.id, next);
                    commitTemplate(column.id);
                  }}
                  onRemove={() => {
                    setTemplate(
                      column.id,
                      templates.filter((_, idx) => idx !== i),
                    );
                    commitTemplate(column.id);
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Nova tarefa modelo..."
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTask();
            }
          }}
          className="min-w-[12rem] flex-1 rounded-full"
        />
        <Select
          value={String(draftWeight)}
          onValueChange={(v) => setDraftWeight(Number(v) as TaskWeight)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[7rem] rounded-full">
            <span className="text-xs">Peso {draftWeight}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Peso 1 (leve)</SelectItem>
            <SelectItem value="2">Peso 2 (médio)</SelectItem>
            <SelectItem value="3">Peso 3 (pesado)</SelectItem>
          </SelectContent>
        </Select>
        <Button disabled={!draftTitle.trim()} onClick={addTask} className="rounded-full">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

function SortableTemplateItem({
  id,
  title,
  weight,
  children: subtasks,
  onTitleChange,
  onTitleCommit,
  onWeightChange,
  onWeightCommit,
  onRemove,
  onAddChild,
  onRemoveChild,
}: {
  id: string;
  title: string;
  weight: TaskWeight;
  children?: string[];
  onTitleChange: (title: string) => void;
  onTitleCommit: () => void;
  onWeightChange: (w: TaskWeight) => void;
  onWeightCommit: () => void;
  onRemove: () => void;
  onAddChild: (title: string) => void;
  onRemoveChild: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const [open, setOpen] = useState(false);
  const [newChild, setNewChild] = useState("");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onTitleCommit}
          className="border-transparent bg-transparent px-0 shadow-none focus-visible:border-input focus-visible:bg-card"
        />
        <Select
          value={String(weight)}
          onValueChange={(v) => {
            onWeightChange(Number(v) as TaskWeight);
            onWeightCommit();
          }}
        >
          <SelectTrigger className="h-8 w-auto min-w-[7rem] rounded-full bg-muted/40">
            <span className="text-xs">Peso {weight}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Peso 1 (leve)</SelectItem>
            <SelectItem value="2">Peso 2 (médio)</SelectItem>
            <SelectItem value="3">Peso 3 (pesado)</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-600"
          aria-label="Remover tarefa"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setOpen(!open)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Subtarefas"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="ml-10 mb-2 mr-4 flex flex-col gap-1.5 border-l-2 border-muted pl-4">
          {subtasks?.map((child, i) => (
            <div key={`${i}-${child}`} className="group flex items-center gap-2">
              <span className="flex-1 text-xs text-foreground/80">{child}</span>
              <button
                onClick={() => onRemoveChild(i)}
                className="text-muted-foreground opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100"
                aria-label="Remover subtarefa"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Input
            placeholder="Nova subtarefa (Enter)"
            className="h-7 max-w-sm rounded-full border-dashed bg-muted/20 text-xs"
            value={newChild}
            onChange={(e) => setNewChild(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newChild.trim()) {
                onAddChild(newChild.trim());
                setNewChild("");
              }
            }}
          />
        </div>
      )}
    </li>
  );
}

/* ============== TASKS SECTION (tarefas + sub-tarefas + tags) ============== */

function TasksSection() {
  const taskTags = useStore((s) => s.taskTags);
  const addTaskTag = useStore((s) => s.addTaskTag);
  const removeTaskTag = useStore((s) => s.removeTaskTag);
  const personalTasks = useStore((s) => s.personalTasks);
  const addStandaloneTask = useStore((s) => s.addStandaloneTask);
  const team = useStore((s) => s.team);
  const columns = useStore((s) => s.columns);

  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("bg-slate-500");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskTagId, setNewTaskTagId] = useState("");

  const customTags = taskTags.filter((t) => !t.isColumn);
  const tarefas = personalTasks.filter((t) => !t.parentId && t.status !== "concluida");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const groupedByTag = useMemo(() => {
    const map = new Map<string | null, PersonalTask[]>();
    for (const t of tarefas) {
      const key = t.tagId ?? null;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tarefas]);

  const tagGroups = useMemo(() => {
    const groups: { key: string | null; label: string; color?: string; tasks: PersonalTask[] }[] =
      [];
    for (const [tagId, tasks] of groupedByTag) {
      const tag = tagId ? taskTags.find((t) => t.id === tagId) : null;
      groups.push({
        key: tagId,
        label: tag?.label ?? "Sem Tag",
        color: tag?.color,
        tasks,
      });
    }
    groups.sort((a, b) => {
      if (a.key === null) return 1;
      if (b.key === null) return -1;
      return a.label.localeCompare(b.label);
    });
    return groups;
  }, [groupedByTag, taskTags]);

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleAddTag() {
    if (!newTagLabel.trim()) return;
    addTaskTag(newTagLabel.trim(), newTagColor);
    setNewTagLabel("");
    toast.success("Tag criada.");
  }

  function handleAddTask() {
    if (!newTaskTitle.trim() || !newTaskAssignee) {
      toast.error("Preencha titulo e responsavel.");
      return;
    }
    addStandaloneTask(newTaskTitle.trim(), newTaskAssignee, {
      dueDate: newTaskDueDate || undefined,
      tagId: newTaskTagId || undefined,
    });
    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskTagId("");
    toast.success("Tarefa criada.");
  }

  const availableColors: { value: string; label: string }[] = [
    { value: "bg-slate-500", label: "Cinza" },
    { value: "bg-blue-500", label: "Azul" },
    { value: "bg-emerald-500", label: "Verde" },
    { value: "bg-amber-500", label: "Ambar" },
    { value: "bg-violet-500", label: "Violeta" },
    { value: "bg-rose-500", label: "Rosa" },
    { value: "bg-cyan-500", label: "Ciano" },
    { value: "bg-orange-500", label: "Laranja" },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Gestão de Tarefas</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {tarefas.length} tarefas · {personalTasks.length - tarefas.length} sub-tarefas
        </span>
      </div>

      {/* Tags */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Tag className="h-4 w-4" />
          Tags
        </h3>

        {/* Tags de coluna (somente leitura) */}
        {taskTags.some((t) => t.isColumn) && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Tags de colunas (automáticas)
            </div>
            <div className="flex flex-wrap gap-2">
              {taskTags
                .filter((t) => t.isColumn)
                .map((tag) => (
                  <span
                    key={tag.id}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white ${tag.color}`}
                    title="Tag gerada automaticamente a partir de coluna kanban"
                  >
                    {tag.label}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Tags customizadas (editáveis) */}
        <div className="mb-2 text-xs font-medium text-muted-foreground">Tags personalizadas</div>
        {customTags.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-3 text-center text-xs text-muted-foreground">
            Nenhuma tag personalizada. Crie tags para classificar tarefas.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {customTags.map((tag) => (
              <div
                key={tag.id}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white ${tag.color}`}
              >
                {tag.label}
                <button
                  onClick={() => {
                    if (confirm(`Remover tag "${tag.label}"?`)) {
                      removeTaskTag(tag.id);
                      toast.success("Tag removida.");
                    }
                  }}
                  className="hover:text-red-200"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            placeholder="Nova tag..."
            value={newTagLabel}
            onChange={(e) => setNewTagLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="h-9 rounded-full flex-1 min-w-[180px]"
          />
          <div className="flex items-center gap-1.5">
            {availableColors.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setNewTagColor(c.value)}
                className={`h-7 w-7 rounded-full transition-all ${c.value} ${
                  newTagColor === c.value
                    ? "ring-2 ring-offset-2 ring-foreground scale-110"
                    : "hover:scale-110"
                }`}
              />
            ))}
          </div>
          <Button disabled={!newTagLabel.trim()} onClick={handleAddTag} className="rounded-full">
            <Plus className="h-4 w-4" /> Criar tag
          </Button>
        </div>
      </div>

      {/* Criar Tarefa */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Criar Tarefa</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Título da tarefa..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="rounded-full"
          />
          <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
            <SelectTrigger className="h-9 rounded-full">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              {team.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            placeholder="Data de entrega (opcional)"
            value={newTaskDueDate}
            onChange={(e) => setNewTaskDueDate(e.target.value)}
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
                    {t.isColumn && (
                      <span className="text-[10px] text-muted-foreground">(coluna)</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          disabled={!newTaskTitle.trim() || !newTaskAssignee}
          onClick={handleAddTask}
          className="mt-3 rounded-full"
        >
          <Plus className="h-4 w-4" /> Criar tarefa
        </Button>
      </div>

      {/* Listar Tarefas + Sub-Tarefas */}
      {tarefas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Weight className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <div className="text-sm font-medium">Nenhuma tarefa</div>
        </div>
      ) : (
        <div className="space-y-4">
          {tagGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.key ?? "__none__"] ?? false;
            return (
              <div key={group.key ?? "__none__"} className="space-y-2">
                <button
                  onClick={() => toggleGroup(group.key ?? "__none__")}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm w-full text-left hover:bg-accent/50 transition"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  {group.color ? (
                    <span className={`h-3 w-3 rounded-full shrink-0 ${group.color}`} />
                  ) : (
                    <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-semibold">{group.label}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {group.tasks.length}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-2 pl-2">
                    {group.tasks.map((tarefa) => (
                      <TarefaCard
                        key={tarefa.id}
                        tarefa={tarefa}
                        allTasks={personalTasks}
                        taskTags={taskTags}
                        team={team}
                        addStandaloneTask={addStandaloneTask}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TarefaCard({
  tarefa,
  allTasks,
  taskTags,
  team,
  addStandaloneTask,
}: {
  tarefa: PersonalTask;
  allTasks: PersonalTask[];
  taskTags: { id: string; label: string; color: string; isColumn?: boolean }[];
  team: { id: string; name: string }[];
  addStandaloneTask: (
    title: string,
    assigneeId: string,
    options?: { dueDate?: string; tagId?: string; parentId?: string },
  ) => void;
}) {
  const [subTitle, setSubTitle] = useState("");
  const subs = allTasks.filter((t) => t.parentId === tarefa.id && t.status !== "concluida");
  const tag = taskTags.find((t) => t.id === tarefa.tagId);

  function handleAddSub() {
    if (!subTitle.trim()) return;
    addStandaloneTask(subTitle.trim(), tarefa.assigneeId || "", {
      parentId: tarefa.id,
    });
    setSubTitle("");
    toast.success("Sub-Tarefa adicionada.");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">{tarefa.title}</h4>
            {tag && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${tag.color}`}
              >
                {tag.label}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            {team.find((m) => m.id === tarefa.assigneeId)?.name && (
              <span>Resp: {team.find((m) => m.id === tarefa.assigneeId)?.name}</span>
            )}
            {tarefa.dueDate && <span>Prazo: {tarefa.dueDate}</span>}
            {tarefa.status === "concluida" && <span className="text-emerald-600">Concluida</span>}
          </div>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums">
          {subs.length} sub-tarefas
        </span>
      </div>

      {subs.length > 0 && (
        <ul className="mt-2 space-y-1 rounded-xl border border-border bg-background px-3 py-2">
          {subs.map((sub) => (
            <li key={sub.id} className="flex items-center justify-between text-xs">
              <span
                className={sub.status === "concluida" ? "text-muted-foreground line-through" : ""}
              >
                {sub.title}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {sub.status === "concluida"
                  ? "Concluida"
                  : sub.status === "em_processo"
                    ? "Em processo"
                    : "Nao iniciada"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tarefa.status !== "concluida" && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            placeholder="Nova sub-tarefa..."
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddSub();
              }
            }}
            className="h-8 rounded-full text-xs"
          />
          <Button
            size="sm"
            disabled={!subTitle.trim()}
            onClick={handleAddSub}
            className="h-8 rounded-full"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
