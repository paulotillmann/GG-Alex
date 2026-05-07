import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Sem dotenv, executaremos via npx tsx --env-file=.env importacao/importar.ts

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontrados no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function cleanPhone(phone: string | null): string | null {
  if (!phone) return null;
  
  // Remove parênteses, hifens e espaços
  let cleaned = phone.replace(/[\(\)\-\s]/g, '');
  
  // Remove '+55'
  if (cleaned.startsWith('+55')) {
    cleaned = cleaned.substring(3);
  } 
  // Remove '55' caso ainda conste e o tamanho indique que é código do país
  else if (cleaned.startsWith('55') && cleaned.length > 11) {
    cleaned = cleaned.substring(2);
  }
  
  return cleaned.trim() || null;
}

async function run() {
  const filePath = path.resolve(import.meta.dirname, 'lista_pessoas_alexPeixoto.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // Separa por linhas e ignora a primeira linha (cabeçalho)
  const lines = fileContent.split('\n');
  const recordsToInsert = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    
    const name = parts[0]?.trim();
    const email = parts[1]?.trim() || null;
    const phone = parts[2]?.trim() || null;
    
    if (!name) continue;
    
    recordsToInsert.push({
      full_name: name,
      email: email,
      phone: cleanPhone(phone)
    });
  }

  console.log(`Encontrados ${recordsToInsert.length} registros válidos para importação.`);
  
  const batchSize = 100;
  let insertedCount = 0;
  
  for (let i = 0; i < recordsToInsert.length; i += batchSize) {
    const batch = recordsToInsert.slice(i, i + batchSize);
    
    // Usando a RPC para bypass do RLS
    const { error } = await supabase.rpc('import_pessoas', { payload: batch });
      
    if (error) {
      console.error(`Erro ao inserir lote a partir do indíce ${i}:`, error.message, error.details);
    } else {
      insertedCount += batch.length;
    }
  }
  
  console.log(`Importação concluída. ${insertedCount} registros foram importados com sucesso para a tabela 'pessoa'.`);
}

run();
