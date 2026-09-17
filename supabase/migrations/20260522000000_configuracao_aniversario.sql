-- ============================================================
-- Migration: Funcionalidade Completa de Aniversariantes
-- ============================================================

-- 1. Garantir extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Tabela de configuração de aniversários
CREATE TABLE IF NOT EXISTS public.configuracao_aniversario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_notificacao_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    mensagem_padrao TEXT NOT NULL DEFAULT 'Olá *{nome}*, tudo bem?\n\nHoje é um dia muito especial! Em nome do Gabinete do Vereador Alex Peixoto, gostaríamos de lhe desejar um **Feliz Aniversário**! 🎉🥳\n\nQue seu dia seja repleto de alegrias, saúde e paz. Um forte abraço!',
    cron_ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.configuracao_aniversario ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.configuracao_aniversario;
CREATE POLICY "Permitir leitura para usuários autenticados"
ON public.configuracao_aniversario FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir atualização para admins" ON public.configuracao_aniversario;
CREATE POLICY "Permitir atualização para admins"
ON public.configuracao_aniversario FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'Administrador')
    )
);

-- Inserir registro inicial caso não exista
INSERT INTO public.configuracao_aniversario (id, mensagem_padrao, cron_ativo)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Olá *{nome}*, tudo bem?\n\nHoje é um dia muito especial! Em nome do Gabinete do Vereador Alex Peixoto, gostaríamos de lhe desejar um **Feliz Aniversário**! 🎉🥳\n\nQue seu dia seja repleto de alegrias, saúde e paz. Um forte abraço!',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.configuracao_aniversario);

-- 3. Função RPC atualizada para obter aniversariantes de hoje (Pessoas e Dependentes)
CREATE OR REPLACE FUNCTION public.get_aniversariantes_hoje()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    birth_date DATE,
    phone TEXT,
    tipo TEXT,
    mensagem_padrao TEXT,
    responsavel_nome TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    hoje_brt DATE;
BEGIN
    -- Obter a data atual no fuso horário do Brasil (BRT)
    hoje_brt := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE;

    RETURN QUERY
    -- Aniversariantes da tabela pessoa
    SELECT 
        p.id,
        p.full_name,
        p.birth_date,
        p.phone,
        'Pessoa'::TEXT AS tipo,
        p.mensagem_padrao,
        NULL::TEXT AS responsavel_nome
    FROM public.pessoa p
    WHERE p.birth_date IS NOT NULL
      AND EXTRACT(MONTH FROM p.birth_date) = EXTRACT(MONTH FROM hoje_brt)
      AND EXTRACT(DAY FROM p.birth_date) = EXTRACT(DAY FROM hoje_brt)

    UNION ALL

    -- Aniversariantes da tabela dependentes
    SELECT 
        d.id,
        d.full_name,
        d.birth_date,
        COALESCE(d.phone, resp.phone) AS phone,
        'Dependente'::TEXT AS tipo,
        NULL::TEXT AS mensagem_padrao,
        resp.full_name AS responsavel_nome
    FROM public.dependentes d
    LEFT JOIN public.pessoa resp ON resp.id = d.pessoa_id
    WHERE d.birth_date IS NOT NULL
      AND EXTRACT(MONTH FROM d.birth_date) = EXTRACT(MONTH FROM hoje_brt)
      AND EXTRACT(DAY FROM d.birth_date) = EXTRACT(DAY FROM hoje_brt);
END;
$$;

-- 4. Funções para controle do pg_cron de Aniversários
CREATE OR REPLACE FUNCTION public.get_birthday_cron_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    job_record record;
    result json;
BEGIN
    SELECT active, schedule INTO job_record
    FROM cron.job
    WHERE jobname = 'send-birthday-wpp'
    LIMIT 1;

    IF FOUND THEN
        result := json_build_object(
            'is_enabled', job_record.active,
            'schedule', job_record.schedule
        );
    ELSE
        result := json_build_object(
            'is_enabled', false,
            'schedule', null
        );
    END IF;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_birthday_cron(
    p_is_enabled boolean,
    p_cron_schedule text DEFAULT '0 12 * * *'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_service_key text;
    v_url text := 'https://ggzineqxakpwafoyuzxe.supabase.co/functions/v1/send-birthday-wpp';
    v_job_exists boolean;
BEGIN
    -- Ler a chave do Vault
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SERVICE_ROLE_KEY'
    LIMIT 1;

    IF v_service_key IS NULL THEN
        RAISE EXCEPTION 'Service Role Key not found in Supabase Vault (SERVICE_ROLE_KEY)';
    END IF;

    -- Verifica se o job já existe antes de tentar remover
    SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-birthday-wpp') INTO v_job_exists;

    IF v_job_exists THEN
        PERFORM cron.unschedule('send-birthday-wpp');
    END IF;

    IF p_is_enabled THEN
        -- 12:00 UTC = 09:00 Horário de Brasília (BRT / UTC-3)
        PERFORM cron.schedule(
            'send-birthday-wpp',
            p_cron_schedule,
            format(
                $query$
                SELECT net.http_post(
                    url:='%s',
                    headers:=jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || '%s'),
                    body:='{}'::jsonb
                );
                $query$,
                v_url,
                v_service_key
            )
        );
    END IF;

    -- Atualizar flag na tabela de configuração
    UPDATE public.configuracao_aniversario
    SET cron_ativo = p_is_enabled,
        updated_at = timezone('utc'::text, now());
END;
$$;

-- Executar configuração inicial do cron
SELECT public.update_birthday_cron(true, '0 12 * * *');
