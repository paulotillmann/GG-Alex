CREATE TABLE public.sapl_sincronismo_historico (
    id uuid default gen_random_uuid() primary key,
    requerimento_id uuid references public.requerimento(id) on delete cascade,
    entidade_tipo text check (entidade_tipo in ('Requerimento', 'Arquivo/Ofício')),
    entidade_identificador text, -- Guarda o número ou nome caso o ID mude
    acao text check (acao in ('CRIADO', 'ATUALIZADO')),
    detalhes_alteracao jsonb default '{}'::jsonb,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.sapl_sincronismo_historico ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Visualização de histórico SAPL permitida para usuários autenticados" 
ON public.sapl_sincronismo_historico 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Inserção de histórico SAPL permitida para usuários autenticados" 
ON public.sapl_sincronismo_historico 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Index para otimizar busca por requerimento
CREATE INDEX idx_sapl_historico_requerimento ON public.sapl_sincronismo_historico(requerimento_id);
