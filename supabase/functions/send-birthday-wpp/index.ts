import { createClient } from "npm:@supabase/supabase-js@2"

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evolution.technocode.site";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "8GJGnDzDfDYQiMFabMWA3e8kFup8LkJY";
const INSTANCE_NAME = Deno.env.get("EVOLUTION_INSTANCE_NAME") || "Alex Peixoto";

const getSupabase = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

async function sendWhatsApp(phone: string, fullName: string, customMessage?: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  let waNumber = cleanPhone;
  if (!waNumber.startsWith("55") && waNumber.length >= 10) {
    waNumber = "55" + waNumber;
  }

  const firstName = fullName.split(' ')[0];
  let message = `Olá *${firstName}*, tudo bem?\n\nHoje é um dia muito especial! Em nome do Gabinete do Vereador Alex Peixoto, gostaríamos de lhe desejar um **Feliz Aniversário**! 🎉🥳\n\nQue seu dia seja repleto de alegrias, saúde e paz. Um forte abraço!`;

  if (customMessage && customMessage.trim() !== '') {
    message = customMessage.replace(/\{nome\}/gi, firstName).replace(/\{nome_completo\}/gi, fullName);
  }

  const payload = {
    number: waNumber,
    options: {
      delay: 1200,
      presence: "composing",
      linkPreview: false
    },
    text: message
  };

  const url = `${EVOLUTION_API_URL}/message/sendText/${encodeURIComponent(INSTANCE_NAME)}`;
  
  console.log(`Sending to Evolution API: ${url} for number ${waNumber}`);
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error sending WA to ${waNumber}:`, errorText);
    throw new Error(`Evolution API Error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

async function processBirthdays(targetId?: string) {
  console.log("Starting birthday processing...");
  const supabase = getSupabase();
  
  const { data: aniversariantes, error } = await supabase.rpc('get_aniversariantes_hoje');
  
  if (error) {
    console.error("Error fetching birthdays:", error);
    throw error;
  }
  
  let toProcess = aniversariantes || [];
  
  if (targetId) {
    toProcess = toProcess.filter((p: any) => p.id === targetId);
  }
  
  console.log(`Found ${toProcess.length} birthdays to process.`);
  
  const results = [];
  
  for (const person of toProcess) {
    try {
      if (!person.phone) continue;
      
      const res = await sendWhatsApp(person.phone, person.full_name, person.mensagem_padrao);
      
      await supabase.from('activity_logs').insert({
        action: 'WHATSAPP_ENVIO',
        table_name: person.tipo === 'Pessoa' ? 'pessoa' : 'dependentes',
        record_id: person.id,
        description: `Mensagem de aniversário enviada para ${person.full_name}`,
        metadata: { phone: person.phone, evolution_response: res }
      });
      
      results.push({ id: person.id, name: person.full_name, status: 'success' });
      await new Promise(r => setTimeout(r, 2000));
    } catch (err: any) {
      console.error(`Failed for ${person.full_name}:`, err.message);
      results.push({ id: person.id, name: person.full_name, status: 'error', error: err.message });
      
      await supabase.from('activity_logs').insert({
        action: 'WHATSAPP_FALHA',
        table_name: person.tipo === 'Pessoa' ? 'pessoa' : 'dependentes',
        record_id: person.id,
        description: `Falha ao enviar mensagem de aniversário para ${person.full_name}`,
        metadata: { phone: person.phone, error: err.message }
      });
    }
  }
  
  return { processed: toProcess.length, results };
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { targetId } = await req.json().catch(() => ({}));
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const cronSecret = "cron-secret-gg-nego-2026";

    if (token !== serviceRoleKey && token !== cronSecret) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) throw new Error("Unauthorized");
    }

    const result = await processBirthdays(targetId);
    
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("HTTP Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
