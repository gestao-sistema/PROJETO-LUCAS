-- Migration: Create all business tables for Azime ERP
-- Generated from snapshot of pessoal project (knukzxkvxaeqenwszckm)
-- Target: ctxmlvsrichzgvwqapex

-- 1. pedras (parent of purchase_orders.pedra_id)
CREATE TABLE IF NOT EXISTS public.pedras (
    id TEXT NOT NULL PRIMARY KEY,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#6b7280',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. profiles (references auth.users.user_id)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    theme TEXT
);

-- 3. embarques (parent of purchase_orders.embark_id)
CREATE TABLE IF NOT EXISTS public.embarques (
    id TEXT NOT NULL PRIMARY KEY,
    code TEXT NOT NULL,
    supplier TEXT NOT NULL,
    origin TEXT NOT NULL CHECK (origin = ANY (ARRAY['china', 'nacional'])),
    currency TEXT NOT NULL CHECK (currency = ANY (ARRAY['USD', 'BRL'])),
    total_value NUMERIC NOT NULL DEFAULT 0,
    issue_date DATE NOT NULL,
    embark_date DATE NOT NULL,
    eta_date DATE NOT NULL,
    stage TEXT NOT NULL,
    invoice_number TEXT,
    invoice_value NUMERIC,
    customs_channel TEXT CHECK (customs_channel = ANY (ARRAY['verde', 'amarelo', 'vermelho'])),
    customs_taxes NUMERIC,
    despachante TEXT,
    notes TEXT,
    history JSONB NOT NULL DEFAULT '[]',
    sharepoint_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    volumes_expected INTEGER NOT NULL DEFAULT 0,
    observacao TEXT,
    qtd_pecas INTEGER DEFAULT 0,
    qtd_caixas INTEGER DEFAULT 0,
    chegada_real DATE,
    suppliers TEXT[] DEFAULT '{}',
    companies TEXT[] DEFAULT '{}'
);

-- 4. kanban_columns (Lucas kanban stages)
CREATE TABLE IF NOT EXISTS public.kanban_columns (
    id TEXT NOT NULL PRIMARY KEY,
    label TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_finalizado BOOLEAN DEFAULT false
);

-- 5. inbound_columns (inbound tracking stages)
CREATE TABLE IF NOT EXISTS public.inbound_columns (
    id TEXT NOT NULL PRIMARY KEY,
    label TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_entregue BOOLEAN DEFAULT false,
    board TEXT DEFAULT 'china'
);

-- 6. suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    origin TEXT CHECK (origin = ANY (ARRAY['china', 'nacional'])),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. currencies
CREATE TABLE IF NOT EXISTS public.currencies (
    id TEXT NOT NULL PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT '$',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. colaboradores
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role = ANY (ARRAY['Auxiliar', 'Analista', 'Gerente', 'Coordenador'])),
    color TEXT NOT NULL DEFAULT 'bg-blue-500',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    email TEXT
);

-- 9. task_tags
CREATE TABLE IF NOT EXISTS public.task_tags (
    id TEXT NOT NULL PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'bg-slate-500',
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_column BOOLEAN NOT NULL DEFAULT false
);

-- 10. task_templates
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    stage TEXT NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. purchase_orders (FK -> embarques, pedras)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT NOT NULL PRIMARY KEY,
    embark_id TEXT NOT NULL REFERENCES public.embarques(id),
    code TEXT NOT NULL,
    supplier TEXT NOT NULL,
    origin TEXT NOT NULL CHECK (origin = ANY (ARRAY['china', 'nacional'])),
    embarque TEXT NOT NULL,
    total_value NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL CHECK (currency = ANY (ARRAY['USD', 'BRL', 'EUR'])),
    issue_date DATE NOT NULL,
    arrival_date DATE,
    volumes_received INTEGER NOT NULL DEFAULT 0,
    divergences JSONB NOT NULL DEFAULT '{"faltas": 0, "sobras": 0, "avarias": 0}',
    invoice JSONB NOT NULL DEFAULT '{}',
    erp_status TEXT NOT NULL DEFAULT 'pendente' CHECK (erp_status = ANY (ARRAY['pendente', 'em_processamento', 'lancado', 'divergente'])),
    freight_cost NUMERIC NOT NULL DEFAULT 0,
    current_stage TEXT NOT NULL,
    history JSONB NOT NULL DEFAULT '[]',
    tasks JSONB NOT NULL DEFAULT '[]',
    sharepoint_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    priority BOOLEAN DEFAULT false,
    observacao TEXT,
    sku_count INTEGER DEFAULT 0,
    pedra_id TEXT REFERENCES public.pedras(id),
    financial_value NUMERIC DEFAULT 0,
    company TEXT
);

-- 12. personal_tasks (self-ref FK on parent_id)
CREATE TABLE IF NOT EXISTS public.personal_tasks (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    assignee_id TEXT,
    weight INTEGER NOT NULL DEFAULT 1 CHECK (weight = ANY (ARRAY[1, 2, 3])),
    status TEXT NOT NULL DEFAULT 'nao_iniciada' CHECK (status = ANY (ARRAY['nao_iniciada', 'em_processo', 'concluida'])),
    paused BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    tag_id TEXT,
    parent_id TEXT REFERENCES public.personal_tasks(id),
    due_date DATE
);

-- Extra indexes
CREATE INDEX IF NOT EXISTS idx_embarques_stage ON public.embarques(stage);
CREATE INDEX IF NOT EXISTS idx_embarques_origin ON public.embarques(origin);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_erp_status ON public.purchase_orders(erp_status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_embark_id ON public.purchase_orders(embark_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_current_stage ON public.purchase_orders(current_stage);
CREATE INDEX IF NOT EXISTS personal_tasks_assignee_id_idx ON public.personal_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS personal_tasks_parent_id_idx ON public.personal_tasks(parent_id);
CREATE INDEX IF NOT EXISTS personal_tasks_tag_id_idx ON public.personal_tasks(tag_id);
