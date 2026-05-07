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
  
  // Endpoint inicial: autores=71 (Alex), tipo=1 (Requerimento), page_size=100 (otimizar paginação)
  // IMPORTANTE: O parâmetro correto é 'autores' (plural). 'autor' (singular) é ignorado pela API.
  let nextUrl: string | null = `${SAPL_BASE_URL}/api/materia/materialegislativa/?autores=71&tipo=1&page_size=100`;

  // Autenticação Basic Auth temporária (SAPL aceita auth para APIs fechadas, mas matérias geralmente são públicas)
  // Vamos enviar por precaução para garantir acesso completo
  const headers = new Headers();
  headers.set('Authorization', 'Basic ' + btoa(`${USERNAME}:${PASSWORD}`));
  headers.set('Accept', 'application/json');

  while (nextUrl) {
    try {
      // Garantir que a URL force HTTPS
      if (nextUrl.startsWith('http://')) {
        nextUrl = nextUrl.replace('http://', 'https://');
      }

      const response = await fetch(nextUrl, { headers });
      if (!response.ok) {
        throw new Error(`Erro na API SAPL: ${response.status} ${response.statusText}`);
      }

      const data: SaplApiResponse = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        // Filtro de segurança: garantir que apenas matérias do autor 71 (Alex) sejam incluídas
        const filtered = data.results.filter(m => {
          if (!m.autores || !Array.isArray(m.autores)) return true; // se não tem campo autores, aceita (veio do filtro da API)
          return m.autores.includes(71);
        });
        allMaterias.push(...filtered);
      }

      if (onProgress) {
        onProgress(allMaterias.length, data.count);
      }

      nextUrl = data.next;
    } catch (err) {
      console.error('Erro ao buscar dados do SAPL:', err);
      break; // Interrompe em caso de erro, mas retorna o que já foi buscado
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
