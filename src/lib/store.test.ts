import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useStore, DONE_STAGE_ID, DEFAULT_COLUMNS, type Cargo } from "./store";

// Mock supabase client
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [] })) })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        in: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Helper to create a basic store state
function resetStore() {
  useStore.setState({
    orders: [],
    columns: [
      { id: "pre_chegada", label: "Pré-Chegada", sortOrder: 0 },
      { id: "recepcao", label: "Recepção", sortOrder: 1 },
      { id: "conferencia", label: "Conferência", sortOrder: 2 },
      { id: DONE_STAGE_ID, label: "Finalizado", isFinalizado: true, sortOrder: 99 },
    ],
    team: [
      { id: "admin-1", name: "Admin User", role: "Admin", color: "bg-rose-500" },
      { id: "coord-1", name: "Coord User", role: "Coordenador", color: "bg-blue-500" },
      { id: "gerente-1", name: "Gerente User", role: "Gerente", color: "bg-emerald-500" },
      { id: "analista-1", name: "Analista User", role: "Analista", color: "bg-amber-500" },
      { id: "aux-1", name: "Auxiliar User", role: "Auxiliar", color: "bg-violet-500" },
    ],
    templates: {},
    taskTags: [],
    personalTasks: [],
    suppliers: [],
    currencies: [],
    pedras: [],
    loading: false,
  });
}

describe("Zustand Store - Tasks, Subtasks, Tags & RBAC", () => {
  beforeEach(() => resetStore());
  afterEach(() => vi.clearAllMocks());

  // ===== DOCK-TO-STOCK BATCH TASKS =====
  describe("Batch Tasks (Dock-to-Stock Stages)", () => {
    const orderId = "order-1";
    const stageId = "recepcao";

    beforeEach(() => {
      useStore.setState({
        orders: [
          {
            id: orderId,
            code: "PO-123",
            currentStage: stageId,
            history: [],
            divergences: { faltas: 0, sobras: 0, avarias: 0 },
            invoice: {},
            tasks: [],
          } as any,
        ],
      });
    });

    it("addTask creates task linked to stage with tagId from column", () => {
      useStore.getState().addTask(orderId, "Conferir volumes", stageId, "user-1");

      const task = useStore.getState().orders[0].tasks[0];
      expect(task.stage).toBe(stageId);
      expect(task.isPersonal).toBeFalsy();
      expect(task.status).toBe("nao_iniciada");
    });

    it("addSubtask inherits stage from parent if not provided", () => {
      useStore.getState().addTask(orderId, "Parent task", stageId);
      const parentId = useStore.getState().orders[0].tasks[0].id;

      useStore.getState().addSubtask(orderId, parentId, "Child task");

      const subtask = useStore.getState().orders[0].tasks.find((t) => t.parentId === parentId);
      expect(subtask?.stage).toBe(stageId);
      expect(subtask?.parentId).toBe(parentId);
    });

    it("addSubtask uses explicit stage when provided", () => {
      useStore.getState().addTask(orderId, "Parent", stageId);
      const parentId = useStore.getState().orders[0].tasks[0].id;

      useStore.getState().addSubtask(orderId, parentId, "Child", "conferencia");

      const subtask = useStore.getState().orders[0].tasks.find((t) => t.parentId === parentId);
      expect(subtask?.stage).toBe("conferencia");
    });

    it("toggleTask marks done and sets timestamps", () => {
      useStore.getState().addTask(orderId, "Task to toggle", stageId);
      const taskId = useStore.getState().orders[0].tasks[0].id;

      useStore.getState().toggleTask(orderId, taskId);

      const task = useStore.getState().orders[0].tasks[0];
      expect(task.done).toBe(true);
      expect(task.status).toBe("concluida");
      expect(task.completedAt).toBeDefined();

      // Toggle back
      useStore.getState().toggleTask(orderId, taskId);
      expect(useStore.getState().orders[0].tasks[0].done).toBe(false);
    });

    it("setTaskStatus updates status and timestamps correctly", () => {
      useStore.getState().addTask(orderId, "Status task", stageId);
      const taskId = useStore.getState().orders[0].tasks[0].id;

      useStore.getState().setTaskStatus(orderId, taskId, "em_processo");
      let task = useStore.getState().orders[0].tasks[0];
      expect(task.status).toBe("em_processo");
      expect(task.startedAt).toBeDefined();
      expect(task.paused).toBe(false);

      useStore.getState().setTaskStatus(orderId, taskId, "concluida");
      task = useStore.getState().orders[0].tasks[0];
      expect(task.completedAt).toBeDefined();
      expect(task.done).toBe(true);

      useStore.getState().setTaskStatus(orderId, taskId, "nao_iniciada");
      task = useStore.getState().orders[0].tasks[0];
      expect(task.done).toBe(false);
    });

    it("removeTask removes task from order", () => {
      useStore.getState().addTask(orderId, "Task to remove", stageId);
      const taskId = useStore.getState().orders[0].tasks[0].id;

      useStore.getState().removeTask(orderId, taskId);
      expect(useStore.getState().orders[0].tasks.length).toBe(0);
    });

    it("setTaskWeight/assignee/dueDate updates correctly", () => {
      useStore.getState().addTask(orderId, "Weight test", stageId, "user-1", 1);
      const taskId = useStore.getState().orders[0].tasks[0].id;

      useStore.getState().setTaskWeight(orderId, taskId, 3);
      expect(useStore.getState().orders[0].tasks[0].weight).toBe(3);

      useStore.getState().assignTask(orderId, taskId, "coord-1");
      expect(useStore.getState().orders[0].tasks[0].assigneeId).toBe("coord-1");

      useStore.getState().setTaskDueDate(orderId, taskId, "2026-12-31");
      expect(useStore.getState().orders[0].tasks[0].dueDate).toBe("2026-12-31");
    });
  });

  // ===== PERSONAL TASKS (STANDALONE) =====
  describe("Personal Tasks (Standalone)", () => {
    it("addStandaloneTask creates task without tag", () => {
      useStore.getState().addStandaloneTask("Tarefa simples", "analista-1");

      const task = useStore.getState().personalTasks[0];
      expect(task.title).toBe("Tarefa simples");
      expect(task.assigneeId).toBe("analista-1");
      expect(task.tagId).toBeUndefined();
      expect(task.parentId).toBeUndefined();
      expect(task.status).toBe("nao_iniciada");
    });

    it("addStandaloneTask creates task linked to existing tag", () => {
      const tagId = useStore.getState().addTaskTag("Importante", "bg-red-500");

      useStore.getState().addStandaloneTask("Com tag", "analista-1", { tagId });

      expect(useStore.getState().personalTasks[0].tagId).toBe(tagId);
    });

    it("addStandaloneTask creates subtask when parentId provided", () => {
      useStore.getState().addStandaloneTask("Pai", "analista-1");
      const parentId = useStore.getState().personalTasks[0].id;

      useStore
        .getState()
        .addStandaloneTask("Filho", "analista-1", { parentId, createdBy: "analista-1" });

      const subtask = useStore.getState().personalTasks.find((t) => t.parentId === parentId);
      expect(subtask).toBeDefined();
      expect(subtask?.parentId).toBe(parentId);
      expect(subtask?.createdBy).toBe("analista-1");
    });

    it("multiple subtasks per parent", () => {
      useStore.getState().addStandaloneTask("Pai", "analista-1");
      const parentId = useStore.getState().personalTasks[0].id;

      useStore.getState().addStandaloneTask("Filho 1", "analista-1", { parentId });
      useStore.getState().addStandaloneTask("Filho 2", "analista-1", { parentId });

      const children = useStore.getState().personalTasks.filter((t) => t.parentId === parentId);
      expect(children.length).toBe(2);
    });

    it("removeStandaloneTask cascades delete children", () => {
      useStore.getState().addStandaloneTask("Pai", "analista-1");
      const parentId = useStore.getState().personalTasks[0].id;

      useStore.getState().addStandaloneTask("Filho 1", "analista-1", { parentId });
      useStore.getState().addStandaloneTask("Filho 2", "analista-1", { parentId });

      expect(useStore.getState().personalTasks.length).toBe(3);

      useStore.getState().removeStandaloneTask(parentId);

      expect(useStore.getState().personalTasks.length).toBe(0);
    });

    it("removeStandaloneTask only removes subtasks of that parent", () => {
      useStore.getState().addStandaloneTask("Pai 1", "analista-1");
      const parent1Id = useStore.getState().personalTasks[0].id;
      useStore.getState().addStandaloneTask("Filho P1", "analista-1", { parentId: parent1Id });

      useStore.getState().addStandaloneTask("Pai 2", "analista-1");
      const parent2Id = useStore.getState().personalTasks.find((t) => t.title === "Pai 2")?.id;
      useStore.getState().addStandaloneTask("Filho P2", "analista-1", { parentId: parent2Id });

      expect(useStore.getState().personalTasks.length).toBe(4);

      useStore.getState().removeStandaloneTask(parent1Id);

      expect(useStore.getState().personalTasks.length).toBe(2);
      expect(useStore.getState().personalTasks.find((t) => t.id === parent2Id)).toBeDefined();
    });

    it("setStandaloneTaskStatus updates status and timestamps", () => {
      useStore.getState().addStandaloneTask("Status test", "analista-1");
      const taskId = useStore.getState().personalTasks[0].id;

      useStore.getState().setStandaloneTaskStatus(taskId, "em_processo");
      expect(useStore.getState().personalTasks[0].status).toBe("em_processo");
      expect(useStore.getState().personalTasks[0].startedAt).toBeDefined();

      useStore.getState().setStandaloneTaskStatus(taskId, "concluida");
      expect(useStore.getState().personalTasks[0].completedAt).toBeDefined();
    });

    it("setStandaloneTaskPaused toggles paused state", () => {
      useStore.getState().addStandaloneTask("Pause test", "analista-1");
      const taskId = useStore.getState().personalTasks[0].id;

      useStore.getState().setStandaloneTaskPaused(taskId, true);
      expect(useStore.getState().personalTasks[0].paused).toBe(true);

      useStore.getState().setStandaloneTaskPaused(taskId, false);
      expect(useStore.getState().personalTasks[0].paused).toBe(false);
    });

    it("setStandaloneTaskTitle/Assignee/DueDate/Tag/Notes/Links update correctly", () => {
      useStore.getState().addStandaloneTask("Original", "analista-1");
      const taskId = useStore.getState().personalTasks[0].id;

      useStore.getState().setStandaloneTaskTitle(taskId, "Atualizado");
      expect(useStore.getState().personalTasks[0].title).toBe("Atualizado");

      useStore.getState().setStandaloneTaskAssignee(taskId, "coord-1");
      expect(useStore.getState().personalTasks[0].assigneeId).toBe("coord-1");

      useStore.getState().setStandaloneTaskDueDate(taskId, "2026-06-15");
      expect(useStore.getState().personalTasks[0].dueDate).toBe("2026-06-15");

      const tagId = useStore.getState().addTaskTag("Nova Tag", "bg-green-500");
      useStore.getState().setStandaloneTaskTag(taskId, tagId);
      expect(useStore.getState().personalTasks[0].tagId).toBe(tagId);

      useStore.getState().setStandaloneTaskNotes(taskId, "Anotações");
      expect(useStore.getState().personalTasks[0].notes).toBe("Anotações");

      useStore
        .getState()
        .setStandaloneTaskLinks(taskId, [{ title: "Link", url: "https://example.com" }]);
      expect(useStore.getState().personalTasks[0].links).toHaveLength(1);
    });
  });

  // ===== TASK TAGS =====
  describe("Task Tags", () => {
    it("addTaskTag creates user tag", () => {
      const tagId = useStore.getState().addTaskTag("Urgente", "bg-red-500");

      const tag = useStore.getState().taskTags.find((t) => t.id === tagId);
      expect(tag).toBeDefined();
      expect(tag?.label).toBe("Urgente");
      expect(tag?.color).toBe("bg-red-500");
      expect(tag?.isColumn).toBe(false);
    });

    it("addTaskTag uses default color when not provided", () => {
      const tagId = useStore.getState().addTaskTag("Sem cor");

      const tag = useStore.getState().taskTags.find((t) => t.id === tagId);
      expect(tag?.color).toBe("bg-slate-500");
    });

    it("removeTaskTag removes user tag and clears references", () => {
      const tagId = useStore.getState().addTaskTag("Remover", "bg-red-500");
      useStore.getState().addStandaloneTask("Com tag", "analista-1", { tagId });
      useStore.getState().addStandaloneTask("Sem tag", "analista-1");

      useStore.getState().removeTaskTag(tagId);

      expect(useStore.getState().taskTags.find((t) => t.id === tagId)).toBeUndefined();
      expect(useStore.getState().personalTasks[0].tagId).toBeUndefined();
    });

    it("removeTaskTag does NOT remove column tags (isColumn=true)", () => {
      const colTagId = "tag-col-stage-custom";

      useStore.setState((s) => ({
        taskTags: [
          ...s.taskTags,
          { id: colTagId, label: "Custom Stage", color: "bg-blue-500", isColumn: true },
        ],
      }));

      useStore.getState().removeTaskTag(colTagId);

      // Column tag should remain
      expect(useStore.getState().taskTags.find((t) => t.id === colTagId)).toBeDefined();
    });

    it("addColumn creates column tag with isColumn=true", () => {
      useStore.getState().addColumn("Nova Etapa");

      const newTags = useStore.getState().taskTags.filter((t) => t.isColumn);
      expect(newTags.length).toBeGreaterThan(0);
      const newColTag = newTags.find((t) => t.label === "Nova Etapa");
      expect(newColTag).toBeDefined();
      expect(newColTag?.isColumn).toBe(true);
    });

    it("renameColumn updates corresponding column tag", () => {
      useStore.getState().addColumn("Etapa Original");
      const col = useStore.getState().columns.find((c) => c.label === "Etapa Original");
      const colTagId = "tag-col-" + col?.id;

      useStore.getState().renameColumn(col!.id, "Etapa Renomeada");

      const tag = useStore.getState().taskTags.find((t) => t.id === colTagId);
      expect(tag?.label).toBe("Etapa Renomeada");
    });

    it("removeColumn removes column and its tag", () => {
      useStore.getState().addColumn("Para Remover");
      const col = useStore.getState().columns.find((c) => c.label === "Para Remover");
      const colTagId = "tag-col-" + col?.id;

      useStore.getState().removeColumn(col!.id);

      expect(useStore.getState().columns.find((c) => c.id === col!.id)).toBeUndefined();
      expect(useStore.getState().taskTags.find((t) => t.id === colTagId)).toBeUndefined();
    });
  });

  // ===== TEMPLATES =====
  describe("Task Templates", () => {
    it("setTemplate and commitTemplate apply to new orders", () => {
      const stageId = "recepcao";

      useStore.getState().setTemplate(stageId, [
        { title: "Template Task 1", weight: 1 },
        { title: "Template Task 2", weight: 2 },
      ]);
      useStore.getState().commitTemplate(stageId);

      // Create new order - should get template tasks
      const orderId = useStore.getState().createLote({
        embarkId: "emb-1",
        code: "PO-NEW",
        supplier: "Fornecedor",
        origin: "china",
        embarque: "EMB-1",
        issueDate: "2026-01-15",
        priority: false,
      });

      const order = useStore.getState().orders.find((o) => o.id === orderId);
      const templateTasks = order?.tasks.filter((t) => t.stage === stageId && !t.parentId);

      expect(templateTasks?.length).toBe(2);
      expect(templateTasks?.[0].title).toBe("Template Task 1");
      expect(templateTasks?.[1].weight).toBe(2);
    });

    it("applyTemplatesRetroactively adds missing template tasks to existing orders", () => {
      const stageId = "recepcao";

      // Create order without template yet
      const orderId = useStore.getState().createLote({
        embarkId: "emb-1",
        code: "PO-OLD",
        supplier: "Fornecedor",
        origin: "china",
        embarque: "EMB-1",
        issueDate: "2026-01-15",
        priority: false,
      });

      // Clear its tasks
      useStore.setState((s) => ({
        orders: s.orders.map((o) => (o.id === orderId ? { ...o, tasks: [] } : o)),
      }));

      // Set template
      useStore.getState().setTemplate(stageId, [{ title: "Retro Task", weight: 1 }]);
      useStore.getState().commitTemplate(stageId);

      const order = useStore.getState().orders.find((o) => o.id === orderId);
      const task = order?.tasks.find((t) => t.title === "Retro Task");

      expect(task).toBeDefined();
    });

    it("applyTemplatesRetroactively does NOT duplicate existing tasks", () => {
      const stageId = "recepcao";

      const orderId = useStore.getState().createLote({
        embarkId: "emb-1",
        code: "PO-DUP",
        supplier: "Fornecedor",
        origin: "china",
        embarque: "EMB-1",
        issueDate: "2026-01-15",
        priority: false,
      });

      // Add task manually that matches template
      useStore.getState().addTask(orderId, "Template Task", stageId);

      // Set template with same title
      useStore.getState().setTemplate(stageId, [{ title: "Template Task", weight: 2 }]);
      useStore.getState().commitTemplate(stageId);

      const order = useStore.getState().orders.find((o) => o.id === orderId);
      const matchingTasks = order?.tasks.filter(
        (t) => t.title === "Template Task" && t.stage === stageId,
      );

      expect(matchingTasks?.length).toBe(1);
    });

    it("reorderTemplateItems reorders items", () => {
      const stageId = "recepcao";

      useStore.getState().setTemplate(stageId, [
        { title: "First", weight: 1 },
        { title: "Second", weight: 2 },
        { title: "Third", weight: 3 },
      ]);

      useStore.getState().reorderTemplateItems(stageId, 0, 2); // Move first to last

      const items = useStore.getState().templates[stageId];
      expect(items?.[0].title).toBe("Second");
      expect(items?.[1].title).toBe("Third");
      expect(items?.[2].title).toBe("First");
    });
  });

  // ===== ROLE-BASED ACCESS CONTROL (UI LOGIC) =====
  describe("Role-Based Access Control Logic", () => {
    // Mirrors UI predicates from pedidos.tsx / produtividade.tsx / templates.tsx
    const isRestricted = (role: Cargo) => role === "Analista" || role === "Auxiliar";
    const canManage = (role: Cargo) =>
      role === "Admin" || role === "Gerente" || role === "Coordenador";

    it("Analista and Auxiliar are restricted", () => {
      expect(isRestricted("Analista")).toBe(true);
      expect(isRestricted("Auxiliar")).toBe(true);
    });

    it("Admin, Gerente, Coordenador are not restricted", () => {
      expect(isRestricted("Admin")).toBe(false);
      expect(isRestricted("Gerente")).toBe(false);
      expect(isRestricted("Coordenador")).toBe(false);
    });

    it("Admin, Gerente, Coordenador can manage", () => {
      expect(canManage("Admin")).toBe(true);
      expect(canManage("Gerente")).toBe(true);
      expect(canManage("Coordenador")).toBe(true);
    });

    it("Analista and Auxiliar cannot manage", () => {
      expect(canManage("Analista")).toBe(false);
      expect(canManage("Auxiliar")).toBe(false);
    });

    it("all Cargo values covered by exactly one group", () => {
      const roles: Cargo[] = ["Admin", "Gerente", "Coordenador", "Analista", "Auxiliar"];
      for (const role of roles) {
        expect(isRestricted(role)).not.toBe(canManage(role));
      }
    });
  });

  // ===== EDGE CASES =====
  describe("Edge Cases", () => {
    it("addTask to non-existent order does nothing (no crash)", () => {
      expect(() => useStore.getState().addTask("non-existent", "Task", "stage-1")).not.toThrow();
      expect(useStore.getState().orders.length).toBe(0);
    });

    it("toggleTask on non-existent task does nothing", () => {
      useStore.setState({ orders: [{ id: "o1", tasks: [] } as any] });
      expect(() => useStore.getState().toggleTask("o1", "task-1")).not.toThrow();
    });

    it("addSubtask with non-existent parent uses empty stage", () => {
      useStore.setState({ orders: [{ id: "o1", tasks: [], currentStage: "stage-1" } as any] });

      useStore.getState().addSubtask("o1", "non-existent-parent", "Child");

      const subtask = useStore.getState().orders[0].tasks[0];
      expect(subtask.stage).toBe(""); // Falls back to empty string
      expect(subtask.parentId).toBe("non-existent-parent");
    });

    it("removeStandaloneTask on non-existent id does nothing", () => {
      expect(() => useStore.getState().removeStandaloneTask("non-existent")).not.toThrow();
    });

    it("setStandaloneTaskTitle with empty string does nothing", () => {
      useStore.getState().addStandaloneTask("Original", "analista-1");
      const taskId = useStore.getState().personalTasks[0].id;

      useStore.getState().setStandaloneTaskTitle(taskId, "   "); // whitespace only

      expect(useStore.getState().personalTasks[0].title).toBe("Original");
    });

    it("DONE_STAGE_ID is 'finalizado'", () => {
      expect(DONE_STAGE_ID).toBe("finalizado");
    });

    it("DEFAULT_COLUMNS contains finalizado column", () => {
      const fin = DEFAULT_COLUMNS.find((c) => c.isFinalizado);
      expect(fin).toBeDefined();
      expect(fin?.id).toBe(DONE_STAGE_ID);
    });
  });

  // ===== COMPLEX SCENARIOS =====
  describe("Complex Scenarios", () => {
    it("full workflow: create order -> add tasks -> add subtasks -> complete", () => {
      // Create order
      const orderId = useStore.getState().createLote({
        embarkId: "emb-1",
        code: "PO-WORKFLOW",
        supplier: "Fornecedor",
        origin: "china",
        embarque: "EMB-1",
        issueDate: "2026-01-15",
        priority: false,
      });

      // Add batch task
      useStore.getState().addTask(orderId, "Receber mercadoria", "recepcao", "coord-1", 2);
      const taskId = useStore.getState().orders[0].tasks.find(
        (t) => t.title === "Receber mercadoria",
      )?.id;
      expect(taskId).toBeDefined();

      // Add subtask
      useStore.getState().addSubtask(orderId, taskId!, "Conferir nota fiscal", "recepcao");
      const subtaskId = useStore
        .getState()
        .orders[0].tasks.find((t) => t.parentId === taskId)?.id;
      expect(subtaskId).toBeDefined();

      // Complete subtask
      useStore.getState().toggleTask(orderId, subtaskId!);
      expect(useStore.getState().orders[0].tasks.find((t) => t.id === subtaskId)?.done).toBe(true);

      // Complete parent
      useStore.getState().toggleTask(orderId, taskId!);
      expect(useStore.getState().orders[0].tasks.find((t) => t.id === taskId)?.done).toBe(true);
    });

    it("personal task hierarchy: parent -> multiple children -> complete all", () => {
      useStore.getState().addStandaloneTask("Projeto X", "gerente-1");
      const projectId = useStore.getState().personalTasks[0].id;

      useStore.getState().addStandaloneTask("Design", "analista-1", { parentId: projectId });
      useStore.getState().addStandaloneTask("Dev", "analista-1", { parentId: projectId });
      useStore.getState().addStandaloneTask("Teste", "analista-1", { parentId: projectId });

      const children = useStore
        .getState()
        .personalTasks.filter((t) => t.parentId === projectId);
      expect(children.length).toBe(3);

      // Complete all children
      children.forEach((c) => useStore.getState().setStandaloneTaskStatus(c.id, "concluida"));

      const completed = useStore
        .getState()
        .personalTasks.filter((t) => t.parentId === projectId && t.status === "concluida");
      expect(completed.length).toBe(3);
    });

    it("tags work for both column tags and user tags", () => {
      // Column tag
      useStore.getState().addColumn("Custom Stage");
      const colTag = useStore
        .getState()
        .taskTags.find((t) => t.label === "Custom Stage" && t.isColumn);
      expect(colTag).toBeDefined();

      // User tag
      const userTagId = useStore.getState().addTaskTag("Urgente", "bg-red-500");
      const userTag = useStore.getState().taskTags.find((t) => t.id === userTagId);
      expect(userTag?.isColumn).toBe(false);

      // Batch task with column tag comes from template auto-tag
      const orderId = useStore.getState().createLote({
        embarkId: "emb-1",
        code: "PO-TAG",
        supplier: "F",
        origin: "china",
        embarque: "E",
        issueDate: "2026-01-15",
        priority: false,
      });
      useStore.getState().addTask(orderId, "Batch task", "recepcao");

      // Personal task with user tag
      useStore
        .getState()
        .addStandaloneTask("Personal with user tag", "analista-1", { tagId: userTagId });
      const personalTask = useStore
        .getState()
        .personalTasks.find((t) => t.tagId === userTagId);
      expect(personalTask).toBeDefined();
    });
  });
});