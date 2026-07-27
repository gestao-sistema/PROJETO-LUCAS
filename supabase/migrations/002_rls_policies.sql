-- Migration: RLS policies for Azime ERP tables
-- Enable RLS and create policies matching pessoal project

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.embarques ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pedras ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inbound_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.task_tags ENABLE ROW LEVEL SECURITY;

-- embarques
CREATE POLICY "Allow read for anon" ON public.embarques FOR SELECT TO public USING (true);
CREATE POLICY "Allow all for authenticated" ON public.embarques FOR ALL TO public USING (auth.role() = 'authenticated') WITH CHECK (true);

-- purchase_orders
CREATE POLICY "Allow read for anon" ON public.purchase_orders FOR SELECT TO public USING (true);
CREATE POLICY "Allow all for authenticated" ON public.purchase_orders FOR ALL TO public USING (auth.role() = 'authenticated') WITH CHECK (true);

-- task_templates
CREATE POLICY "Allow read for anon" ON public.task_templates FOR SELECT TO public USING (true);
CREATE POLICY "Allow all for authenticated" ON public.task_templates FOR ALL TO public USING (auth.role() = 'authenticated') WITH CHECK (true);

-- profiles
CREATE POLICY "Allow read for anon" ON public.profiles FOR SELECT TO public USING (true);
CREATE POLICY "Allow all for authenticated" ON public.profiles FOR ALL TO public USING (auth.role() = 'authenticated') WITH CHECK (true);

-- kanban_columns
CREATE POLICY "Allow read for anon" ON public.kanban_columns FOR SELECT TO anon USING (true);
CREATE POLICY "Allow all for authenticated" ON public.kanban_columns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- colaboradores
CREATE POLICY "Allow read for anon" ON public.colaboradores FOR SELECT TO anon USING (true);
CREATE POLICY "Allow all for authenticated" ON public.colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- suppliers
CREATE POLICY "Allow all for authenticated" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- currencies
CREATE POLICY "Allow all for authenticated" ON public.currencies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- personal_tasks
CREATE POLICY "personal_tasks_read" ON public.personal_tasks FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY "personal_tasks_insert" ON public.personal_tasks FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "personal_tasks_update" ON public.personal_tasks FOR UPDATE TO public USING (auth.role() = 'authenticated') WITH CHECK (true);
CREATE POLICY "personal_tasks_delete" ON public.personal_tasks FOR DELETE TO public USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated" ON public.personal_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pedras
CREATE POLICY "auth read pedras" ON public.pedras FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write pedras" ON public.pedras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- inbound_columns
CREATE POLICY "auth read inbound_columns" ON public.inbound_columns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write inbound_columns" ON public.inbound_columns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- task_tags
CREATE POLICY "task_tags_read" ON public.task_tags FOR SELECT TO public USING (auth.role() = 'authenticated');
CREATE POLICY "task_tags_insert" ON public.task_tags FOR INSERT TO public WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "task_tags_update" ON public.task_tags FOR UPDATE TO public USING (auth.role() = 'authenticated') WITH CHECK (true);
CREATE POLICY "task_tags_delete" ON public.task_tags FOR DELETE TO public USING (auth.role() = 'authenticated');
