import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Executaremos via: npx tsx --env-file=.env importacao/importar.ts

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DDD_PADRAO = '34';

// Higieniza o telefone salvando-o puro (sem máscara)
function normalizarTelefone(tel: string | null): string | null {
  if (!tel) return null;
  
  // Remove tudo o que não for dígito
  let limpo = tel.replace(/\D/g, '');
  if (!limpo) return null;
  
  // Se tiver DDI 55 do Brasil e for completo (12 ou 13 dígitos), remove o 55
  if (limpo.startsWith('55') && (limpo.length === 12 || limpo.length === 13)) {
    limpo = limpo.slice(2);
  }
  
  // Se for apenas número local de 8 ou 9 dígitos, adiciona o DDD padrão
  if (limpo.length === 8 || limpo.length === 9) {
    limpo = DDD_PADRAO + limpo;
  }
  
  return limpo;
}

async function run() {
  const filePath = path.resolve(import.meta.dirname, 'lista_celular_alex.csv');
  console.log(`=== Lendo arquivo de importação: ${filePath} ===`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Erro: Arquivo CSV não encontrado em ${filePath}`);
    process.exit(1);
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // Separa por linhas e ignora a primeira linha (cabeçalho)
  const lines = fileContent.split('\n');
  const recordsToInsert = [];
  
  // Controle de deduplicação
  const telefonesProcessados = new Set<string>();
  let contatosSemTelefone = 0;
  let contatosDuplicados = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Delimitador ponto e vírgula
    const parts = line.split(';');
    
    const name = parts[0]?.trim() || '';
    const email = parts[1]?.trim() || null;
    let phoneExtraRaw = parts[2]?.trim() || '';
    let phoneRaw = parts[3]?.trim() || '';
    
    // Se nome e contatos estiverem totalmente vazios, descarta
    if (!name && !phoneRaw && !phoneExtraRaw) continue;
    
    // Se o telefone principal estiver vazio e o extra preenchido, inverte para priorizar o principal
    if (!phoneRaw && phoneExtraRaw) {
      phoneRaw = phoneExtraRaw;
      phoneExtraRaw = '';
    }
    
    const phone = normalizarTelefone(phoneRaw);
    const phoneExtra = normalizarTelefone(phoneExtraRaw);
    
    // Se após a higienização não possuir telefone principal, descarta
    if (!phone) {
      contatosSemTelefone++;
      continue;
    }
    
    // Deduplicação pelo telefone principal
    if (telefonesProcessados.has(phone)) {
      contatosDuplicados++;
      continue;
    }
    
    telefonesProcessados.add(phone);
    
    recordsToInsert.push({
      full_name: name || 'Importado via Planilha',
      email: email || null,
      phone: phone,
      phone_extra: phoneExtra || null
    });
  }

  console.log('\n=== Estatísticas do Processamento ===');
  console.log(`- Total de linhas no arquivo: ${lines.length - 1}`);
  console.log(`- Registros descartados por falta de telefone: ${contatosSemTelefone}`);
  console.log(`- Registros duplicados descartados: ${contatosDuplicados}`);
  console.log(`- Registros únicos prontos para inserção: ${recordsToInsert.length}`);
  console.log('====================================\n');
  
  if (recordsToInsert.length === 0) {
    console.log('Nenhum registro válido para importar.');
    return;
  }
  
  const batchSize = 100;
  let insertedCount = 0;
  
  console.log('Iniciando envio dos lotes para o Supabase...');
  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);
    
    // Usando a RPC para fazer bypass do RLS (roda com SECURITY DEFINER no banco)
    const { error } = await supabase.rpc('import_pessoas', { payload: batch });
      
    if (error) {
      console.error(`Erro ao inserir lote a partir do índice ${i}:`, error.message, error.details);
    } else {
      insertedCount += batch.length;
      console.log(`- Lote de ${insertedCount - batch.length} a ${insertedCount} importado com sucesso.`);
    }
  }
  
  console.log(`\nImportação concluída! ${insertedCount} registros foram importados com sucesso para a tabela 'pessoa'.`);
}

run().catch(err => {
  console.error("Erro na execução do script:", err);
});
