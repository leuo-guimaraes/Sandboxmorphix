-- =========================================================================
--  LICITAPRO — Script Completo de Criação do Banco de Dados Supabase
--  Cole e execute este script no SQL Editor do Supabase Dashboard.
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA EDITAIS
CREATE TABLE IF NOT EXISTS public.editais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero TEXT,
    modalidade TEXT,
    orgao TEXT,
    valor_estimado NUMERIC(15, 2),
    data_abertura TIMESTAMPTZ,
    data_limite TIMESTAMPTZ,
    status TEXT DEFAULT 'Aberto',
    objeto TEXT,
    plataforma TEXT,
    keywords JSONB DEFAULT '[]'::jsonb,
    ai_analysis TEXT,
    ai_provider TEXT,
    pdf_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    cnpj TEXT,
    area TEXT,
    cor TEXT DEFAULT '#3b82f6',
    produtos JSONB DEFAULT '[]'::jsonb,
    contato TEXT,
    obs TEXT,
    keywords JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA PIPELINE (KANBAN DE EDITAIS)
CREATE TABLE IF NOT EXISTS public.pipeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edital_id UUID REFERENCES public.editais(id) ON DELETE CASCADE,
    coluna TEXT NOT NULL DEFAULT 'prospeccao',
    prioridade TEXT DEFAULT 'media',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA EDITAL_CLIENTES (VÍNCULO EDITAL X CLIENTE)
CREATE TABLE IF NOT EXISTS public.edital_clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edital_id UUID REFERENCES public.editais(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA RPA_TASKS (TAREFAS AUTOMATIZADAS)
CREATE TABLE IF NOT EXISTS public.rpa_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo TEXT NOT NULL,
    url TEXT,
    entrada TEXT,
    instrucao TEXT,
    data_agendada TIMESTAMPTZ,
    status TEXT DEFAULT 'agendado',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA KANBAN_COLUNAS (COLUNAS CUSTOMIZÁVEIS)
CREATE TABLE IF NOT EXISTS public.kanban_colunas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    posicao INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA EXTRACOES (RESULTADOS DE EXTRAÇÃO RPA)
CREATE TABLE IF NOT EXISTS public.extracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rpa_task_id UUID REFERENCES public.rpa_tasks(id) ON DELETE CASCADE,
    url TEXT,
    conteudo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR ROW LEVEL SECURITY (RLS) E PERMISSÕES PÚBLICAS (ANON) PARA TODAS AS TABELAS
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edital_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rpa_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracoes ENABLE ROW LEVEL SECURITY;

-- POLITICAS DE ACESSO TOTAL PARA RLS (ANON & AUTHENTICATED)
CREATE POLICY "Acesso total publico editais" ON public.editais FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico pipeline" ON public.pipeline FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico edital_clientes" ON public.edital_clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico rpa_tasks" ON public.rpa_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico kanban_colunas" ON public.kanban_colunas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico extracoes" ON public.extracoes FOR ALL USING (true) WITH CHECK (true);

-- COLUNAS PADRÃO DO KANBAN (SEED)
INSERT INTO public.kanban_colunas (key, label, posicao) VALUES
('prospeccao', 'Prospecção', 1),
('analise', 'Em Análise', 2),
('proposta', 'Proposta em Elaboração', 3),
('habilitacao', 'Habilitação / Documentos', 4),
('disputa', 'Em Disputa / Pregão', 5),
('ganha', 'Ganha / Homologada', 6),
('perdida', 'Perdida / Revogada', 7)
ON CONFLICT (key) DO NOTHING;
