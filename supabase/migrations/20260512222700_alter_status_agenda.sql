-- Altera a coluna status da agenda para texto e remove o valor padrão
ALTER TABLE public.agenda ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.agenda ALTER COLUMN status TYPE TEXT USING status::text;
