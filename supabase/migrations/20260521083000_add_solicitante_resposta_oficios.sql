-- Migration to add solicitante and resposta columns to oficios table
ALTER TABLE public.oficios
ADD COLUMN solicitante text,
ADD COLUMN resposta text;
