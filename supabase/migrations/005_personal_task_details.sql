-- 005: Detalhamento de atividade pessoal (anotações + links)
-- Só modelagem estrutural — sem migração de dados.

ALTER TABLE public.personal_tasks
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]';
