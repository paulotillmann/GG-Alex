import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ─── Evolution API Config ────────────────────────────────────────────────────
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution.technocode.site";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "8GJGnDzDfDYQiMFabMWA3e8kFup8LkJY";
const INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME") || "Alex Peixoto";

// ─── Supabase Client (Service Role) ──────────────────────────────────────────
const getSupabase = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
};

// ─── Enviar WhatsApp via Evolution API ───────────────────────────────────────
async function sendWhatsApp(phone: string, text: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  let waNumber = cleanPhone;
  if (!waNumber.startsWith("55") && waNumber.length >= 10) {
    waNumber = "55" + waNumber;
  }

  const payload = {
    number: waNumber,
    options: {
      delay: 1200,
      presence: "composing",
      linkPreview: false,
    },
    text: text,
  };

  const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(INSTANCE_NAME)}`;
  console.log(`[Birthday WPP] Sending to Evolution API: ${url} for number ${waNumber}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Birthday WPP] Error sending WA to ${waNumber}:`, errorText);
    throw new Error(`Evolution API Error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// ─── Formatar data DD/MM ─────────────────────────────────────────────────────
function formatDateDayMonth(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length >= 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}

// ─── Modo Consolidado (Cron Matinal das 09h) ─────────────────────────────────
async function processConsolidatedBirthdays() {
  console.log("[Birthday WPP] Starting consolidated morning birthday processing...");
  const supabase = getSupabase();

  // 1. Buscar aniversariantes de hoje
  const { data: aniversariantes, error: rpcError } = await supabase.rpc("get_aniversariantes_hoje");

  if (rpcError) {
    console.error("[Birthday WPP] Error fetching birthdays:", rpcError);
    throw rpcError;
  }

  if (!aniversariantes || aniversariantes.length === 0) {
    console.log("[Birthday WPP] No birthdays today. No message will be sent.");
    return {
      message: "Nenhum aniversariante hoje. Nenhuma mensagem enviada.",
      processed: 0,
      sent: false,
    };
  }

  console.log(`[Birthday WPP] Found ${aniversariantes.length} birthday(s) today.`);

  // 2. Buscar configuração de aniversários (usuário de destino)
  const { data: config, error: configError } = await supabase
    .from("configuracao_aniversario")
    .select("usuario_notificacao_id, cron_ativo")
    .single();

  if (configError || !config) {
    console.error("[Birthday WPP] Error fetching configuracao_aniversario:", configError);
    throw new Error("Configuração de aniversário não encontrada.");
  }

  if (config.cron_ativo === false) {
    console.log("[Birthday WPP] Cron is disabled in configuracao_aniversario. Aborting.");
    return {
      message: "Envio automático desativado nas configurações.",
      processed: aniversariantes.length,
      sent: false,
    };
  }

  if (!config.usuario_notificacao_id) {
    console.warn("[Birthday WPP] No notification user configured in configuracao_aniversario.");
    return {
      message: "Nenhum usuário configurado para receber o aviso de aniversariantes.",
      processed: aniversariantes.length,
      sent: false,
    };
  }

  // 3. Buscar telefone do usuário configurado em profiles
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, telefone")
    .eq("id", config.usuario_notificacao_id)
    .single();

  if (profileError || !userProfile || !userProfile.telefone) {
    console.warn(
      `[Birthday WPP] User ${config.usuario_notificacao_id} has no valid phone registered in profiles.`
    );
    return {
      message: "Usuário configurado não possui telefone/WhatsApp cadastrado no perfil.",
      processed: aniversariantes.length,
      sent: false,
    };
  }

  // 4. Montar mensagem consolidada simples
  const linhasAniversariantes = aniversariantes.map((a: any) => {
    const dataFormatada = formatDateDayMonth(a.birth_date);
    const tipoStr = a.tipo === "Dependente" ? " (Dependente)" : "";
    return `• Nome: ${a.full_name}${tipoStr} - Data: ${dataFormatada}`;
  });

  const textoConsolidado = [
    `🎂 *Aniversariantes de Hoje*`,
    ``,
    `Hoje temos os seguintes aniversariantes:`,
    ...linhasAniversariantes,
    ``,
    `_Mensagem automática do Gabinete Alex Peixoto_`,
  ].join("\n");

  // 5. Enviar mensagem para o usuário configurado
  const res = await sendWhatsApp(userProfile.telefone, textoConsolidado);

  // 6. Registrar log em activity_logs
  await supabase.from("activity_logs").insert({
    action: "WHATSAPP_ANIVERSARIO_CONSOLIDADO",
    table_name: "configuracao_aniversario",
    record_id: config.usuario_notificacao_id,
    description: `Aviso consolidado de ${aniversariantes.length} aniversariante(s) enviado para ${userProfile.full_name}`,
    metadata: {
      recipient_id: userProfile.id,
      recipient_name: userProfile.full_name,
      recipient_phone: userProfile.telefone,
      total_aniversariantes: aniversariantes.length,
      aniversariantes: aniversariantes.map((a: any) => ({
        id: a.id,
        nome: a.full_name,
        tipo: a.tipo,
        data: a.birth_date,
      })),
      evolution_response: res,
    },
  });

  return {
    success: true,
    message: `Aviso consolidado com ${aniversariantes.length} aniversariante(s) enviado para ${userProfile.full_name}`,
    recipient: userProfile.full_name,
    processed: aniversariantes.length,
    sent: true,
  };
}

// ─── Modo Individual (Disparado via Botão de WhatsApp no Pop-up) ─────────────
async function processIndividualBirthday(targetId: string, targetType?: string) {
  console.log(`[Birthday WPP] Starting individual birthday sending for ${targetId} (${targetType})...`);
  const supabase = getSupabase();

  // 1. Buscar mensagem padrão configurada
  const { data: config } = await supabase
    .from("configuracao_aniversario")
    .select("mensagem_padrao")
    .single();

  const templatePadrao =
    config?.mensagem_padrao ||
    "Olá *{nome}*, tudo bem?\n\nHoje é um dia muito especial! Em nome do Gabinete do Vereador Alex Peixoto, gostaríamos de lhe desejar um **Feliz Aniversário**! 🎉🥳\n\nQue seu dia seja repleto de alegrias, saúde e paz. Um forte abraço!";

  // 2. Buscar aniversariante (Pessoa ou Dependente)
  let targetName = "";
  let targetPhone = "";
  let tableName = "pessoa";

  if (targetType === "Dependente") {
    tableName = "dependentes";
    const { data: dep, error: depError } = await supabase
      .from("dependentes")
      .select("id, full_name, phone, pessoa:pessoa_id (full_name, phone)")
      .eq("id", targetId)
      .single();

    if (depError || !dep) throw new Error("Dependente não encontrado.");
    targetName = dep.full_name;
    targetPhone = dep.phone || (dep.pessoa as any)?.phone || "";
  } else {
    tableName = "pessoa";
    const { data: pessoa, error: pError } = await supabase
      .from("pessoa")
      .select("id, full_name, phone, mensagem_padrao")
      .eq("id", targetId)
      .single();

    if (pError || !pessoa) throw new Error("Pessoa não encontrada.");
    targetName = pessoa.full_name;
    targetPhone = pessoa.phone || "";
  }

  if (!targetPhone) {
    throw new Error("Esta pessoa não possui número de WhatsApp cadastrado.");
  }

  // 3. Montar mensagem personalizada substituindo {nome}
  const firstName = targetName.split(" ")[0];
  const message = templatePadrao
    .replace(/\{nome\}/gi, firstName)
    .replace(/\{nome_completo\}/gi, targetName);

  // 4. Enviar mensagem
  const res = await sendWhatsApp(targetPhone, message);

  // 5. Registrar log
  await supabase.from("activity_logs").insert({
    action: "WHATSAPP_ANIVERSARIO_INDIVIDUAL",
    table_name: tableName,
    record_id: targetId,
    description: `Mensagem de aniversário individual enviada para ${targetName}`,
    metadata: {
      phone: targetPhone,
      recipient_name: targetName,
      tipo: targetType || "Pessoa",
      evolution_response: res,
    },
  });

  return {
    success: true,
    message: `Mensagem de aniversário enviada com sucesso para ${targetName}!`,
    recipient: targetName,
    phone: targetPhone,
  };
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // Validar se é service_role ou usuário logado
    let isServiceRole = false;
    try {
      const payloadB64 = token.split(".")[1];
      if (payloadB64) {
        const payload = JSON.parse(atob(payloadB64));
        if (payload.role === "service_role") {
          isServiceRole = true;
        }
      }
    } catch {
      // Ignora erro de parsing JWT
    }

    if (!isServiceRole) {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (token === serviceRoleKey || token === "cron-secret-gg-nego-2026") {
        isServiceRole = true;
      }
    }

    if (!isServiceRole) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );

      const {
        data: { user },
        error: authError,
      } = await supabaseClient.auth.getUser();
      if (authError || !user) throw new Error("Unauthorized");
    }

    const body = await req.json().catch(() => ({}));
    const { targetId, targetType } = body;

    let result;
    if (targetId) {
      // Disparo individual a partir do pop-up
      result = await processIndividualBirthday(targetId, targetType);
    } else {
      // Disparo consolidado (cron diário das 09h)
      result = await processConsolidatedBirthdays();
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[Birthday WPP] HTTP Error:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
