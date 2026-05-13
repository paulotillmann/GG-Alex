-- Adiciona a coluna status na tabela agenda
ALTER TABLE public.agenda 
ADD COLUMN status anotacao_status DEFAULT 'recebido'::anotacao_status;
