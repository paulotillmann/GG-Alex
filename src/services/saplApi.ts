import { supabase } from '../lib/supabase';

const SAPL_BASE_URL = 'https://sapl.araguari.mg.leg.br';

export interface SaplMateria {
  id: number;
  tipo: number;
  numero: number;
  ano: number;
  ementa: string;
  data_apresentacao: string;
  texto_original: string | null;
  autores?: number[];
  tramitacao_set?: any[];
}

export interface SaplApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SaplMateria[];
}

// Credenciais (idealmente em variáveis de ambiente, mas como solicitado pelo user, usaremos fixo para a primeira integração)
const USERNAME = 'alex';
const PASSWORD = 'Mudar@123';

/**
 * Busca todas as matérias legislativas do Vereador Alex Peixoto (autor 71)
 * que sejam do tipo Requerimento (tipo 1).
 */
export async function fetchAllSaplRequerimentos(
  onProgress?: (fetched: number, total: number) => void
): Promise<SaplMateria[]> {
  const allMaterias: SaplMateria[] = [];
  
  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + btoa(`${USERNAME}:${PASSWORD}`));
  headers.set('Accept', 'application/json');

  const PAGE_SIZE = 100;
  let page = 1;
  let totalCount = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Construir URL manualmente para evitar problemas com o link 'next' que vem em http://
      const url = `${SAPL_BASE_URL}/api/materia/materialegislativa/?autores=71&tipo=1&page_size=${PAGE_SIZE}&page=${page}`;

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Erro na API SAPL: ${response.status} ${response.statusText}`);
      }

      const data: SaplApiResponse = await response.json();
      totalCount = data.count;
      
      if (data.results && Array.isArray(data.results)) {
        allMaterias.push(...data.results);
      }

      if (onProgress) {
        onProgress(allMaterias.length, totalCount);
      }

      // Verificar se há mais páginas
      hasMore = data.next !== null && allMaterias.length < totalCount;
      page++;
    } catch (err) {
      console.error(`Erro ao buscar página ${page} do SAPL:`, err);
      break;
    }
  }

  return allMaterias;
}

/**
 * Faz o mapeamento de um objeto vindo do SAPL para o formato do Supabase
 */
export function mapSaplToRequerimento(sapl: SaplMateria, userId: string) {
  // Concatena numero/ano como chave única (ex: "001/2025")
  const numero_requerimento = `${String(sapl.numero).padStart(3, '0')}/${sapl.ano}`;

  return {
    numero_requerimento,
    titulo: sapl.ementa || 'Sem ementa',
    data_sessao: sapl.data_apresentacao || new Date().toISOString().split('T')[0],
    status: 'Apresentado', // Status padrão inicial, pode ser atualizado pelas tramitações se necessário
    resposta_recebida: null,
    pessoa_id: null,
    informacoes_adicionais: `Importado do SAPL (ID: ${sapl.id})`,
    user_id: userId,
  };
}
